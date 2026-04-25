# Rolldex — Agent Guide

## What this app is

Rolldex is a TTRPG campaign manager. A Dungeon Master (DM) creates campaigns and populates them with **nouns** (named entities: people, places, things, factions) and **game sessions** (session notes). Players can be invited by email and given read-only access.

## Concurrency expectations

**This app does not need to handle high concurrency.** Any given campaign will have at most one DM actively editing it at a time. Optimistic locking, conflict detection, and similar patterns are out of scope. Simple `UPDATE … WHERE id = $id` writes are fine.

## Stack

| Layer | Tech |
|---|---|
| Framework | TanStack Start (SSR React, file-based routing) |
| Router | TanStack Router |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Better Auth |
| UI components | ShadCN (Radix UI primitives) |
| Styling | Tailwind CSS v4, CSS custom properties |
| Validation | Zod |
| Linting/formatting | Biome |

## Key conventions

### Server functions
All data access goes through `createServerFn()` in `src/server/`. Every handler calls `requireSession()` first, then `requireCampaignAccess()` for anything campaign-scoped. Never trust the request body for identity — derive user ID and email from the session.

### Access control
Three levels, checked in `src/lib/access.ts`:
- **ADMIN** — campaign creator. Sees everything, can edit/delete.
- **READ_ONLY** — invited member. No edits, `privateNotes` stripped, `isSecret` entities hidden.
- **NONE** — everyone else → `notFound()`.

Member rows can be created by email invite before the invitee registers. The `userId IS NULL` state represents an unlinked invite; `linkMemberAccounts` binds it to a real user on registration. When checking membership, always use `userId = $id OR (email = $email AND userId IS NULL)` — never match email unconditionally.

### Route layout
- `_auth` layout — unauthenticated pages (login, register)
- `_app` layout — requires session (loader throws redirect to `/login` if none). Child routes get `user` via `getRouteApi('/_app').useLoaderData()` — do **not** re-fetch the session in child loaders.
- `_app.campaigns.$campaignId` — loads the campaign once; children inherit via `getRouteApi`.

### Path alias
Everything imports from `@/*` (maps to `src/*`). The `#/*` alias has been removed.

### Database table naming
The sessions table is named `game_sessions` (Drizzle variable `gameSessions`). Never name it `sessions` — that conflicts with Better Auth's own sessions table.

## Domain model

```
campaigns       — owned by a user (createdById); name unique per owner
nouns           — belong to a campaign; type: PERSON | PLACE | THING | FACTION
                  isSecret hides from READ_ONLY users; privateNotes stripped for READ_ONLY
game_sessions   — belong to a campaign; same secret/private pattern as nouns
members         — join table: (campaignId, email) unique; userId nullable until linked
```

## Relationship detection

`src/lib/relationships.ts` computes related entities via bi-directional text search: an entity is "related" if its name appears in the current entity's text, OR if the current entity's name appears in the candidate's text. This runs in-memory on every entity load (fetches all campaign entities). Fine at typical campaign sizes (tens to low hundreds of entities).

## Running locally

```bash
pnpm dev          # starts dev server on :3000
pnpm db:generate  # generate Drizzle migration after schema changes
pnpm db:migrate   # apply migrations
pnpm exec tsc --noEmit   # type check
pnpm check        # Biome lint + format check
```
