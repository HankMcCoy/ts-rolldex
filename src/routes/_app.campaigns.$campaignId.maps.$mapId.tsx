import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { campaignBundleQuery } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/$mapId")(
	{
		loader: async ({ context, params }) => {
			const bundle = await context.queryClient.ensureQueryData(
				campaignBundleQuery(params.campaignId),
			);
			const map = bundle.maps.find((m) => m.id === params.mapId);
			if (!map) throw notFound();
			return { map };
		},
		head: ({ loaderData }) => ({
			meta: [{ title: `${loaderData?.map.name ?? "Map"} - Rolldex` }],
		}),
		component: () => <Outlet />,
	},
);
