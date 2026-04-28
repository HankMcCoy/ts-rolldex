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
	field: "start" | "end";
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
				columns: {
					id: true,
					name: true,
					dateMonth: true,
					dateDay: true,
					endDateMonth: true,
					endDateDay: true,
				},
			}),
			db.query.gameSessions.findMany({
				where: and(
					eq(gameSessions.campaignId, data.campaignId),
					isNotNull(gameSessions.dateYear),
				),
				columns: {
					id: true,
					name: true,
					dateMonth: true,
					dateDay: true,
					endDateMonth: true,
					endDateDay: true,
				},
			}),
		]);

		const conflicts: DateConflict[] = [];
		const months = data.calendar.months;

		function check(
			kind: "noun" | "session",
			id: string,
			name: string,
			field: "start" | "end",
			month: number | null,
			day: number | null,
		) {
			if (month === null || day === null) return;
			if (month < 0 || month >= months.length || day > months[month].days) {
				conflicts.push({ kind, id, name, monthIndex: month, day, field });
			}
		}

		for (const n of datedNouns) {
			check(
				"noun",
				n.id,
				n.name,
				"start",
				n.dateMonth as number,
				n.dateDay as number,
			);
			check("noun", n.id, n.name, "end", n.endDateMonth, n.endDateDay);
		}
		for (const s of datedSessions) {
			check(
				"session",
				s.id,
				s.name,
				"start",
				s.dateMonth as number,
				s.dateDay as number,
			);
			check("session", s.id, s.name, "end", s.endDateMonth, s.endDateDay);
		}

		if (conflicts.length > 0) {
			const summary = conflicts
				.slice(0, 5)
				.map(
					(c) =>
						`"${c.name}" (${c.field} month ${c.monthIndex + 1}, day ${c.day})`,
				)
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
