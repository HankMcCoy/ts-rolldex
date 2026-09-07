import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	BundleMutationError,
	patchAddMember,
	patchRemoveMember,
	useAccessLevel,
	useBundleMutation,
	useCampaign,
	useCampaignDashboard,
} from "@/lib/queries";
import { inviteMember, removeMember } from "@/server/members";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/members",
)({
	head: () => ({ meta: [{ title: "Members - Rolldex" }] }),
	component: MembersSettingsPage,
});

function MembersSettingsPage() {
	const { campaignId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const accessLevel = useAccessLevel(campaignId);
	const { members } = useCampaignDashboard(campaignId);

	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: "Settings",
			to: "/campaigns/$campaignId/settings" as const,
			params: { campaignId: campaign.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title="Members">
				<p>You don't have permission to manage this campaign.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="Members">
			<div className="max-w-2xl space-y-4">
				<p className="text-sm text-[var(--sea-ink-soft)]">
					Invite players to your campaign by email. They'll get read-only access
					when they register or sign in with that address.
				</p>
				<div className="island-shell space-y-6 rounded-2xl p-6">
					<InviteForm campaignId={campaign.id} />
					<MemberList members={members} campaignId={campaign.id} />
				</div>
			</div>
		</Page>
	);
}

interface InviteFormProps {
	campaignId: string;
}

function InviteForm({ campaignId }: InviteFormProps) {
	const inviteMutation = useBundleMutation({
		campaignId,
		mutationFn: (vars: { email: string }) =>
			inviteMember({ data: { campaignId, email: vars.email } }),
		// The invited member appears in the list immediately. We use a temp id
		// prefixed with "pending-invite:" so the row is identifiable for rollback;
		// the backstop refetch in `onSettled` swaps it for the canonical row.
		patch: (bundle, vars) =>
			patchAddMember(bundle, {
				id: `pending-invite:${vars.email}`,
				role: "READ_ONLY",
				email: vars.email,
				user: null,
			}),
	});
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			setError("Enter an email address");
			return;
		}
		setError(null);
		try {
			await inviteMutation.mutateAsync({ email: trimmed });
			setEmail("");
		} catch (err) {
			if (err instanceof BundleMutationError) setError(err.message);
			else throw err;
		}
	}

	const busy = inviteMutation.isPending;

	return (
		<form method="post" onSubmit={onSubmit} className="space-y-2">
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
	const removeMutation = useBundleMutation({
		campaignId,
		mutationFn: (vars: { memberId: string }) =>
			removeMember({ data: { campaignId, memberId: vars.memberId } }),
		patch: (bundle, vars) => patchRemoveMember(bundle, vars.memberId),
	});

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
									onClick={() => {
										removeMutation.mutate({ memberId: m.id });
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
