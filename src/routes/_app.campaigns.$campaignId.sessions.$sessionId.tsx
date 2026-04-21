import { createFileRoute, getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSession, deleteSession } from "@/server/sessions";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RelatedEntities } from "@/components/RelatedEntities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
)({
	loader: ({ params }) =>
		getSession({
			data: { campaignId: params.campaignId, sessionId: params.sessionId },
		}),
	component: SessionPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function SessionPage() {
	const { session, accessLevel, related } = Route.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const remove = useServerFn(deleteSession);

	const isAdmin = accessLevel === "ADMIN";

	async function handleDelete() {
		if (!confirm(`Delete "${session.name}"? This cannot be undone.`)) return;
		await remove({
			data: { campaignId: campaign.id, sessionId: session.id },
		});
		await navigate({
			to: "/campaigns/$campaignId/sessions",
			params: { campaignId: campaign.id },
		});
	}

	return (
		<main className="page-wrap px-4 py-10">
			<div className="flex gap-10">
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-start justify-between gap-4">
						<div>
							<Link
								to="/campaigns/$campaignId/sessions"
								params={{ campaignId: campaign.id }}
								className="text-sm text-[var(--sea-ink-soft)] hover:underline"
							>
								← Sessions
							</Link>
							<h1 className="display-title text-3xl font-bold">{session.name}</h1>
						</div>
						{isAdmin && (
							<div className="flex gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/campaigns/$campaignId/sessions/$sessionId/edit"
										params={{ campaignId: campaign.id, sessionId: session.id }}
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

					{session.isSecret && (
						<div className="mb-4">
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
							<h2 className="island-kicker mb-2">Notes</h2>
							<div className="island-shell max-w-2xl rounded-xl p-4">
								<MarkdownRenderer content={session.notes} />
							</div>
						</section>
					)}

					{isAdmin && session.privateNotes && (
						<>
							<Separator className="mb-8" />
							<section className="mb-8">
								<h2 className="island-kicker mb-2">Private notes</h2>
								<div className="island-shell max-w-2xl rounded-xl p-4">
									<MarkdownRenderer content={session.privateNotes} />
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
