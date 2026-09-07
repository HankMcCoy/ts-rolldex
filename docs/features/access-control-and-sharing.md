# Access control and sharing

Three levels, resolved in `src/lib/access.ts`. Covered by `access.test.ts`.

| Level | Who | Effect |
|---|---|---|
| `ADMIN` | The campaign creator (`campaigns.createdById`) — nobody else, ever | Sees and edits everything |
| `READ_ONLY` | An invited member | Reads a filtered view; no writes |
| `NONE` | Everyone else | `throw notFound()` — the campaign is indistinguishable from nonexistent |

There is exactly one ADMIN per campaign. `memberTypeEnum` has a single value,
`READ_ONLY`, so there's no co-DM role and no ownership transfer.

## The membership rule

Read this before touching any membership query:

```ts
userId = $id  OR  (email = $email AND userId IS NULL)
```

Members can be invited **before they have an account**, which is why the email
fallback exists. But it is guarded by `userId IS NULL`: once a row is linked to
a real user, the userId match is authoritative. Matching on email
unconditionally would let someone claim a campaign by registering with an
address that already belongs to a linked member.

Emails are stored and compared lowercased. `findMembership` lowercases the
session email before comparing, so an invite sent to `Foo@Bar.com` matches a
user who registers as `foo@bar.com`.

The same rule is duplicated in `getCampaigns` (`src/server/campaigns.ts`),
because the campaign list spans campaigns and can't use `findMembership`. If
the rule changes, change it in both places.

## Invite flow

1. ADMIN invites an email → `inviteMember` (`src/server/members.ts`) inserts a
   `members` row. If a user with that email already exists it links `userId`
   immediately, so the UI shows a name instead of a raw address.
2. If not, the row sits with `userId IS NULL` — a pending invite.
3. When that person registers, `_auth.register.tsx` calls
   `linkMemberAccounts`, which backfills `userId` on every unlinked row
   matching their session email. It takes no arguments: both email and userId
   come from the session, never the request body.

Duplicate invites are caught twice — a pre-check and a 23505 catch — both
returning the same "already been invited" message.

## What READ_ONLY loses

All of this is applied **server-side inside `getCampaignBundle`**, so the
client never receives hidden data:

| Hidden | How |
|---|---|
| `isSecret` nouns, sessions, maps | `visibilityFilter` (`src/server/query-helpers.ts`) adds `eq(col, false)` to the query |
| `privateNotes` | Rewritten to `""` on the way out |
| Templates | Query is skipped entirely; `templates: []` |
| Member email addresses | `email: null` on every entry |
| Pending invites | Members with no linked `user` are filtered out of the list |
| Pins on hidden maps, or targeting hidden entities | Post-filtered against the visible id sets |
| Tags carried only by hidden entities | `bundle.tags` is narrowed to tags on visible rows — a tag has no `isSecret` of its own, so its *name* would otherwise leak. See [tags.md](tags.md) |

The DM appears in `members` as a **synthetic entry** with `id:
"dm-<createdById>"` and `role: "DM"` — it is not a `members` row. Anything
counting real members must exclude it, as `useSettingsSummary` does.

## Enforcement points

- `requireSession()` — throws `redirect({ href: "/login" })`.
- `requireCampaignAccess(campaignId, user, minimumLevel)` — `NONE` throws
  `notFound()`; failing an ADMIN minimum throws `new Response("Forbidden",
  { status: 403 })`, because TanStack Router has no forbidden helper.
- `requireCampaign(...)` — same, but returns the campaign row too. Used by the
  bundle, which needs the row itself.

Every mutating server fn calls session-then-access before touching the DB.

## Known leak: images

R2 objects are world-readable and served from a public base URL. Once a URL
has been observed, flipping `isSecret` to true later **does not revoke it** —
the bundle stops emitting the URL, but the object stays fetchable. See
[images.md](images.md).
