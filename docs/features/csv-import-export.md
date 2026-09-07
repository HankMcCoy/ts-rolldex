# CSV import and export

At `/campaigns/$campaignId/settings/import`, ADMIN only. Handles nouns and
sessions separately — pick a kind, then import or export.

## Columns

| Kind | Required | Optional |
|---|---|---|
| Nouns | `name`, `type`, `summary` | `notes`, `privateNotes`, `isSecret`, and the six date columns |
| Sessions | `name`, `summary` | same |

Date columns are `dateYear`, `dateMonth`, `dateDay`, `endDateYear`,
`endDateMonth`, `endDateDay`.

Two gotchas for anyone hand-editing a file:

- The noun type column is called **`type`** in CSV but `nounType` in the
  schema. Values are upper-cased before validation, so `person` works.
- **`dateMonth` is a 0-based index**, matching the schema and the date pickers.
  January is `0`. This is deliberate but reliably surprises people.

`isSecret` accepts `true/1/yes/y/x/secret` as true and `false/0/no/n/`(empty)
as false. Anything else is a row error rather than a silent default.

## Import pipeline

Parsing and validation happen **client-side first**, in
`buildImportPreview` (`src/lib/csv.ts`), so the user sees a full preview before
anything is written. Papaparse with `header: true` and greedy empty-line
skipping; headers are trimmed.

Each row lands in one of three outcomes:

| Outcome | Meaning |
|---|---|
| `ok` | Valid, will be inserted |
| `duplicate` | Name already exists in the campaign (`existing`) or appears twice in the file (`duplicate-in-file`). Skipped silently |
| `error` | Blocks the whole import until the file is fixed |

Duplicate detection compares **lowercased names** against sets built from the
in-memory bundle — no server call. Unknown columns are collected into
`unknownColumns` and surfaced as a warning, not an error. A missing required
column short-circuits with a single row-0 error.

Row numbers shown to the user start at **2**, since the header is row 1.

Date cells go through `parseDateCells`, which repeats the same three structural
invariants plus `validateDateAgainstCalendar` and the end-≥-start check against
**the campaign's actual calendar** (passed in from `campaign.calendar`).

## Server side

`importNouns` / `importSessions` (`src/server/import-csv.ts`) do **not** trust
the preview. They re-run `validateRowDates` against a freshly loaded calendar
— the client path can be bypassed — and reject the whole batch on the first
bad row, naming it by row number.

- Capped at `MAX_ROWS = 2000` per call.
- Single bulk insert with `.onConflictDoNothing({ target: [campaignId, name] })`,
  so a file that partially overlaps existing data still imports the rest.
- Returns `{ inserted, skipped }` computed from the returned ids, which the UI
  renders as "n imported, m skipped".

## Export

`serializeNounsToCsv` / `serializeSessionsToCsv` write every column import
understands, including the date triplets, so a round-trip is lossless for
everything the format covers.

`downloadCsv` prepends a UTF-8 BOM so Excel doesn't mojibake. Papaparse strips
it transparently, so re-importing into Rolldex is unaffected. Filenames come
from `csvFilename`, which slugs the campaign name (`curse-of-strahd-nouns.csv`).

Export reads the bundle, so a READ_ONLY user would export only what they can
see — but the route is ADMIN-gated anyway.

> **Stale comment.** The block comment above `serializeNounsToCsv` says the
> date columns are "tolerated" by import and that a round-trip is
> "forward-compatible if import gains date support later". Import gained date
> support in `f95e1d1`; the dates are now in `OPTIONAL_NOUN_COLUMNS` and are
> fully parsed and validated. Trust the code, not that comment.
