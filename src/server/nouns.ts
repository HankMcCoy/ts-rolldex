import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaigns, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import {
	type Calendar,
	EARTH_GREGORIAN_CALENDAR,
	toAbsoluteDay,
	validateDateAgainstCalendar,
} from "@/lib/calendar";
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

const dateInputSchema = z
	.object({
		dateYear: z.number().int().optional(),
		dateMonth: z.number().int().optional(),
		dateDay: z.number().int().optional(),
		endDateYear: z.number().int().optional(),
		endDateMonth: z.number().int().optional(),
		endDateDay: z.number().int().optional(),
	})
	.refine(
		(d) => {
			const present = [d.dateYear, d.dateMonth, d.dateDay].filter(
				(v) => v !== undefined,
			).length;
			return present === 0 || present === 3;
		},
		{ message: "Year, month, and day must be set together" },
	)
	.refine(
		(d) => {
			const present = [d.endDateYear, d.endDateMonth, d.endDateDay].filter(
				(v) => v !== undefined,
			).length;
			return present === 0 || present === 3;
		},
		{ message: "End year, month, and day must be set together" },
	)
	.refine(
		(d) => {
			const hasEnd =
				d.endDateYear !== undefined ||
				d.endDateMonth !== undefined ||
				d.endDateDay !== undefined;
			if (!hasEnd) return true;
			return (
				d.dateYear !== undefined &&
				d.dateMonth !== undefined &&
				d.dateDay !== undefined
			);
		},
		{ message: "End date requires a start date" },
	);

type DateInput = z.infer<typeof dateInputSchema>;

interface ResolvedDateColumns {
	dateYear: number | null;
	dateMonth: number | null;
	dateDay: number | null;
	endDateYear: number | null;
	endDateMonth: number | null;
	endDateDay: number | null;
}

async function resolveDateColumns(
	campaignId: string,
	input: DateInput,
): Promise<
	{ ok: true; cols: ResolvedDateColumns } | { ok: false; error: string }
> {
	const empty: ResolvedDateColumns = {
		dateYear: null,
		dateMonth: null,
		dateDay: null,
		endDateYear: null,
		endDateMonth: null,
		endDateDay: null,
	};
	if (
		input.dateYear === undefined ||
		input.dateMonth === undefined ||
		input.dateDay === undefined
	) {
		return { ok: true, cols: empty };
	}
	const row = await db.query.campaigns.findFirst({
		where: eq(campaigns.id, campaignId),
		columns: { calendar: true },
	});
	const calendar: Calendar = row?.calendar ?? EARTH_GREGORIAN_CALENDAR;
	const start = {
		year: input.dateYear,
		monthIndex: input.dateMonth,
		day: input.dateDay,
	};
	const v = validateDateAgainstCalendar(start, calendar);
	if (!v.ok) return { ok: false, error: v.error };

	const cols: ResolvedDateColumns = {
		...empty,
		dateYear: input.dateYear,
		dateMonth: input.dateMonth,
		dateDay: input.dateDay,
	};

	if (
		input.endDateYear !== undefined &&
		input.endDateMonth !== undefined &&
		input.endDateDay !== undefined
	) {
		const end = {
			year: input.endDateYear,
			monthIndex: input.endDateMonth,
			day: input.endDateDay,
		};
		const ev = validateDateAgainstCalendar(end, calendar);
		if (!ev.ok) return { ok: false, error: `End date: ${ev.error}` };
		if (toAbsoluteDay(end, calendar) < toAbsoluteDay(start, calendar)) {
			return {
				ok: false,
				error: "End date must be on or after the start date",
			};
		}
		cols.endDateYear = input.endDateYear;
		cols.endDateMonth = input.endDateMonth;
		cols.endDateDay = input.endDateDay;
	}

	return { ok: true, cols };
}

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
		z
			.object({
				campaignId: z.string(),
				name: z.string().min(1).max(200),
				nounType: nounTypeSchema,
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
			})
			.and(dateInputSchema),
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
		z
			.object({
				campaignId: z.string(),
				nounId: z.string(),
				name: z.string().min(1).max(200),
				nounType: nounTypeSchema,
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
			})
			.and(dateInputSchema),
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
