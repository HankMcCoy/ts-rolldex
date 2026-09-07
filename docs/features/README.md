# Rolldex feature documentation

Written for future readers — mostly LLM sessions — who need to understand what
this app already does before changing it. Each file covers one user-facing
capability: what it does, where the code lives, and the non-obvious rules that
aren't visible from a single file.

`../../AGENTS.md` covers **architecture** (the bundle pattern, mutation
lifecycle, how to add a resource). These docs cover **behaviour**. Read
AGENTS.md first if you're about to write code; read these to find out whether
something already exists and how it currently works.

## Index

| Doc | Covers |
|---|---|
| [campaigns.md](campaigns.md) | The top-level container, dashboard, settings hub |
| [entities-and-sessions.md](entities-and-sessions.md) | Nouns and game sessions — the two content types |
| [access-control-and-sharing.md](access-control-and-sharing.md) | ADMIN/READ_ONLY/NONE, invites, secrets, private notes |
| [calendar-and-timeline.md](calendar-and-timeline.md) | Per-campaign calendars, in-world dates, the timeline |
| [maps-and-pins.md](maps-and-pins.md) | Map images, pinning entities to coordinates |
| [markdown-notes.md](markdown-notes.md) | The Tiptap editor, callouts, tables, the read-side renderer |
| [templates.md](templates.md) | Reusable markdown blocks in the slash menu |
| [quick-find-and-shortcuts.md](quick-find-and-shortcuts.md) | Cmd-K palette, Cmd-E, Cmd-S |
| [csv-import-export.md](csv-import-export.md) | Bulk import and backup export |
| [images.md](images.md) | R2 upload/removal for entity and map images |
| [auth-and-accounts.md](auth-and-accounts.md) | Better Auth, registration, invite linking |

## The one thing to know first

Every view under `/campaigns/$campaignId/*` is rendered from a **single
server round-trip**. `getCampaignBundle` (`src/server/campaigns.ts`) returns
the campaign plus every noun, session, map, pin, member, and template the
caller is allowed to see. The parent route loads it once; children read
slices through selector hooks in `src/lib/queries.ts` and never fetch.

Two consequences that shape almost every feature below:

- **Filtering and search are synchronous, client-side, and free.** Quick Find,
  related entities, the timeline, and CSV import's duplicate detection all run
  over in-memory arrays. Nothing debounces; nothing round-trips.
- **Access control is applied server-side, once, in the bundle.** The client
  never receives data it shouldn't see, so components don't re-check
  permissions before rendering — only before offering *actions*.

## Cross-cutting invariants

These hold across every feature; the individual docs won't repeat them.

- **Every write requires ADMIN.** Server fns call `requireSession()` then
  `requireCampaignAccess(campaignId, user, "ADMIN")`. READ_ONLY members can
  read a campaign and nothing else.
- **Identity is never taken from the request body.** User id and email come
  from the Better Auth session, server-side.
- **Names are unique per campaign** (per owner, for campaigns themselves),
  enforced by a unique index *and* a pre-check. See `withUniqueName`
  (`src/server/unique-name.ts`) — it pre-checks for a friendly message and
  catches Postgres 23505 for the race.
- **Expected business errors return `Result<T>`**, not exceptions.
  `{ ok: false, error }` reaches the client as a `BundleMutationError` thrown
  by `useBundleMutation`, after the optimistic patch has been rolled back.
- **Client-supplied UUIDs.** `create*` server fns accept an optional `id` so
  the optimistic patch and the post-create navigate target are stable from
  the moment a form is submitted.

## Planned work

Tasks live in `plans/` as an Obsidian vault, one file per task, referenced by
ID (`RDX-07`). Where a doc below describes a known gap, it links the task.
