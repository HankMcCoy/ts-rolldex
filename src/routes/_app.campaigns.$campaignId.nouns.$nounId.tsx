import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { campaignBundleQuery } from "@/lib/queries";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId",
)({
	loader: async ({ context, params }) => {
		const bundle = await context.queryClient.ensureQueryData(
			campaignBundleQuery(params.campaignId),
		);
		const noun = bundle.nouns.find((n) => n.id === params.nounId);
		if (!noun) throw notFound();
		return { noun };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.noun.name ?? "Entity"} - Rolldex` }],
	}),
	component: () => <Outlet />,
});
