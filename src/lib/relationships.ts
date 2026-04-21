export type EntityType = "PERSON" | "PLACE" | "THING" | "FACTION" | "SESSION";

export interface CandidateEntity {
	id: string;
	name: string;
	entityType: EntityType;
}

export function computeRelatedEntities(
	currentId: string,
	current: { summary: string; notes: string; privateNotes: string },
	candidates: CandidateEntity[],
): CandidateEntity[] {
	const text = [current.summary, current.notes, current.privateNotes]
		.join(" ")
		.toLowerCase()
		.replace(/'\s*s\b/g, "");

	return candidates.filter((c) => {
		if (c.id === currentId) return false;
		const name = c.name.toLowerCase().replace(/'\s*s\b/g, "");
		const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`, "i");
		return pattern.test(text);
	});
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
