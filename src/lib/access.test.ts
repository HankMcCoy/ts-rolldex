import { eq, like } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/index";
import { users } from "@/db/schema/auth";
import { campaigns, members } from "@/db/schema/index";
import { getCampaignAccess, requireCampaignAccess } from "@/lib/access";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_PREFIX = "access-test-";

function uid() {
	return `${TEST_PREFIX}${crypto.randomUUID()}`;
}

let dmId: string;
let memberId: string;
let outsiderId: string;
let campaignId: string;

beforeEach(async () => {
	dmId = uid();
	memberId = uid();
	outsiderId = uid();
	campaignId = uid();

	const now = new Date();

	await db.insert(users).values([
		{
			id: dmId,
			name: "DM",
			email: `${dmId}@test.invalid`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: memberId,
			name: "Member",
			email: `${memberId}@test.invalid`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: outsiderId,
			name: "Outsider",
			email: `${outsiderId}@test.invalid`,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await db.insert(campaigns).values({
		id: campaignId,
		name: `Test Campaign ${campaignId}`,
		createdById: dmId,
	});

	// Member row linked to memberId
	await db.insert(members).values({
		campaignId,
		email: `${memberId}@test.invalid`,
		userId: memberId,
	});
});

afterEach(async () => {
	// Clean up in reverse FK order
	await db.delete(members).where(like(members.email, `${TEST_PREFIX}%`));
	await db
		.delete(campaigns)
		.where(like(campaigns.name, `Test Campaign ${TEST_PREFIX}%`));
	await db.delete(users).where(like(users.id, `${TEST_PREFIX}%`));
});

// ---------------------------------------------------------------------------
// getCampaignAccess
// ---------------------------------------------------------------------------

describe("getCampaignAccess", () => {
	it("returns ADMIN for the campaign creator", async () => {
		const access = await getCampaignAccess(
			campaignId,
			dmId,
			`${dmId}@test.invalid`,
		);
		expect(access).toBe("ADMIN");
	});

	it("returns READ_ONLY for a member matched by userId", async () => {
		const access = await getCampaignAccess(
			campaignId,
			memberId,
			`${memberId}@test.invalid`,
		);
		expect(access).toBe("READ_ONLY");
	});

	it("returns READ_ONLY for an unlinked invite matched by email", async () => {
		const inviteEmail = `invite-${uid()}@test.invalid`;
		await db
			.insert(members)
			.values({ campaignId, email: inviteEmail, userId: null });

		const access = await getCampaignAccess(campaignId, outsiderId, inviteEmail);
		expect(access).toBe("READ_ONLY");

		await db.delete(members).where(eq(members.email, inviteEmail));
	});

	it("matches unlinked invite case-insensitively (invite stored lowercase, query uppercased)", async () => {
		const base = `invite-${uid()}`;
		const storedEmail = `${base}@test.invalid`; // lowercase as stored by inviteMember
		await db
			.insert(members)
			.values({ campaignId, email: storedEmail, userId: null });

		// Simulate a user whose email has different casing (e.g. from an OAuth provider)
		const access = await getCampaignAccess(
			campaignId,
			outsiderId,
			storedEmail.toUpperCase(),
		);
		expect(access).toBe("READ_ONLY");

		await db.delete(members).where(eq(members.email, storedEmail));
	});

	it("returns NONE when email matches but member row belongs to a different userId", async () => {
		// memberId's row has userId set — outsider shouldn't be able to claim it via email
		const access = await getCampaignAccess(
			campaignId,
			outsiderId,
			`${memberId}@test.invalid`,
		);
		expect(access).toBe("NONE");
	});

	it("returns NONE for a non-member", async () => {
		const access = await getCampaignAccess(
			campaignId,
			outsiderId,
			`${outsiderId}@test.invalid`,
		);
		expect(access).toBe("NONE");
	});

	it("returns NONE for a non-existent campaign", async () => {
		const access = await getCampaignAccess(
			"no-such-campaign",
			dmId,
			`${dmId}@test.invalid`,
		);
		expect(access).toBe("NONE");
	});
});

// ---------------------------------------------------------------------------
// requireCampaignAccess
// ---------------------------------------------------------------------------

describe("requireCampaignAccess", () => {
	it("returns ADMIN for the creator with no minimum specified", async () => {
		const access = await requireCampaignAccess(
			campaignId,
			dmId,
			`${dmId}@test.invalid`,
		);
		expect(access).toBe("ADMIN");
	});

	it("returns READ_ONLY for a member with no minimum specified", async () => {
		const access = await requireCampaignAccess(
			campaignId,
			memberId,
			`${memberId}@test.invalid`,
		);
		expect(access).toBe("READ_ONLY");
	});

	it("throws notFound() for NONE access", async () => {
		await expect(
			requireCampaignAccess(
				campaignId,
				outsiderId,
				`${outsiderId}@test.invalid`,
			),
		).rejects.toMatchObject({ isNotFound: true });
	});

	it("throws 403 when ADMIN is required but user is READ_ONLY", async () => {
		await expect(
			requireCampaignAccess(
				campaignId,
				memberId,
				`${memberId}@test.invalid`,
				"ADMIN",
			),
		).rejects.toMatchObject({ status: 403 });
	});

	it("returns ADMIN when ADMIN is required and user is creator", async () => {
		const access = await requireCampaignAccess(
			campaignId,
			dmId,
			`${dmId}@test.invalid`,
			"ADMIN",
		);
		expect(access).toBe("ADMIN");
	});
});
