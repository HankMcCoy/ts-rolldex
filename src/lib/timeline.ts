import { type Calendar, formatDateRange, toAbsoluteDay } from "@/lib/calendar";
import type { NounType } from "@/lib/noun-types";

export interface TimelineEntry {
	kind: "noun" | "session";
	id: string;
	name: string;
	summary: string;
	date: { year: number; monthIndex: number; day: number };
	dateText: string;
	isSecret: boolean;
	nounType: NounType | null;
	imageUrl: string | null;
}

interface DatedRow {
	id: string;
	name: string;
	summary: string;
	isSecret: boolean;
	dateYear: number | null;
	dateMonth: number | null;
	dateDay: number | null;
	endDateYear: number | null;
	endDateMonth: number | null;
	endDateDay: number | null;
}

interface DatedNoun extends DatedRow {
	nounType: NounType;
	imageUrl: string | null;
}

function endDate(row: DatedRow) {
	if (
		row.endDateYear === null ||
		row.endDateMonth === null ||
		row.endDateDay === null
	) {
		return null;
	}
	return {
		year: row.endDateYear,
		monthIndex: row.endDateMonth,
		day: row.endDateDay,
	};
}

/**
 * Pure version of `loadTimelineEntries` — sorts dated nouns + sessions into a
 * single timeline ordered by absolute day. Operates on data already in the
 * client bundle, so it runs synchronously on every render with no roundtrip.
 */
export function buildTimeline(
	nouns: DatedNoun[],
	sessions: DatedRow[],
	calendar: Calendar,
	limit?: number,
): TimelineEntry[] {
	const entries: TimelineEntry[] = [];

	for (const n of nouns) {
		if (n.dateYear === null || n.dateMonth === null || n.dateDay === null) {
			continue;
		}
		const date = { year: n.dateYear, monthIndex: n.dateMonth, day: n.dateDay };
		entries.push({
			kind: "noun",
			id: n.id,
			name: n.name,
			summary: n.summary,
			date,
			dateText: formatDateRange(date, endDate(n), calendar),
			isSecret: n.isSecret,
			nounType: n.nounType,
			imageUrl: n.imageUrl,
		});
	}

	for (const s of sessions) {
		if (s.dateYear === null || s.dateMonth === null || s.dateDay === null) {
			continue;
		}
		const date = { year: s.dateYear, monthIndex: s.dateMonth, day: s.dateDay };
		entries.push({
			kind: "session",
			id: s.id,
			name: s.name,
			summary: s.summary,
			date,
			dateText: formatDateRange(date, endDate(s), calendar),
			isSecret: s.isSecret,
			nounType: null,
			imageUrl: null,
		});
	}

	entries.sort((a, b) => {
		const da = toAbsoluteDay(a.date, calendar);
		const dbn = toAbsoluteDay(b.date, calendar);
		if (da !== dbn) return da - dbn;
		return a.name.localeCompare(b.name);
	});

	return limit ? entries.slice(0, limit) : entries;
}
