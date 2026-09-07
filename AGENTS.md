# Rolldex — Agent Guide

## What this app is

Rolldex is a TTRPG campaign manager. A Dungeon Master (DM) creates campaigns and populates them with **nouns** (named entities: people, places, things, factions, events) and **game sessions** (session notes). Players can be invited by email and given read-only access.

## Existing functionality

`docs/features/` documents what the app already does, one file per capability.
Start at `docs/features/README.md` for the index and the cross-cutting
invariants.

| If you're touching… | Read |
|---|---|
| Campaign CRUD, the dashboard, the settings hub | `campaigns.md` |
| Nouns, game sessions, related-entity inference | `entities-and-sessions.md` |
| Permissions, invites, `isSecret`, `privateNotes` | `access-control-and-sharing.md` |
| In-world dates, calendars, the timeline | `calendar-and-timeline.md` |
| Maps, pins, `MapView` | `maps-and-pins.md` |
| The Tiptap editor, callouts, tables, the renderer | `markdown-notes.md` |
| Tags on nouns or sessions | `tags.md` |
| Slash-menu templates | `templates.md` |
| Cmd-K, Cmd-E, Cmd-S | `quick-find-and-shortcuts.md` |
| CSV import or export | `csv-import-export.md` |
| R2 uploads, `imageKey` | `images.md` |
| Better Auth, registration, session handling | `auth-and-accounts.md` |

This guide covers *architecture* — how to build. Those docs cover *behaviour* —
what exists. **Check them before adding a feature that may already be there**;
several near-misses are already implemented (Quick Find can create an entity,
CSV import already handles dates, related entities are inferred from note text).

### Keeping them current

These docs are only worth having if they stay true, so **update the affected
file in the same change as the code**, not as a follow-up:

- **Behaviour changed** — edit the doc that covers it. If the change makes a
  documented rule wrong, fix the rule; a stale doc is worse than none.
- **New capability** — if it fits an existing file, add a section. If it's a
  genuinely new surface, add a file and register it in `README.md`'s index and
  in the table above.
- **A gap got closed** — the docs link known gaps to their `RDX-NN` task.
  When you implement one, replace the "known gap" note with what the feature
  now does, and set the task's `status: done` in `plans/tasks/`.
- **Invariants** belong in `README.md` only if they genuinely span features;
  otherwise keep them in the file they apply to.

Write for a reader who has not seen the code: state the rule and *why* it
holds, not just where it lives. Prefer file and symbol names over line numbers,
which drift. Don't restate what the schema or a route file already says plainly
— the value is in the rules that no single file makes visible.

## Planned work

Upcoming work is tracked as Markdown in `plans/` (an Obsidian vault). One task per
file in `plans/tasks/`, named `RDX-NN Short title.md`; the `RDX-NN` prefix is the
stable ID to use in commit messages and branch names. Frontmatter carries
`status` (`todo` | `doing` | `done` | `dropped`) and `blockedBy` (wikilinks to
other tasks). See `plans/README.md`.

When a user references a task by ID, read that file first — it holds the intent
and the constraints, which are usually not derivable from the code.

## Concurrency expectations

**This app does not need to handle high concurrency.** Any given campaign will have at most one DM actively editing it at a time. Optimistic locking, conflict detection, and similar patterns are out of scope. Simple `UPDATE … WHERE id = $id` writes are fine. The data layer leans into this — see "Local-first campaign bundle" below.

## Stack

| Layer | Tech |
|---|---|
| Framework | TanStack Start (SSR React, file-based routing) |
| Router | TanStack Router |
| Data layer | TanStack Query, integrated via `@tanstack/react-router-ssr-query` |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth |
| Image storage | Cloudflare R2 |
| UI components | ShadCN (Radix UI primitives) |
| Styling | Tailwind CSS v4, CSS custom properties |
| Validation | Zod |
| Linting/formatting | Biome |

## Local-first campaign bundle

This is the dominant data-flow pattern. **Read it before adding new routes or mutations.**

A campaign and everything in it (nouns, sessions, maps, pins, members, templates) is small enough to fit in memory comfortably (~150 KB gzipped pessimistically). The data layer ships the whole thing in one round-trip:

- `getCampaignBundle` (`src/server/campaigns.ts`) is the only read-side server fn for campaign-scoped data. It applies all access-control filtering server-side (`isSecret` hiding, `privateNotes` stripping, member-email redaction, template hiding).
- `src/lib/queries.ts` defines the bundle key, the `campaignBundleQuery`, and selector hooks: `useCampaign`, `useNoun`, `useNouns`, `useSession`, `useSessions`, `useMap`/`useMapWithPins`, `useMaps`, `useTemplates`, `useTemplate`, `useTimeline`, `useCampaignDashboard`, `useSettingsSummary`, `useAccessLevel`. Components use these — they don't fetch.
- The parent route `/_app/campaigns/$campaignId` calls `context.queryClient.ensureQueryData(campaignBundleQuery(...))` in its loader. Child routes either have no loader (most of them) or a tiny one that re-uses the cached bundle to derive a single row plus throw `notFound()` if it's missing/filtered (e.g. `nouns/$nounId`, `sessions/$sessionId`, `maps/$mapId`, `settings/templates/$templateId`).
- Pure derivations live client-side: `computeRelatedEntities` in `src/lib/relationships.ts`, `buildTimeline` in `src/lib/timeline.ts`, and the pin-grouping helper in `src/lib/queries.ts`. They run synchronously off the bundle on every render. The previous server-side equivalents (`loadCampaignCandidates`, `loadTimelineEntries`, `loadMapPinLocations`) are gone.
- Quick Find (Cmd-K) filters the in-memory bundle synchronously — no debounce, no server roundtrip.

**When adding a new resource:**
1. Add columns/relations in `src/db/schema/*` and generate a migration with `pnpm db:generate`.
2. Extend `getCampaignBundle` to include the resource, applying access-level filtering server-side.
3. Add a selector hook in `src/lib/queries.ts` (`useFoo` / `useFoos`) — derive from the bundle, throw `notFound()` for missing single-row lookups.
4. Add patcher helpers (`patchAddFoo`, `patchUpdateFoo`, `patchRemoveFoo`) for use in `useBundleMutation`.

## Mutations

`useBundleMutation` (`src/lib/queries.ts`) wraps server-fn calls with the optimistic-update lifecycle: snapshot in `onMutate` → apply patcher → request → invalidate as backstop in `onSettled` (a background refetch picks up server-canonical fields like `updatedAt`). Use it for every mutation.

Pattern:

```ts
const create = useBundleMutation({
  campaignId,
  mutationFn: (vars: CreateFooVars) =>
    createFoo({ data: { campaignId, ...vars } }),
  patch: (bundle, vars) => patchAddFoo(bundle, { id: vars.id, ... }),
});

async function onSubmit(values) {
  const id = crypto.randomUUID();
  try {
    await create.mutateAsync({ id, ...values });
  } catch (e) {
    if (e instanceof BundleMutationError) {
      form.setError("name", { message: e.message });
      return;
    }
    throw e;
  }
  navigate({ to: "/campaigns/$campaignId/foos/$fooId", params: { campaignId, fooId: id } });
}
```

Notes:
- **Client-supplied IDs**: `create*` server fns accept an optional `id`; the client generates a UUID, the optimistic patch uses it, and the server persists the same id. The post-create navigate target is therefore stable from the moment the form is submitted. The schema's `idColumn()` defaults to `crypto.randomUUID()` server-side if no id is supplied — both paths work.
- **Result envelopes**: server fns that surface expected business errors return `Result<T>` (`{ ok: true, value } | { ok: false, error }`). `useBundleMutation` re-throws `{ ok: false }` results as `BundleMutationError` so the rollback path runs and the call site can branch on `e instanceof BundleMutationError`.
- **Skip optimism for**: image uploads/removes (the eventual `imageUrl` is server-generated — they keep `useServerFn` + manual `queryClient.invalidateQueries({ queryKey: bundleKey(...) })`) and delete-from-detail flows (removing the row mid-render would trip `useNoun`'s `notFound()` before navigation completes — those use `useBundleMutation` without a `patch:` so the backstop invalidate handles it).

## Server functions

All writes (and the single bundle read) go through `createServerFn()` in `src/server/`. Every handler calls `requireSession()` first, then `requireCampaignAccess()` for anything campaign-scoped. **Never trust the request body for identity** — derive user ID and email from the session.

`src/server/query-helpers.ts` is now down to one helper: `visibilityFilter`, used inside `getCampaignBundle`.

## Access control

Three levels, checked in `src/lib/access.ts`:
- **ADMIN** — campaign creator. Sees everything, can edit/delete.
- **READ_ONLY** — invited member. No edits, `privateNotes` stripped, `isSecret` entities hidden.
- **NONE** — everyone else → `throw notFound()` (from `@tanstack/react-router`). Admin-required check throws `new Response("Forbidden", { status: 403 })` since TanStack Router has no built-in forbidden helper.

Member rows can be created by email invite before the invitee registers. The `userId IS NULL` state represents an unlinked invite; `linkMemberAccounts` binds it to a real user on registration. When checking membership, always use `userId = $id OR (email = $email AND userId IS NULL)` — never match email unconditionally.

## Route layout

- `_auth` layout — unauthenticated pages (login, register).
- `_app` layout — requires session (loader throws redirect to `/login` if none). Child routes that need the user can pull from the loader data via `getRouteApi('/_app').useLoaderData()` — do **not** re-fetch the session in child loaders.
- `_app.campaigns.$campaignId` — loads the campaign **bundle** once via `ensureQueryData(campaignBundleQuery(...))`. Children read slices via the selector hooks in `@/lib/queries`; they do **not** call `getRouteApi('/_app/campaigns/$campaignId').useLoaderData()` for entity data (the loader returns the whole bundle, but treating it as the source of truth in components couples them too tightly to the loader shape).

## Path alias

Everything imports from `@/*` (maps to `src/*`). The `#/*` alias has been removed.

## Database table naming

The sessions table is named `game_sessions` (Drizzle variable `gameSessions`). Never name it `sessions` — that conflicts with Better Auth's own sessions table.

## Domain model

```
campaigns       — owned by a user (createdById); name unique per owner
                  embeds a per-campaign `calendar` (jsonb): array of months with
                  names + day counts. Defaults to Earth Gregorian.
nouns           — belong to a campaign; type: PERSON | PLACE | THING | FACTION | EVENT
                  isSecret hides from READ_ONLY users; privateNotes stripped for READ_ONLY
                  optional imageKey (R2 storage); optional date / endDate triplet
                  (year, monthIndex, day) for timeline placement
game_sessions   — belong to a campaign; same secret/private pattern as nouns;
                  same optional date / endDate triplet
members         — join table: (campaignId, email) unique; userId nullable until linked
maps            — belong to a campaign; optional imageKey; isSecret hides from READ_ONLY
map_pins        — belong to a map; reference exactly one of nounId or sessionId
                  (DB CHECK enforces XOR); x/y are 0..1 fractions of the image
campaign_templates — markdown blocks surfaced in the editor's slash menu;
                     ADMIN-only, stripped from the bundle for READ_ONLY users.
tags            — free-form labels, campaign-scoped; unique per campaign on
                  lower(name). No CRUD of their own: a tag lives exactly as
                  long as something carries it (see docs/features/tags.md)
entity_tags     — belong to a tag; reference exactly one of nounId or sessionId
                  (DB CHECK enforces XOR), mirroring map_pins
```

Date columns are all-or-none and end-requires-start (DB CHECKs in `app.ts`).
Day-within-month is enforced in app code, not the DB — `updateCalendar`
(`src/server/calendar.ts`) refuses to save a calendar that would orphan
existing dated rows on either start or end.

## Maps and pins

Map pins target exactly one of a noun or a session (DB CHECK enforces XOR). `createPin` validates the target lives in the same campaign as the map — **never trust the FK alone**, it only proves the row exists somewhere. The bundle's `mapPins` is a flat list filtered to pins on visible maps targeting visible entities; selector helpers (`pinsForTarget`) group them per-map for the noun/session detail sidebars.

## Storage

Entity and map images go to Cloudflare R2 via `src/lib/storage.ts`. Bucket objects are world-readable: once a URL is observed, flipping `isSecret` later does not revoke it. R2 env vars (`R2_*`) are required at boot — see `src/lib/env.ts`.

## Running locally

```bash
pnpm dev                  # the only command you need — see below
pnpm db:generate          # generate Drizzle migration after schema changes
pnpm db:migrate           # apply migrations
pnpm exec tsc --noEmit    # type check
pnpm check                # Biome lint + format check
pnpm test                 # Vitest (needs the database — see below)
pnpm e2e                  # Playwright browser checks
```

`pnpm dev` runs `scripts/dev-db.mjs` first, which starts the Postgres container
from `docker-compose.yml`, waits for its healthcheck, applies migrations, and
only then boots Vite on :3000. There is no ordering to remember and no second
terminal. **Only the database is containerised** — the app runs on the host, so
HMR and debugging behave normally.

It also refuses to start if something is already listening on the app port.
Vite's own response to a busy port is one easily-missed line and a silent move
to :3001 — you then load :3000, get whatever stale server is squatting there,
and conclude the app didn't start. The script names the offending PID and the
command to kill it instead.

Credentials come from `DATABASE_URL` in `.env`; the compose file has none
hardcoded. If `DATABASE_URL` points at a non-local host the container step is
skipped, so pointing at a hosted database still works. If Docker isn't running
the script says so and tells you how to start it.

```bash
pnpm db:up                # just the database, no Vite
pnpm db:down              # stop it, keep the data
pnpm db:reset             # drop the volume and start clean
```

**`pnpm test` needs a live database.** `src/lib/access.test.ts` exercises real
membership queries rather than mocking them, so run `pnpm db:up` (or `pnpm dev`)
before `pnpm test` or you'll get `ECONNREFUSED` on 12 tests.

## Browser testing

Playwright is set up as **tooling, not a regression suite** — one smoke test
proves the harness works, and the helpers exist so you can write a throwaway
check that a change actually renders. See `e2e/README.md`.

`playwright.config.ts` boots the app with `pnpm dev` when nothing is on :3000,
and reuses an existing dev server when there is one. Every run registers a
fresh user and leaves rows behind; `pnpm db:reset` clears them. Keep browser
specs in `e2e/` — `vitest.config.ts` excludes that directory, and both runners
claim `*.spec.ts` by default.
