import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import {
	type CandidateEntity,
	computeRelatedEntities,
} from "@/lib/relationships";

const nounTypeSchema = z.enum(["PERSON", "PLACE", "THING", "FACTION"]);

export const getNouns = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			nounType: nounTypeSchema.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		return db.query.nouns.findMany({
			where: (n, { and, eq }) =>
				and(
					eq(n.campaignId, data.campaignId),
					data.nounType ? eq(n.nounType, data.nounType) : undefined,
					accessLevel === "READ_ONLY" ? eq(n.isSecret, false) : undefined,
				),
			orderBy: (n, { asc }) => asc(n.name),
		});
	});

export const getNoun = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		const noun = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.id, data.nounId),
				eq(nouns.campaignId, data.campaignId),
			),
		});

		if (!noun) throw new Response("Not Found", { status: 404 });
		if (accessLevel === "READ_ONLY" && noun.isSecret)
			throw new Response("Not Found", { status: 404 });

		const result = { ...noun };
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
				summary: n.summary,
				text: includePrivate
					? `${n.summary} ${n.notes} ${n.privateNotes}`
					: `${n.summary} ${n.notes}`,
			})),
			...allSessions.map((s) => ({
				id: s.id,
				name: s.name,
				entityType: "SESSION" as const,
				summary: s.summary,
				text: includePrivate
					? `${s.summary} ${s.notes} ${s.privateNotes}`
					: `${s.summary} ${s.notes}`,
			})),
		];

		const related = computeRelatedEntities(
			noun.id,
			noun.name,
			result,
			candidates,
		);

		return { noun: result, accessLevel, related };
	});

export const createNoun = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(200),
			nounType: nounTypeSchema,
			summary: z.string(),
			notes: z.string(),
			privateNotes: z.string(),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				eq(nouns.name, data.name),
			),
		});
		if (existing) {
			return {
				error: "A noun with this name already exists in this campaign.",
			};
		}

		const [noun] = await db
			.insert(nouns)
			.values({
				campaignId: data.campaignId,
				name: data.name,
				nounType: data.nounType,
				summary: data.summary,
				notes: data.notes,
				privateNotes: data.privateNotes,
				isSecret: data.isSecret,
			})
			.returning();
		return { noun };
	});

export const updateNoun = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			nounId: z.string(),
			name: z.string().min(1).max(200),
			nounType: nounTypeSchema,
			summary: z.string(),
			notes: z.string(),
			privateNotes: z.string(),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				eq(nouns.name, data.name),
				ne(nouns.id, data.nounId),
			),
		});
		if (existing) {
			return {
				error: "A noun with this name already exists in this campaign.",
			};
		}

		const [noun] = await db
			.update(nouns)
			.set({
				name: data.name,
				nounType: data.nounType,
				summary: data.summary,
				notes: data.notes,
				privateNotes: data.privateNotes,
				isSecret: data.isSecret,
				updatedAt: new Date(),
			})
			.where(
				and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
			)
			.returning();
		return { noun };
	});

export const deleteNoun = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");
		await db
			.delete(nouns)
			.where(
				and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
			);
		return { success: true };
	});
