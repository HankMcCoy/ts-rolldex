import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarEditor } from "@/components/CalendarEditor";
import { Page } from "@/components/Page";
import { bundleKey, useCampaign } from "@/lib/queries";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/calendar",
)({
	head: () => ({ meta: [{ title: "Calendar - Rolldex" }] }),
	component: CalendarSettingsPage,
});

function CalendarSettingsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const queryClient = useQueryClient();

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
			<Page breadcrumbs={breadcrumbs} title="Calendar">
				<p>You don't have permission to manage this campaign.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="Calendar">
			<div className="max-w-2xl space-y-4">
				<p className="text-sm text-[var(--sea-ink-soft)]">
					Define the months of your in-world year. Names and day counts feed the
					date pickers and the timeline ordering.
				</p>
				<div className="island-shell rounded-2xl p-6">
					<CalendarEditor
						campaignId={campaign.id}
						initial={campaign.calendar}
						onSaved={() =>
							queryClient.invalidateQueries({
								queryKey: bundleKey(campaign.id),
							})
						}
					/>
				</div>
			</div>
		</Page>
	);
}
