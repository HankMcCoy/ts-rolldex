import { and, eq, inArray, isNull, notExists, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { entityTags, tagGroups, tags } from "@/db/schema/index";
import { err, ok } from "@/lib/result";
import { normalizeTagNames, type TagRef, tagKey } from "@/lib/tags";
import { withUniqueName } from "@/server/unique-name";

export type TagGroupWrite = {
	campaignId: string;
	id: string;
	name: string;
	tags: TagRef[];
};

/** Call only after ADMIN authorization. Validate all membership changes before writing. */
export async function writeTagGroup(data: TagGroupWrite, updating: boolean) {
	const groupWhere = and(
		eq(tagGroups.id, data.id),
		eq(tagGroups.campaignId, data.campaignId),
	);
	const currentGroup = updating
		? await db.query.tagGroups.findFirst({ where: groupWhere })
		: undefined;
	if (updating && !currentGroup) return err("Tag group not found.");
	const existing = await db.query.tags.findMany({
		where: eq(tags.campaignId, data.campaignId),
	});
	const byKey = new Map(existing.map((t) => [tagKey(t.name), t]));
	const proposedIds = new Map(data.tags.map((t) => [tagKey(t.name), t.id]));
	const selected = normalizeTagNames(data.tags.map((t) => t.name)).map(
		(name) =>
			byKey.get(tagKey(name)) ?? {
				id: proposedIds.get(tagKey(name)) as string,
				name,
				groupId: null,
			},
	);
	if (selected.some((t) => t.groupId && t.groupId !== data.id))
		return err(
			"A tag already belongs to another group. Remove it from that group first.",
		);
	if (currentGroup?.isEntityType) {
		if (selected.length === 0)
			return err("The entity Type group must keep at least one type.");
		const retained = new Set(selected.map((t) => t.id));
		const removed = existing
			.filter((t) => t.groupId === data.id && !retained.has(t.id))
			.map((t) => t.id);
		if (
			removed.length &&
			(await db.query.entityTags.findFirst({
				where: inArray(entityTags.tagId, removed),
			}))
		)
			return err(
				"This type is in use. Reassign its entities before removing it.",
			);
		const added = selected
			.filter((t) => t.groupId !== data.id)
			.map((t) => t.id);
		if (
			added.length &&
			(await db.query.entityTags.findFirst({
				where: inArray(entityTags.tagId, added),
			}))
		)
			return err(
				"This tag is already assigned. Create a new type instead, or remove its existing assignments first.",
			);
	}
	const ids = selected
		.filter((t) => byKey.has(tagKey(t.name)))
		.map((t) => t.id);
	if (ids.length) {
		const assignments = await db
			.select()
			.from(entityTags)
			.where(inArray(entityTags.tagId, ids));
		const targets = new Set<string>();
		for (const row of assignments) {
			const key = row.nounId
				? `noun:${row.nounId}`
				: `session:${row.sessionId}`;
			if (targets.has(key))
				return err(
					"An entity or session already carries multiple tags from this group. Remove the conflicting tags before saving.",
				);
			targets.add(key);
		}
	}
	return withUniqueName(
		"A tag group with this name already exists in this campaign.",
		() =>
			db.query.tagGroups.findFirst({
				where: and(
					eq(tagGroups.campaignId, data.campaignId),
					sql`lower(${tagGroups.name}) = ${tagKey(data.name)}`,
					updating ? sql`${tagGroups.id} <> ${data.id}` : undefined,
				),
			}),
		() =>
			db.transaction(async (tx) => {
				if (updating)
					await tx.update(tagGroups).set({ name: data.name }).where(groupWhere);
				else
					await tx.insert(tagGroups).values({
						id: data.id,
						campaignId: data.campaignId,
						name: data.name,
					});
				await tx
					.update(tags)
					.set({ groupId: null })
					.where(
						and(
							eq(tags.campaignId, data.campaignId),
							eq(tags.groupId, data.id),
						),
					);
				for (const tag of selected) {
					if (byKey.has(tagKey(tag.name)))
						await tx
							.update(tags)
							.set({ groupId: data.id })
							.where(
								and(eq(tags.id, tag.id), eq(tags.campaignId, data.campaignId)),
							);
					else
						await tx.insert(tags).values({
							id: tag.id,
							name: tag.name,
							campaignId: data.campaignId,
							groupId: data.id,
						});
				}
				await pruneUngrouped(tx, data.campaignId);
				return { id: data.id, name: data.name };
			}),
	);
}

async function pruneUngrouped(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	campaignId: string,
) {
	await tx
		.delete(tags)
		.where(
			and(
				eq(tags.campaignId, campaignId),
				isNull(tags.groupId),
				notExists(
					tx
						.select({ one: sql`1` })
						.from(entityTags)
						.where(eq(entityTags.tagId, tags.id)),
				),
			),
		);
}

/** Deleting a group releases its tags; assignments are preserved. */
export async function removeTagGroup(campaignId: string, id: string) {
	const group = await db.query.tagGroups.findFirst({
		where: and(eq(tagGroups.id, id), eq(tagGroups.campaignId, campaignId)),
	});
	if (group?.isEntityType)
		return err("The required entity Type group cannot be deleted.");
	return db.transaction(async (tx) => {
		const removed = await tx
			.delete(tagGroups)
			.where(and(eq(tagGroups.id, id), eq(tagGroups.campaignId, campaignId)))
			.returning();
		if (!removed.length) return err("Tag group not found.");
		await pruneUngrouped(tx, campaignId);
		return ok({ id });
	});
}
