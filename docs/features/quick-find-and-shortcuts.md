# Quick Find and keyboard shortcuts

## Quick Find (Cmd-K / Ctrl-K)

`src/components/QuickFindDialog.tsx`, mounted once by the campaign layout route
so it is available on every page inside a campaign.

Because the whole campaign is already in memory, search is a synchronous
`useMemo` over the bundle — **no debounce, no server round-trip, no loading
state**. Current behaviour:

- Case-insensitive **substring match on `name` only**. Summaries and notes are
  not searched, and there is no fuzzy matching.
- Two groups, entities and sessions, capped at `RESULT_LIMIT = 5` each. The
  loop `break`s at the cap, so results are effectively "first 5 in bundle
  order" (nouns by name, sessions by recency) rather than best-scoring.
- Empty query shows nothing.
- Secret entities never appear for READ_ONLY viewers — they aren't in the
  bundle to begin with.

### Create from the palette

With a non-empty query, ADMINs get a trailing "Create entity "<query>"" item.
It **navigates** to `nouns/new?name=<query>`, which prefills the name field.

> That navigation is the problem `RDX-06` addresses. The use case is
> mid-session note-taking: an NPC gets invented at the table and needs to be
> jotted down in seconds without losing your place in the session note. The
> planned version creates in a modal and returns you to what you were looking
> at. See `plans/tasks/RDX-06 Quick create from the Cmd-K palette.md`.

Tags aren't searchable because they don't exist yet; adding tag results that
jump to a filtered view is `RDX-05`.

## Cmd-E / Ctrl-E — edit

`useEditShortcut` (`src/lib/keyboard.ts`). Mounted on detail pages to jump to
the matching edit route: campaign dashboard, noun detail, session detail, map
detail. Passed `enabled = isAdmin`, so it's inert for READ_ONLY viewers.

## Cmd-S / Ctrl-S — save

`useSaveShortcut`. Mounted on every create and edit form to submit it.

Both come from `useModShortcut`, which:

- Treats Cmd (macOS) and Ctrl (elsewhere) as the same chord, and requires that
  Alt and Shift are *not* held.
- Always `preventDefault()`s on a match, so the browser's "Save page as" never
  appears.
- Reads the handler from a ref, so callers can pass a fresh closure every
  render without remounting the listener.

Listeners are attached to `document`, so they fire while focus is inside the
Tiptap editor too.
