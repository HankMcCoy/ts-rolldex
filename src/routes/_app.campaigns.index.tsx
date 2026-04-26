import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { getCampaigns } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/")({
	loader: () => getCampaigns(),
	head: () => ({ meta: [{ title: "Campaigns - Rolldex" }] }),
	component: CampaignsPage,
});

function CampaignsPage() {
	const campaigns = Route.useLoaderData();

	return (
		<Page
			title="Campaigns"
			actions={
				<Button asChild size="sm">
					<Link to="/campaigns/new">+ New Campaign</Link>
				</Button>
			}
		>
			<ul className="grid gap-4 sm:grid-cols-2">
				{campaigns.map((c) => (
					<li key={c.id}>
						<Link
							to="/campaigns/$campaignId"
							params={{ campaignId: c.id }}
							className="campaign-card flex h-full flex-col p-5 no-underline"
						>
							<h2 className="campaign-card-title mb-2 text-base">{c.name}</h2>
							{c.summary && (
								<p className="campaign-card-body mb-4 line-clamp-2 text-sm">
									{c.summary}
								</p>
							)}
							<div
								className="flex gap-6 pt-3"
								style={{ borderTop: "1px solid var(--card-dark-line)" }}
							>
								<div>
									<div className="campaign-card-stat-num">
										{c.gameSessions.length}
									</div>
									<div className="campaign-card-stat-label">Sessions</div>
								</div>
								<div>
									<div className="campaign-card-stat-num">{c.nouns.length}</div>
									<div className="campaign-card-stat-label">Entries</div>
								</div>
							</div>
						</Link>
					</li>
				))}
				<li>
					<Link
						to="/campaigns/new"
						className="flex h-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--line)] p-5 no-underline transition hover:border-[var(--sea-ink-soft)]"
					>
						<span className="text-2xl text-[var(--sea-ink-soft)]">+</span>
						<span className="text-sm text-[var(--sea-ink-soft)]">
							New Campaign
						</span>
					</Link>
				</li>
			</ul>
		</Page>
	);
}
