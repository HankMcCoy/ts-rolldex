import { describe, expect, it } from "vitest";
import {
	buildImportPreview,
	csvFilename,
	partitionPreview,
	serializeNounsToCsv,
	serializeSessionsToCsv,
} from "@/lib/csv";

const emptyExisting = { nouns: new Set<string>(), sessions: new Set<string>() };

describe("buildImportPreview (nouns)", () => {
	it("rejects a CSV missing required columns", () => {
		const csv = "name,summary\nFoo,bar\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/missing required column/);
	});

	it("parses minimal valid rows and reports unknown columns", () => {
		const csv =
			"name,type,summary,extraneous\n" +
			'"Lord Velga",PERSON,"Captain.","ignored"\n';
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { ok, errors } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(ok).toHaveLength(1);
		expect(ok[0].data).toMatchObject({
			name: "Lord Velga",
			nounType: "PERSON",
			summary: "Captain.",
			notes: "",
			privateNotes: "",
			isSecret: false,
		});
		expect(preview.unknownColumns).toEqual(["extraneous"]);
	});

	it("flags an invalid type as a row error", () => {
		const csv = "name,type,summary\nFoo,Wizard,Bar\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].rowNumber).toBe(2);
	});

	it("marks rows whose name is already in the bundle as duplicates", () => {
		const csv = "name,type,summary\nLord Velga,PERSON,Captain\n";
		const existing = {
			nouns: new Set(["lord velga"]),
			sessions: new Set<string>(),
		};
		const preview = buildImportPreview("nouns", csv, existing);
		const { duplicates, ok } = partitionPreview(preview);
		expect(ok).toHaveLength(0);
		expect(duplicates).toHaveLength(1);
		expect(duplicates[0].reason).toBe("existing");
	});

	it("flags a name that appears twice in the same CSV as a duplicate", () => {
		const csv =
			"name,type,summary\n" +
			"Lord Velga,PERSON,Captain\n" +
			"Lord Velga,PLACE,A different one\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { ok, duplicates } = partitionPreview(preview);
		expect(ok).toHaveLength(1);
		expect(duplicates).toHaveLength(1);
		expect(duplicates[0].reason).toBe("duplicate-in-file");
	});

	it("accepts varied truthy/falsy literals for isSecret", () => {
		const csv =
			"name,type,summary,isSecret\n" +
			"A,PERSON,x,true\nB,PERSON,x,1\nC,PERSON,x,yes\n" +
			"D,PERSON,x,false\nE,PERSON,x,no\nF,PERSON,x,\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { ok, errors } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(ok.map((r) => r.data.isSecret)).toEqual([
			true,
			true,
			true,
			false,
			false,
			false,
		]);
	});

	it("rejects an unparseable isSecret value", () => {
		const csv = "name,type,summary,isSecret\nA,PERSON,x,maybe\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/isSecret/);
	});
});

describe("buildImportPreview (sessions)", () => {
	it("does not require a type column", () => {
		const csv = "name,summary\nKickoff,The party meets at the inn\n";
		const preview = buildImportPreview("sessions", csv, emptyExisting);
		const { ok, errors } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(ok).toHaveLength(1);
		expect(ok[0].data).toMatchObject({
			name: "Kickoff",
			summary: "The party meets at the inn",
		});
	});
});

describe("export round-trip", () => {
	it("re-imports a serialized noun export to the same shape", () => {
		const exported = [
			{
				name: "Lord Velga",
				nounType: "PERSON" as const,
				summary: "Captain of the harbor guard.",
				notes: "Speaks in clipped sentences.",
				privateNotes: "Took a bribe from the Sallow.",
				isSecret: false,
				dateYear: null,
				dateMonth: null,
				dateDay: null,
				endDateYear: null,
				endDateMonth: null,
				endDateDay: null,
			},
			{
				name: "The Hollow Gate",
				nounType: "PLACE" as const,
				summary: "A ruined arch, three days' march south.",
				// Notes intentionally exercise quoting + embedded comma + newline.
				notes: 'Locals call it "the gate."\nNothing grows within the arch.',
				privateNotes: "",
				isSecret: true,
				dateYear: null,
				dateMonth: null,
				dateDay: null,
				endDateYear: null,
				endDateMonth: null,
				endDateDay: null,
			},
		];
		const csv = serializeNounsToCsv(exported);
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { ok, errors, duplicates } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(duplicates).toHaveLength(0);
		expect(ok).toHaveLength(2);
		expect(ok[0].data).toMatchObject({
			name: exported[0].name,
			nounType: exported[0].nounType,
			summary: exported[0].summary,
			notes: exported[0].notes,
			privateNotes: exported[0].privateNotes,
			isSecret: exported[0].isSecret,
		});
		expect(ok[1].data).toMatchObject({
			name: exported[1].name,
			nounType: exported[1].nounType,
			summary: exported[1].summary,
			notes: exported[1].notes,
			privateNotes: exported[1].privateNotes,
			isSecret: exported[1].isSecret,
		});
	});

	it("re-imports a serialized session export to the same shape", () => {
		const exported = [
			{
				name: "Session 3 — Into the Reach",
				summary: "The party crosses the marsh.",
				notes: "Combat with two ghouls; Velga critical-failed a save.",
				privateNotes: "",
				isSecret: false,
				dateYear: null,
				dateMonth: null,
				dateDay: null,
				endDateYear: null,
				endDateMonth: null,
				endDateDay: null,
			},
		];
		const csv = serializeSessionsToCsv(exported);
		const preview = buildImportPreview("sessions", csv, emptyExisting);
		const { ok, errors } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(ok).toHaveLength(1);
		expect(ok[0].data).toEqual({
			name: "Session 3 — Into the Reach",
			summary: "The party crosses the marsh.",
			notes: "Combat with two ghouls; Velga critical-failed a save.",
			privateNotes: "",
			isSecret: false,
			dateYear: null,
			dateMonth: null,
			dateDay: null,
			endDateYear: null,
			endDateMonth: null,
			endDateDay: null,
		});
	});

	it("dates round-trip losslessly through export → import", () => {
		const exported = [
			{
				name: "The Burning of Faldorne",
				nounType: "EVENT" as const,
				summary: "A fortnight's siege ended in fire.",
				notes: "",
				privateNotes: "",
				isSecret: false,
				dateYear: 1492,
				dateMonth: 3,
				dateDay: 15,
				endDateYear: 1492,
				endDateMonth: 3,
				endDateDay: 28,
			},
			{
				name: "The Hollow Gate",
				nounType: "PLACE" as const,
				summary: "A ruined arch.",
				notes: "",
				privateNotes: "",
				isSecret: false,
				// Undated row sits next to a dated one in the same export.
				dateYear: null,
				dateMonth: null,
				dateDay: null,
				endDateYear: null,
				endDateMonth: null,
				endDateDay: null,
			},
		];
		const csv = serializeNounsToCsv(exported);
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { ok, errors } = partitionPreview(preview);
		expect(errors).toHaveLength(0);
		expect(ok).toHaveLength(2);
		// Date columns are now part of the schema, so they don't show up in the
		// "unknown columns will be ignored" list.
		expect(preview.unknownColumns).toEqual([]);
		expect(ok[0].data).toMatchObject({
			dateYear: 1492,
			dateMonth: 3,
			dateDay: 15,
			endDateYear: 1492,
			endDateMonth: 3,
			endDateDay: 28,
		});
		expect(ok[1].data).toMatchObject({
			dateYear: null,
			dateMonth: null,
			dateDay: null,
			endDateYear: null,
			endDateMonth: null,
			endDateDay: null,
		});
	});
});

describe("date column validation", () => {
	it("rejects a partial start triplet", () => {
		const csv = "name,type,summary,dateYear,dateMonth\nA,EVENT,x,1492,3\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/all be set together/);
	});

	it("rejects an end date without a start date", () => {
		const csv =
			"name,type,summary,endDateYear,endDateMonth,endDateDay\nA,EVENT,x,1492,3,15\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/end date requires a start date/i);
	});

	it("rejects a day outside the month's range (Earth Gregorian)", () => {
		const csv =
			"name,type,summary,dateYear,dateMonth,dateDay\nA,EVENT,x,1492,1,30\n";
		// February (monthIndex 1) only has 28 days in the default calendar.
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/Day must be between/);
	});

	it("rejects an end date before its start date", () => {
		const csv =
			"name,type,summary,dateYear,dateMonth,dateDay,endDateYear,endDateMonth,endDateDay\nA,EVENT,x,1492,3,28,1492,3,15\n";
		const preview = buildImportPreview("nouns", csv, emptyExisting);
		const { errors } = partitionPreview(preview);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/on or after the start date/);
	});
});

describe("csvFilename", () => {
	it("slugifies the campaign name and appends the kind", () => {
		expect(csvFilename("The Shadow Coast", "nouns")).toBe(
			"the-shadow-coast-nouns.csv",
		);
		expect(csvFilename("  Weird-Chars!  ", "sessions")).toBe(
			"weird-chars-sessions.csv",
		);
	});

	it("falls back to a default stem when nothing is left after slugification", () => {
		expect(csvFilename("???", "nouns")).toBe("campaign-nouns.csv");
	});
});
