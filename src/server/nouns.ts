import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { applyDateRefinements, dateFields } from "@/lib/date-schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { nounTypeSchema } from "@/lib/noun-types";
import { computeRelatedEntities } from "@/lib/relationships";
import { err, ok } from "@/lib/result";
import { deleteObject } from "@/lib/storage";
import { resolveDateColumns } from "@/server/date-resolver";
import {
	imageUrlFor,
	performImageRemove,
	performImageUpload,
} from "@/server/image-uploads";
import {
	loadCampaignCandidates,
	loadMapPinLocations,
	visibilityFilter,
} from "@/server/query-helpers";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

		const rows = await db.query.nouns.findMany({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				data.nounType ? eq(nouns.nounType, data.nounType) : undefined,
				visibilityFilter(nouns.isSecret, accessLevel),
			),
			orderBy: (n, { asc }) => asc(n.name),
		});

		return rows.map((n) => ({ ...n, imageUrl: imageUrlFor(n.imageKey) }));
	});

export const getNoun = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		const noun = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.id, data.nounId),
				eq(nouns.campaignId, data.campaignId),
			),
		});

		if (!noun) throw notFound();
		if (accessLevel === "READ_ONLY" && noun.isSecret) throw notFound();

		const result = { ...noun };
		if (accessLevel === "READ_ONLY") result.privateNotes = "";

		const candidates = await loadCampaignCandidates(
			data.campaignId,
			accessLevel,
		);
		const related = computeRelatedEntities(
			noun.id,
			noun.name,
			result,
			candidates,
		);

		const imageUrl = imageUrlFor(noun.imageKey);

		const mapPinLocations = await loadMapPinLocations(
			data.campaignId,
			accessLevel,
			{ nounId: noun.id },
		);

		return {
			noun: { ...result, imageUrl },
			accessLevel,
			related,
			mapPinLocations,
		};
	});

export const createNoun = createServerFn({ method: "POST" })
	.inputValidator(
		applyDateRefinements(
			z.object({
				campaignId: z.string(),
				name: z.string().min(1).max(200),
				nounType: nounTypeSchema,
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				eq(nouns.name, data.name),
			),
		});
		if (existing) {
			return err("A noun with this name already exists in this campaign.");
		}

		try {
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
					...dateResult.cols,
				})
				.returning();
			return ok(noun);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A noun with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const updateNoun = createServerFn({ method: "POST" })
	.inputValidator(
		applyDateRefinements(
			z.object({
				campaignId: z.string(),
				nounId: z.string(),
				name: z.string().min(1).max(200),
				nounType: nounTypeSchema,
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.campaignId, data.campaignId),
				eq(nouns.name, data.name),
				ne(nouns.id, data.nounId),
			),
		});
		if (existing) {
			return err("A noun with this name already exists in this campaign.");
		}

		try {
			const [noun] = await db
				.update(nouns)
				.set({
					name: data.name,
					nounType: data.nounType,
					summary: data.summary,
					notes: data.notes,
					privateNotes: data.privateNotes,
					isSecret: data.isSecret,
					...dateResult.cols,
					updatedAt: new Date(),
				})
				.where(
					and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
				)
				.returning();
			return ok(noun);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A noun with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const deleteNoun = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.id, data.nounId),
				eq(nouns.campaignId, data.campaignId),
			),
			columns: { imageKey: true },
		});

		await db
			.delete(nouns)
			.where(
				and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
			);

		if (existing?.imageKey) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete noun image from storage:", e);
			}
		}

		return { success: true };
	});

export const uploadNounImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		if (!(data instanceof FormData)) {
			throw new Error("Expected FormData");
		}
		const campaignId = data.get("campaignId");
		const nounId = data.get("nounId");
		const file = data.get("file");
		if (typeof campaignId !== "string" || !campaignId) {
			throw new Error("Missing campaignId");
		}
		if (typeof nounId !== "string" || !nounId) {
			throw new Error("Missing nounId");
		}
		if (!(file instanceof File)) {
			throw new Error("Missing file");
		}
		return { campaignId, nounId, file };
	})
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const where = and(
			eq(nouns.id, data.nounId),
			eq(nouns.campaignId, data.campaignId),
		);

		return performImageUpload({
			file: data.file,
			maxBytes: MAX_IMAGE_BYTES,
			keyPrefix: `nouns/${data.nounId}`,
			notFoundMessage: "Entity not found.",
			loadExistingKey: () =>
				db.query.nouns.findFirst({ where, columns: { imageKey: true } }),
			applyKey: async (key) => {
				await db
					.update(nouns)
					.set({ imageKey: key, updatedAt: new Date() })
					.where(where);
			},
		});
	});

export const removeNounImage = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), nounId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const where = and(
			eq(nouns.id, data.nounId),
			eq(nouns.campaignId, data.campaignId),
		);

		return performImageRemove({
			notFoundMessage: "Entity not found.",
			loadExistingKey: () =>
				db.query.nouns.findFirst({ where, columns: { imageKey: true } }),
			applyKey: async (key) => {
				await db
					.update(nouns)
					.set({ imageKey: key, updatedAt: new Date() })
					.where(where);
			},
		});
	});
