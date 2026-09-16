import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { TagFilterBar } from "@/components/TagFilterBar";
import { TagList } from "@/components/TagList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	useCampaign,
	useSessions,
	useSessionTagOptions,
	useTags,
} from "@/lib/queries";
import { tagFilterSchema, toggleTagName } from "@/lib/tags";

export const Route = createFileRoute("/_app/campaigns/$campaignId/sessions/")({
	validateSearch: z.object({ tags: tagFilterSchema }),
	head: ({ match }) => {
		const { tags } = match.search;
		const filter = tags?.length ? ` tagged ${tags.join(" + ")}` : "";
		return { meta: [{ title: `Sessions${filter} - Rolldex` }] };
	},
	component: SessionsPage,
});

function SessionsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const { tags } = Route.useSearch();
	const activeTags = tags ?? [];
	const sessions = useSessions(campaignId, { tags: activeTags });
	const tagOptions = useSessionTagOptions(campaignId);
	const tagsById = new Map(useTags(campaignId).map((t) => [t.id, t]));
	const navigate = Route.useNavigate();

	const isAdmin = accessLevel === "ADMIN";

	// The filter lives in the URL so the view is linkable, but replace: true
	// keeps a session of chip-toggling out of the back-button history.
	function setTags(next: string[]) {
		navigate({
			search: (prev) => ({ ...prev, tags: next.length ? next : undefined }),
			replace: true,
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
			<TagFilterBar
				tags={tagOptions}
				active={activeTags}
				onToggle={(name) => setTags(toggleTagName(activeTags, name))}
				onClear={() => setTags([])}
			/>

			{sessions.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">
					{activeTags.length > 0
						? "No sessions carry all of those tags."
						: "No sessions yet."}
				</p>
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
									isSession
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
