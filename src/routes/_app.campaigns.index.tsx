import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { getCampaigns } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/")({
	loader: () => getCampaigns(),
	component: CampaignsPage,
});

function CampaignsPage() {
	const campaigns = Route.useLoaderData();

	return (
		<>
			<PageHeader
				title="Campaigns"
				actions={
					<Button asChild size="sm">
						<Link to="/campaigns/new">+ New Campaign</Link>
					</Button>
				}
			/>
			<main className="page-wrap px-4 py-10">
				<p
					className="mb-8 text-[var(--sea-ink-soft)]"
					style={{
						fontFamily: "ui-monospace, monospace",
						fontSize: "0.65rem",
						letterSpacing: "0.18em",
						textTransform: "uppercase",
					}}
				>
					Campaign Registry &mdash; {campaigns.length}{" "}
					{campaigns.length === 1 ? "Record" : "Records"}
				</p>

				<ul className="grid gap-4 sm:grid-cols-2">
					{campaigns.map((c) => (
						<li key={c.id}>
							<Link
								to="/campaigns/$campaignId"
								params={{ campaignId: c.id }}
								className="campaign-card block p-5 no-underline"
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
										<div className="campaign-card-stat-num">
											{c.nouns.length}
										</div>
										<div className="campaign-card-stat-label">Entries</div>
									</div>
								</div>
							</Link>
						</li>
					))}
					<li>
						<Link
							to="/campaigns/new"
							className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--line)] no-underline transition hover:border-[var(--sea-ink-soft)]"
						>
							<span className="text-2xl text-[var(--sea-ink-soft)]">+</span>
							<span className="text-sm text-[var(--sea-ink-soft)]">
								New Campaign
							</span>
						</Link>
					</li>
				</ul>
			</main>
		</>
	);
}
