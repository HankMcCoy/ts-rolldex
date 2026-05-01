import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { nounTypeSchema } from "@/lib/noun-types";

const MAX_ROWS = 2000;

const nounRowSchema = z.object({
	name: z.string().min(1).max(200),
	nounType: nounTypeSchema,
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000).default(""),
	privateNotes: z.string().max(50_000).default(""),
	isSecret: z.boolean().default(false),
});

const sessionRowSchema = z.object({
	name: z.string().min(1).max(200),
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000).default(""),
	privateNotes: z.string().max(50_000).default(""),
	isSecret: z.boolean().default(false),
});

/**
 * Bulk-insert nouns from a CSV the client has already parsed and validated.
 * Returns counts so the UI can render a "n imported, m skipped as duplicates"
 * summary. The (campaignId, name) unique index handles any duplicates the
 * client preview missed; ON CONFLICT DO NOTHING means partial overlap with
 * existing data still imports the rest of the file.
 */
export const importNouns = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			rows: z.array(nounRowSchema).max(MAX_ROWS),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		if (data.rows.length === 0) return { inserted: 0, skipped: 0 };

		const inserted = await db
			.insert(nouns)
			.values(
				data.rows.map((r) => ({
					campaignId: data.campaignId,
					name: r.name,
					nounType: r.nounType,
					summary: r.summary,
					notes: r.notes,
					privateNotes: r.privateNotes,
					isSecret: r.isSecret,
				})),
			)
			.onConflictDoNothing({ target: [nouns.campaignId, nouns.name] })
			.returning({ id: nouns.id });

		return {
			inserted: inserted.length,
			skipped: data.rows.length - inserted.length,
		};
	});

export const importSessions = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			rows: z.array(sessionRowSchema).max(MAX_ROWS),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		if (data.rows.length === 0) return { inserted: 0, skipped: 0 };

		const inserted = await db
			.insert(gameSessions)
			.values(
				data.rows.map((r) => ({
					campaignId: data.campaignId,
					name: r.name,
					summary: r.summary,
					notes: r.notes,
					privateNotes: r.privateNotes,
					isSecret: r.isSecret,
				})),
			)
			.onConflictDoNothing({
				target: [gameSessions.campaignId, gameSessions.name],
			})
			.returning({ id: gameSessions.id });

		return {
			inserted: inserted.length,
			skipped: data.rows.length - inserted.length,
		};
	});
