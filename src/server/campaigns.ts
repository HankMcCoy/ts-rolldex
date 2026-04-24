import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaigns, members } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";

export const getCampaigns = createServerFn().handler(async () => {
	const { user } = await requireSession();

	// All campaigns the user created or is a member of
	const memberCampaignIds = await db.query.members.findMany({
		where: or(eq(members.userId, user.id), eq(members.email, user.email)),
		columns: { campaignId: true },
	});

	const memberIds = memberCampaignIds.map((m) => m.campaignId);

	return db.query.campaigns.findMany({
		where: (c, { or, eq, inArray }) =>
			or(
				eq(c.createdById, user.id),
				memberIds.length > 0 ? inArray(c.id, memberIds) : undefined,
			),
		orderBy: (c, { desc }) => desc(c.createdAt),
	});
});

export const getCampaign = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);
		const campaign = await db.query.campaigns.findFirst({
			where: eq(campaigns.id, data.campaignId),
		});
		if (!campaign) throw new Response("Not Found", { status: 404 });
		return { campaign, accessLevel };
	});

export const getCampaignDashboard = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		const [campaign, allNouns, recentSessions, allMembers] = await Promise.all([
			db.query.campaigns.findFirst({
				where: eq(campaigns.id, data.campaignId),
			}),
			db.query.nouns.findMany({
				where: (n, { and, eq }) =>
					and(
						eq(n.campaignId, data.campaignId),
						accessLevel === "READ_ONLY" ? eq(n.isSecret, false) : undefined,
					),
				columns: { id: true, nounType: true },
			}),
			db.query.gameSessions.findMany({
				where: (s, { and, eq }) =>
					and(
						eq(s.campaignId, data.campaignId),
						accessLevel === "READ_ONLY" ? eq(s.isSecret, false) : undefined,
					),
				orderBy: (s, { desc }) => desc(s.createdAt),
				limit: 5,
				columns: { id: true, name: true, summary: true, createdAt: true },
			}),
			db.query.members.findMany({
				where: eq(members.campaignId, data.campaignId),
				with: { user: { columns: { id: true, name: true, email: true } } },
			}),
		]);

		if (!campaign) throw new Response("Not Found", { status: 404 });

		const nounCounts = {
			PERSON: allNouns.filter((n) => n.nounType === "PERSON").length,
			PLACE: allNouns.filter((n) => n.nounType === "PLACE").length,
			THING: allNouns.filter((n) => n.nounType === "THING").length,
			FACTION: allNouns.filter((n) => n.nounType === "FACTION").length,
		};

		return {
			campaign,
			accessLevel,
			nounCounts,
			recentSessions,
			members: allMembers,
		};
	});

export const createCampaign = createServerFn()
	.inputValidator(
		z.object({ name: z.string().min(1).max(100), summary: z.string() }),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();

		const existing = await db.query.campaigns.findFirst({
			where: eq(campaigns.name, data.name),
		});
		if (existing) {
			return { error: "A campaign with this name already exists." };
		}

		const [campaign] = await db
			.insert(campaigns)
			.values({ name: data.name, summary: data.summary, createdById: user.id })
			.returning();
		return { campaign };
	});

export const updateCampaign = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(100),
			summary: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

		const existing = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.name, data.name),
				ne(campaigns.id, data.campaignId),
			),
		});
		if (existing) {
			return { error: "A campaign with this name already exists." };
		}

		const [campaign] = await db
			.update(campaigns)
			.set({
				name: data.name,
				summary: data.summary,
				updatedAt: new Date(),
			})
			.where(eq(campaigns.id, data.campaignId))
			.returning();
		return { campaign };
	});

export const deleteCampaign = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");
		await db.delete(campaigns).where(eq(campaigns.id, data.campaignId));
		return { success: true };
	});
