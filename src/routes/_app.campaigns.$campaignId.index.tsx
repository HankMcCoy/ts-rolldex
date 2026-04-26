import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NOUN_TYPE_LABELS, NOUN_TYPES, type NounType } from "@/lib/noun-types";
import { getCampaignDashboard } from "@/server/campaigns";
import { removeMember } from "@/server/members";

export const Route = createFileRoute("/_app/campaigns/$campaignId/")({
	loader: ({ params }) =>
		getCampaignDashboard({ data: { campaignId: params.campaignId } }),
	component: CampaignDashboard,
});

function CampaignDashboard() {
	const { campaign, accessLevel, entities, recentSessions, members } =
		Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const remove = useServerFn(removeMember);
	const [entityFilter, setEntityFilter] = useState<NounType | null>(null);

	const isAdmin = accessLevel === "ADMIN";

	const visibleEntities = entityFilter
		? entities.filter((e) => e.nounType === entityFilter)
		: entities;

	return (
		<Page
			breadcrumbs={[{ label: "Campaigns", to: "/campaigns" }]}
			title={campaign.name}
			actions={
				isAdmin && (
					<Button variant="outline" asChild size="sm">
						<Link
							to="/campaigns/$campaignId/edit"
							params={{ campaignId: campaign.id }}
						>
							Edit
						</Link>
					</Button>
				)
			}
		>
			{campaign.summary && (
				<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
					{campaign.summary}
				</p>
			)}

			<div className="mb-8 grid gap-8 lg:grid-cols-2">
				{/* Sessions section */}
				<section>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="island-kicker">Sessions</h2>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild>
								<Link
									to="/campaigns/$campaignId/sessions"
									params={{ campaignId: campaign.id }}
								>
									All sessions
								</Link>
							</Button>
							{isAdmin && (
								<Button size="sm" asChild>
									<Link
										to="/campaigns/$campaignId/sessions/new"
										params={{ campaignId: campaign.id }}
									>
										+ Session
									</Link>
								</Button>
							)}
						</div>
					</div>

					{recentSessions.length === 0 ? (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							No sessions yet.
						</p>
					) : (
						<ul className="space-y-2">
							{recentSessions.map((s) => (
								<li key={s.id}>
									<Link
										to="/campaigns/$campaignId/sessions/$sessionId"
										params={{ campaignId: campaign.id, sessionId: s.id }}
										className="island-shell flex items-center gap-4 rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
									>
										<EntityAvatar
											entityType="SESSION"
											imageUrl={null}
											name={s.name}
										/>
										<div className="min-w-0 flex-1">
											<div className="font-medium">{s.name}</div>
											{s.summary && (
												<div className="mt-1 line-clamp-1 text-sm text-[var(--sea-ink-soft)]">
													{s.summary}
												</div>
											)}
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>

				{/* Members section */}
				<section>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="island-kicker">Members</h2>
						{isAdmin && (
							<Button size="sm" asChild>
								<Link
									to="/campaigns/$campaignId/members/invite"
									params={{ campaignId: campaign.id }}
								>
									+ Invite
								</Link>
							</Button>
						)}
					</div>

					<ul className="space-y-2">
						{members.map((m) => {
							const displayName = m.user?.name ?? m.email ?? "Pending invite";
							const showEmail = isAdmin && m.user?.name && m.email;
							const isDM = m.role === "DM";
							return (
								<li
									key={m.id}
									className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] px-4 py-2"
								>
									<div>
										<span className="font-medium">{displayName}</span>
										{showEmail && (
											<span className="ml-2 text-sm text-[var(--sea-ink-soft)]">
												{m.email}
											</span>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">
											{isDM ? "DM" : "Read only"}
										</Badge>
										{isAdmin && !isDM && (
											<button
												type="button"
												onClick={async () => {
													await remove({
														data: {
															campaignId: campaign.id,
															memberId: m.id,
														},
													});
													await router.invalidate();
													navigate({ to: "." });
												}}
												className="text-sm text-destructive hover:underline"
											>
												Remove
											</button>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				</section>
			</div>

			<Separator className="mb-8" />

			{/* Entities section */}
			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="island-kicker">Entities</h2>
					{isAdmin && (
						<Button size="sm" asChild>
							<Link
								to="/campaigns/$campaignId/nouns/new"
								params={{ campaignId: campaign.id }}
								search={entityFilter ? { type: entityFilter } : {}}
							>
								+ Add
							</Link>
						</Button>
					)}
				</div>

				<div className="mb-4 flex flex-wrap gap-2">
					<Button
						variant={entityFilter === null ? "default" : "outline"}
						size="sm"
						onClick={() => setEntityFilter(null)}
					>
						All
					</Button>
					{NOUN_TYPES.map((t) => (
						<Button
							key={t}
							variant={entityFilter === t ? "default" : "outline"}
							size="sm"
							onClick={() => setEntityFilter(t)}
						>
							{NOUN_TYPE_LABELS[t]}s
						</Button>
					))}
				</div>

				{visibleEntities.length === 0 ? (
					<p className="text-sm text-[var(--sea-ink-soft)]">
						Nothing here yet.
					</p>
				) : (
					<ul className="space-y-2">
						{visibleEntities.map((noun) => (
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
			</section>
		</Page>
	);
}
