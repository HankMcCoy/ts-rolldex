import { z } from "zod";
import { normalizeTagName, TAG_MAX_LENGTH, tagKey } from "@/lib/tags";

/** Seed vocabulary only. Available types always come from the campaign bundle. */
export const DEFAULT_NOUN_TYPES = [
	"Person",
	"Place",
	"Thing",
	"Faction",
	"Event",
] as const;
export const nounTypeSchema = z
	.string()
	.transform(normalizeTagName)
	.pipe(z.string().min(1).max(TAG_MAX_LENGTH));
export type NounType = string;

/** Names are campaign-defined; legacy uppercase links still resolve by tagKey. */
export function nounTypeLabel(name: string): string {
	return DEFAULT_NOUN_TYPES.find((t) => tagKey(t) === tagKey(name)) ?? name;
}
