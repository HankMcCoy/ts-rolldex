import { and, eq, isNotNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db/index";
import {
	campaigns,
	gameSessions,
	mapPins,
	maps,
	nouns,
} from "@/db/schema/index";
import type { AccessLevel } from "@/lib/access";
import {
	type Calendar,
	EARTH_GREGORIAN_CALENDAR,
	formatDateRange,
	toAbsoluteDay,
} from "@/lib/calendar";
import type { NounType } from "@/lib/noun-types";
import type { CandidateEntity } from "@/lib/relationships";
import { publicUrlFor } from "@/lib/storage";

export interface MapPinLocation {
	map: { id: string; name: string; imageUrl: string | null };
	pins: { id: string; x: number; y: number; label: string | null }[];
}

/**
 * Loads every map (within the campaign and visible to the caller) that has at
 * least one pin pointing at the given noun or session, grouped per map.
 */
export async function loadMapPinLocations(
	campaignId: string,
	accessLevel: AccessLevel,
	target: { nounId: string } | { sessionId: string },
): Promise<MapPinLocation[]> {
	const filter =
		"nounId" in target
			? eq(mapPins.nounId, target.nounId)
			: eq(mapPins.sessionId, target.sessionId);

	const rows = await db
		.select({
			pinId: mapPins.id,
			pinX: mapPins.x,
			pinY: mapPins.y,
			pinLabel: mapPins.label,
			mapId: maps.id,
			mapName: maps.name,
			mapImageKey: maps.imageKey,
			mapIsSecret: maps.isSecret,
		})
		.from(mapPins)
		.innerJoin(maps, eq(mapPins.mapId, maps.id))
		.where(and(eq(maps.campaignId, campaignId), filter))
		.orderBy(maps.name);

	const visible = rows.filter(
		(r) => accessLevel !== "READ_ONLY" || !r.mapIsSecret,
	);

	const grouped = new Map<string, MapPinLocation>();
	for (const r of visible) {
		const pin = { id: r.pinId, x: r.pinX, y: r.pinY, label: r.pinLabel };
		const existing = grouped.get(r.mapId);
		if (existing) {
			existing.pins.push(pin);
		} else {
			grouped.set(r.mapId, {
				map: {
					id: r.mapId,
					name: r.mapName,
					imageUrl: r.mapImageKey ? publicUrlFor(r.mapImageKey) : null,
				},
				pins: [pin],
			});
		}
	}
	return Array.from(grouped.values());
}

/**
 * Returns eq(col, false) for READ_ONLY users so secret entities are hidden,
 * or undefined (no filter) for ADMIN users.
 */
export function visibilityFilter(col: AnyPgColumn, accessLevel: AccessLevel) {
	return accessLevel === "READ_ONLY" ? eq(col, false) : undefined;
}

/**
 * Fetches all visible nouns and sessions for a campaign and shapes them into
 * CandidateEntity objects for relationship computation. The text field includes
 * privateNotes only when the caller has ADMIN access.
 */
export async function loadCampaignCandidates(
	campaignId: string,
	accessLevel: AccessLevel,
): Promise<CandidateEntity[]> {
	const [allNouns, allSessions] = await Promise.all([
		db.query.nouns.findMany({
			where: and(
				eq(nouns.campaignId, campaignId),
				visibilityFilter(nouns.isSecret, accessLevel),
			),
			columns: {
				id: true,
				name: true,
				nounType: true,
				imageKey: true,
				summary: true,
				notes: true,
				privateNotes: true,
			},
		}),
		db.query.gameSessions.findMany({
			where: and(
				eq(gameSessions.campaignId, campaignId),
				visibilityFilter(gameSessions.isSecret, accessLevel),
			),
			columns: {
				id: true,
				name: true,
				summary: true,
				notes: true,
				privateNotes: true,
			},
		}),
	]);

	const includePrivate = accessLevel !== "READ_ONLY";
	return [
		...allNouns.map((n) => ({
			id: n.id,
			name: n.name,
			entityType: n.nounType as CandidateEntity["entityType"],
			imageUrl: n.imageKey ? publicUrlFor(n.imageKey) : null,
			summary: n.summary,
			text: includePrivate
				? `${n.summary} ${n.notes} ${n.privateNotes}`
				: `${n.summary} ${n.notes}`,
		})),
		...allSessions.map((s) => ({
			id: s.id,
			name: s.name,
			entityType: "SESSION" as const,
			imageUrl: null,
			summary: s.summary,
			text: includePrivate
				? `${s.summary} ${s.notes} ${s.privateNotes}`
				: `${s.summary} ${s.notes}`,
		})),
	];
}

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

/**
 * Loads dated nouns and sessions for a campaign and merges them into a single
 * timeline ordered by an absolute-day key computed from the campaign's calendar.
 * Pass a `limit` to slice the result for previews.
 */
export async function loadTimelineEntries(
	campaignId: string,
	accessLevel: AccessLevel,
	limit?: number,
): Promise<TimelineEntry[]> {
	const [campaignRow, eventNouns, datedSessions] = await Promise.all([
		db.query.campaigns.findFirst({
			where: eq(campaigns.id, campaignId),
			columns: { calendar: true },
		}),
		db.query.nouns.findMany({
			where: and(
				eq(nouns.campaignId, campaignId),
				isNotNull(nouns.dateYear),
				visibilityFilter(nouns.isSecret, accessLevel),
			),
			columns: {
				id: true,
				name: true,
				nounType: true,
				summary: true,
				isSecret: true,
				imageKey: true,
				dateYear: true,
				dateMonth: true,
				dateDay: true,
				endDateYear: true,
				endDateMonth: true,
				endDateDay: true,
			},
		}),
		db.query.gameSessions.findMany({
			where: and(
				eq(gameSessions.campaignId, campaignId),
				isNotNull(gameSessions.dateYear),
				visibilityFilter(gameSessions.isSecret, accessLevel),
			),
			columns: {
				id: true,
				name: true,
				summary: true,
				isSecret: true,
				dateYear: true,
				dateMonth: true,
				dateDay: true,
				endDateYear: true,
				endDateMonth: true,
				endDateDay: true,
			},
		}),
	]);

	const calendar: Calendar = campaignRow?.calendar ?? EARTH_GREGORIAN_CALENDAR;

	function endDate(row: {
		endDateYear: number | null;
		endDateMonth: number | null;
		endDateDay: number | null;
	}) {
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

	const entries: TimelineEntry[] = [
		...eventNouns.map((n) => {
			const date = {
				year: n.dateYear as number,
				monthIndex: n.dateMonth as number,
				day: n.dateDay as number,
			};
			return {
				kind: "noun" as const,
				id: n.id,
				name: n.name,
				summary: n.summary,
				date,
				dateText: formatDateRange(date, endDate(n), calendar),
				isSecret: n.isSecret,
				nounType: n.nounType as NounType,
				imageUrl: n.imageKey ? publicUrlFor(n.imageKey) : null,
			};
		}),
		...datedSessions.map((s) => {
			const date = {
				year: s.dateYear as number,
				monthIndex: s.dateMonth as number,
				day: s.dateDay as number,
			};
			return {
				kind: "session" as const,
				id: s.id,
				name: s.name,
				summary: s.summary,
				date,
				dateText: formatDateRange(date, endDate(s), calendar),
				isSecret: s.isSecret,
				nounType: null,
				imageUrl: null,
			};
		}),
	];

	entries.sort((a, b) => {
		const da = toAbsoluteDay(a.date, calendar);
		const dbn = toAbsoluteDay(b.date, calendar);
		if (da !== dbn) return da - dbn;
		return a.name.localeCompare(b.name);
	});

	return limit ? entries.slice(0, limit) : entries;
}
