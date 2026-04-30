import {
	createFileRoute,
	getRouteApi,
	useRouter,
} from "@tanstack/react-router";
import { CalendarEditor } from "@/components/CalendarEditor";
import { Page } from "@/components/Page";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/calendar",
)({
	head: () => ({ meta: [{ title: "Calendar - Rolldex" }] }),
	component: CalendarSettingsPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function CalendarSettingsPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const router = useRouter();

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
						onSaved={() => router.invalidate()}
					/>
				</div>
			</div>
		</Page>
	);
}
