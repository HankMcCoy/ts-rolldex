/**
 * Pure tag-name handling, shared by the server fns that persist tags and the
 * client that renders and optimistically patches them. Both sides must agree
 * on what counts as "the same tag" or the optimistic patch will disagree with
 * the row the server writes back.
 */

import { z } from "zod";

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
export function normalizeTagNames(
	names: string[],
	limit = MAX_TAGS_PER_ENTITY,
): string[] {
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
	return out.slice(0, limit);
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

/**
 * Search-param schema for a tag filter, shared by the noun and session list
 * routes. The filter is carried as tag **names**, not ids: names survive a tag
 * being pruned and retyped (which mints a new id — see the lifecycle rule in
 * `docs/features/tags.md`), and a hand-written URL stays readable. A bare
 * `?tags=villain` is coerced to a one-element list so those URLs work too.
 */
export const tagFilterSchema = z
	.preprocess(
		(v) => (typeof v === "string" ? [v] : v),
		z.array(z.string()).max(MAX_TAGS_PER_ENTITY),
	)
	.optional();

/**
 * Adds `name` to the active filter, or removes it if an equal-keyed name is
 * already there. Returns a new array; order of the survivors is preserved.
 */
export function toggleTagName(
	active: readonly string[],
	name: string,
): string[] {
	const key = tagKey(name);
	const without = active.filter((n) => tagKey(n) !== key);
	return without.length === active.length ? [...active, name] : without;
}

/**
 * Narrows rows to those carrying **every** named tag (AND, not OR — stacking
 * chips should keep narrowing). Names are matched case-insensitively against
 * `tags`; a name no campaign tag matches can't be carried by anything, so the
 * result is empty rather than silently ignored.
 */
export function filterByTagNames<T extends { tagIds: string[] }>(
	rows: readonly T[],
	tags: readonly TagRef[],
	names: readonly string[],
): T[] {
	const wanted = [...new Set(names.map(tagKey))].filter(Boolean);
	if (wanted.length === 0) return [...rows];

	const idByKey = new Map(tags.map((t) => [tagKey(t.name), t.id]));
	const ids: string[] = [];
	for (const key of wanted) {
		const id = idByKey.get(key);
		if (id === undefined) return [];
		ids.push(id);
	}

	return rows.filter((row) => ids.every((id) => row.tagIds.includes(id)));
}

/** Selecting a grouped tag replaces the previous selection from that group. */
export function selectTagName(
	value: string[],
	name: string,
	tags: readonly (TagRef & { groupId: string | null })[],
): string[] {
	const groupByName = new Map(tags.map((t) => [tagKey(t.name), t.groupId]));
	const groupId = groupByName.get(tagKey(name));
	const remaining = value.filter(
		(n) =>
			tagKey(n) !== tagKey(name) &&
			(!groupId || groupByName.get(tagKey(n)) !== groupId),
	);
	return remaining.length >= MAX_TAGS_PER_ENTITY ? value : [...remaining, name];
}
