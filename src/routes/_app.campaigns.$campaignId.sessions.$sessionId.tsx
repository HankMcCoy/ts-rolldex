import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ensureBundleRow } from "@/lib/queries";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
)({
	loader: async ({ context, params }) => ({
		session: await ensureBundleRow(
			context.queryClient,
			params.campaignId,
			"sessions",
			params.sessionId,
		),
	}),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.session.name ?? "Session"} - Rolldex` }],
	}),
	component: () => <Outlet />,
});
