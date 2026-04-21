import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { z } from "zod";
import { getNouns } from "@/server/nouns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const nounTypeSchema = z.enum(["PERSON", "PLACE", "THING", "FACTION"]);
type NounType = z.infer<typeof nounTypeSchema>;

export const Route = createFileRoute("/_app/campaigns/$campaignId/nouns")({
	validateSearch: z.object({ type: nounTypeSchema.optional() }),
	loaderDeps: ({ search }) => ({ type: search.type }),
	loader: ({ params, deps }) =>
		getNouns({ data: { campaignId: params.campaignId, nounType: deps.type } }),
	component: NounsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

const NOUN_TYPES: NounType[] = ["PERSON", "PLACE", "THING", "FACTION"];

function NounsPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const nouns = Route.useLoaderData();
	const { type } = Route.useSearch();

	const isAdmin = accessLevel === "ADMIN";
	const label = type
		? type.charAt(0) + type.slice(1).toLowerCase() + "s"
		: "All entities";

	return (
		<main className="page-wrap px-4 py-10">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<Link
						to="/campaigns/$campaignId"
						params={{ campaignId: campaign.id }}
						className="text-sm text-[var(--sea-ink-soft)] hover:underline"
					>
						{campaign.name}
					</Link>
					<h1 className="display-title text-3xl font-bold">{label}</h1>
				</div>
				{isAdmin && (
					<Button asChild size="sm">
						<Link
							to="/campaigns/$campaignId/nouns/new"
							params={{ campaignId: campaign.id }}
							search={type ? { type } : {}}
						>
							+ Add
						</Link>
					</Button>
				)}
			</div>

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
							{t.charAt(0) + t.slice(1).toLowerCase()}s
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
								className="island-shell flex items-center justify-between rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
							>
								<div>
									<span className="font-medium">{noun.name}</span>
									{noun.summary && (
										<p className="mt-0.5 text-sm text-[var(--sea-ink-soft)] line-clamp-1">
											{noun.summary}
										</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									{noun.isSecret && (
										<Badge variant="secondary">Secret</Badge>
									)}
									<Badge variant="outline">
										{noun.nounType.charAt(0) + noun.nounType.slice(1).toLowerCase()}
									</Badge>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
