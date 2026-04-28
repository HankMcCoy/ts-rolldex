import { z } from "zod";

/**
 * The six date columns shared by nouns and game_sessions. Spread into a zod
 * object schema with `...dateFields`. Used together with `applyDateRefinements`
 * to enforce all-or-none + end-requires-start in one place.
 */
export const dateFields = {
	dateYear: z.number().int().optional(),
	dateMonth: z.number().int().optional(),
	dateDay: z.number().int().optional(),
	endDateYear: z.number().int().optional(),
	endDateMonth: z.number().int().optional(),
	endDateDay: z.number().int().optional(),
} as const;

export interface DateFieldsValue {
	dateYear?: number;
	dateMonth?: number;
	dateDay?: number;
	endDateYear?: number;
	endDateMonth?: number;
	endDateDay?: number;
}

function presentCount(...vs: (number | undefined)[]) {
	return vs.filter((v) => v !== undefined).length;
}

/**
 * Adds the three invariants we want on every entry that exposes a date:
 * 1. dateYear/Month/Day are all present or all absent
 * 2. endDateYear/Month/Day are all present or all absent
 * 3. an end date requires a start date
 *
 * Mirrors the DB CHECK constraints in `app.ts`. Apply this to any schema that
 * contains the six date columns (server inputValidator, client form schemas).
 */
export function applyDateRefinements<S extends z.ZodType<DateFieldsValue>>(
	schema: S,
) {
	return schema
		.refine(
			(d) => {
				const n = presentCount(d.dateYear, d.dateMonth, d.dateDay);
				return n === 0 || n === 3;
			},
			{
				message: "Year, month, and day must be set together",
				path: ["dateDay"],
			},
		)
		.refine(
			(d) => {
				const n = presentCount(d.endDateYear, d.endDateMonth, d.endDateDay);
				return n === 0 || n === 3;
			},
			{
				message: "End year, month, and day must be set together",
				path: ["endDateDay"],
			},
		)
		.refine(
			(d) => {
				const hasEnd =
					d.endDateYear !== undefined ||
					d.endDateMonth !== undefined ||
					d.endDateDay !== undefined;
				if (!hasEnd) return true;
				return (
					d.dateYear !== undefined &&
					d.dateMonth !== undefined &&
					d.dateDay !== undefined
				);
			},
			{ message: "End date requires a start date", path: ["endDateDay"] },
		);
}
