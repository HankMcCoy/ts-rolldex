import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { campaigns } from "@/db/schema/index";
import {
	type Calendar,
	EARTH_GREGORIAN_CALENDAR,
	toAbsoluteDay,
	validateDateAgainstCalendar,
} from "@/lib/calendar";
import type { DateFieldsValue } from "@/lib/date-schema";

export interface ResolvedDateColumns {
	dateYear: number | null;
	dateMonth: number | null;
	dateDay: number | null;
	endDateYear: number | null;
	endDateMonth: number | null;
	endDateDay: number | null;
}

const EMPTY: ResolvedDateColumns = {
	dateYear: null,
	dateMonth: null,
	dateDay: null,
	endDateYear: null,
	endDateMonth: null,
	endDateDay: null,
};

/**
 * Validates a date input against the campaign's calendar and returns column
 * values ready to spread into an insert/update. Returns `{ ok: false }` with
 * a user-facing error if the start date or end date is out of range, or if
 * the end date is before the start date.
 *
 * Callers should have already passed the input through `applyDateRefinements`
 * so the all-or-none and end-requires-start invariants hold; this helper
 * focuses on the calendar-specific checks (day-within-month, end ≥ start).
 */
export async function resolveDateColumns(
	campaignId: string,
	input: DateFieldsValue,
): Promise<
	{ ok: true; cols: ResolvedDateColumns } | { ok: false; error: string }
> {
	if (
		input.dateYear === undefined ||
		input.dateMonth === undefined ||
		input.dateDay === undefined
	) {
		return { ok: true, cols: EMPTY };
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
		...EMPTY,
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
