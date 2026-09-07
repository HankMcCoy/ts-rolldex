/**
 * Pure tag-name handling, shared by the server fns that persist tags and the
 * client that renders and optimistically patches them. Both sides must agree
 * on what counts as "the same tag" or the optimistic patch will disagree with
 * the row the server writes back.
 */

export const TAG_MAX_LENGTH = 40;
export const MAX_TAGS_PER_ENTITY = 25;

export interface TagRef {
	id: string;
	name: string;
}

/** Trim and collapse internal whitespace so " red  dragon " === "red dragon". */
export function normalizeTagName(raw: string): string {
	return raw.trim().replace(/\s+/g, " ");
}

/**
 * Identity key for a tag name. Case-insensitive, matching the
 * `lower(name)` unique index on `tags` — typing "villain" when "Villain"
 * already exists reuses the existing tag rather than creating a near-duplicate.
 */
export function tagKey(name: string): string {
	return normalizeTagName(name).toLowerCase();
}

/**
 * Normalizes a submitted list: drops blanks, clips over-long names, and keeps
 * the first spelling of each key. Order is preserved so the user's chip order
 * survives a round-trip until the server re-sorts by name.
 */
export function normalizeTagNames(names: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of names) {
		const name = normalizeTagName(raw).slice(0, TAG_MAX_LENGTH);
		if (!name) continue;
		const key = tagKey(name);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(name);
	}
	return out.slice(0, MAX_TAGS_PER_ENTITY);
}

/**
 * Pairs each submitted name with an id: the existing campaign tag's id when
 * one matches case-insensitively, otherwise a fresh UUID. Running this on the
 * client before submitting is what lets the optimistic patch show the right
 * chips — the server resolves the same names to the same ids.
 */
export function resolveTagRefs(
	existing: readonly TagRef[],
	names: string[],
	newId: () => string = () => crypto.randomUUID(),
): TagRef[] {
	const byKey = new Map(existing.map((t) => [tagKey(t.name), t]));
	return normalizeTagNames(names).map((name) => {
		const match = byKey.get(tagKey(name));
		return match ? { id: match.id, name: match.name } : { id: newId(), name };
	});
}

export function sortTagsByName<T extends { name: string }>(tags: T[]): T[] {
	return [...tags].sort((a, b) => a.name.localeCompare(b.name));
}
