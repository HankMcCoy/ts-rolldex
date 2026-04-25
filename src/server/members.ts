import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { members } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";

/**
 * Called after a new user registers to backfill member rows
 * that were created by email invite before the account existed.
 * Derives both email and userId from the active session — never trusts the body.
 */
export const linkMemberAccounts = createServerFn().handler(async () => {
	const { user } = await requireSession();
	await db
		.update(members)
		.set({ userId: user.id })
		.where(and(eq(members.email, user.email), isNull(members.userId)));
});

export const inviteMember = createServerFn()
	.inputValidator(
		z.object({ campaignId: z.string(), email: z.string().email() }),
	)
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
