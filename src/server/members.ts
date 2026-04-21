import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { members } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";

/**
 * Called after a new user registers to backfill member rows
 * that were created by email invite before the account existed.
 */
export const linkMemberAccounts = createServerFn()
	.inputValidator(z.object({ email: z.string().email(), userId: z.string() }))
	.handler(async ({ data }) => {
		await db
			.update(members)
			.set({ userId: data.userId })
			.where(and(eq(members.email, data.email), isNull(members.userId)));
	});

export const inviteMember = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), email: z.string().email() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");

		const existing = await db.query.members.findFirst({
			where: and(
				eq(members.campaignId, data.campaignId),
				eq(members.email, data.email),
			),
		});

		if (existing) {
			return { error: "This email has already been invited." };
		}

		await db.insert(members).values({
			campaignId: data.campaignId,
			email: data.email,
		});

		return { success: true };
	});

export const removeMember = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), memberId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email, "ADMIN");
		await db.delete(members).where(eq(members.id, data.memberId));
		return { success: true };
	});

export const getMembers = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user.id, user.email);
		return db.query.members.findMany({
			where: and(
				eq(members.campaignId, data.campaignId),
				or(
					eq(members.userId, user.id),
					and(eq(members.email, user.email), isNull(members.userId)),
				),
			),
			with: { user: true },
		});
	});
