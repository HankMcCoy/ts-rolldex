import {
	createFileRoute,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCampaignDashboard } from "@/server/campaigns";
import { removeMember } from "@/server/members";

export const Route = createFileRoute("/_app/campaigns/$campaignId/")({
	loader: ({ params }) =>
		getCampaignDashboard({ data: { campaignId: params.campaignId } }),
	component: CampaignDashboard,
});

const NOUN_TYPES = ["PERSON", "PLACE", "THING", "FACTION"] as const;

function CampaignDashboard() {
	const { campaign, accessLevel, nounCounts, recentSessions, members } =
		Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const remove = useServerFn(removeMember);

	const isAdmin = accessLevel === "ADMIN";

	return (
		<main className="page-wrap px-4 py-10">
			<div className="mb-2 flex items-start justify-between gap-4">
				<h1 className="display-title text-3xl font-bold">{campaign.name}</h1>
				{isAdmin && (
					<Button variant="outline" asChild size="sm">
						<Link
							to="/campaigns/$campaignId/edit"
							params={{ campaignId: campaign.id }}
						>
							Edit
						</Link>
					</Button>
				)}
			</div>
			{campaign.summary && (
				<p className="mb-8 max-w-2xl text-[var(--sea-ink-soft)]">
					{campaign.summary}
				</p>
			)}

			{/* Nouns section */}
			<section className="mb-8">
				<h2 className="island-kicker mb-3">Entities</h2>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{NOUN_TYPES.map((type) => (
						<Link
							key={type}
							to="/campaigns/$campaignId/nouns"
							params={{ campaignId: campaign.id }}
							search={{ type }}
							className="island-shell rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
						>
							<div className="text-2xl font-bold">{nounCounts[type]}</div>
							<div className="text-sm capitalize text-[var(--sea-ink-soft)]">
								{type.charAt(0) + type.slice(1).toLowerCase()}s
							</div>
						</Link>
					))}
				</div>
				{isAdmin && (
					<div className="mt-3 flex flex-wrap gap-2">
						{NOUN_TYPES.map((type) => (
							<Button key={type} variant="outline" size="sm" asChild>
								<Link
									to="/campaigns/$campaignId/nouns/new"
									params={{ campaignId: campaign.id }}
									search={{ type }}
								>
									+ {type.charAt(0) + type.slice(1).toLowerCase()}
								</Link>
							</Button>
						))}
					</div>
				)}
			</section>

			<Separator className="mb-8" />

			{/* Sessions section */}
			<section className="mb-8">
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
					<p className="text-sm text-[var(--sea-ink-soft)]">No sessions yet.</p>
				) : (
					<ul className="space-y-2">
						{recentSessions.map((s) => (
							<li key={s.id}>
								<Link
									to="/campaigns/$campaignId/sessions/$sessionId"
									params={{ campaignId: campaign.id, sessionId: s.id }}
									className="island-shell block rounded-xl p-4 no-underline transition hover:-translate-y-0.5"
								>
									<div className="font-medium">{s.name}</div>
									{s.summary && (
										<div className="mt-1 line-clamp-1 text-sm text-[var(--sea-ink-soft)]">
											{s.summary}
										</div>
									)}
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<Separator className="mb-8" />

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
					{members.map((m) => (
						<li
							key={m.id}
							className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] px-4 py-2"
						>
							<div>
								<span className="font-medium">{m.user?.name ?? m.email}</span>
								{m.user?.name && (
									<span className="ml-2 text-sm text-[var(--sea-ink-soft)]">
										{m.email}
									</span>
								)}
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="secondary">Read only</Badge>
								{isAdmin && (
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
					))}
				</ul>
			</section>
		</main>
	);
}
