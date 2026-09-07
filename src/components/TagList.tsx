import { Badge } from "@/components/ui/badge";

/**
 * Read-side rendering of an entity's tags. Plain chips for now — filtered tag
 * views are `RDX-02`, at which point these become links.
 */
export function TagList({
	tags,
	className,
}: {
	tags: { id: string; name: string }[];
	className?: string;
}) {
	if (tags.length === 0) return null;
	return (
		<div className={className}>
			<ul className="flex flex-wrap gap-1.5">
				{tags.map((tag) => (
					<li key={tag.id}>
						<Badge variant="secondary">{tag.name}</Badge>
					</li>
				))}
			</ul>
		</div>
	);
}
