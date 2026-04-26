import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { isUniqueViolation } from "@/lib/db-errors";
import { nounTypeSchema } from "@/lib/noun-types";
import { computeRelatedEntities } from "@/lib/relationships";
import { err, ok } from "@/lib/result";
import { deleteObject, publicUrlFor, uploadObject } from "@/lib/storage";
import {
	loadCampaignCandidates,
	loadMapPinLocations,
	visibilityFilter,
} from "@/server/query-helpers";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extensionFor(contentType: string): string {
	if (contentType === "image/jpeg") return "jpg";
	if (contentType === "image/png") return "png";
	if (contentType === "image/webp") return "webp";
	return "bin";
}

function imageUrlFor(imageKey: string | null): string | null {
	return imageKey ? publicUrlFor(imageKey) : null;
}

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
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(200),
			nounType: nounTypeSchema,
			summary: z.string().max(5_000),
			notes: z.string().max(50_000),
			privateNotes: z.string().max(50_000),
			isSecret: z.boolean(),
			dateLabel: z.string().max(200).optional(),
			dateSort: z.string().max(200).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

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
					dateLabel: data.dateLabel?.trim() || null,
					dateSort: data.dateSort?.trim() || null,
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
		z.object({
			campaignId: z.string(),
			nounId: z.string(),
			name: z.string().min(1).max(200),
			nounType: nounTypeSchema,
			summary: z.string().max(5_000),
			notes: z.string().max(50_000),
			privateNotes: z.string().max(50_000),
			isSecret: z.boolean(),
			dateLabel: z.string().max(200).optional(),
			dateSort: z.string().max(200).optional(),
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
					dateLabel: data.dateLabel?.trim() || null,
					dateSort: data.dateSort?.trim() || null,
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

		if (!ALLOWED_IMAGE_TYPES.has(data.file.type)) {
			return err("Image must be a JPEG, PNG, or WebP file.");
		}
		if (data.file.size > MAX_IMAGE_BYTES) {
			return err("Image must be 5 MB or smaller.");
		}

		const existing = await db.query.nouns.findFirst({
			where: and(
				eq(nouns.id, data.nounId),
				eq(nouns.campaignId, data.campaignId),
			),
			columns: { imageKey: true },
		});
		if (!existing) return err("Entity not found.");

		const ext = extensionFor(data.file.type);
		const key = `nouns/${data.nounId}/${crypto.randomUUID()}.${ext}`;
		const bytes = new Uint8Array(await data.file.arrayBuffer());

		await uploadObject(key, bytes, data.file.type);

		await db
			.update(nouns)
			.set({ imageKey: key, updatedAt: new Date() })
			.where(
				and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
			);

		if (existing.imageKey && existing.imageKey !== key) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete prior noun image:", e);
			}
		}

		return ok({ imageKey: key, imageUrl: publicUrlFor(key) });
	});

export const removeNounImage = createServerFn({ method: "POST" })
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
		if (!existing) return err("Entity not found.");

		await db
			.update(nouns)
			.set({ imageKey: null, updatedAt: new Date() })
			.where(
				and(eq(nouns.id, data.nounId), eq(nouns.campaignId, data.campaignId)),
			);

		if (existing.imageKey) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete noun image:", e);
			}
		}

		return ok({ success: true });
	});
