import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { tagGroups, tags } from "@/db/schema/index";
import { DEFAULT_NOUN_TYPES } from "@/lib/noun-types";
import { err, ok } from "@/lib/result";
import { MAX_TAGS_PER_ENTITY, type TagRef, tagKey } from "@/lib/tags";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function seedEntityTypes(tx: Transaction, campaignId: string) {
	const [group] = await tx
		.insert(tagGroups)
		.values({ campaignId, name: "Type", isEntityType: true })
		.returning();
	return tx
		.insert(tags)
		.values(
			DEFAULT_NOUN_TYPES.map((name) => ({
				campaignId,
				groupId: group.id,
				name,
			})),
		)
		.returning();
}

export async function loadEntityTypes(campaignId: string) {
	return db
		.select({ id: tags.id, name: tags.name })
		.from(tags)
		.innerJoin(tagGroups, eq(tags.groupId, tagGroups.id))
		.where(
			and(
				eq(tags.campaignId, campaignId),
				eq(tagGroups.campaignId, campaignId),
				eq(tagGroups.isEntityType, true),
			),
		);
}

/** The Type field and tag assignments have one persisted source of truth. */
export async function prepareNounTags(
	campaignId: string,
	nounType: string,
	refs: TagRef[],
) {
	const types = await loadEntityTypes(campaignId);
	const selected = types.find((t) => tagKey(t.name) === tagKey(nounType));
	if (!selected)
		return err(
			"Choose an existing entity type from this campaign's Type group.",
		);
	const typeNames = new Set(types.map((t) => tagKey(t.name)));
	if (
		refs.some(
			(t) =>
				typeNames.has(tagKey(t.name)) &&
				tagKey(t.name) !== tagKey(selected.name),
		)
	)
		return err(
			"An entity must have exactly one type. Change it using the Type field.",
		);
	const ordinary = refs.filter((t) => !typeNames.has(tagKey(t.name)));
	if (ordinary.length > MAX_TAGS_PER_ENTITY)
		return err(
			`An entity can have up to ${MAX_TAGS_PER_ENTITY} tags in addition to its type.`,
		);
	return ok([selected, ...ordinary]);
}
