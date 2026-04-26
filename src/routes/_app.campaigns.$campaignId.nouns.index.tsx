import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOUN_TYPE_LABELS, NOUN_TYPES, nounTypeSchema } from "@/lib/noun-types";
import { getNouns } from "@/server/nouns";

export const Route = createFileRoute("/_app/campaigns/$campaignId/nouns/")({
	validateSearch: z.object({ type: nounTypeSchema.optional() }),
	loaderDeps: ({ search }) => ({ type: search.type }),
	loader: ({ params, deps }) =>
		getNouns({ data: { campaignId: params.campaignId, nounType: deps.type } }),
	component: NounsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function NounsPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const nouns = Route.useLoaderData();
	const { type } = Route.useSearch();

	const isAdmin = accessLevel === "ADMIN";
	const label = type ? `${NOUN_TYPE_LABELS[type]}s` : "All entities";

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
							search={{ type: t }}
						>
							{NOUN_TYPE_LABELS[t]}s
						</Link>
					</Button>
				))}
			</div>

			{nouns.length === 0 ? (
				<p className="text-sm text-[var(--sea-ink-soft)]">Nothing here yet.</p>
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
