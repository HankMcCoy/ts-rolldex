import { createFileRoute, Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOUN_TYPE_LABELS } from "@/lib/noun-types";
import { getCampaignDashboard } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/$campaignId/")({
	loader: ({ params }) =>
		getCampaignDashboard({ data: { campaignId: params.campaignId } }),
	component: CampaignDashboard,
});

function CampaignDashboard() {
	const {
		campaign,
		accessLevel,
		entities,
		recentSessions,
		members,
		maps,
		timelinePreview,
	} = Route.useLoaderData();

	const isAdmin = accessLevel === "ADMIN";

	return (
		<Page
			breadcrumbs={[{ label: "Campaigns", to: "/campaigns" }]}
			title={campaign.name}
			actions={
				isAdmin && (
					<div className="flex gap-2">
						<Button variant="outline" asChild size="sm">
							<Link
								to="/campaigns/$campaignId/edit"
								params={{ campaignId: campaign.id }}
							>
								Edit
							</Link>
						</Button>
						<Button variant="outline" asChild size="sm">
							<Link
								to="/campaigns/$campaignId/settings"
								params={{ campaignId: campaign.id }}
							>
								Settings
							</Link>
						</Button>
					</div>
				)
			}
		>
			{campaign.summary && (
				<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
					{campaign.summary}
				</p>
			)}

			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-8">
					{/* Sessions section */}
					<section>
						<div className="mb-3 flex items-center justify-between">
							<h2 className="island-kicker">
								<Link
									to="/campaigns/$campaignId/sessions"
									params={{ campaignId: campaign.id }}
									className="no-underline hover:text-[var(--sea-ink)]"
								>
									Sessions
								</Link>
							</h2>
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

					{/* Maps section */}
					<section>
						<div className="mb-3 flex items-center justify-between">
							<h2 className="island-kicker">
								<Link
									to="/campaigns/$campaignId/maps"
									params={{ campaignId: campaign.id }}
									className="no-underline hover:text-[var(--sea-ink)]"
								>
									Maps
								</Link>
							</h2>
							{isAdmin && (
								<Button size="sm" asChild>
									<Link
										to="/campaigns/$campaignId/maps/new"
										params={{ campaignId: campaign.id }}
									>
										+ Map
									</Link>
								</Button>
							)}
						</div>

						{maps.length === 0 ? (
							<p className="text-sm text-[var(--sea-ink-soft)]">No maps yet.</p>
						) : (
							<ul className="space-y-2">
								{maps.map((m) => (
									<li key={m.id}>
										<Link
											to="/campaigns/$campaignId/maps/$mapId"
											params={{ campaignId: campaign.id, mapId: m.id }}
											className="island-shell flex items-center gap-4 rounded-xl p-3 no-underline transition hover:-translate-y-0.5"
										>
											<div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-white/90">
												{m.imageUrl ? (
													<img
														src={m.imageUrl}
														alt=""
														loading="lazy"
														decoding="async"
														className="h-full w-full object-cover"
													/>
												) : (
													<MapIcon className="size-5 text-[var(--sea-ink-soft)]" />
												)}
											</div>
											<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
												<span className="font-medium">{m.name}</span>
												{m.isSecret && (
													<Badge variant="secondary">Secret</Badge>
												)}
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</section>

					{timelinePreview.length > 0 && (
						<section>
							<h2 className="island-kicker mb-3">
								<Link
									to="/campaigns/$campaignId/timeline"
									params={{ campaignId: campaign.id }}
									className="no-underline hover:text-[var(--sea-ink)]"
								>
									Timeline
								</Link>
							</h2>
							<ul className="space-y-2">
								{timelinePreview.map((entry) => {
									const dateText = entry.dateText;
									const target =
										entry.kind === "session" ? (
											<Link
												to="/campaigns/$campaignId/sessions/$sessionId"
												params={{
													campaignId: campaign.id,
													sessionId: entry.id,
												}}
												className="island-shell flex items-center gap-3 rounded-xl p-3 no-underline transition hover:-translate-y-0.5"
											>
												<EntityAvatar
													entityType="SESSION"
													imageUrl={null}
													name={entry.name}
												/>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium">
														{entry.name}
													</div>
													<div className="text-xs text-[var(--sea-ink-soft)]">
														{dateText}
													</div>
												</div>
											</Link>
										) : (
											<Link
												to="/campaigns/$campaignId/nouns/$nounId"
												params={{
													campaignId: campaign.id,
													nounId: entry.id,
												}}
												className="island-shell flex items-center gap-3 rounded-xl p-3 no-underline transition hover:-translate-y-0.5"
											>
												<EntityAvatar
													entityType={entry.nounType ?? "EVENT"}
													imageUrl={entry.imageUrl}
													name={entry.name}
												/>
												<div className="min-w-0 flex-1">
													<div className="truncate font-medium">
														{entry.name}
													</div>
													<div className="text-xs text-[var(--sea-ink-soft)]">
														{dateText}
													</div>
												</div>
											</Link>
										);
									return <li key={entry.kind + entry.id}>{target}</li>;
								})}
							</ul>
						</section>
					)}

					{/* Members section */}
					<section>
						<div className="mb-3 flex items-center justify-between">
							<h2 className="island-kicker">Members</h2>
							{isAdmin && (
								<Button variant="outline" size="sm" asChild>
									<Link
										to="/campaigns/$campaignId/settings/members"
										params={{ campaignId: campaign.id }}
									>
										Manage members
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
										<Badge variant="secondary">
											{isDM ? "DM" : "Read only"}
										</Badge>
									</li>
								);
							})}
						</ul>
					</section>
				</div>

				{/* Entities section */}
				<section>
					<div className="mb-3 flex items-center justify-between">
						<h2 className="island-kicker">
							<Link
								to="/campaigns/$campaignId/nouns"
								params={{ campaignId: campaign.id }}
								className="no-underline hover:text-[var(--sea-ink)]"
							>
								Entities
							</Link>
						</h2>
						{isAdmin && (
							<Button size="sm" asChild>
								<Link
									to="/campaigns/$campaignId/nouns/new"
									params={{ campaignId: campaign.id }}
								>
									+ Add
								</Link>
							</Button>
						)}
					</div>

					{entities.length === 0 ? (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							Nothing here yet.
						</p>
					) : (
						<ul className="space-y-2">
							{entities.map((noun) => (
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
											{noun.isSecret && (
												<Badge variant="secondary">Secret</Badge>
											)}
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
			</div>
		</Page>
	);
}
