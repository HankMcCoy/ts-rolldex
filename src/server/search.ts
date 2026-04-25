import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";

export const quickFind = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), query: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(
			data.campaignId,
			user.id,
			user.email,
		);

		const q = `%${data.query.replace(/[\\%_]/g, "\\$&")}%`;

		const [matchedNouns, matchedSessions] = await Promise.all([
			db.query.nouns.findMany({
				where: and(
					eq(nouns.campaignId, data.campaignId),
					ilike(nouns.name, q),
					accessLevel === "READ_ONLY" ? eq(nouns.isSecret, false) : undefined,
				),
				columns: { id: true, name: true, nounType: true },
				limit: 5,
			}),
			db.query.gameSessions.findMany({
				where: and(
					eq(gameSessions.campaignId, data.campaignId),
					ilike(gameSessions.name, q),
					accessLevel === "READ_ONLY"
						? eq(gameSessions.isSecret, false)
						: undefined,
				),
				columns: { id: true, name: true },
				limit: 5,
			}),
		]);

		return { nouns: matchedNouns, sessions: matchedSessions };
	});
