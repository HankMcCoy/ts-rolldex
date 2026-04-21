import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/$campaignId")({
	loader: ({ params }) => getCampaign({ data: { campaignId: params.campaignId } }),
	component: () => <Outlet />,
});
