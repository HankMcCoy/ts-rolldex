import { createFileRoute, Link } from "@tanstack/react-router";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { TagList } from "@/components/TagList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCampaign, useSessions, useTags } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId/sessions/")({
	head: () => ({ meta: [{ title: "Sessions - Rolldex" }] }),
	component: SessionsPage,
});

function SessionsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const sessions = useSessions(campaignId);
	const tagsById = new Map(useTags(campaignId).map((t) => [t.id, t]));

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
		>
			{sessions.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">No sessions yet.</p>
			) : (
				<ul className="space-y-2">
					{sessions.map((s) => (
						<li key={s.id}>
							<Link
								to="/campaigns/$campaignId/sessions/$sessionId"
								params={{ campaignId: campaign.id, sessionId: s.id }}
								className="island-shell flex items-center gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
							>
								<EntityAvatar
									entityType="SESSION"
									imageUrl={null}
									name={s.name}
								/>
								<div className="min-w-0 flex-1">
									<span className="font-medium">{s.name}</span>
									{s.summary && (
										<p className="mt-0.5 text-sm text-[var(--sea-ink-soft)] line-clamp-1">
											{s.summary}
										</p>
									)}
									<TagList
										className="mt-1.5"
										tags={s.tagIds
											.map((id) => tagsById.get(id))
											.filter((t) => t !== undefined)}
									/>
								</div>
								{s.isSecret && <Badge variant="secondary">Secret</Badge>}
							</Link>
						</li>
					))}
				</ul>
			)}
		</Page>
	);
}
