---
status: todo
blockedBy: []
---

A campaign has exactly one admin, forever — the person who created it. There is
no way to add a second GM to a co-run campaign, and no way to hand a campaign
over to someone else.

## Notes

Every competitor supports at least a co-GM; Obsidian Portal sells "promote a
player to co-GM" as a paid feature. See `docs/competitive-analysis.md`.

Today ADMIN comes from exactly one place: `campaigns.createdById`.
`memberTypeEnum` (`src/db/schema/app.ts`) has a single value, `READ_ONLY`, so
the members table cannot express anything else.

### What has to change together

- **`memberTypeEnum` gains a value**, and `getCampaignAccess`
  (`src/lib/access.ts`) starts deriving the level from `memberType` rather than
  from ownership alone.
- **The membership rule is duplicated.** `findMembership` and `getCampaigns`
  (`src/server/campaigns.ts`) both implement
  `userId = $id OR (email = $email AND userId IS NULL)`. Both change, and
  `access.test.ts` covers the first one only.
- **The synthetic DM entry.** The bundle fabricates a member with
  `id: "dm-<createdById>"` and `role: "DM"` because the owner has no `members`
  row. With more than one admin this either grows to cover them all, or the
  owner gains a real `members` row in a migration and the synthetic entry goes
  away. The second is cleaner and touches more.
- **`useSettingsSummary`** deliberately excludes the synthetic entry from its
  member count. Whatever replaces it has to keep that count meaning "people I
  invited".

### Decisions to make explicitly

- Can a co-GM invite further members? Delete the campaign? Promote someone
  else? The safe default is that destructive and membership-granting actions
  stay with the owner, which means `requireCampaignAccess(…, "ADMIN")` is no
  longer a sufficient check for all of them and some routes need an
  owner-specific one.
- Is ownership transfer a separate action, or just "promote to admin, then the
  old owner leaves"? Transfer is the simpler story for users and the harder one
  for the schema, since `createdById` is also half of the campaign name unique
  index (`campaigns_creator_name_unique`) — transferring into an account that
  already has a campaign of that name has to fail cleanly.

### The docs make a promise here

`docs/features/access-control-and-sharing.md` states that the creator is ADMIN
"nobody else, ever", and that there is no co-DM role and no ownership transfer.
That rule is load-bearing prose, not an aside — it has to change in the same
commit as the code, along with the invariant in `docs/features/README.md`.
