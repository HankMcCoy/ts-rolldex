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
