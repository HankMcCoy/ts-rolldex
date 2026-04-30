/**
 * Tailwind class chain shared by the Tiptap Callout node's `renderHTML` and
 * the read-side `<Callout>` component. Single source of truth so the editor
 * and renderer never visually drift.
 */
const BASE = [
	"callout",
	"my-3 rounded-md border border-[var(--line)] bg-[var(--surface)]",
	"px-4 py-3",
	"[&>:first-child]:mt-0 [&>:last-child]:mb-0",
];

const STAT_BLOCK = [
	"overflow-hidden border-2 border-[var(--sea-ink)] bg-white",
	"[&>h2:first-child]:-mx-4 [&>h2:first-child]:-mt-3",
	"[&>h2:first-child]:mb-3",
	"[&>h2:first-child]:bg-[var(--sea-ink)] [&>h2:first-child]:px-4 [&>h2:first-child]:py-2",
	"[&>h2:first-child]:text-white",
];

export function calloutClass(name?: string): string {
	const parts = [...BASE];
	if (name === "stat-block") parts.push(...STAT_BLOCK);
	return parts.join(" ");
}
