import {
	createFileRoute,
	getRouteApi,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { CalendarEditor } from "@/components/CalendarEditor";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getCampaignDashboard } from "@/server/campaigns";
import { inviteMember, removeMember } from "@/server/members";

export const Route = createFileRoute("/_app/campaigns/$campaignId/settings")({
	loader: ({ params }) =>
		getCampaignDashboard({ data: { campaignId: params.campaignId } }),
	head: () => ({ meta: [{ title: "Settings - Rolldex" }] }),
	component: SettingsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function SettingsPage() {
	const { campaign } = parentRoute.useLoaderData();
	const { accessLevel, members } = Route.useLoaderData();
	const router = useRouter();

	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title="Settings">
				<p>You don't have permission to manage this campaign.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="Settings">
			<div className="max-w-2xl space-y-10">
				<section>
					<h2 className="island-kicker mb-3">Calendar</h2>
					<p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
						Define the months of your in-world year. Names and day counts feed
						the date pickers and the timeline ordering.
					</p>
					<div className="island-shell rounded-2xl p-6">
						<CalendarEditor
							campaignId={campaign.id}
							initial={campaign.calendar}
							onSaved={() => router.invalidate()}
						/>
					</div>
				</section>

				<Separator />

				<section>
					<h2 className="island-kicker mb-3">Members</h2>
					<p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
						Invite players to your campaign by email. They'll get read-only
						access when they register or sign in with that address.
					</p>
					<div className="island-shell space-y-6 rounded-2xl p-6">
						<InviteForm campaignId={campaign.id} />
						<MemberList members={members} campaignId={campaign.id} />
					</div>
				</section>
			</div>
		</Page>
	);
}

interface InviteFormProps {
	campaignId: string;
}

function InviteForm({ campaignId }: InviteFormProps) {
	const router = useRouter();
	const invite = useServerFn(inviteMember);
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			setError("Enter an email address");
			return;
		}
		setError(null);
		setBusy(true);
		try {
			const result = await invite({
				data: { campaignId, email: trimmed },
			});
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setEmail("");
			await router.invalidate();
		} finally {
			setBusy(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="space-y-2">
			<div className="flex gap-2">
				<Input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="player@example.com"
					disabled={busy}
				/>
				<Button type="submit" disabled={busy}>
					{busy ? "Inviting…" : "Invite"}
				</Button>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</form>
	);
}

interface MemberListProps {
	campaignId: string;
	members: {
		id: string;
		role: "DM" | "READ_ONLY";
		email: string | null;
		user: { name: string } | null;
	}[];
}

function MemberList({ campaignId, members }: MemberListProps) {
	const router = useRouter();
	const remove = useServerFn(removeMember);

	return (
		<ul className="space-y-2">
			{members.map((m) => {
				const displayName = m.user?.name ?? m.email ?? "Pending invite";
				const showEmail = m.user?.name && m.email;
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
							<Badge variant="secondary">{isDM ? "DM" : "Read only"}</Badge>
							{!isDM && (
								<button
									type="button"
									onClick={async () => {
										await remove({ data: { campaignId, memberId: m.id } });
										await router.invalidate();
									}}
									title="Remove member"
									aria-label="Remove member"
									className="rounded p-1.5 text-[var(--sea-ink-soft)] transition hover:text-destructive"
								>
									<Trash2 className="size-4" />
								</button>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
