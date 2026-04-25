import {
	createFileRoute,
	getRouteApi,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NOUN_TYPE_LABELS } from "@/lib/noun-types";
import { deleteNoun } from "@/server/nouns";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId/",
)({
	component: NounPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const nounRoute = getRouteApi("/_app/campaigns/$campaignId/nouns/$nounId");

function NounPage() {
	const { noun, accessLevel, related } = nounRoute.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const remove = useServerFn(deleteNoun);

	const isAdmin = accessLevel === "ADMIN";
	const typeLabel = NOUN_TYPE_LABELS[noun.nounType];

	async function handleDelete() {
		if (!confirm(`Delete "${noun.name}"? This cannot be undone.`)) return;
		await remove({ data: { campaignId: campaign.id, nounId: noun.id } });
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId/nouns",
			params: { campaignId: campaign.id },
			search: { type: noun.nounType },
		});
	}

	return (
		<main className="page-wrap px-4 py-10">
			<div className="flex gap-12">
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-start justify-between gap-4">
						<div>
							<Link
								to="/campaigns/$campaignId/nouns"
								params={{ campaignId: campaign.id }}
								search={{ type: noun.nounType }}
								className="text-sm"
							>
								← {typeLabel}s
							</Link>
							<h1 className="display-title text-4xl font-bold">{noun.name}</h1>
						</div>
						{isAdmin && (
							<div className="mt-1 flex shrink-0 gap-2">
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
									className="rounded p-1.5 text-[var(--sea-ink-soft)] transition hover:text-destructive"
								>
									<Trash2 className="size-4" />
								</button>
							</div>
						)}
					</div>

					<div className="mb-6 flex gap-2">
						<Badge variant="outline">{typeLabel}</Badge>
						{noun.isSecret && <Badge variant="secondary">Secret</Badge>}
					</div>

					{noun.summary && (
						<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
							{noun.summary}
						</p>
					)}

					{noun.notes && (
						<section className="mb-8">
							<h2 className="island-kicker mb-3">Notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={noun.notes} />
							</div>
						</section>
					)}

					{isAdmin && noun.privateNotes && (
						<>
							<Separator className="mb-8" />
							<section className="mb-8">
								<h2 className="island-kicker mb-3">Private notes</h2>
								<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
									<MarkdownRenderer content={noun.privateNotes} />
								</div>
							</section>
						</>
					)}
				</div>

				{related.length > 0 && (
					<div className="w-44 shrink-0">
						<RelatedEntities campaignId={campaign.id} related={related} />
					</div>
				)}
			</div>
		</main>
	);
}
