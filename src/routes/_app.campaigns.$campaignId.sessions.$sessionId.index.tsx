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
		<main className="page-wrap px-4 py-10">
			<div className="flex gap-12">
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-start justify-between gap-4">
						<div>
							<Link
								to="/campaigns/$campaignId/sessions"
								params={{ campaignId: campaign.id }}
								className="text-sm"
							>
								← Sessions
							</Link>
							<h1 className="display-title text-4xl font-bold">
								{session.name}
							</h1>
						</div>
						{isAdmin && (
							<div className="mt-1 flex shrink-0 gap-2">
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
									className="rounded p-1.5 text-[var(--sea-ink-soft)] transition hover:text-destructive"
								>
									<Trash2 className="size-4" />
								</button>
							</div>
						)}
					</div>

					{session.isSecret && (
						<div className="mb-3">
							<Badge variant="secondary">Secret</Badge>
						</div>
					)}

					{session.summary && (
						<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
							{session.summary}
						</p>
					)}

					{session.notes && (
						<section className="mb-8">
							<h2 className="island-kicker mb-3">Notes</h2>
							<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
								<MarkdownRenderer content={session.notes} />
							</div>
						</section>
					)}

					{isAdmin && session.privateNotes && (
						<>
							<Separator className="mb-8" />
							<section className="mb-8">
								<h2 className="island-kicker mb-3">Private notes</h2>
								<div className="max-w-2xl rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
									<MarkdownRenderer content={session.privateNotes} />
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
