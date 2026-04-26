import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { loadTimelineEntries } from "@/server/query-helpers";

export const getTimeline = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);
		const entries = await loadTimelineEntries(data.campaignId, accessLevel);
		return { entries, accessLevel };
	});
