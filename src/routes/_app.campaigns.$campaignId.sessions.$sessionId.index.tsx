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
import { PageHeader } from "@/components/PageHeader";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSession } from "@/server/sessions";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId/",
)({
	component: SessionPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const sessionRoute = getRouteApi(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
);

function SessionPage() {
	const { session, accessLevel, related } = sessionRoute.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const remove = useServerFn(deleteSession);

	const isAdmin = accessLevel === "ADMIN";

	async function handleDelete() {
		if (!confirm(`Delete "${session.name}"? This cannot be undone.`)) return;
		await remove({
			data: { campaignId: campaign.id, sessionId: session.id },
		});
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId/sessions",
			params: { campaignId: campaign.id },
		});
	}

	return (
		<>
			<PageHeader
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
			/>
			<main className="page-wrap px-4 py-10">
				<div className="flex gap-12">
					<div className="min-w-0 flex-1 space-y-6">
						{session.isSecret && <Badge variant="secondary">Secret</Badge>}

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
					</div>

					{related.length > 0 && (
						<div className="w-44 shrink-0">
							<RelatedEntities campaignId={campaign.id} related={related} />
						</div>
					)}
				</div>
			</main>
		</>
	);
}
