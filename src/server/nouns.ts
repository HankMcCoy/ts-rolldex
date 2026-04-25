import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { nounTypeSchema } from "@/lib/noun-types";
import { computeRelatedEntities } from "@/lib/relationships";
import { loadCampaignCandidates, visibilityFilter } from "@/server/query-helpers";

export const getNouns = createServerFn()
	.inputValidator(
		z.object({
			campaignId: z.string(),
			nounType: nounTypeSchema.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		return db.query.nouns.findMany({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				data.nounType ? eq(nouns.nounType, data.nounType) : undefined,
				visibilityFilter(nouns.isSecret, accessLevel),
			),
			orderBy: (n, { asc }) => asc(n.name),
		});
	});

export const getNoun = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		const noun = await db.query.nouns.findFirst({
			where: and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
		});

		if (!noun) throw notFound();
		if (accessLevel === "READ_ONLY" && noun.isSecret) throw notFound();

		const result = { ...noun };
		if (accessLevel === "READ_ONLY") result.privateNotes = "";

		const candidates = await loadCampaignCandidates(data.campaignId, accessLevel);
		const related = computeRelatedEntities(noun.id, noun.name, result, candidates);

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
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.nouns.findFirst({
			where: and(eq(nouns.campaignId, data.campaignId), eq(nouns.name, data.name)),
		});
		if (existing) {
			return { error: "A noun with this name already exists in this campaign." };
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
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				eq(nouns.name, data.name),
				ne(nouns.id, data.nounId),
			),
		});
		if (existing) {
			return { error: "A noun with this name already exists in this campaign." };
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
			.where(and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)))
			.returning();
		return { noun };
	});

export const deleteNoun = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db
			.delete(nouns)
			.where(and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)));
		return { success: true };
	});
