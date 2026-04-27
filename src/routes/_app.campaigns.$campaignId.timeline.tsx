import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { NOUN_TYPE_LABELS } from "@/lib/noun-types";
import { getTimeline } from "@/server/timeline";

export const Route = createFileRoute("/_app/campaigns/$campaignId/timeline")({
	loader: ({ params }) =>
		getTimeline({ data: { campaignId: params.campaignId } }),
	head: () => ({ meta: [{ title: "Timeline - Rolldex" }] }),
	component: TimelinePage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function TimelinePage() {
	const { campaign } = parentRoute.useLoaderData();
	const { entries } = Route.useLoaderData();

	return (
		<Page
			breadcrumbs={[
				{
					label: campaign.name,
					to: "/campaigns/$campaignId",
					params: { campaignId: campaign.id },
				},
			]}
			title="Timeline"
		>
			{entries.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">
					No timeline entries yet. Add an in-world date to a session, or create
					an Event entity, to see it here.
				</p>
			) : (
				<ul className="space-y-2">
					{entries.map((entry) => {
						const typeLabel =
							entry.kind === "session"
								? "Session"
								: NOUN_TYPE_LABELS[entry.nounType ?? "EVENT"];
						const dateText = entry.dateText;
						const link =
							entry.kind === "session" ? (
								<Link
									key={entry.kind + entry.id}
									to="/campaigns/$campaignId/sessions/$sessionId"
									params={{ campaignId: campaign.id, sessionId: entry.id }}
									className="island-shell flex items-center gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
								>
									<div className="hidden w-32 shrink-0 text-sm font-medium text-[var(--sea-ink-soft)] sm:block">
										{dateText}
									</div>
									<EntityAvatar
										entityType="SESSION"
										imageUrl={null}
										name={entry.name}
									/>
									<div className="min-w-0 flex-1">
										<div className="font-medium">{entry.name}</div>
										<div className="mt-0.5 text-xs text-[var(--sea-ink-soft)] sm:hidden">
											{dateText}
										</div>
										{entry.summary && (
											<p className="mt-0.5 line-clamp-1 text-sm text-[var(--sea-ink-soft)]">
												{entry.summary}
											</p>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{entry.isSecret && (
											<Badge variant="secondary">Secret</Badge>
										)}
										<Badge variant="outline">{typeLabel}</Badge>
									</div>
								</Link>
							) : (
								<Link
									key={entry.kind + entry.id}
									to="/campaigns/$campaignId/nouns/$nounId"
									params={{ campaignId: campaign.id, nounId: entry.id }}
									className="island-shell flex items-center gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
								>
									<div className="hidden w-32 shrink-0 text-sm font-medium text-[var(--sea-ink-soft)] sm:block">
										{dateText}
									</div>
									<EntityAvatar
										entityType={entry.nounType ?? "EVENT"}
										imageUrl={entry.imageUrl}
										name={entry.name}
									/>
									<div className="min-w-0 flex-1">
										<div className="font-medium">{entry.name}</div>
										<div className="mt-0.5 text-xs text-[var(--sea-ink-soft)] sm:hidden">
											{dateText}
										</div>
										{entry.summary && (
											<p className="mt-0.5 line-clamp-1 text-sm text-[var(--sea-ink-soft)]">
												{entry.summary}
											</p>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{entry.isSecret && (
											<Badge variant="secondary">Secret</Badge>
										)}
										<Badge variant="outline">{typeLabel}</Badge>
									</div>
								</Link>
							);
						return <li key={entry.kind + entry.id}>{link}</li>;
					})}
				</ul>
			)}
		</Page>
	);
}
