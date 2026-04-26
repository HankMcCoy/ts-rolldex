import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessions } from "@/server/sessions";

export const Route = createFileRoute("/_app/campaigns/$campaignId/sessions/")({
	loader: ({ params }) =>
		getSessions({ data: { campaignId: params.campaignId } }),
	component: SessionsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function SessionsPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const sessions = Route.useLoaderData();

	const isAdmin = accessLevel === "ADMIN";

	return (
		<>
			<PageHeader
				breadcrumbs={[
					{
						label: campaign.name,
						to: "/campaigns/$campaignId",
						params: { campaignId: campaign.id },
					},
				]}
				title="Sessions"
				actions={
					isAdmin && (
						<Button asChild size="sm">
							<Link
								to="/campaigns/$campaignId/sessions/new"
								params={{ campaignId: campaign.id }}
							>
								+ Session
							</Link>
						</Button>
					)
				}
			/>
			<main className="page-wrap px-4 py-10">
				{sessions.length === 0 ? (
					<p className="text-sm text-[var(--sea-ink-soft)]">No sessions yet.</p>
				) : (
					<ul className="space-y-2">
						{sessions.map((s) => (
							<li key={s.id}>
								<Link
									to="/campaigns/$campaignId/sessions/$sessionId"
									params={{ campaignId: campaign.id, sessionId: s.id }}
									className="island-shell flex items-center justify-between rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
								>
									<div>
										<span className="font-medium">{s.name}</span>
										{s.summary && (
											<p className="mt-0.5 text-sm text-[var(--sea-ink-soft)] line-clamp-1">
												{s.summary}
											</p>
										)}
									</div>
									{s.isSecret && <Badge variant="secondary">Secret</Badge>}
								</Link>
							</li>
						))}
					</ul>
				)}
			</main>
		</>
	);
}
