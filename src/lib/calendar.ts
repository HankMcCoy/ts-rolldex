import { z } from "zod";

export const monthSchema = z.object({
	name: z.string().min(1, "Month name is required").max(50),
	days: z.number().int().min(1).max(1000),
});

export const calendarSchema = z.object({
	months: z.array(monthSchema).min(1).max(100),
});

export type Calendar = z.infer<typeof calendarSchema>;
export type Month = z.infer<typeof monthSchema>;

export const EARTH_GREGORIAN_CALENDAR: Calendar = {
	months: [
		{ name: "January", days: 31 },
		{ name: "February", days: 28 },
		{ name: "March", days: 31 },
		{ name: "April", days: 30 },
		{ name: "May", days: 31 },
		{ name: "June", days: 30 },
		{ name: "July", days: 31 },
		{ name: "August", days: 31 },
		{ name: "September", days: 30 },
		{ name: "October", days: 31 },
		{ name: "November", days: 30 },
		{ name: "December", days: 31 },
	],
};

export interface CampaignDate {
	year: number;
	monthIndex: number;
	day: number;
}

export function daysPerYear(c: Calendar): number {
	let total = 0;
	for (const m of c.months) total += m.days;
	return total;
}

/**
 * Maps a structured date to a single integer suitable for ascending sort.
 * Years can be negative; the result is monotonic across the year boundary.
 */
export function toAbsoluteDay(d: CampaignDate, c: Calendar): number {
	let priorMonthDays = 0;
	for (let i = 0; i < d.monthIndex && i < c.months.length; i++) {
		priorMonthDays += c.months[i].days;
	}
	return d.year * daysPerYear(c) + priorMonthDays + (d.day - 1);
}

/** "1492 Hammer 15" — fallback to a synthetic name if the index is out of range. */
export function formatDate(d: CampaignDate, c: Calendar): string {
	const month = c.months[d.monthIndex];
	const monthName = month?.name ?? `Month ${d.monthIndex + 1}`;
	return `${d.year} ${monthName} ${d.day}`;
}

/**
 * Renders a start/end pair, collapsing the redundant parts when start and end
 * share a year and/or month. Returns just `formatDate(start)` when end is absent
 * or equal to start.
 */
export function formatDateRange(
	start: CampaignDate,
	end: CampaignDate | null,
	c: Calendar,
): string {
	if (!end) return formatDate(start, c);
	if (
		start.year === end.year &&
		start.monthIndex === end.monthIndex &&
		start.day === end.day
	) {
		return formatDate(start, c);
	}
	const startText = formatDate(start, c);
	if (start.year !== end.year) return `${startText} – ${formatDate(end, c)}`;
	const endMonth = c.months[end.monthIndex];
	const endMonthName = endMonth?.name ?? `Month ${end.monthIndex + 1}`;
	if (start.monthIndex !== end.monthIndex) {
		return `${startText} – ${endMonthName} ${end.day}`;
	}
	return `${startText}–${end.day}`;
}

export type DateValidation =
	| { ok: true }
	| { ok: false; field: "year" | "month" | "day"; error: string };

export function validateDateAgainstCalendar(
	d: CampaignDate,
	c: Calendar,
): DateValidation {
	if (!Number.isInteger(d.year)) {
		return { ok: false, field: "year", error: "Year must be a whole number" };
	}
	if (!Number.isInteger(d.monthIndex)) {
		return { ok: false, field: "month", error: "Month is required" };
	}
	if (d.monthIndex < 0 || d.monthIndex >= c.months.length) {
		return {
			ok: false,
			field: "month",
			error: `Month must be between 1 and ${c.months.length}`,
		};
	}
	if (!Number.isInteger(d.day)) {
		return { ok: false, field: "day", error: "Day is required" };
	}
	const max = c.months[d.monthIndex].days;
	if (d.day < 1 || d.day > max) {
		return {
			ok: false,
			field: "day",
			error: `Day must be between 1 and ${max}`,
		};
	}
	return { ok: true };
}
