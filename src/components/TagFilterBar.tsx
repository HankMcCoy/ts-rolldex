import { Button } from "@/components/ui/button";
import { tagKey } from "@/lib/tags";

interface TagFilterBarProps {
	/** Chips to offer, name-sorted — usually `useNounTagOptions` et al. */
	tags: { id: string; name: string }[];
	/** Active tag names, straight off the URL search param. */
	active: readonly string[];
	onToggle: (name: string) => void;
	onClear: () => void;
}

/**
 * Toggle chips above a list view. Selecting more than one narrows with AND, so
 * every extra chip shows fewer rows.
 *
 * These are buttons rather than links because they toggle rather than navigate;
 * the caller still writes the result to the URL, so the view stays linkable.
 * An active name with no chip in `tags` (its tag was pruned, or it only exists
 * on another noun type) is rendered anyway — otherwise it would filter the list
 * with no way to switch it off.
 */
export function TagFilterBar({
	tags,
	active,
	onToggle,
	onClear,
}: TagFilterBarProps) {
	const activeKeys = new Set(active.map(tagKey));
	const offered = new Set(tags.map((t) => tagKey(t.name)));
	const orphans = active.filter((name) => !offered.has(tagKey(name)));

	if (tags.length === 0 && orphans.length === 0) return null;

	return (
		<div className="mb-6 flex flex-wrap items-center gap-2">
			<span className="text-sm text-[var(--sea-ink-soft)]">Tags</span>
			{[...tags, ...orphans.map((name) => ({ id: name, name }))].map((tag) => {
				const isActive = activeKeys.has(tagKey(tag.name));
				return (
					<Button
						key={tag.id}
						type="button"
						size="sm"
						variant={isActive ? "default" : "outline"}
						aria-pressed={isActive}
						onClick={() => onToggle(tag.name)}
					>
						{tag.name}
					</Button>
				);
			})}
			{active.length > 0 && (
				<Button type="button" size="sm" variant="ghost" onClick={onClear}>
					Clear
				</Button>
			)}
		</div>
	);
}
