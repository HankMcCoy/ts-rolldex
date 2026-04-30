import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { EntityImage } from "@/components/EntityImage";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Page } from "@/components/Page";
import { PinnedOnMaps } from "@/components/PinnedOnMaps";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Button } from "@/components/ui/button";
import { NOUN_TYPE_LABELS } from "@/lib/noun-types";
import { bundleKey, useCampaign, useNoun } from "@/lib/queries";
import { deleteNoun } from "@/server/nouns";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId/",
)({
	component: NounPage,
});

function NounPage() {
	const { campaignId, nounId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const { noun, accessLevel, related, mapPinLocations } = useNoun(
		campaignId,
		nounId,
	);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const remove = useServerFn(deleteNoun);

	const isAdmin = accessLevel === "ADMIN";
	const typeLabel = NOUN_TYPE_LABELS[noun.nounType];

	async function handleDelete() {
		if (!confirm(`Delete "${noun.name}"? This cannot be undone.`)) return;
		await remove({ data: { campaignId: campaign.id, nounId: noun.id } });
		await queryClient.invalidateQueries({ queryKey: bundleKey(campaign.id) });
		await navigate({
			to: "/campaigns/$campaignId/nouns",
			params: { campaignId: campaign.id },
			search: { type: noun.nounType },
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
					label: `${typeLabel}s`,
					to: "/campaigns/$campaignId/nouns",
					params: { campaignId: campaign.id },
					search: { type: noun.nounType },
				},
			]}
			title={noun.name}
			secret={noun.isSecret}
			actions={
				isAdmin && (
					<>
						<Button variant="outline" size="sm" asChild>
							<Link
								to="/campaigns/$campaignId/nouns/$nounId/edit"
								params={{ campaignId: campaign.id, nounId: noun.id }}
							>
								Edit
							</Link>
						</Button>
						<button
							type="button"
							onClick={handleDelete}
							title="Delete entity"
							aria-label="Delete entity"
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
					{noun.summary && (
						<section>
							<h2 className="island-kicker mb-3">Summary</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 text-[var(--sea-ink-soft)] shadow-sm">
								{noun.summary}
							</div>
						</section>
					)}

					{noun.notes && (
						<section>
							<h2 className="island-kicker mb-3">Notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={noun.notes} />
							</div>
						</section>
					)}

					{isAdmin && noun.privateNotes && (
						<section>
							<h2 className="island-kicker mb-3">Private notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={noun.privateNotes} />
							</div>
						</section>
					)}

					<PinnedOnMaps campaignId={campaign.id} locations={mapPinLocations} />
				</div>

				<div className="w-44 shrink-0 space-y-6">
					<EntityImage
						nounType={noun.nounType}
						imageUrl={noun.imageUrl}
						name={noun.name}
					/>
					{related.length > 0 && (
						<RelatedEntities campaignId={campaign.id} related={related} />
					)}
				</div>
			</div>
		</Page>
	);
}
