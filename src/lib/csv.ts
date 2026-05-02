import Papa from "papaparse";
import { z } from "zod";
import { type NounType, nounTypeSchema } from "@/lib/noun-types";

export type ImportKind = "nouns" | "sessions";

export interface ImportNounRow {
	name: string;
	nounType: NounType;
	summary: string;
	notes: string;
	privateNotes: string;
	isSecret: boolean;
}

export interface ImportSessionRow {
	name: string;
	summary: string;
	notes: string;
	privateNotes: string;
	isSecret: boolean;
}

export type ImportRow<K extends ImportKind> = K extends "nouns"
	? ImportNounRow
	: ImportSessionRow;

/**
 * Per-row outcome as the preview builds. `ok` rows proceed to the server;
 * `duplicate` rows are skipped silently (already in the bundle, or appear
 * twice within the CSV); `error` rows block the import until the user fixes
 * the file.
 */
export type RowOutcome<K extends ImportKind> =
	| { kind: "ok"; rowNumber: number; data: ImportRow<K> }
	| {
			kind: "duplicate";
			rowNumber: number;
			name: string;
			reason: "existing" | "duplicate-in-file";
	  }
	| { kind: "error"; rowNumber: number; message: string };

export interface ImportPreview<K extends ImportKind> {
	kind: K;
	totalRows: number;
	outcomes: RowOutcome<K>[];
	unknownColumns: string[];
}

const REQUIRED_NOUN_COLUMNS = ["name", "type", "summary"];
const OPTIONAL_NOUN_COLUMNS = ["notes", "privateNotes", "isSecret"];
const REQUIRED_SESSION_COLUMNS = ["name", "summary"];
const OPTIONAL_SESSION_COLUMNS = ["notes", "privateNotes", "isSecret"];

export function expectedColumns(kind: ImportKind): {
	required: readonly string[];
	optional: readonly string[];
} {
	return kind === "nouns"
		? { required: REQUIRED_NOUN_COLUMNS, optional: OPTIONAL_NOUN_COLUMNS }
		: {
				required: REQUIRED_SESSION_COLUMNS,
				optional: OPTIONAL_SESSION_COLUMNS,
			};
}

const TRUE_LITERALS = new Set(["true", "1", "yes", "y", "x", "secret"]);
const FALSE_LITERALS = new Set(["false", "0", "no", "n", ""]);

function parseBooleanCell(raw: string): boolean | null {
	const v = raw.trim().toLowerCase();
	if (TRUE_LITERALS.has(v)) return true;
	if (FALSE_LITERALS.has(v)) return false;
	return null;
}

const nounRowSchema = z.object({
	name: z.string().min(1).max(200),
	nounType: nounTypeSchema,
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000),
	privateNotes: z.string().max(50_000),
	isSecret: z.boolean(),
});

const sessionRowSchema = z.object({
	name: z.string().min(1).max(200),
	summary: z.string().min(1).max(5_000),
	notes: z.string().max(50_000),
	privateNotes: z.string().max(50_000),
	isSecret: z.boolean(),
});

interface ExistingNames {
	nouns: Set<string>;
	sessions: Set<string>;
}

/**
 * Parses a CSV string and validates it against the schema for `kind`. The
 * existing-names sets come from the in-memory campaign bundle so we can flag
 * duplicates before the user even hits the server.
 */
export function buildImportPreview<K extends ImportKind>(
	kind: K,
	csv: string,
	existing: ExistingNames,
): ImportPreview<K> {
	const parsed = Papa.parse<Record<string, string>>(csv, {
		header: true,
		skipEmptyLines: "greedy",
		transformHeader: (h) => h.trim(),
		transform: (v) => (typeof v === "string" ? v : ""),
	});

	const outcomes: RowOutcome<K>[] = [];
	const seenNames = new Set<string>();
	const headers = parsed.meta.fields ?? [];
	const expected = expectedColumns(kind);
	const allowed = new Set([...expected.required, ...expected.optional]);
	const unknownColumns = headers.filter((h) => h && !allowed.has(h));

	const missing = expected.required.filter((c) => !headers.includes(c));
	if (missing.length > 0) {
		outcomes.push({
			kind: "error",
			rowNumber: 0,
			message: `CSV is missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
		});
		return {
			kind,
			totalRows: parsed.data.length,
			outcomes,
			unknownColumns,
		};
	}

	const existingForKind = kind === "nouns" ? existing.nouns : existing.sessions;
	const schema = kind === "nouns" ? nounRowSchema : sessionRowSchema;

	for (let i = 0; i < parsed.data.length; i++) {
		const raw = parsed.data[i];
		// CSV row numbers are 1-indexed and the header is row 1, so user-visible
		// row numbers start at 2.
		const rowNumber = i + 2;

		const isSecretRaw = (raw.isSecret ?? "").toString();
		const isSecret = parseBooleanCell(isSecretRaw);
		if (isSecret === null) {
			outcomes.push({
				kind: "error",
				rowNumber,
				message: `isSecret must be true/false (got "${isSecretRaw}")`,
			});
			continue;
		}

		const candidate =
			kind === "nouns"
				? {
						name: (raw.name ?? "").trim(),
						nounType: (raw.type ?? "").trim().toUpperCase(),
						summary: (raw.summary ?? "").trim(),
						notes: raw.notes ?? "",
						privateNotes: raw.privateNotes ?? "",
						isSecret,
					}
				: {
						name: (raw.name ?? "").trim(),
						summary: (raw.summary ?? "").trim(),
						notes: raw.notes ?? "",
						privateNotes: raw.privateNotes ?? "",
						isSecret,
					};

		const result = schema.safeParse(candidate);
		if (!result.success) {
			const first = result.error.issues[0];
			const field = first?.path.join(".") || "row";
			outcomes.push({
				kind: "error",
				rowNumber,
				message: `${field}: ${first?.message ?? "invalid"}`,
			});
			continue;
		}

		const name = result.data.name;
		const lowered = name.toLowerCase();
		if (existingForKind.has(lowered)) {
			outcomes.push({
				kind: "duplicate",
				rowNumber,
				name,
				reason: "existing",
			});
			continue;
		}
		if (seenNames.has(lowered)) {
			outcomes.push({
				kind: "duplicate",
				rowNumber,
				name,
				reason: "duplicate-in-file",
			});
			continue;
		}
		seenNames.add(lowered);

		outcomes.push({
			kind: "ok",
			rowNumber,
			data: result.data as ImportRow<K>,
		});
	}

	if (parsed.errors.length > 0) {
		for (const e of parsed.errors) {
			outcomes.push({
				kind: "error",
				rowNumber: (e.row ?? 0) + 2,
				message: `parse: ${e.message}`,
			});
		}
	}

	return {
		kind,
		totalRows: parsed.data.length,
		outcomes,
		unknownColumns,
	};
}

export function partitionPreview<K extends ImportKind>(
	preview: ImportPreview<K>,
) {
	const ok: { rowNumber: number; data: ImportRow<K> }[] = [];
	const duplicates: {
		rowNumber: number;
		name: string;
		reason: "existing" | "duplicate-in-file";
	}[] = [];
	const errors: { rowNumber: number; message: string }[] = [];
	for (const o of preview.outcomes) {
		if (o.kind === "ok") ok.push({ rowNumber: o.rowNumber, data: o.data });
		else if (o.kind === "duplicate") duplicates.push(o);
		else errors.push(o);
	}
	return { ok, duplicates, errors };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

interface DatedRow {
	dateYear: number | null;
	dateMonth: number | null;
	dateDay: number | null;
	endDateYear: number | null;
	endDateMonth: number | null;
	endDateDay: number | null;
}

interface ExportableNoun extends DatedRow {
	name: string;
	nounType: NounType;
	summary: string;
	notes: string;
	privateNotes: string;
	isSecret: boolean;
}

interface ExportableSession extends DatedRow {
	name: string;
	summary: string;
	notes: string;
	privateNotes: string;
	isSecret: boolean;
}

const NOUN_EXPORT_HEADERS = [
	"name",
	"type",
	"summary",
	"notes",
	"privateNotes",
	"isSecret",
	"dateYear",
	"dateMonth",
	"dateDay",
	"endDateYear",
	"endDateMonth",
	"endDateDay",
] as const;

const SESSION_EXPORT_HEADERS = [
	"name",
	"summary",
	"notes",
	"privateNotes",
	"isSecret",
	"dateYear",
	"dateMonth",
	"dateDay",
	"endDateYear",
	"endDateMonth",
	"endDateDay",
] as const;

function emptyIfNull(v: number | null): string {
	return v === null ? "" : String(v);
}

/**
 * CSV export covering the same columns as import, plus the date triplets.
 * The unknown date columns are tolerated by `buildImportPreview` (it warns
 * and drops them), so a round-trip preserves everything import currently
 * understands and is forward-compatible if import gains date support later.
 *
 * `monthIndex` stays 0-based to match the schema and the date pickers in the
 * UI. Spreadsheet-editing users will need to know that, hence the column
 * name `dateMonth` rather than something more user-friendly.
 */
export function serializeNounsToCsv(nouns: ExportableNoun[]): string {
	const rows = nouns.map((n) => ({
		name: n.name,
		type: n.nounType,
		summary: n.summary,
		notes: n.notes,
		privateNotes: n.privateNotes,
		isSecret: n.isSecret ? "true" : "false",
		dateYear: emptyIfNull(n.dateYear),
		dateMonth: emptyIfNull(n.dateMonth),
		dateDay: emptyIfNull(n.dateDay),
		endDateYear: emptyIfNull(n.endDateYear),
		endDateMonth: emptyIfNull(n.endDateMonth),
		endDateDay: emptyIfNull(n.endDateDay),
	}));
	return Papa.unparse(rows, { columns: [...NOUN_EXPORT_HEADERS] });
}

export function serializeSessionsToCsv(sessions: ExportableSession[]): string {
	const rows = sessions.map((s) => ({
		name: s.name,
		summary: s.summary,
		notes: s.notes,
		privateNotes: s.privateNotes,
		isSecret: s.isSecret ? "true" : "false",
		dateYear: emptyIfNull(s.dateYear),
		dateMonth: emptyIfNull(s.dateMonth),
		dateDay: emptyIfNull(s.dateDay),
		endDateYear: emptyIfNull(s.endDateYear),
		endDateMonth: emptyIfNull(s.endDateMonth),
		endDateDay: emptyIfNull(s.endDateDay),
	}));
	return Papa.unparse(rows, { columns: [...SESSION_EXPORT_HEADERS] });
}

/** Sanitizes a campaign name into a download-safe filename stem. */
export function csvFilename(campaignName: string, kind: ImportKind): string {
	const slug =
		campaignName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "campaign";
	return `${slug}-${kind}.csv`;
}

/** Triggers a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
	// Prepended BOM helps Excel auto-detect UTF-8 without mojibake. Tradeoff:
	// strict CSV parsers may surface the BOM as part of the first header cell;
	// papaparse handles it transparently, so re-importing into Rolldex is fine.
	const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
