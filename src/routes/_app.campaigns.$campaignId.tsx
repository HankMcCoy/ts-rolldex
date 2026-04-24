import { createFileRoute, Outlet } from "@tanstack/react-router";
import { QuickFindDialog } from "@/components/QuickFindDialog";
import { getCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/$campaignId")({
	loader: ({ params }) =>
		getCampaign({ data: { campaignId: params.campaignId } }),
	component: CampaignLayout,
});

function CampaignLayout() {
	const { campaign } = Route.useLoaderData();
	return (
		<>
			<Outlet />
			<QuickFindDialog campaignId={campaign.id} />
		</>
	);
}
