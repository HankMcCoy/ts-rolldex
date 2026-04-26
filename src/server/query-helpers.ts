import { and, eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db/index";
import { gameSessions, mapPins, maps, nouns } from "@/db/schema/index";
import type { AccessLevel } from "@/lib/access";
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
