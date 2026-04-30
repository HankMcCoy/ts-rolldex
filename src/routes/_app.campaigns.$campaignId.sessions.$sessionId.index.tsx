import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Page } from "@/components/Page";
import { PinnedOnMaps } from "@/components/PinnedOnMaps";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Button } from "@/components/ui/button";
import { bundleKey, useCampaign, useSession } from "@/lib/queries";
import { deleteSession } from "@/server/sessions";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId/",
)({
	component: SessionPage,
});

function SessionPage() {
	const { campaignId, sessionId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const { session, accessLevel, related, mapPinLocations } = useSession(
		campaignId,
		sessionId,
	);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const remove = useServerFn(deleteSession);

	const isAdmin = accessLevel === "ADMIN";

	async function handleDelete() {
		if (!confirm(`Delete "${session.name}"? This cannot be undone.`)) return;
		await remove({
			data: { campaignId: campaign.id, sessionId: session.id },
		});
		await queryClient.invalidateQueries({ queryKey: bundleKey(campaign.id) });
		await navigate({
			to: "/campaigns/$campaignId/sessions",
			params: { campaignId: campaign.id },
		});
	}

	return (
		<Page
			breadcrumbs={[
				{
					label: campaign.name,
					to: "/campaigns/$campaignId",
					params: { campaignId: campaign.id },
				},
				{
					label: "Sessions",
					to: "/campaigns/$campaignId/sessions",
					params: { campaignId: campaign.id },
				},
			]}
			title={session.name}
			secret={session.isSecret}
			actions={
				isAdmin && (
					<>
						<Button variant="outline" size="sm" asChild>
							<Link
								to="/campaigns/$campaignId/sessions/$sessionId/edit"
								params={{
									campaignId: campaign.id,
									sessionId: session.id,
								}}
							>
								Edit
							</Link>
						</Button>
						<button
							type="button"
							onClick={handleDelete}
							title="Delete session"
							aria-label="Delete session"
							className="rounded p-1.5 text-white/55 transition hover:text-destructive"
						>
							<Trash2 className="size-4" />
						</button>
					</>
				)
			}
		>
			<div className="flex gap-12">
				<div className="min-w-0 flex-1 space-y-6">
					{session.summary && (
						<section>
							<h2 className="island-kicker mb-3">Summary</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 text-[var(--sea-ink-soft)] shadow-sm">
								{session.summary}
							</div>
						</section>
					)}

					{session.notes && (
						<section>
							<h2 className="island-kicker mb-3">Notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={session.notes} />
							</div>
						</section>
					)}

					{isAdmin && session.privateNotes && (
						<section>
							<h2 className="island-kicker mb-3">Private notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={session.privateNotes} />
							</div>
						</section>
					)}

					<PinnedOnMaps campaignId={campaign.id} locations={mapPinLocations} />
				</div>

				{related.length > 0 && (
					<div className="w-44 shrink-0">
						<RelatedEntities campaignId={campaign.id} related={related} />
					</div>
				)}
			</div>
		</Page>
	);
}
