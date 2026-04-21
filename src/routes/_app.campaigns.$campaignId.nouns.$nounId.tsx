import { createFileRoute, getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getNoun, deleteNoun } from "@/server/nouns";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId",
)({
	loader: ({ params }) =>
		getNoun({ data: { campaignId: params.campaignId, nounId: params.nounId } }),
	component: NounPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function NounPage() {
	const { noun, accessLevel, related } = Route.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const remove = useServerFn(deleteNoun);

	const isAdmin = accessLevel === "ADMIN";

	async function handleDelete() {
		if (!confirm(`Delete "${noun.name}"? This cannot be undone.`)) return;
		await remove({ data: { campaignId: campaign.id, nounId: noun.id } });
		await navigate({
			to: "/campaigns/$campaignId/nouns",
			params: { campaignId: campaign.id },
			search: { type: noun.nounType },
		});
	}

	return (
		<main className="page-wrap px-4 py-10">
			<div className="flex gap-10">
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-start justify-between gap-4">
						<div>
							<Link
								to="/campaigns/$campaignId/nouns"
								params={{ campaignId: campaign.id }}
								search={{ type: noun.nounType }}
								className="text-sm text-[var(--sea-ink-soft)] hover:underline"
							>
								← {noun.nounType.charAt(0) + noun.nounType.slice(1).toLowerCase()}s
							</Link>
							<h1 className="display-title text-3xl font-bold">{noun.name}</h1>
						</div>
						{isAdmin && (
							<div className="flex gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/campaigns/$campaignId/nouns/$nounId/edit"
										params={{ campaignId: campaign.id, nounId: noun.id }}
									>
										Edit
									</Link>
								</Button>
								<Button variant="destructive" size="sm" onClick={handleDelete}>
									Delete
								</Button>
							</div>
						)}
					</div>

					<div className="mb-6 flex gap-2">
						<Badge variant="outline">
							{noun.nounType.charAt(0) + noun.nounType.slice(1).toLowerCase()}
						</Badge>
						{noun.isSecret && <Badge variant="secondary">Secret</Badge>}
					</div>

					{noun.summary && (
						<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
							{noun.summary}
						</p>
					)}

					{noun.notes && (
						<section className="mb-8">
							<h2 className="island-kicker mb-2">Notes</h2>
							<div className="island-shell max-w-2xl rounded-xl p-4">
								<MarkdownRenderer content={noun.notes} />
							</div>
						</section>
					)}

					{isAdmin && noun.privateNotes && (
						<>
							<Separator className="mb-8" />
							<section className="mb-8">
								<h2 className="island-kicker mb-2">Private notes</h2>
								<div className="island-shell max-w-2xl rounded-xl p-4">
									<MarkdownRenderer content={noun.privateNotes} />
								</div>
							</section>
						</>
					)}
				</div>

				{related.length > 0 && (
					<div className="w-48 shrink-0">
						<RelatedEntities campaignId={campaign.id} related={related} />
					</div>
				)}
			</div>
		</main>
	);
}
