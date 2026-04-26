import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getMap } from "@/server/maps";
import { getNouns } from "@/server/nouns";
import { getSessions } from "@/server/sessions";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/$mapId")(
	{
		loader: async ({ params }) => {
			const [mapData, nouns, sessions] = await Promise.all([
				getMap({
					data: { campaignId: params.campaignId, mapId: params.mapId },
				}),
				getNouns({ data: { campaignId: params.campaignId } }),
				getSessions({ data: { campaignId: params.campaignId } }),
			]);
			return { ...mapData, nouns, sessions };
		},
		head: ({ loaderData }) => ({
			meta: [{ title: `${loaderData?.map.name ?? "Map"} - Rolldex` }],
		}),
		component: () => <Outlet />,
	},
);
