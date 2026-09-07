---
status: todo
blockedBy:
  - "[[RDX-01 Arbitrary tags on nouns and sessions]]"
---

CSV import and export ignore tags, so a round-trip through export-then-import
silently drops them.

## Notes

[[RDX-01 Arbitrary tags on nouns and sessions]] added tags without touching
`src/lib/csv.ts` or `src/server/import-csv.ts`. Backup-and-restore is the stated
point of the export, so losing tags on the way through is a real hole.

Shape it as one optional `tags` column holding a delimited list. Comma is taken
by CSV itself and semicolons read naturally in a quoted cell, so `"Ally; Tavern"`
is probably the right format — but whatever is chosen, export and
`buildImportPreview` have to agree.

Things the existing pipeline already decides for us:

- **Validation is client-side first.** `buildImportPreview` builds the preview
  the user approves, so tag-name errors (too long, too many per row) belong
  there alongside the date checks, using the limits in `src/lib/tags.ts`.
- **The server re-validates.** `importNouns` / `importSessions` don't trust the
  preview; they'd need the same normalisation, since the client path can be
  bypassed.
- **Import is a single bulk insert** with `onConflictDoNothing`. Tags need join
  rows per inserted entity, so this stops being one statement — and rows skipped
  as duplicates must not have their tags applied to the pre-existing entity
  (or must deliberately merge, which is a decision to make explicitly).
- **Tags are created on demand.** Import should reuse `applyEntityTags`
  (`src/server/tags.ts`) rather than growing a second path that writes `tags`
  rows, or the case-insensitive reuse rule drifts.

Unknown columns are a warning rather than an error today, so an old export
without a `tags` column keeps importing cleanly either way.
