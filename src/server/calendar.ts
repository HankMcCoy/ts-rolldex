import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { campaigns, gameSessions, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { calendarSchema } from "@/lib/calendar";
import { err, ok } from "@/lib/result";

interface DateConflict {
	kind: "noun" | "session";
	id: string;
	name: string;
	monthIndex: number;
	day: number;
}

export const updateCalendar = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			calendar: calendarSchema,
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const [datedNouns, datedSessions] = await Promise.all([
			db.query.nouns.findMany({
				where: and(
					eq(nouns.campaignId, data.campaignId),
					isNotNull(nouns.dateYear),
				),
				columns: { id: true, name: true, dateMonth: true, dateDay: true },
			}),
			db.query.gameSessions.findMany({
				where: and(
					eq(gameSessions.campaignId, data.campaignId),
					isNotNull(gameSessions.dateYear),
				),
				columns: { id: true, name: true, dateMonth: true, dateDay: true },
			}),
		]);

		const conflicts: DateConflict[] = [];
		const months = data.calendar.months;
		for (const n of datedNouns) {
			const m = n.dateMonth as number;
			const d = n.dateDay as number;
			if (m < 0 || m >= months.length || d > months[m].days) {
				conflicts.push({
					kind: "noun",
					id: n.id,
					name: n.name,
					monthIndex: m,
					day: d,
				});
			}
		}
		for (const s of datedSessions) {
			const m = s.dateMonth as number;
			const d = s.dateDay as number;
			if (m < 0 || m >= months.length || d > months[m].days) {
				conflicts.push({
					kind: "session",
					id: s.id,
					name: s.name,
					monthIndex: m,
					day: d,
				});
			}
		}

		if (conflicts.length > 0) {
			const summary = conflicts
				.slice(0, 5)
				.map((c) => `"${c.name}" (month ${c.monthIndex + 1}, day ${c.day})`)
				.join(", ");
			const more =
				conflicts.length > 5 ? ` and ${conflicts.length - 5} more` : "";
			return err(
				`Cannot save: ${conflicts.length} dated entr${conflicts.length === 1 ? "y" : "ies"} would become invalid — ${summary}${more}. Adjust those dates first.`,
			);
		}

		await db
			.update(campaigns)
			.set({ calendar: data.calendar, updatedAt: new Date() })
			.where(eq(campaigns.id, data.campaignId));

		return ok({ success: true });
	});
