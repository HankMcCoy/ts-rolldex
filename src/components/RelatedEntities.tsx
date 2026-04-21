import { Link } from "@tanstack/react-router";
import type { CandidateEntity, EntityType } from "@/lib/relationships";

interface Props {
	campaignId: string;
	related: CandidateEntity[];
}

const TYPE_LABELS: Record<EntityType, string> = {
	PERSON: "People",
	PLACE: "Places",
	THING: "Things",
	FACTION: "Factions",
	SESSION: "Sessions",
};

const TYPE_ORDER: EntityType[] = [
	"PERSON",
	"PLACE",
	"THING",
	"FACTION",
	"SESSION",
];

export function RelatedEntities({ campaignId, related }: Props) {
	if (related.length === 0) return null;

	const byType = TYPE_ORDER.map((type) => ({
		type,
		items: related.filter((e) => e.entityType === type),
	})).filter((g) => g.items.length > 0);

	return (
		<aside>
			<h2 className="island-kicker mb-3">Related</h2>
			<div className="space-y-4">
				{byType.map(({ type, items }) => (
					<div key={type}>
						<h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
							{TYPE_LABELS[type]}
						</h3>
						<ul className="space-y-1">
							{items.map((e) => (
								<li key={e.id}>
									{type === "SESSION" ? (
										<Link
											to="/campaigns/$campaignId/sessions/$sessionId"
											params={{ campaignId, sessionId: e.id }}
											className="text-sm hover:underline"
										>
											{e.name}
										</Link>
									) : (
										<Link
											to="/campaigns/$campaignId/nouns/$nounId"
											params={{ campaignId, nounId: e.id }}
											className="text-sm hover:underline"
										>
											{e.name}
										</Link>
									)}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</aside>
	);
}
