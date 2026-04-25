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
		.where(
			and(eq(members.email, user.email.toLowerCase()), isNull(members.userId)),
		);
});

export const inviteMember = createServerFn()
	.inputValidator(
		z.object({ campaignId: z.string(), email: z.string().email() }),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const normalizedEmail = data.email.toLowerCase();

		const existing = await db.query.members.findFirst({
			where: and(
				eq(members.campaignId, data.campaignId),
				eq(members.email, normalizedEmail),
			),
		});

		if (existing) {
			return { error: "This email has already been invited." };
		}

		await db.insert(members).values({
			campaignId: data.campaignId,
			email: normalizedEmail,
		});

		return { success: true };
	});

export const removeMember = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), memberId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db
			.delete(members)
			.where(
				and(
					eq(members.id, data.memberId),
					eq(members.campaignId, data.campaignId),
				),
			);
		return { success: true };
	});
