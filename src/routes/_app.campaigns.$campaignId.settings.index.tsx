import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Page } from "@/components/Page";
import { getCampaignDashboard } from "@/server/campaigns";
import { getTemplates } from "@/server/templates";

export const Route = createFileRoute("/_app/campaigns/$campaignId/settings/")({
	loader: async ({ params }) => {
		const [dashboard, templates] = await Promise.all([
			getCampaignDashboard({ data: { campaignId: params.campaignId } }),
			getTemplates({ data: { campaignId: params.campaignId } }),
		]);
		return {
			accessLevel: dashboard.accessLevel,
			memberCount: dashboard.members.length,
			templateCount: templates.length,
		};
	},
	head: () => ({ meta: [{ title: "Settings - Rolldex" }] }),
	component: SettingsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function SettingsPage() {
	const { campaign } = parentRoute.useLoaderData();
	const { accessLevel, memberCount, templateCount } = Route.useLoaderData();

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
