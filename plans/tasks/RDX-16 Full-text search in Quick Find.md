---
status: todo
blockedBy: []
---

Cmd-K only matches entity names. A DM who remembers "the innkeeper who owed
Dave money" but not the innkeeper's name cannot find them, even though the
sentence is sitting in a note.

## Notes

`src/components/QuickFindDialog.tsx` does a `name.toLowerCase().includes(q)`
over nouns and sessions and `break`s at `RESULT_LIMIT = 5` per group. Two
consequences worth naming: summaries and note bodies are never searched, and
because the loop breaks at the cap, results are "first 5 in bundle order"
rather than the best 5.

Every competitor searches note bodies. See `docs/competitive-analysis.md`.

### Reuse the existing text assembly

`buildCandidates` (`src/lib/queries.ts`) already concatenates
`summary + notes + privateNotes` per entity for `computeRelatedEntities`, and
already drops `privateNotes` for READ_ONLY viewers. Search should reuse it
rather than growing a second assembly path — if the two disagree, the
privateNotes rule drifts and a player gets a hit on text they can't read.

### Ranking becomes mandatory

Once bodies match, the 5-per-group cap starts discarding good results. A name
hit has to outrank a summary hit has to outrank a body hit, and the cap has to
apply after scoring rather than as a `break`.

A body hit also needs a snippet with the matched span marked, or the result is
unexplained — the user sees an entity name and no reason it's there.

### Watch the synchronous budget before adding a debounce

Not debouncing is a deliberate property of the bundle architecture, not an
oversight. Notes are capped at 50,000 characters each, so a large campaign is a
few MB of text scanned per keystroke. Measure it before reaching for a debounce;
a lowercased index memoised off the bundle is likely enough, and keeping the
no-loading-state feel is worth some work.

### Ordering against the other palette task

[[RDX-05 Tag views in the Cmd-K palette]] adds a third result kind to the same
component. Whichever lands first should establish the result-kind and scoring
shape so the second isn't a rewrite.
