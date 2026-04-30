import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaignTemplates } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { withUniqueName } from "@/server/unique-name";

const TEMPLATE_NAME_CONFLICT =
	"A template with this name already exists in this campaign.";

const templateBodySchema = z.object({
	name: z.string().min(1).max(80),
	body: z.string().max(50_000),
	wrapInStatBlock: z.boolean(),
});

export const getTemplates = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user);

		return db.query.campaignTemplates.findMany({
			where: eq(campaignTemplates.campaignId, data.campaignId),
			orderBy: (t, { asc }) => asc(t.name),
		});
	});

export const getTemplate = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), templateId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const template = await db.query.campaignTemplates.findFirst({
			where: and(
				eq(campaignTemplates.id, data.templateId),
				eq(campaignTemplates.campaignId, data.campaignId),
			),
		});
		if (!template) throw notFound();
		return template;
	});

export const createTemplate = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string() }).and(templateBodySchema))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		return withUniqueName(
			TEMPLATE_NAME_CONFLICT,
			() =>
				db.query.campaignTemplates.findFirst({
					where: and(
						eq(campaignTemplates.campaignId, data.campaignId),
						eq(campaignTemplates.name, data.name),
					),
					columns: { id: true },
				}),
			async () => {
				const [template] = await db
					.insert(campaignTemplates)
					.values({
						campaignId: data.campaignId,
						name: data.name,
						body: data.body,
						wrapInStatBlock: data.wrapInStatBlock,
					})
					.returning();
				return template;
			},
		);
	});

export const updateTemplate = createServerFn({ method: "POST" })
	.inputValidator(
		z
			.object({ campaignId: z.string(), templateId: z.string() })
			.and(templateBodySchema),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		return withUniqueName(
			TEMPLATE_NAME_CONFLICT,
			() =>
				db.query.campaignTemplates.findFirst({
					where: and(
						eq(campaignTemplates.campaignId, data.campaignId),
						eq(campaignTemplates.name, data.name),
						ne(campaignTemplates.id, data.templateId),
					),
					columns: { id: true },
				}),
			async () => {
				const [template] = await db
					.update(campaignTemplates)
					.set({
						name: data.name,
						body: data.body,
						wrapInStatBlock: data.wrapInStatBlock,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(campaignTemplates.id, data.templateId),
							eq(campaignTemplates.campaignId, data.campaignId),
						),
					)
					.returning();
				return template;
			},
		);
	});

export const deleteTemplate = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), templateId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		await db
			.delete(campaignTemplates)
			.where(
				and(
					eq(campaignTemplates.id, data.templateId),
					eq(campaignTemplates.campaignId, data.campaignId),
				),
			);

		return { success: true };
	});
