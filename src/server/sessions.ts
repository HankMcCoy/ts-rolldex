import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { computeRelatedEntities } from "@/lib/relationships";
import {
	loadCampaignCandidates,
	visibilityFilter,
} from "@/server/query-helpers";

export const getSessions = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		return db.query.gameSessions.findMany({
			where: and(
				eq(gameSessions.campaignId, data.campaignId),
				visibilityFilter(gameSessions.isSecret, accessLevel),
			),
			orderBy: (s, { desc }) => desc(s.createdAt),
		});
	});

export const getSession = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), sessionId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		const session = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.id, data.sessionId),
				eq(gameSessions.campaignId, data.campaignId),
			),
		});

		if (!session) throw notFound();
		if (accessLevel === "READ_ONLY" && session.isSecret) throw notFound();

		const result = { ...session };
		if (accessLevel === "READ_ONLY") {
			result.privateNotes = "";
		}

		const candidates = await loadCampaignCandidates(
			data.campaignId,
			accessLevel,
		);
		const related = computeRelatedEntities(
			session.id,
			session.name,
			result,
			candidates,
		);

		return { session: result, accessLevel, related };
	});

export const createSession = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(200),
			summary: z.string(),
			notes: z.string(),
			privateNotes: z.string(),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.campaignId, data.campaignId),
				eq(gameSessions.name, data.name),
			),
		});
		if (existing) {
			return {
				error: "A session with this name already exists in this campaign.",
			};
		}

		const [session] = await db
			.insert(gameSessions)
			.values({
				campaignId: data.campaignId,
				name: data.name,
				summary: data.summary,
				notes: data.notes,
				privateNotes: data.privateNotes,
				isSecret: data.isSecret,
			})
			.returning();
		return { session };
	});

export const updateSession = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			sessionId: z.string(),
			name: z.string().min(1).max(200),
			summary: z.string(),
			notes: z.string(),
			privateNotes: z.string(),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.campaignId, data.campaignId),
				eq(gameSessions.name, data.name),
				ne(gameSessions.id, data.sessionId),
			),
		});
		if (existing) {
			return {
				error: "A session with this name already exists in this campaign.",
			};
		}

		const [session] = await db
			.update(gameSessions)
			.set({
				name: data.name,
				summary: data.summary,
				notes: data.notes,
				privateNotes: data.privateNotes,
				isSecret: data.isSecret,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(gameSessions.id, data.sessionId),
					eq(gameSessions.campaignId, data.campaignId),
				),
			)
			.returning();
		return { session };
	});

export const deleteSession = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), sessionId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db
			.delete(gameSessions)
			.where(
				and(
					eq(gameSessions.id, data.sessionId),
					eq(gameSessions.campaignId, data.campaignId),
				),
			);
		return { success: true };
	});
