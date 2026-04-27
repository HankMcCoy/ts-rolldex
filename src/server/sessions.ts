import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaigns, gameSessions } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import {
	type Calendar,
	EARTH_GREGORIAN_CALENDAR,
	toAbsoluteDay,
	validateDateAgainstCalendar,
} from "@/lib/calendar";
import { isUniqueViolation } from "@/lib/db-errors";
import { computeRelatedEntities } from "@/lib/relationships";
import { err, ok } from "@/lib/result";
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

		const mapPinLocations = await loadMapPinLocations(
			data.campaignId,
			accessLevel,
			{ sessionId: session.id },
		);

		return { session: result, accessLevel, related, mapPinLocations };
	});

export const createSession = createServerFn({ method: "POST" })
	.inputValidator(
		z
			.object({
				campaignId: z.string(),
				name: z.string().min(1).max(200),
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

		const existing = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.campaignId, data.campaignId),
				eq(gameSessions.name, data.name),
			),
		});
		if (existing) {
			return err("A session with this name already exists in this campaign.");
		}

		try {
			const [session] = await db
				.insert(gameSessions)
				.values({
					campaignId: data.campaignId,
					name: data.name,
					summary: data.summary,
					notes: data.notes,
					privateNotes: data.privateNotes,
					isSecret: data.isSecret,
					...dateResult.cols,
				})
				.returning();
			return ok(session);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A session with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const updateSession = createServerFn({ method: "POST" })
	.inputValidator(
		z
			.object({
				campaignId: z.string(),
				sessionId: z.string(),
				name: z.string().min(1).max(200),
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

		const existing = await db.query.gameSessions.findFirst({
			where: and(
				eq(gameSessions.campaignId, data.campaignId),
				eq(gameSessions.name, data.name),
				ne(gameSessions.id, data.sessionId),
			),
		});
		if (existing) {
			return err("A session with this name already exists in this campaign.");
		}

		try {
			const [session] = await db
				.update(gameSessions)
				.set({
					name: data.name,
					summary: data.summary,
					notes: data.notes,
					privateNotes: data.privateNotes,
					isSecret: data.isSecret,
					...dateResult.cols,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(gameSessions.id, data.sessionId),
						eq(gameSessions.campaignId, data.campaignId),
					),
				)
				.returning();
			return ok(session);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A session with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const deleteSession = createServerFn({ method: "POST" })
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
