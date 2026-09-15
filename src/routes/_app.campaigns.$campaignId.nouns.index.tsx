import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { TagFilterBar } from "@/components/TagFilterBar";
import { TagList } from "@/components/TagList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOUN_TYPE_LABELS, NOUN_TYPES, nounTypeSchema } from "@/lib/noun-types";
import {
	useCampaign,
	useNouns,
	useNounTagOptions,
	useTags,
} from "@/lib/queries";
import { tagFilterSchema, toggleTagName } from "@/lib/tags";

export const Route = createFileRoute("/_app/campaigns/$campaignId/nouns/")({
	validateSearch: z.object({
		type: nounTypeSchema.optional(),
		tags: tagFilterSchema,
	}),
	head: ({ match }) => {
		const { type, tags } = match.search;
		const label = type ? `${NOUN_TYPE_LABELS[type]}s` : "All entities";
		const filter = tags?.length ? ` tagged ${tags.join(" + ")}` : "";
		return { meta: [{ title: `${label}${filter} - Rolldex` }] };
	},
	component: NounsPage,
});

function NounsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const { type, tags } = Route.useSearch();
	const activeTags = tags ?? [];
	const nouns = useNouns(campaignId, { type, tags: activeTags });
	const tagOptions = useNounTagOptions(campaignId, type);
	const tagsById = new Map(useTags(campaignId).map((t) => [t.id, t]));
	const navigate = Route.useNavigate();

	const isAdmin = accessLevel === "ADMIN";
	const label = type ? `${NOUN_TYPE_LABELS[type]}s` : "All entities";

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
			title={label}
			actions={
				isAdmin && (
					<Button asChild size="sm">
						<Link
							to="/campaigns/$campaignId/nouns/new"
							params={{ campaignId: campaign.id }}
							search={type ? { type } : {}}
						>
							+ Add
						</Link>
					</Button>
				)
			}
		>
			<div className="mb-6 flex flex-wrap gap-2">
				<Button variant={!type ? "default" : "outline"} size="sm" asChild>
					<Link
						to="/campaigns/$campaignId/nouns"
						params={{ campaignId: campaign.id }}
						search={(prev) => ({ ...prev, type: undefined })}
					>
						All
					</Link>
				</Button>
				{NOUN_TYPES.map((t) => (
					<Button
						key={t}
						variant={type === t ? "default" : "outline"}
						size="sm"
						asChild
					>
						<Link
							to="/campaigns/$campaignId/nouns"
							params={{ campaignId: campaign.id }}
							search={(prev) => ({ ...prev, type: t })}
						>
							{NOUN_TYPE_LABELS[t]}s
						</Link>
					</Button>
				))}
			</div>

			<TagFilterBar
				tags={tagOptions}
				active={activeTags}
				onToggle={(name) => setTags(toggleTagName(activeTags, name))}
				onClear={() => setTags([])}
			/>

			{nouns.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">
					{activeTags.length > 0
						? "Nothing carries all of those tags."
						: "Nothing here yet."}
				</p>
			) : (
				<ul className="space-y-2">
					{nouns.map((noun) => (
						<li key={noun.id}>
							<Link
								to="/campaigns/$campaignId/nouns/$nounId"
								params={{ campaignId: campaign.id, nounId: noun.id }}
								className="island-shell flex items-center gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
							>
								<EntityAvatar
									entityType={noun.nounType}
									imageUrl={noun.imageUrl}
									name={noun.name}
								/>
								<div className="min-w-0 flex-1">
									<span className="font-medium">{noun.name}</span>
									{noun.summary && (
										<p className="mt-0.5 text-sm text-[var(--sea-ink-soft)] line-clamp-1">
											{noun.summary}
										</p>
									)}
									<TagList
										className="mt-1.5"
										tags={noun.tagIds
											.map((id) => tagsById.get(id))
											.filter((t) => t !== undefined)}
									/>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									{noun.isSecret && <Badge variant="secondary">Secret</Badge>}
									<Badge variant="outline">
										{NOUN_TYPE_LABELS[noun.nounType]}
									</Badge>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Page>
	);
}
