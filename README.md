# Rolldex

A campaign manager for tabletop RPGs. Dungeon Masters create campaigns and populate them with **nouns** (people, places, things, factions, events) and **session notes**, then invite players for read-only access. Notes are markdown with cross-entity linking; events sit on a per-campaign calendar; maps support pinned entities.

## Running locally

```bash
pnpm install
cp .env.example .env       # then fill in DATABASE_URL, BETTER_AUTH_SECRET, R2_* credentials
pnpm db:migrate            # apply schema migrations to the configured Postgres
pnpm dev                   # http://localhost:3000
```

You'll need a Postgres instance (local or hosted) and a Cloudflare R2 bucket for image uploads. R2 vars are validated at boot — see `src/lib/env.ts`. R2 is the only required external service besides Postgres; auth is handled in-process by Better Auth.

Useful scripts:

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server with HMR. |
| `pnpm build` | Production build into `.output/`. |
| `pnpm start` | Serve the built app (`node .output/server/index.mjs`). |
| `pnpm test` | Vitest suite (relationships, calendar math, access control, markdown round-trip). |
| `pnpm exec tsc --noEmit` | Type check. |
| `pnpm check` | Biome lint + format check. |
| `pnpm format` | Biome auto-format. |
| `pnpm db:generate` | Generate a new Drizzle migration after editing `src/db/schema/*`. |
| `pnpm db:migrate` | Apply pending migrations. |
| `pnpm db:studio` | Drizzle Studio (web UI for the database). |

## Deployment

Deploys to Fly.io using the bundled `Dockerfile` and `fly.toml`. From a logged-in `flyctl`:

```bash
fly deploy
```

The `[deploy]` block in `fly.toml` runs `node scripts/migrate.mjs` as a release command, so each deploy applies pending Drizzle migrations against `DATABASE_URL` before the new VM starts taking traffic. Secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `R2_*`) live in `fly secrets`. The app currently runs in `sjc` with at least one VM always warm to avoid cold starts.

## Architecture

| Layer | Tech |
|---|---|
| Framework | TanStack Start (SSR React with file-based routing) |
| Router | TanStack Router |
| Data layer | TanStack Query, integrated via `@tanstack/react-router-ssr-query` |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth |
| UI | ShadCN (Radix primitives) on Tailwind CSS v4 |
| Validation | Zod |
| Storage | Cloudflare R2 (entity + map images) |

### Local-first campaign bundle

Campaigns are small enough to fit comfortably in memory (~150 KB gzipped pessimistically), and the single-DM concurrency model means there's no consistency war to fight. The data layer is built around that:

- **One server fn (`getCampaignBundle`)** returns everything visible to the caller for a campaign — nouns, sessions, maps, pins, members, templates, the campaign row — with all access-control filtering applied server-side. Children of `/_app/campaigns/$campaignId/*` don't have their own loaders; they read slices via selector hooks (`useNoun`, `useNouns`, `useMapWithPins`, `useTimeline`, …) defined in `src/lib/queries.ts`.
- **Cross-route navigation costs zero network requests** after the initial bundle fetch. Quick Find (Cmd-K) is a synchronous in-memory filter; relationship/timeline/pin-location derivations are pure functions of the bundle.
- **Mutations are optimistic by default.** `useBundleMutation` snapshots the bundle, applies a patcher in `onMutate`, rolls back on either thrown errors or `Result<{ok:false}>` returns, and invalidates as a backstop in `onSettled`. Pin drags, member invites, calendar saves, and entity edits all draw immediately. Image uploads stay non-optimistic since the URL is server-generated.
- **Client-supplied IDs.** Create server fns accept an optional `id`; the client generates a UUID, the optimistic patch uses it, and the server persists the same id. The post-create navigate target is stable from the moment the form is submitted.

### Layout

```
src/
  routes/                 file-based routes (TanStack Router)
    _app.*                authed routes (loaders fetch the campaign bundle)
    _auth.*               unauthenticated (login, register)
    api/auth/$.tsx        Better Auth handler
  server/                 createServerFn() handlers (writes + the bundle read)
  lib/
    queries.ts            bundle key, selector hooks, useBundleMutation, patchers
    relationships.ts      pure related-entity computation
    timeline.ts           pure timeline ordering
    calendar.ts           per-campaign calendar math
    access.ts             ADMIN/READ_ONLY/NONE access checks
    storage.ts            R2 client
  db/schema/              Drizzle schemas (app + Better Auth tables)
  components/             UI (ShadCN-shaped) + MarkdownEditor (Tiptap, lazy-loaded)
drizzle/                  generated migrations
```

### Access control

Three levels, enforced in `src/lib/access.ts`:

- **ADMIN** — campaign creator. Sees everything; can edit/delete.
- **READ_ONLY** — invited member. `privateNotes` stripped; `isSecret` entities hidden; member emails redacted.
- **NONE** — `throw notFound()`.

Filtering happens once when `getCampaignBundle` builds its response, so the client never receives data it shouldn't see.

### Conventions

- Path alias `@/*` → `src/*`. Imports use `@/`.
- Drizzle's sessions table is named `game_sessions` to avoid colliding with Better Auth's own `sessions` table.
- Date columns are all-or-none and end-requires-start; checks live in `app.ts`. Day-within-month is enforced in app code (`src/server/calendar.ts`) so a calendar change can't orphan dated rows.
- Result-style returns (`{ok, value | error}`) for expected business errors (unique-name conflicts, invalid pin targets); throws for unexpected. `useBundleMutation` routes both through the same rollback path.
