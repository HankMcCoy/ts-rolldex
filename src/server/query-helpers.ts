import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { gameSessions, nouns } from "@/db/schema/index";
import type { AccessLevel } from "@/lib/access";
import type { CandidateEntity } from "@/lib/relationships";

/**
 * Returns eq(col, false) for READ_ONLY users so secret entities are hidden,
 * or undefined (no filter) for ADMIN users.
 */
export function visibilityFilter(
	col: typeof nouns.isSecret | typeof gameSessions.isSecret,
	accessLevel: AccessLevel,
) {
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
			summary: n.summary,
			text: includePrivate
				? `${n.summary} ${n.notes} ${n.privateNotes}`
				: `${n.summary} ${n.notes}`,
		})),
		...allSessions.map((s) => ({
			id: s.id,
			name: s.name,
			entityType: "SESSION" as const,
			summary: s.summary,
			text: includePrivate
				? `${s.summary} ${s.notes} ${s.privateNotes}`
				: `${s.summary} ${s.notes}`,
		})),
	];
}
