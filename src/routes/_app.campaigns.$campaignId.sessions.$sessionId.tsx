import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getSession } from "@/server/sessions";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
)({
	loader: ({ params }) =>
		getSession({
			data: { campaignId: params.campaignId, sessionId: params.sessionId },
		}),
	component: () => <Outlet />,
});
