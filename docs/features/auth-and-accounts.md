# Auth and accounts

Better Auth (`src/lib/auth.ts`) with the Drizzle adapter, `usePlural: true`, so
its tables are `users`, `sessions`, `accounts`, `verifications`
(`src/db/schema/auth.ts`).

**Email and password only.** No OAuth, no email verification, no password
reset flow.

This is why the app's own session table is named `game_sessions` — `sessions`
belongs to Better Auth.

## Route layouts

| Layout | Behaviour |
|---|---|
| `_auth` | `/login`, `/register`. Unauthenticated |
| `_app` | Everything else. Loader calls `getSessionOrRedirect`, throwing `redirect({ href: "/login" })` when there's no session |

Child routes under `_app` that need the user pull it from the loader data via
`getRouteApi('/_app').useLoaderData()` — they must **not** re-fetch the
session.

`Header` renders nothing on `/_app` routes (it checks `useMatches()` for a
route id starting with `/_app`), so the marketing header only appears on the
public and auth pages.

## Registration

`_auth.register.tsx` validates name, email, password (≥8), and a confirmation
match, then calls `authClient.signUp.email`. On success it calls
`linkMemberAccounts` — the session is already established by sign-up, so that
server fn reads identity from the session and backfills any pending campaign
invites addressed to this email. See
[access-control-and-sharing.md](access-control-and-sharing.md).

## Session handling on the server

`src/lib/access.ts` wraps Better Auth:

- `requireSession()` — throws a redirect to `/login` if absent.
- `getOptionalSession()` — returns `null` instead. Used by the `_app` loader
  and by public pages.

Both read headers from `getRequest()` (`@tanstack/react-start/server`) and
return a narrowed `{ id, email, name }`.

**Never trust the request body for identity.** Every server fn derives the
user from the session; `linkMemberAccounts` takes no arguments at all
specifically so it can't be pointed at someone else's email.
