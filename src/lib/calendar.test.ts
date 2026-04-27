import { describe, expect, it } from "vitest";
import {
	type Calendar,
	calendarSchema,
	daysPerYear,
	EARTH_GREGORIAN_CALENDAR,
	formatDate,
	toAbsoluteDay,
	validateDateAgainstCalendar,
} from "@/lib/calendar";

const FANTASY_CALENDAR: Calendar = {
	months: [
		{ name: "Hammer", days: 30 },
		{ name: "Alturiak", days: 30 },
		{ name: "Mirtul", days: 28 },
	],
};

describe("daysPerYear", () => {
	it("sums Earth Gregorian to 365", () => {
		expect(daysPerYear(EARTH_GREGORIAN_CALENDAR)).toBe(365);
	});

	it("sums fantasy calendar correctly", () => {
		expect(daysPerYear(FANTASY_CALENDAR)).toBe(88);
	});
});

describe("toAbsoluteDay", () => {
	it("returns 0 for year 0 month 0 day 1", () => {
		expect(
			toAbsoluteDay(
				{ year: 0, monthIndex: 0, day: 1 },
				EARTH_GREGORIAN_CALENDAR,
			),
		).toBe(0);
	});

	it("preserves order within a single year", () => {
		const a = toAbsoluteDay(
			{ year: 1492, monthIndex: 0, day: 1 },
			FANTASY_CALENDAR,
		);
		const b = toAbsoluteDay(
			{ year: 1492, monthIndex: 0, day: 15 },
			FANTASY_CALENDAR,
		);
		const c = toAbsoluteDay(
			{ year: 1492, monthIndex: 1, day: 1 },
			FANTASY_CALENDAR,
		);
		expect(a).toBeLessThan(b);
		expect(b).toBeLessThan(c);
	});

	it("preserves order across years", () => {
		const lateYear = toAbsoluteDay(
			{ year: 1, monthIndex: 2, day: 28 },
			FANTASY_CALENDAR,
		);
		const earlyYear = toAbsoluteDay(
			{ year: 2, monthIndex: 0, day: 1 },
			FANTASY_CALENDAR,
		);
		expect(lateYear).toBeLessThan(earlyYear);
	});

	it("handles negative years monotonically", () => {
		const minus1 = toAbsoluteDay(
			{ year: -1, monthIndex: 2, day: 28 },
			FANTASY_CALENDAR,
		);
		const zero = toAbsoluteDay(
			{ year: 0, monthIndex: 0, day: 1 },
			FANTASY_CALENDAR,
		);
		expect(minus1).toBeLessThan(zero);
	});
});

describe("formatDate", () => {
	it("renders year, month name, and day", () => {
		expect(
			formatDate({ year: 1492, monthIndex: 0, day: 15 }, FANTASY_CALENDAR),
		).toBe("1492 Hammer 15");
	});

	it("falls back to a synthetic name for an out-of-range month", () => {
		expect(
			formatDate({ year: 1, monthIndex: 99, day: 1 }, FANTASY_CALENDAR),
		).toBe("1 Month 100 1");
	});
});

describe("validateDateAgainstCalendar", () => {
	it("accepts a valid date", () => {
		expect(
			validateDateAgainstCalendar(
				{ year: 1492, monthIndex: 0, day: 15 },
				FANTASY_CALENDAR,
			),
		).toEqual({ ok: true });
	});

	it("rejects an out-of-range month", () => {
		const r = validateDateAgainstCalendar(
			{ year: 1, monthIndex: 5, day: 1 },
			FANTASY_CALENDAR,
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.field).toBe("month");
	});

	it("rejects a day past the month length", () => {
		const r = validateDateAgainstCalendar(
			{ year: 1, monthIndex: 2, day: 29 },
			FANTASY_CALENDAR,
		);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.field).toBe("day");
			expect(r.error).toContain("28");
		}
	});

	it("rejects day < 1", () => {
		const r = validateDateAgainstCalendar(
			{ year: 1, monthIndex: 0, day: 0 },
			FANTASY_CALENDAR,
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.field).toBe("day");
	});

	it("rejects non-integer year", () => {
		const r = validateDateAgainstCalendar(
			{ year: 1.5, monthIndex: 0, day: 1 },
			FANTASY_CALENDAR,
		);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.field).toBe("year");
	});
});

describe("calendarSchema", () => {
	it("accepts the Earth default", () => {
		expect(() => calendarSchema.parse(EARTH_GREGORIAN_CALENDAR)).not.toThrow();
	});

	it("rejects an empty months array", () => {
		expect(() => calendarSchema.parse({ months: [] })).toThrow();
	});

	it("rejects a month with zero days", () => {
		expect(() =>
			calendarSchema.parse({ months: [{ name: "Bad", days: 0 }] }),
		).toThrow();
	});

	it("rejects a month with empty name", () => {
		expect(() =>
			calendarSchema.parse({ months: [{ name: "", days: 30 }] }),
		).toThrow();
	});
});
