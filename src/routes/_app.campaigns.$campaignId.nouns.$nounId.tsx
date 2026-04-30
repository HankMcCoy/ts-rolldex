import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ensureBundleRow } from "@/lib/queries";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId",
)({
	loader: async ({ context, params }) => ({
		noun: await ensureBundleRow(
			context.queryClient,
			params.campaignId,
			"nouns",
			params.nounId,
		),
	}),
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.noun.name ?? "Entity"} - Rolldex` }],
	}),
	component: () => <Outlet />,
});
