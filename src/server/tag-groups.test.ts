import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/index";
import {
	campaigns,
	entityTags,
	gameSessions,
	nouns,
	tagGroups,
	tags,
	users,
} from "@/db/schema/index";
import { removeTagGroup, writeTagGroup } from "@/server/tag-group-writes";
import {
	applyEntityTags,
	pruneOrphanTags,
	validateEntityTagGroups,
} from "@/server/tags";

let userId: string;
let campaignId: string;
let nounId: string;
let sessionId: string;
const ref = (name: string) => ({ id: crypto.randomUUID(), name });

beforeEach(async () => {
	userId = crypto.randomUUID();
	campaignId = crypto.randomUUID();
	nounId = crypto.randomUUID();
	sessionId = crypto.randomUUID();
	await db.insert(users).values({
		id: userId,
		name: "Tag groups test",
		email: `${userId}@test.invalid`,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db
		.insert(campaigns)
		.values({ id: campaignId, name: "Groups", createdById: userId });
	await db.insert(nouns).values({
		id: nounId,
		campaignId,
		name: "Quest",
		summary: "Test",
	});
	await db
		.insert(gameSessions)
		.values({ id: sessionId, campaignId, name: "Session", summary: "Test" });
});
afterEach(async () => {
	await db.delete(users).where(eq(users.id, userId));
});

describe("tag group persistence", () => {
	it("keeps unused grouped tags and releases assigned tags when deleting a group", async () => {
		const active = ref("Active"),
			complete = ref("Complete"),
			id = crypto.randomUUID();
		expect(
			(
				await writeTagGroup(
					{ campaignId, id, name: "Status", tags: [active, complete] },
					false,
				)
			).ok,
		).toBe(true);
		await pruneOrphanTags(campaignId);
		expect(
			await db.query.tags.findMany({ where: eq(tags.campaignId, campaignId) }),
		).toHaveLength(2);
		await applyEntityTags(campaignId, { nounId }, [active]);
		await applyEntityTags(campaignId, { sessionId }, [active]);
		expect(
			await validateEntityTagGroups(campaignId, [ref("active"), complete]),
		).toMatch(/one tag/);
		expect(
			await validateEntityTagGroups(campaignId, [active, ref("Other")]),
		).toBeNull();
		expect((await removeTagGroup(campaignId, id)).ok).toBe(true);
		expect(
			await db.query.tags.findMany({ where: eq(tags.campaignId, campaignId) }),
		).toEqual([expect.objectContaining({ id: active.id, groupId: null })]);
		expect(
			await db.query.entityTags.findMany({
				where: eq(entityTags.tagId, active.id),
			}),
		).toHaveLength(2);
	});

	it.each([
		"noun",
		"session",
	])("rejects grouping tags already co-applied to a %s without partial changes", async (kind) => {
		const a = ref("A"),
			b = ref("B"),
			id = crypto.randomUUID();
		await applyEntityTags(
			campaignId,
			kind === "noun" ? { nounId } : { sessionId },
			[a, b],
		);
		const result = await writeTagGroup(
			{ campaignId, id, name: "Conflict", tags: [a, b] },
			false,
		);
		expect(result.ok).toBe(false);
		expect(
			await db.query.tagGroups.findFirst({ where: eq(tagGroups.id, id) }),
		).toBeUndefined();
		expect(
			(
				await db.query.tags.findMany({ where: eq(tags.campaignId, campaignId) })
			).every((t) => t.groupId === null),
		).toBe(true);
	});

	it("renames groups, reuses existing tags by name and rejects duplicate groups or tag ownership", async () => {
		const active = ref("Active"),
			id = crypto.randomUUID();
		await applyEntityTags(campaignId, { nounId }, [active]);
		await writeTagGroup(
			{ campaignId, id, name: "Status", tags: [ref("active")] },
			false,
		);
		expect(
			(await db.query.tags.findFirst({ where: eq(tags.id, active.id) }))
				?.groupId,
		).toBe(id);
		expect(
			(
				await writeTagGroup(
					{ campaignId, id: crypto.randomUUID(), name: "status", tags: [] },
					false,
				)
			).ok,
		).toBe(false);
		expect(
			(
				await writeTagGroup(
					{
						campaignId,
						id: crypto.randomUUID(),
						name: "Other",
						tags: [active],
					},
					false,
				)
			).ok,
		).toBe(false);
		expect(
			(
				await writeTagGroup(
					{ campaignId, id, name: "Progress", tags: [] },
					true,
				)
			).ok,
		).toBe(true);
		expect(
			(await db.query.tags.findFirst({ where: eq(tags.id, active.id) }))
				?.groupId,
		).toBeNull();
	});

	it("does not modify a group from another campaign", async () => {
		const other = crypto.randomUUID(),
			id = crypto.randomUUID();
		await db
			.insert(campaigns)
			.values({ id: other, name: "Other", createdById: userId });
		await writeTagGroup(
			{ campaignId: other, id, name: "Private", tags: [ref("Secret")] },
			false,
		);
		expect(
			(await writeTagGroup({ campaignId, id, name: "Changed", tags: [] }, true))
				.ok,
		).toBe(false);
		expect((await removeTagGroup(campaignId, id)).ok).toBe(false);
		expect(
			(await db.query.tagGroups.findFirst({ where: eq(tagGroups.id, id) }))
				?.name,
		).toBe("Private");
	});
});
