import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import {
	campaigns,
	gameSessions,
	maps,
	members,
	nouns,
	users,
} from "@/db/schema/index";
import {
	requireCampaign,
	requireCampaignAccess,
	requireSession,
} from "@/lib/access";
import { isUniqueViolation } from "@/lib/db-errors";
import { err, ok } from "@/lib/result";
import { publicUrlFor } from "@/lib/storage";
import { loadTimelineEntries, visibilityFilter } from "@/server/query-helpers";

export const getCampaigns = createServerFn().handler(async () => {
	const { user } = await requireSession();

	// All campaigns the user created or is a member of.
	// Email fallback (userId IS NULL) handles invite-before-account rows only —
	// once linked, the userId match is authoritative.
	const memberCampaignIds = await db.query.members.findMany({
		where: or(
			eq(members.userId, user.id),
			and(eq(members.email, user.email.toLowerCase()), isNull(members.userId)),
		),
		columns: { campaignId: true },
	});

	const memberIds = memberCampaignIds.map((m) => m.campaignId);

	return db.query.campaigns.findMany({
		where: (c, { or, eq, inArray }) =>
			or(
				eq(c.createdById, user.id),
				memberIds.length > 0 ? inArray(c.id, memberIds) : undefined,
			),
		with: {
			nouns: { columns: { id: true } },
			gameSessions: { columns: { id: true } },
		},
		orderBy: (c, { desc }) => desc(c.createdAt),
	});
});

export const getCampaign = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		return requireCampaign(data.campaignId, user);
	});

export const getCampaignDashboard = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const { campaign, accessLevel } = await requireCampaign(
			data.campaignId,
			user,
		);

		const [
			allNouns,
			recentSessions,
			allMembers,
			creator,
			allMaps,
			timelinePreview,
		] = await Promise.all([
			db.query.nouns.findMany({
				where: and(
					eq(nouns.campaignId, data.campaignId),
					visibilityFilter(nouns.isSecret, accessLevel),
				),
				orderBy: (n, { asc }) => asc(n.name),
				columns: {
					id: true,
					name: true,
					nounType: true,
					summary: true,
					isSecret: true,
					imageKey: true,
				},
			}),
			db.query.gameSessions.findMany({
				where: and(
					eq(gameSessions.campaignId, data.campaignId),
					visibilityFilter(gameSessions.isSecret, accessLevel),
				),
				orderBy: (s, { desc }) => desc(s.createdAt),
				limit: 5,
				columns: { id: true, name: true, summary: true, createdAt: true },
			}),
			db.query.members.findMany({
				where: eq(members.campaignId, data.campaignId),
				with: { user: { columns: { id: true, name: true, email: true } } },
			}),
			db.query.users.findFirst({
				where: eq(users.id, campaign.createdById),
				columns: { id: true, name: true, email: true },
			}),
			db.query.maps.findMany({
				where: and(
					eq(maps.campaignId, data.campaignId),
					visibilityFilter(maps.isSecret, accessLevel),
				),
				orderBy: (m, { asc }) => asc(m.name),
				columns: { id: true, name: true, isSecret: true, imageKey: true },
			}),
			loadTimelineEntries(data.campaignId, accessLevel, 5),
		]);

		const entities = allNouns.map(({ imageKey, ...rest }) => ({
			...rest,
			imageUrl: imageKey ? publicUrlFor(imageKey) : null,
		}));

		const dmEntry = {
			id: `dm-${campaign.createdById}`,
			role: "DM" as const,
			email: accessLevel === "ADMIN" ? (creator?.email ?? null) : null,
			user: creator ? { name: creator.name } : null,
		};

		// Hide pending invites and member emails from non-admin viewers.
		const memberEntries =
			accessLevel === "ADMIN"
				? allMembers.map((m) => ({
						id: m.id,
						role: "READ_ONLY" as const,
						email: m.email,
						user: m.user ? { name: m.user.name } : null,
					}))
				: allMembers
						.filter((m) => m.user)
						.map((m) => ({
							id: m.id,
							role: "READ_ONLY" as const,
							email: null,
							user: { name: m.user?.name ?? "" },
						}));

		const mapsList = allMaps.map(({ imageKey, ...rest }) => ({
			...rest,
			imageUrl: imageKey ? publicUrlFor(imageKey) : null,
		}));

		return {
			campaign,
			accessLevel,
			entities,
			recentSessions,
			members: [dmEntry, ...memberEntries],
			maps: mapsList,
			timelinePreview,
		};
	});

export const createCampaign = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1).max(100),
			summary: z.string().max(5_000),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();

		const existing = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.name, data.name),
				eq(campaigns.createdById, user.id),
			),
		});
		if (existing) {
			return err("You already have a campaign with this name.");
		}

		try {
			const [campaign] = await db
				.insert(campaigns)
				.values({
					name: data.name,
					summary: data.summary,
					createdById: user.id,
				})
				.returning();
			return ok(campaign);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("You already have a campaign with this name.");
			}
			throw e;
		}
	});

export const updateCampaign = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(100),
			summary: z.string().max(5_000),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.campaigns.findFirst({
			where: and(
				eq(campaigns.name, data.name),
				eq(campaigns.createdById, user.id),
				ne(campaigns.id, data.campaignId),
			),
		});
		if (existing) {
			return err("You already have a campaign with this name.");
		}

		try {
			const [campaign] = await db
				.update(campaigns)
				.set({
					name: data.name,
					summary: data.summary,
					updatedAt: new Date(),
				})
				.where(eq(campaigns.id, data.campaignId))
				.returning();
			return ok(campaign);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("You already have a campaign with this name.");
			}
			throw e;
		}
	});

export const deleteCampaign = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db.delete(campaigns).where(eq(campaigns.id, data.campaignId));
		return { success: true };
	});
