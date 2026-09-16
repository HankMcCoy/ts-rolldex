import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { normalizeTagName } from "@/lib/tags";
import { removeTagGroup, writeTagGroup } from "@/server/tag-group-writes";
import { tagRefsField } from "@/server/tags";

const groupFields = z.object({
	campaignId: z.string(),
	id: z.string().uuid(),
	name: z.string().transform(normalizeTagName).pipe(z.string().min(1).max(100)),
	tags: tagRefsField,
});

export const createTagGroup = createServerFn({ method: "POST" })
	.inputValidator(
		groupFields.extend({
			id: z
				.string()
				.uuid()
				.default(() => crypto.randomUUID()),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		return writeTagGroup(data, false);
	});

export const updateTagGroup = createServerFn({ method: "POST" })
	.inputValidator(groupFields)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		return writeTagGroup(data, true);
	});

export const deleteTagGroup = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), id: z.string().uuid() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		return removeTagGroup(data.campaignId, data.id);
	});
