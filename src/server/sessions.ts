import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { applyDateRefinements, dateFields } from "@/lib/date-schema";
import { err } from "@/lib/result";
import { resolveDateColumns } from "@/server/date-resolver";
import { applyEntityTags, pruneOrphanTags, tagRefsField } from "@/server/tags";
import { withUniqueName } from "@/server/unique-name";

const SESSION_NAME_CONFLICT =
	"A session with this name already exists in this campaign.";

export const createSession = createServerFn({ method: "POST" })
	.inputValidator(
		applyDateRefinements(
			z.object({
				campaignId: z.string(),
				id: z.string().uuid().optional(),
				name: z.string().min(1).max(200),
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
				tags: tagRefsField,
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		return withUniqueName(
			SESSION_NAME_CONFLICT,
			() =>
				db.query.gameSessions.findFirst({
					where: and(
						eq(gameSessions.campaignId, data.campaignId),
						eq(gameSessions.name, data.name),
					),
					columns: { id: true },
				}),
			async () => {
				const [session] = await db
					.insert(gameSessions)
					.values({
						...(data.id ? { id: data.id } : {}),
						campaignId: data.campaignId,
						name: data.name,
						summary: data.summary,
						notes: data.notes,
						privateNotes: data.privateNotes,
						isSecret: data.isSecret,
						...dateResult.cols,
					})
					.returning();
				const tags = await applyEntityTags(
					data.campaignId,
					{ sessionId: session.id },
					data.tags,
				);
				return { ...session, tags };
			},
		);
	});

export const updateSession = createServerFn({ method: "POST" })
	.inputValidator(
		applyDateRefinements(
			z.object({
				campaignId: z.string(),
				sessionId: z.string(),
				name: z.string().min(1).max(200),
				summary: z.string().min(1).max(5_000),
				notes: z.string().max(50_000),
				privateNotes: z.string().max(50_000),
				isSecret: z.boolean(),
				tags: tagRefsField,
				...dateFields,
			}),
		),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const dateResult = await resolveDateColumns(data.campaignId, data);
		if (!dateResult.ok) return err(dateResult.error);

		return withUniqueName(
			SESSION_NAME_CONFLICT,
			() =>
				db.query.gameSessions.findFirst({
					where: and(
						eq(gameSessions.campaignId, data.campaignId),
						eq(gameSessions.name, data.name),
						ne(gameSessions.id, data.sessionId),
					),
					columns: { id: true },
				}),
			async () => {
				const [session] = await db
					.update(gameSessions)
					.set({
						name: data.name,
						summary: data.summary,
						notes: data.notes,
						privateNotes: data.privateNotes,
						isSecret: data.isSecret,
						...dateResult.cols,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(gameSessions.id, data.sessionId),
							eq(gameSessions.campaignId, data.campaignId),
						),
					)
					.returning();
				const tags = await applyEntityTags(
					data.campaignId,
					{ sessionId: data.sessionId },
					data.tags,
				);
				return { ...session, tags };
			},
		);
	});

export const deleteSession = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), sessionId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db
			.delete(gameSessions)
			.where(
				and(
					eq(gameSessions.id, data.sessionId),
					eq(gameSessions.campaignId, data.campaignId),
				),
			);

		// entity_tags cascade with the session, which can leave a tag with no
		// carrier.
		await pruneOrphanTags(data.campaignId);

		return { success: true };
	});
