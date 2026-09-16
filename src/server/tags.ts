import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { entityTags, tagGroups, tags } from "@/db/schema/index";
import {
	MAX_TAGS_PER_ENTITY,
	normalizeTagNames,
	sortTagsByName,
	TAG_MAX_LENGTH,
	type TagRef,
	tagKey,
} from "@/lib/tags";

/**
 * Shape the noun/session create + update server fns accept for tags. Ids are
 * client-supplied so the optimistic patch and the persisted row agree — but
 * they are only *proposals*: a name that already exists in the campaign keeps
 * the existing tag's id, so a client can't hijack or invent one.
 */
export const tagRefsField = z
	.array(
		z.object({
			id: z.string().uuid(),
			name: z.string().min(1).max(TAG_MAX_LENGTH),
		}),
	)
	.max(MAX_TAGS_PER_ENTITY)
	.default([]);

export const nounTagRefsField = z
	.array(tagRefsField.unwrap().element)
	.max(MAX_TAGS_PER_ENTITY + 1)
	.default([]);

type TagDatabase =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

type TagTarget = { nounId: string } | { sessionId: string };

const targetColumn = (target: TagTarget) =>
	"nounId" in target ? entityTags.nounId : entityTags.sessionId;

const targetId = (target: TagTarget) =>
	"nounId" in target ? target.nounId : target.sessionId;

/**
 * Resolves submitted names to campaign tag rows, creating any that are new.
 * Matching is case-insensitive (see `tagKey`), so re-typing an existing tag in
 * a different case reuses it instead of tripping the unique index.
 */
async function resolveTags(
	campaignId: string,
	refs: TagRef[],
	connection: TagDatabase = db,
): Promise<TagRef[]> {
	const names = normalizeTagNames(
		refs.map((r) => r.name),
		MAX_TAGS_PER_ENTITY + 1,
	);
	if (names.length === 0) return [];

	const existing = await connection.query.tags.findMany({
		where: eq(tags.campaignId, campaignId),
		columns: { id: true, name: true },
	});
	const byKey = new Map(existing.map((t) => [tagKey(t.name), t]));

	// Only names with no existing match get inserted, and each carries the id
	// the client proposed. `onConflictDoNothing` covers the race where a
	// concurrent save created the same name first; the re-read below then
	// resolves it to whichever row won.
	const proposedIds = new Map(refs.map((r) => [tagKey(r.name), r.id] as const));
	const missing = names.filter((n) => !byKey.has(tagKey(n)));
	if (missing.length > 0) {
		await connection
			.insert(tags)
			.values(
				missing.map((name) => ({
					id: proposedIds.get(tagKey(name)),
					campaignId,
					name,
				})),
			)
			.onConflictDoNothing();

		const refreshed = await connection.query.tags.findMany({
			where: eq(tags.campaignId, campaignId),
			columns: { id: true, name: true },
		});
		byKey.clear();
		for (const t of refreshed) byKey.set(tagKey(t.name), t);
	}

	const resolved: TagRef[] = [];
	for (const name of names) {
		const row = byKey.get(tagKey(name));
		if (row) resolved.push(row);
	}
	return resolved;
}

/**
 * Deletes ungrouped campaign tags nothing carries any more. Grouped tags
 * persist as a configured vocabulary. Every write that can
 * drop the last assignment (a tag edit, a noun or session delete) ends here.
 */
export async function pruneOrphanTags(
	campaignId: string,
	connection: TagDatabase = db,
): Promise<void> {
	await connection
		.delete(tags)
		.where(
			and(
				eq(tags.campaignId, campaignId),
				isNull(tags.groupId),
				notExists(
					connection
						.select({ one: sql`1` })
						.from(entityTags)
						.where(eq(entityTags.tagId, tags.id)),
				),
			),
		);
}

/**
 * Replaces a noun's or session's tags with `refs`, creating tags that don't
 * exist yet and pruning ones left with no carrier. Returns the persisted tag
 * rows, name-sorted — the same order `getCampaignBundle` reports them in.
 *
 * Callers must have already checked the target belongs to `campaignId`; this
 * only writes the join rows.
 */
export async function applyEntityTags(
	campaignId: string,
	target: TagTarget,
	refs: TagRef[],
	connection: TagDatabase = db,
): Promise<TagRef[]> {
	const resolved = await resolveTags(campaignId, refs, connection);

	await connection
		.delete(entityTags)
		.where(eq(targetColumn(target), targetId(target)));
	if (resolved.length > 0) {
		await connection.insert(entityTags).values(
			resolved.map((t) => ({
				tagId: t.id,
				nounId: "nounId" in target ? target.nounId : null,
				sessionId: "sessionId" in target ? target.sessionId : null,
			})),
		);
	}

	await pruneOrphanTags(campaignId, connection);
	return sortTagsByName(resolved);
}

/** Run before any entity writes, so invalid selections cannot partially save. */
export async function validateEntityTagGroups(
	campaignId: string,
	refs: TagRef[],
	targetKind: "noun" | "session" = "noun",
): Promise<string | null> {
	const existing = await db.query.tags.findMany({
		where: eq(tags.campaignId, campaignId),
	});
	const selected = new Set(
		normalizeTagNames(
			refs.map((t) => t.name),
			MAX_TAGS_PER_ENTITY + 1,
		).map(tagKey),
	);
	const typeGroup =
		targetKind === "session"
			? await db.query.tagGroups.findFirst({
					where: and(
						eq(tagGroups.campaignId, campaignId),
						eq(tagGroups.isEntityType, true),
					),
				})
			: undefined;
	const seen = new Set<string>();
	for (const tag of existing) {
		if (!tag.groupId || !selected.has(tagKey(tag.name))) continue;
		if (tag.groupId === typeGroup?.id)
			return "Entity types cannot be applied to sessions.";
		if (seen.has(tag.groupId)) return "Choose only one tag from each group.";
		seen.add(tag.groupId);
	}
	return null;
}
