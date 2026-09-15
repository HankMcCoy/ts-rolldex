import type { NounType } from "@/lib/noun-types";

export type EntityType = NounType | "SESSION";

export interface CandidateEntity {
	id: string;
	name: string;
	entityType: EntityType;
	imageUrl: string | null;
	summary?: string; // shown in hover preview
	text?: string; // summary + notes, used for reverse-direction lookup — stripped on return
	linkedEntityIds?: readonly string[]; // durable links, also stripped on return
}

export type RelatedEntity = Omit<CandidateEntity, "text" | "linkedEntityIds">;

export interface ExplicitRelationship {
	id: string;
	typeId: string;
	typeName: string;
	label: string;
	target: RelatedEntity;
}

export function computeRelatedEntities(
	currentId: string,
	currentName: string,
	current: { summary: string; notes: string; privateNotes: string },
	candidates: CandidateEntity[],
	explicitIds: ReadonlySet<string> = new Set(),
	currentLinkedIds: ReadonlySet<string> = new Set(),
): RelatedEntity[] {
	// Text of the current entity (forward direction)
	const currentText = [current.summary, current.notes, current.privateNotes]
		.join(" ")
		.toLowerCase()
		.replace(/'\s*s\b/g, "");

	// Pattern to match the current entity's name (reverse direction)
	const currentNameNorm = currentName.toLowerCase().replace(/'\s*s\b/g, "");
	const currentNamePattern = new RegExp(
		`\\b${escapeRegex(currentNameNorm)}\\b`,
		"i",
	);

	return candidates
		.filter((c) => {
			if (c.id === currentId) return false;
			if (explicitIds.has(c.id)) return false;

			const candidateName = c.name.toLowerCase().replace(/'\s*s\b/g, "");
			const candidatePattern = new RegExp(
				`\\b${escapeRegex(candidateName)}\\b`,
				"i",
			);

			// Forward: does the current entity name or link this candidate?
			if (currentLinkedIds.has(c.id) || candidatePattern.test(currentText))
				return true;

			// Reverse: does this candidate name or link the current entity?
			if (c.linkedEntityIds?.includes(currentId)) return true;
			if (c.text) {
				const candidateText = c.text.toLowerCase().replace(/'\s*s\b/g, "");
				if (currentNamePattern.test(candidateText)) return true;
			}

			return false;
		})
		.map(({ text: _text, linkedEntityIds: _linkedEntityIds, ...rest }) => rest);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
