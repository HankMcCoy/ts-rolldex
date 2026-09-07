---
status: todo
blockedBy: []
---

Nothing protects a note from a bad edit. Select-all and type over a
50,000-character session note, hit save, and it's gone — there is no undo once
the page is closed.

## Notes

Obsidian Portal and Kanka both sell this (page version history, entry
recovery). See `docs/competitive-analysis.md`.

**This is not conflict resolution.** `AGENTS.md` rules out optimistic locking
and concurrent-edit handling, and that stands — at most one DM edits a campaign
at a time. What's missing is an undo of last resort, which is a much smaller
thing: a record of what the text used to be.

### Shape

Cheapest useful version: on every `updateNoun` / `updateSession` where `notes`
or `privateNotes` actually changed, append the previous value to a history
table with a timestamp; keep the last N per entity; offer view-and-restore from
the detail page.

Points that need deciding rather than defaulting:

- **History does not go in the bundle.** It is large, cold, and grows without
  bound — exactly the opposite of the properties that make the bundle work.
  That makes this the **first campaign-scoped read that isn't
  `getCampaignBundle`**, which `AGENTS.md` currently describes as the only one.
  Worth being deliberate about, and worth updating that sentence when it lands.
- **`privateNotes` history is ADMIN-only**, same as the field itself. Since the
  fetch is its own server fn rather than the filtered bundle, that filtering has
  to be written by hand instead of coming free.
- **Retention.** Every keystroke isn't a version; every save might be too many.
  Last-N-per-entity is simple and bounded; time-bucketing (collapse saves within
  a few minutes) is nicer and more code.
- **Cascades.** Deleting an entity must take its history with it, and campaign
  delete already cascades — but note that `deleteCampaign` relying on cascade is
  exactly why R2 images leak today, so check the cascade actually reaches this
  table rather than assuming it.
