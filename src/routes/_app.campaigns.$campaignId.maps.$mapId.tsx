import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ensureBundleRow } from "@/lib/queries";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/$mapId")(
	{
		loader: async ({ context, params }) => ({
			map: await ensureBundleRow(
				context.queryClient,
				params.campaignId,
				"maps",
				params.mapId,
			),
		}),
		head: ({ loaderData }) => ({
			meta: [{ title: `${loaderData?.map.name ?? "Map"} - Rolldex` }],
		}),
		component: () => <Outlet />,
	},
);
