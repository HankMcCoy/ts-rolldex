import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

interface TagListProps {
	tags: { id: string; name: string }[];
	className?: string;
	/**
	 * When set, each chip links to that collection's list filtered by the tag.
	 * Omit it inside a row that is itself a link — nesting anchors is invalid
	 * HTML, so the list views render inert chips and put the toggles in
	 * `TagFilterBar` instead.
	 */
	filterLink?: { campaignId: string; collection: "nouns" | "sessions" };
}

/** Read-side rendering of an entity's tags. */
export function TagList({ tags, className, filterLink }: TagListProps) {
	if (tags.length === 0) return null;
	return (
		<div className={className}>
			<ul className="flex flex-wrap gap-1.5">
				{tags.map((tag) => (
					<li key={tag.id}>
						{filterLink === undefined ? (
							<Badge variant="secondary">{tag.name}</Badge>
						) : filterLink.collection === "nouns" ? (
							<Link
								to="/campaigns/$campaignId/nouns"
								params={{ campaignId: filterLink.campaignId }}
								search={{ tags: [tag.name] }}
								className="no-underline"
							>
								<Badge variant="secondary" className="hover:bg-accent">
									{tag.name}
								</Badge>
							</Link>
						) : (
							<Link
								to="/campaigns/$campaignId/sessions"
								params={{ campaignId: filterLink.campaignId }}
								search={{ tags: [tag.name] }}
								className="no-underline"
							>
								<Badge variant="secondary" className="hover:bg-accent">
									{tag.name}
								</Badge>
							</Link>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
