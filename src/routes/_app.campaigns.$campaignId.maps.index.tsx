import { createFileRoute, Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaign, useMaps } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/")({
	head: () => ({ meta: [{ title: "Maps - Rolldex" }] }),
	component: MapsPage,
});

function MapsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const maps = useMaps(campaignId);

	const isAdmin = accessLevel === "ADMIN";

	return (
		<Page
			breadcrumbs={[
				{
					label: campaign.name,
					to: "/campaigns/$campaignId",
					params: { campaignId: campaign.id },
				},
			]}
			title="Maps"
			actions={
				isAdmin && (
					<Button asChild size="sm">
						<Link
							to="/campaigns/$campaignId/maps/new"
							params={{ campaignId: campaign.id }}
						>
							+ Map
						</Link>
					</Button>
				)
			}
		>
			{maps.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">No maps yet.</p>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2">
					{maps.map((m) => (
						<li key={m.id}>
							<Link
								to="/campaigns/$campaignId/maps/$mapId"
								params={{ campaignId: campaign.id, mapId: m.id }}
								className="island-shell flex h-full gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
							>
								<div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-white/90">
									{m.imageUrl ? (
										<img
											src={m.imageUrl}
											alt=""
											loading="lazy"
											decoding="async"
											className="h-full w-full object-cover"
										/>
									) : (
										<MapIcon className="size-6 text-[var(--sea-ink-soft)]" />
									)}
								</div>
								<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
									<span className="font-medium">{m.name}</span>
									{m.isSecret && <Badge variant="secondary">Secret</Badge>}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Page>
	);
}
