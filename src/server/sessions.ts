import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import {
	type CandidateEntity,
	computeRelatedEntities,
} from "@/lib/relationships";

export const getSessions = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		return db.query.gameSessions.findMany({
			where: (s, { and, eq }) =>
				and(
					eq(s.campaignId, data.campaignId),
					accessLevel === "READ_ONLY" ? eq(s.isSecret, false) : undefined,
				),
			orderBy: (s, { desc }) => desc(s.createdAt),
		});
	});

export const getSession = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), sessionId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		const session = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.id, data.sessionId),
				eq(gameSessions.campaignId, data.campaignId),
			),
		});

		if (!session) throw new Response("Not Found", { status: 404 });
		if (accessLevel === "READ_ONLY" && session.isSecret)
			throw new Response("Not Found", { status: 404 });

		const result = { ...session };
		if (accessLevel === "READ_ONLY") {
			result.privateNotes = "";
		}

		// Fetch all visible entities for relationship computation
		const [allNouns, allSessions] = await Promise.all([
			db.query.nouns.findMany({
				where: (n, { and, eq }) =>
					and(
						eq(n.campaignId, data.campaignId),
						accessLevel === "READ_ONLY" ? eq(n.isSecret, false) : undefined,
					),
				columns: {
					id: true,
					name: true,
					nounType: true,
					summary: true,
					notes: true,
					privateNotes: true,
				},
			}),
			db.query.gameSessions.findMany({
				where: (s, { and, eq }) =>
					and(
						eq(s.campaignId, data.campaignId),
						accessLevel === "READ_ONLY" ? eq(s.isSecret, false) : undefined,
					),
				columns: {
					id: true,
					name: true,
					summary: true,
					notes: true,
					privateNotes: true,
				},
			}),
		]);

		const includePrivate = accessLevel !== "READ_ONLY";
		const candidates: CandidateEntity[] = [
			...allNouns.map((n) => ({
				id: n.id,
				name: n.name,
				entityType: n.nounType as CandidateEntity["entityType"],
				text: includePrivate
					? `${n.summary} ${n.notes} ${n.privateNotes}`
					: `${n.summary} ${n.notes}`,
			})),
			...allSessions.map((s) => ({
				id: s.id,
				name: s.name,
				entityType: "SESSION" as const,
				text: includePrivate
					? `${s.summary} ${s.notes} ${s.privateNotes}`
					: `${s.summary} ${s.notes}`,
			})),
		];

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
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

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
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

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
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");
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
