import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Page } from "@/components/Page";
import { useCampaign, useSettingsSummary } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId/settings/")({
	head: () => ({ meta: [{ title: "Settings - Rolldex" }] }),
	component: SettingsPage,
});

function SettingsPage() {
	const { campaignId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const { accessLevel, memberCount, templateCount } =
		useSettingsSummary(campaignId);

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

	const cards = [
		{
			title: "Calendar",
			description:
				"Define the months of your in-world year. Names and day counts feed the date pickers and the timeline ordering.",
			to: "/campaigns/$campaignId/settings/calendar" as const,
			hint: `${campaign.calendar.months.length} month${campaign.calendar.months.length === 1 ? "" : "s"}`,
		},
		{
			title: "Templates",
			description:
				"Reusable markdown blocks that show up in the slash menu of any entity or session note.",
			to: "/campaigns/$campaignId/settings/templates" as const,
			hint: `${templateCount} template${templateCount === 1 ? "" : "s"}`,
		},
		{
			title: "Members",
			description: "Invite players and manage who can see this campaign.",
			to: "/campaigns/$campaignId/settings/members" as const,
			hint: `${memberCount} member${memberCount === 1 ? "" : "s"}`,
		},
		{
			title: "Import",
			description:
				"Bulk-create entities or sessions from a CSV. Duplicates by name are skipped.",
			to: "/campaigns/$campaignId/settings/import" as const,
			hint: "CSV upload",
		},
	];

	return (
		<Page breadcrumbs={breadcrumbs} title="Settings">
			<div className="grid max-w-2xl gap-4 sm:grid-cols-2">
				{cards.map((card) => (
					<Link
						key={card.title}
						to={card.to}
						params={{ campaignId: campaign.id }}
						className="island-shell flex flex-col rounded-2xl p-6 no-underline transition hover:-translate-y-0.5"
					>
						<div className="mb-2 flex items-center justify-between gap-2">
							<h2 className="island-kicker">{card.title}</h2>
							<ChevronRight className="size-4 text-[var(--sea-ink-soft)]" />
						</div>
						<p className="text-sm text-[var(--sea-ink-soft)]">
							{card.description}
						</p>
						<p className="mt-4 text-xs text-[var(--sea-ink-soft)]">
							{card.hint}
						</p>
					</Link>
				))}
			</div>
		</Page>
	);
}
