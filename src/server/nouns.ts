import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { applyDateRefinements, dateFields } from "@/lib/date-schema";
import { nounTypeSchema } from "@/lib/noun-types";
import { err } from "@/lib/result";
import { deleteObject } from "@/lib/storage";
import { resolveDateColumns } from "@/server/date-resolver";
import { performImageRemove, performImageUpload } from "@/server/image-uploads";
import { applyEntityTags, pruneOrphanTags, tagRefsField } from "@/server/tags";
import { withUniqueName } from "@/server/unique-name";

const NOUN_NAME_CONFLICT =
	"A noun with this name already exists in this campaign.";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const createNoun = createServerFn({ method: "POST" })
	.inputValidator(
		applyDateRefinements(
			z.object({
				campaignId: z.string(),
				// Optional client-supplied id lets the optimistic UI render the new
				// row immediately and keeps the post-create navigate target stable.
				id: z.string().uuid().optional(),
				name: z.string().min(1).max(200),
				nounType: nounTypeSchema,
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
				tags: tagRefsField,
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		return withUniqueName(
			NOUN_NAME_CONFLICT,
			() =>
				db.query.nouns.findFirst({
					where: and(
						eq(nouns.campaignId, data.campaignId),
						eq(nouns.name, data.name),
					),
					columns: { id: true },
				}),
			async () => {
				const [noun] = await db
					.insert(nouns)
					.values({
						...(data.id ? { id: data.id } : {}),
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
				const tags = await applyEntityTags(
					data.campaignId,
					{ nounId: noun.id },
					data.tags,
				);
				return { ...noun, tags };
			},
		);
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
				tags: tagRefsField,
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		return withUniqueName(
			NOUN_NAME_CONFLICT,
			() =>
				db.query.nouns.findFirst({
					where: and(
						eq(nouns.campaignId, data.campaignId),
						eq(nouns.name, data.name),
						ne(nouns.id, data.nounId),
					),
					columns: { id: true },
				}),
			async () => {
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
						and(
							eq(nouns.id, data.nounId),
							eq(nouns.campaignId, data.campaignId),
						),
					)
					.returning();
				const tags = await applyEntityTags(
					data.campaignId,
					{ nounId: data.nounId },
					data.tags,
				);
				return { ...noun, tags };
			},
		);
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

		// entity_tags cascade with the noun, which can leave a tag with no carrier.
		await pruneOrphanTags(data.campaignId);

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
