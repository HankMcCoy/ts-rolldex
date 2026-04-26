import { Link } from "@tanstack/react-router";
import { EntityAvatar } from "@/components/EntityAvatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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

function entityHref(
	campaignId: string,
	e: CandidateEntity,
): { to: string; params: Record<string, string> } {
	if (e.entityType === "SESSION") {
		return {
			to: "/campaigns/$campaignId/sessions/$sessionId",
			params: { campaignId, sessionId: e.id },
		};
	}
	return {
		to: "/campaigns/$campaignId/nouns/$nounId",
		params: { campaignId, nounId: e.id },
	};
}

export function RelatedEntities({ campaignId, related }: Props) {
	if (related.length === 0) return null;

	const byType = TYPE_ORDER.map((type) => ({
		type,
		items: related.filter((e) => e.entityType === type),
	})).filter((g) => g.items.length > 0);

	return (
		<TooltipProvider delayDuration={300}>
			<aside>
				<h2
					className="mb-4 text-xs font-bold tracking-[0.18em] text-[var(--sea-ink)]"
					style={{ textTransform: "uppercase" }}
				>
					Related
				</h2>
				<div className="space-y-5">
					{byType.map(({ type, items }) => (
						<div key={type}>
							<h3
								className="mb-2 text-[10px] font-semibold tracking-[0.15em] text-[var(--sea-ink-soft)]"
								style={{ textTransform: "uppercase" }}
							>
								{TYPE_LABELS[type]}
							</h3>
							<ul className="space-y-1.5">
								{items.map((e) => {
									const { to, params } = entityHref(campaignId, e);
									const link = (
										<Link
											to={to}
											params={params}
											className="flex items-center gap-2 text-sm"
										>
											<EntityAvatar
												entityType={e.entityType}
												imageUrl={e.imageUrl}
												name={e.name}
												className="size-6 rounded-md"
											/>
											{e.name}
										</Link>
									);

									if (!e.summary) return <li key={e.id}>{link}</li>;

									return (
										<li key={e.id}>
											<Tooltip>
												<TooltipTrigger asChild>{link}</TooltipTrigger>
												<TooltipContent
													side="left"
													className="max-w-56 flex-col items-start gap-1 p-3"
												>
													<p className="font-semibold">{e.name}</p>
													<p className="font-normal opacity-80">{e.summary}</p>
												</TooltipContent>
											</Tooltip>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</div>
			</aside>
		</TooltipProvider>
	);
}
