import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { campaignBundleQuery } from "@/lib/queries";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
)({
	loader: async ({ context, params }) => {
		const bundle = await context.queryClient.ensureQueryData(
			campaignBundleQuery(params.campaignId),
		);
		const session = bundle.sessions.find((s) => s.id === params.sessionId);
		if (!session) throw notFound();
		return { session };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.session.name ?? "Session"} - Rolldex` }],
	}),
	component: () => <Outlet />,
});
