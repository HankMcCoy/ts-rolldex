# Entities and sessions

The two content types. **Nouns** (called "entities" in the UI) are named things
in the world; **game sessions** are session notes. They are deliberately almost
the same shape, and most code paths handle both.

Note the table name: `game_sessions`, Drizzle variable `gameSessions`. Never
`sessions` — that collides with Better Auth's own table.

## Shared shape

Both have, in `src/db/schema/app.ts`:

| Field | Rule |
|---|---|
| `name` | Required, ≤200. Unique per campaign |
| `summary` | **Required**, 1–5,000. Plain text — rendered as-is, not markdown |
| `notes` | Optional, ≤50,000. Markdown |
| `privateNotes` | Optional, ≤50,000. Markdown. Stripped to `""` for READ_ONLY |
| `isSecret` | Hides the whole row from READ_ONLY |
| date triplets | `dateYear/Month/Day` + `endDate*`. See [calendar-and-timeline.md](calendar-and-timeline.md) |
| `tagIds` | Free-form labels, saved with the entity. See [tags.md](tags.md) |

`summary` being required is easy to miss — it's `z.string().min(1)` on both
create and update, so a blank summary fails validation rather than defaulting.

## Differences

| | Nouns | Sessions |
|---|---|---|
| Type | `nounType`: PERSON / PLACE / THING / FACTION / EVENT (a hard `pgEnum`) | none |
| Image | `imageKey` → R2 | none |
| Bundle order | `name` ascending | `createdAt` **descending** (newest first) |
| Optimistic insert | `patchAddNoun` appends then re-sorts by name | `patchAddSession` prepends |

`nounType` is a Postgres enum, surfaced through `src/lib/noun-types.ts`
(`NOUN_TYPES`, `NOUN_TYPE_LABELS`, `nounTypeSchema`). It drives list grouping,
the `/nouns?type=` filter, breadcrumbs, `EntityAvatar` icons, and CSV
import/export.

> Making the type user-definable is `RDX-04`, which is the riskiest item in
> `plans/` precisely because the enum is threaded through all of the above.

## Routes

Both follow the same three-route pattern, e.g. for nouns:

- `nouns/index.tsx` — list, with `?type=` search param and filter chips
- `nouns/new.tsx` — create form; accepts `?type=` and `?name=` to prefill
- `nouns/$nounId.tsx` — parent that resolves the row from the cached bundle
  and throws `notFound()` if missing, wrapping `$nounId/index.tsx` (detail)
  and `$nounId/edit.tsx`

The `?name=` prefill on `nouns/new` exists for Quick Find's "Create entity"
action — see [quick-find-and-shortcuts.md](quick-find-and-shortcuts.md).

## Detail page

Main column: tag chips, summary card, notes (markdown-rendered), private notes
(ADMIN only, and only if non-empty), then `PinnedOnMaps`. Right rail: entity
image and `RelatedEntities`.

Delete asks for `confirm()` then runs a **non-optimistic** mutation. This is
deliberate: removing the row from the bundle while still mounted on its detail
page would trip `useNoun`'s `notFound()` before the navigation completes. The
`onSettled` invalidate handles the refresh instead.

## Related entities — implicit linking

`computeRelatedEntities` (`src/lib/relationships.ts`) is a pure function over
the bundle, recomputed on every render. It relates two entities when either
mentions the other **by name** in its text:

- **Forward** — does the current entity's `summary + notes + privateNotes`
  contain the candidate's name?
- **Reverse** — does the candidate's text contain the current entity's name?

Details that matter:

- Matching is case-insensitive, on word boundaries (`\b…\b`), against
  regex-escaped names.
- Possessives are normalised away first: `/'\s*s\b/` is stripped from both
  sides, so "Dave's tavern" matches the entity "Dave".
- The candidate pool is nouns **and** sessions, built by `buildCandidates` in
  `src/lib/queries.ts`. `privateNotes` is only included in the searchable text
  for non-READ_ONLY viewers, so players never get a relationship inferred from
  DM-only text.
- ID-backed inline entity links count as implicit relationships in both
  directions even after an entity is renamed. `extractEntityLinkIds` resolves
  only links scoped to the current campaign.
- The `text` field is stripped from the returned objects — it exists only for
  the reverse-direction check.

## Related entities — declared relationships

An ADMIN can declare a categorised relationship between any two campaign entries,
including noun-to-session and session-to-session links. The detail-page sidebar
supports both starting a relationship from scratch and promoting an implicit
match with the adjacent plus action.

Relationship categories are reusable, campaign-owned groups such as `Family`,
`Political`, or `Goals`. The optional directional labels live on each
relationship instance instead:

- a forward label can say `daughter of` or `is pursuing`;
- a reverse label can independently say `father of` or be omitted;
- both labels may be omitted for a neutral connection grouped only by category.

The source page shows the forward label and the target page shows the reverse
label. An omitted label renders no substitute phrase; the entity still appears
under the category on that endpoint. The creation form offers previous labels
from the chosen category as autocomplete suggestions, but labels are not
canonical vocabulary and never accumulate in a dropdown of their own.

`relationship_categories` stores the groups and `entity_relationships` stores
the edges plus their labels. Both endpoints use noun/session XOR columns,
mirroring `map_pins` and `entity_tags`. Writes live in
`src/server/relationships.ts`; reads are part of `getCampaignBundle`, and
`relationshipsFor` in `src/lib/queries.ts` resolves the category, directional
label, and opposite endpoint for the current detail page.

Multiple relationships may connect the same pair in the same category. Only an
exact duplicate is rejected; entering the equivalent relationship from the
opposite endpoint, with the directional labels swapped, is also an exact
duplicate.

A declared edge suppresses the implicit match for the same pair on **both**
detail pages, regardless of whether the implicit signal came from a name
mention or an inline entity link, and regardless of which endpoint contains it.
Deleting the declared edge therefore allows any text-derived relationship to
appear again.

Relationships have no independent secret flag. Visibility is inherited from
both endpoints: the bundle drops an edge unless the caller can see both entries.
For READ_ONLY callers it also returns only relationship categories used by
visible edges, so category names and labels attached exclusively to hidden
content are not disclosed.
