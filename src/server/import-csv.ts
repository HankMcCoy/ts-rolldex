import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaigns, gameSessions, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import {
	type Calendar,
	EARTH_GREGORIAN_CALENDAR,
	toAbsoluteDay,
	validateDateAgainstCalendar,
} from "@/lib/calendar";
import { nounTypeSchema } from "@/lib/noun-types";
import { err, ok } from "@/lib/result";

const MAX_ROWS = 2000;

const dateColumnSchema = {
	dateYear: z.number().int().nullable(),
	dateMonth: z.number().int().nullable(),
	dateDay: z.number().int().nullable(),
	endDateYear: z.number().int().nullable(),
	endDateMonth: z.number().int().nullable(),
	endDateDay: z.number().int().nullable(),
} as const;

const nounRowSchema = z.object({
	name: z.string().min(1).max(200),
	nounType: nounTypeSchema,
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000).default(""),
	privateNotes: z.string().max(50_000).default(""),
	isSecret: z.boolean().default(false),
	...dateColumnSchema,
});

const sessionRowSchema = z.object({
	name: z.string().min(1).max(200),
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000).default(""),
	privateNotes: z.string().max(50_000).default(""),
	isSecret: z.boolean().default(false),
	...dateColumnSchema,
});

type RowDates = z.infer<z.ZodObject<typeof dateColumnSchema>>;

/**
 * Defense-in-depth date validation against the campaign's calendar. The
 * client-side preview already runs the same checks via `parseDateCells`, but
 * the server can't trust client input for inserts that bypass the UI. Checks
 * mirror `applyDateRefinements` + `validateDateAgainstCalendar` + the same
 * end-≥-start guard used by `resolveDateColumns`.
 */
function validateRowDates(
	rowNumber: number,
	row: RowDates,
	calendar: Calendar,
): { ok: true } | { ok: false; error: string } {
	const startCount =
		(row.dateYear !== null ? 1 : 0) +
		(row.dateMonth !== null ? 1 : 0) +
		(row.dateDay !== null ? 1 : 0);
	const endCount =
		(row.endDateYear !== null ? 1 : 0) +
		(row.endDateMonth !== null ? 1 : 0) +
		(row.endDateDay !== null ? 1 : 0);

	if (startCount !== 0 && startCount !== 3) {
		return {
			ok: false,
			error: `Row ${rowNumber}: dateYear/dateMonth/dateDay must all be set together`,
		};
	}
	if (endCount !== 0 && endCount !== 3) {
		return {
			ok: false,
			error: `Row ${rowNumber}: endDateYear/endDateMonth/endDateDay must all be set together`,
		};
	}
	if (endCount === 3 && startCount === 0) {
		return {
			ok: false,
			error: `Row ${rowNumber}: an end date requires a start date`,
		};
	}

	if (startCount === 3) {
		const start = {
			year: row.dateYear as number,
			monthIndex: row.dateMonth as number,
			day: row.dateDay as number,
		};
		const v = validateDateAgainstCalendar(start, calendar);
		if (!v.ok)
			return { ok: false, error: `Row ${rowNumber} start date: ${v.error}` };
		if (endCount === 3) {
			const end = {
				year: row.endDateYear as number,
				monthIndex: row.endDateMonth as number,
				day: row.endDateDay as number,
			};
			const ev = validateDateAgainstCalendar(end, calendar);
			if (!ev.ok)
				return { ok: false, error: `Row ${rowNumber} end date: ${ev.error}` };
			if (toAbsoluteDay(end, calendar) < toAbsoluteDay(start, calendar)) {
				return {
					ok: false,
					error: `Row ${rowNumber}: end date is before start date`,
				};
			}
		}
	}

	return { ok: true };
}

async function loadCalendar(campaignId: string): Promise<Calendar> {
	const row = await db.query.campaigns.findFirst({
		where: eq(campaigns.id, campaignId),
		columns: { calendar: true },
	});
	return row?.calendar ?? EARTH_GREGORIAN_CALENDAR;
}

/**
 * Bulk-insert nouns from a CSV the client has already parsed and validated.
 * Returns counts so the UI can render a "n imported, m skipped as duplicates"
 * summary. The (campaignId, name) unique index handles any duplicates the
 * client preview missed; ON CONFLICT DO NOTHING means partial overlap with
 * existing data still imports the rest of the file.
 */
export const importNouns = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			rows: z.array(nounRowSchema).max(MAX_ROWS),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		if (data.rows.length === 0) return ok({ inserted: 0, skipped: 0 });

		const calendar = await loadCalendar(data.campaignId);
		for (let i = 0; i < data.rows.length; i++) {
			const v = validateRowDates(i + 2, data.rows[i], calendar);
			if (!v.ok) return err(v.error);
		}

		const inserted = await db
			.insert(nouns)
			.values(
				data.rows.map((r) => ({
					campaignId: data.campaignId,
					name: r.name,
					nounType: r.nounType,
					summary: r.summary,
					notes: r.notes,
					privateNotes: r.privateNotes,
					isSecret: r.isSecret,
					dateYear: r.dateYear,
					dateMonth: r.dateMonth,
					dateDay: r.dateDay,
					endDateYear: r.endDateYear,
					endDateMonth: r.endDateMonth,
					endDateDay: r.endDateDay,
				})),
			)
			.onConflictDoNothing({ target: [nouns.campaignId, nouns.name] })
			.returning({ id: nouns.id });

		return ok({
			inserted: inserted.length,
			skipped: data.rows.length - inserted.length,
		});
	});

export const importSessions = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			rows: z.array(sessionRowSchema).max(MAX_ROWS),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		if (data.rows.length === 0) return ok({ inserted: 0, skipped: 0 });

		const calendar = await loadCalendar(data.campaignId);
		for (let i = 0; i < data.rows.length; i++) {
			const v = validateRowDates(i + 2, data.rows[i], calendar);
			if (!v.ok) return err(v.error);
		}

		const inserted = await db
			.insert(gameSessions)
			.values(
				data.rows.map((r) => ({
					campaignId: data.campaignId,
					name: r.name,
					summary: r.summary,
					notes: r.notes,
					privateNotes: r.privateNotes,
					isSecret: r.isSecret,
					dateYear: r.dateYear,
					dateMonth: r.dateMonth,
					dateDay: r.dateDay,
					endDateYear: r.endDateYear,
					endDateMonth: r.endDateMonth,
					endDateDay: r.endDateDay,
				})),
			)
			.onConflictDoNothing({
				target: [gameSessions.campaignId, gameSessions.name],
			})
			.returning({ id: gameSessions.id });

		return ok({
			inserted: inserted.length,
			skipped: data.rows.length - inserted.length,
		});
	});
