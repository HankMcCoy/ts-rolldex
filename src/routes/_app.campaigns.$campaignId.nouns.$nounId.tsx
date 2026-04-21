import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getNoun } from "@/server/nouns";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId",
)({
	loader: ({ params }) =>
		getNoun({ data: { campaignId: params.campaignId, nounId: params.nounId } }),
	component: () => <Outlet />,
});
