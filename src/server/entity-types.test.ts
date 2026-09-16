import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "@/db/index";
import {
	campaigns,
	entityTags,
	nouns,
	tagGroups,
	tags,
	users,
} from "@/db/schema/index";
import {
	loadEntityTypes,
	prepareNounTags,
	seedEntityTypes,
} from "@/server/entity-types";
import { removeTagGroup, writeTagGroup } from "@/server/tag-group-writes";
import {
	applyEntityTags,
	nounTagRefsField,
	validateEntityTagGroups,
} from "@/server/tags";

let userId: string;
let campaignId: string;
let groupId: string;
let nounId: string;
let types: Awaited<ReturnType<typeof loadEntityTypes>>;
beforeEach(async () => {
	userId = crypto.randomUUID();
	campaignId = crypto.randomUUID();
	nounId = crypto.randomUUID();
	await db.insert(users).values({
		id: userId,
		name: "Types test",
		email: `${userId}@test.invalid`,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db.transaction(async (tx) => {
		await tx
			.insert(campaigns)
			.values({ id: campaignId, name: "Types", createdById: userId });
		await seedEntityTypes(tx, campaignId);
	});
	types = await loadEntityTypes(campaignId);
	const group = await db.query.tagGroups.findFirst({
		where: eq(tagGroups.campaignId, campaignId),
	});
	groupId = group?.id as string;
	await db.insert(nouns).values({ id: nounId, campaignId, name: "Entity" });
});
afterEach(async () => {
	await db.delete(users).where(eq(users.id, userId));
});

it("requires a campaign-owned type and rejects conflicting choices and session types", async () => {
	const person = types.find((t) => t.name === "Person");
	const place = types.find((t) => t.name === "Place");
	if (!person || !place) throw new Error("Missing seed types");
	expect((await prepareNounTags(campaignId, "", [])).ok).toBe(false);
	expect((await prepareNounTags(campaignId, "Unknown", [])).ok).toBe(false);
	expect((await prepareNounTags(campaignId, "Person", [place])).ok).toBe(false);
	expect(await prepareNounTags(campaignId, "person", [])).toEqual({
		ok: true,
		value: [person],
	});
	expect(
		await validateEntityTagGroups(campaignId, [person], "session"),
	).toMatch(/cannot be applied/);
	const other = crypto.randomUUID();
	await db
		.insert(campaigns)
		.values({ id: other, name: "Other", createdById: userId });
	expect((await prepareNounTags(other, "Person", [person])).ok).toBe(false);
});

it("persists custom types and protects the required group and in-use type", async () => {
	const quest = { id: crypto.randomUUID(), name: "Quest" };
	expect(
		(
			await writeTagGroup(
				{ campaignId, id: groupId, name: "Type", tags: [...types, quest] },
				true,
			)
		).ok,
	).toBe(true);
	const result = await prepareNounTags(campaignId, "quest", []);
	if (!result.ok) throw new Error(result.error);
	await applyEntityTags(campaignId, { nounId }, result.value);
	expect((await removeTagGroup(campaignId, groupId)).ok).toBe(false);
	expect(
		(
			await writeTagGroup(
				{ campaignId, id: groupId, name: "Type", tags: types },
				true,
			)
		).ok,
	).toBe(false);
	expect(
		(
			await writeTagGroup(
				{ campaignId, id: groupId, name: "Type", tags: [] },
				true,
			)
		).ok,
	).toBe(false);
	expect(
		(
			await db.query.entityTags.findMany({
				where: eq(entityTags.nounId, nounId),
			})
		).map((t) => t.tagId),
	).toEqual([quest.id]);
	const replacement = await prepareNounTags(campaignId, "Person", []);
	if (!replacement.ok) throw new Error(replacement.error);
	await applyEntityTags(campaignId, { nounId }, replacement.value);
	expect(
		(
			await writeTagGroup(
				{ campaignId, id: groupId, name: "Type", tags: types },
				true,
			)
		).ok,
	).toBe(true);
	expect(
		await db.query.tags.findFirst({ where: eq(tags.id, quest.id) }),
	).toBeUndefined();
});

it("preserves 25 ordinary tags alongside the required type", async () => {
	const ordinary = Array.from({ length: 25 }, (_, i) => ({
		id: crypto.randomUUID(),
		name: `Tag ${i}`,
	}));
	const result = await prepareNounTags(campaignId, "Person", ordinary);
	if (!result.ok) throw new Error(result.error);
	expect(nounTagRefsField.safeParse(result.value).success).toBe(true);
	const saved = await applyEntityTags(campaignId, { nounId }, result.value);
	expect(saved).toHaveLength(26);
	expect(saved.some((t) => t.name === "Tag 24")).toBe(true);
	expect(saved.some((t) => t.name === "Person")).toBe(true);
});

it("rejects moving an already-assigned ordinary tag into the required type group", async () => {
	const ordinary = { id: crypto.randomUUID(), name: "Ally" };
	const prepared = await prepareNounTags(campaignId, "Person", [ordinary]);
	if (!prepared.ok) throw new Error(prepared.error);
	await applyEntityTags(campaignId, { nounId }, prepared.value);
	expect(
		(
			await writeTagGroup(
				{ campaignId, id: groupId, name: "Type", tags: [...types, ordinary] },
				true,
			)
		).ok,
	).toBe(false);
});
