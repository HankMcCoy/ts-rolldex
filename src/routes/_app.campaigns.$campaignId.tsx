import { createFileRoute, Outlet } from "@tanstack/react-router";
import { QuickFindDialog } from "@/components/QuickFindDialog";
import { campaignBundleQuery, useCampaign } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(campaignBundleQuery(params.campaignId)),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.campaign.name ?? "Campaign"} - Rolldex` }],
	}),
	component: CampaignLayout,
});

function CampaignLayout() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	return (
		<>
			<Outlet />
			<QuickFindDialog campaignId={campaign.id} accessLevel={accessLevel} />
		</>
	);
}
