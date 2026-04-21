import { createFileRoute, Link } from "@tanstack/react-router";
import { getCampaigns } from "@/server/campaigns";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/campaigns/")({
	loader: () => getCampaigns(),
	component: CampaignsPage,
});

function CampaignsPage() {
	const campaigns = Route.useLoaderData();

	return (
		<main className="page-wrap px-4 py-10">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="display-title text-3xl font-bold">Campaigns</h1>
				<Button asChild>
					<Link to="/campaigns/new">New campaign</Link>
				</Button>
			</div>

			{campaigns.length === 0 ? (
				<div className="island-shell rounded-2xl p-10 text-center">
					<p className="mb-4 text-[var(--sea-ink-soft)]">
						No campaigns yet. Create one to get started.
					</p>
					<Button asChild>
						<Link to="/campaigns/new">Create your first campaign</Link>
					</Button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{campaigns.map((c) => (
						<li key={c.id}>
							<Link
								to="/campaigns/$campaignId"
								params={{ campaignId: c.id }}
								className="island-shell block rounded-2xl p-5 no-underline transition hover:-translate-y-0.5"
							>
								<h2 className="mb-1 text-base font-semibold text-[var(--sea-ink)]">
									{c.name}
								</h2>
								{c.summary && (
									<p className="line-clamp-2 text-sm text-[var(--sea-ink-soft)]">
										{c.summary}
									</p>
								)}
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
