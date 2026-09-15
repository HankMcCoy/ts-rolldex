import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import {
	entityRelationships,
	gameSessions,
	nouns,
	relationshipTypes,
} from "@/db/schema";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { err, ok } from "@/lib/result";

const targetSchema = z.object({
	kind: z.enum(["noun", "session"]),
	id: z.string(),
});

const relationshipTypeSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("existing"),
		id: z.string().uuid(),
	}),
	z.object({
		kind: z.literal("new"),
		id: z.string().uuid().optional(),
		name: z.string().trim().min(1).max(80),
		forwardLabel: z.string().trim().min(1).max(80),
		reverseLabel: z.string().trim().max(80).optional(),
	}),
]);

export const createRelationship = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			id: z.string().uuid().optional(),
			source: targetSchema,
			target: targetSchema,
			type: relationshipTypeSchema,
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		if (
			data.source.id === data.target.id &&
			data.source.kind === data.target.kind
		)
			return err("An entity cannot relate to itself.");
		const exists = async (target: z.infer<typeof targetSchema>) =>
			target.kind === "noun"
				? db.query.nouns.findFirst({
						where: and(
							eq(nouns.id, target.id),
							eq(nouns.campaignId, data.campaignId),
						),
						columns: { id: true },
					})
				: db.query.gameSessions.findFirst({
						where: and(
							eq(gameSessions.id, target.id),
							eq(gameSessions.campaignId, data.campaignId),
						),
						columns: { id: true },
					});
		if (!(await exists(data.source)) || !(await exists(data.target)))
			return err("Both relationship endpoints must belong to this campaign.");
		let type =
			data.type.kind === "existing"
				? await db.query.relationshipTypes.findFirst({
						where: and(
							eq(relationshipTypes.id, data.type.id),
							eq(relationshipTypes.campaignId, data.campaignId),
						),
					})
				: undefined;
		if (data.type.kind === "existing" && !type)
			return err("That relationship type does not belong to this campaign.");
		if (data.type.kind === "new") {
			const named = await db.query.relationshipTypes.findFirst({
				where: and(
					eq(relationshipTypes.campaignId, data.campaignId),
					eq(relationshipTypes.name, data.type.name),
				),
				columns: { id: true },
			});
			if (named)
				return err("A relationship type with that name already exists.");
			[type] = await db
				.insert(relationshipTypes)
				.values({
					...(data.type.id ? { id: data.type.id } : {}),
					campaignId: data.campaignId,
					name: data.type.name,
					forwardLabel: data.type.forwardLabel,
					reverseLabel: data.type.reverseLabel || null,
				})
				.returning();
		}
		if (!type) return err("Relationship type not found.");
		const existing = await db.query.entityRelationships.findMany({
			where: eq(entityRelationships.relationshipTypeId, type.id),
		});
		const sourceMatches = (
			r: typeof entityRelationships.$inferSelect,
			endpoint: z.infer<typeof targetSchema>,
		) =>
			endpoint.kind === "noun"
				? r.sourceNounId === endpoint.id
				: r.sourceSessionId === endpoint.id;
		const targetMatches = (
			r: typeof entityRelationships.$inferSelect,
			endpoint: z.infer<typeof targetSchema>,
		) =>
			endpoint.kind === "noun"
				? r.targetNounId === endpoint.id
				: r.targetSessionId === endpoint.id;
		if (
			existing.some(
				(r) =>
					(sourceMatches(r, data.source) && targetMatches(r, data.target)) ||
					(sourceMatches(r, data.target) && targetMatches(r, data.source)),
			)
		)
			return err("That relationship already exists.");
		const [relationship] = await db
			.insert(entityRelationships)
			.values({
				...(data.id ? { id: data.id } : {}),
				relationshipTypeId: type.id,
				sourceNounId: data.source.kind === "noun" ? data.source.id : null,
				sourceSessionId: data.source.kind === "session" ? data.source.id : null,
				targetNounId: data.target.kind === "noun" ? data.target.id : null,
				targetSessionId: data.target.kind === "session" ? data.target.id : null,
			})
			.returning();
		return ok({ relationship, type });
	});

export const deleteRelationship = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({ campaignId: z.string(), relationshipId: z.string() }),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		const relationship = await db.query.entityRelationships.findFirst({
			where: eq(entityRelationships.id, data.relationshipId),
			with: { type: { columns: { campaignId: true } } },
		});
		if (relationship?.type?.campaignId === data.campaignId) {
			await db
				.delete(entityRelationships)
				.where(eq(entityRelationships.id, data.relationshipId));
		}
		return { success: true };
	});
