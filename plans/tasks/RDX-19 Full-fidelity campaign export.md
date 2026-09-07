---
status: todo
blockedBy: []
---

There is no way to get a whole campaign out. CSV export covers nouns and
sessions and nothing else — maps, pins, templates, the calendar and members are
unreachable, and tags are dropped too.

## Notes

"You own your data" is an explicit selling point for LegendKeeper and for the
Obsidian crowd, and a hosted tool with no way out is a real objection for
someone deciding where to put five years of campaign notes. See
`docs/competitive-analysis.md`.

The good news is that the shape already exists. `getCampaignBundle`
(`src/server/campaigns.ts`) returns the campaign plus every noun, session, map,
pin, member, template and tag the caller can see — a JSON export is close to
"serialise the bundle", which is what makes this cheap relative to its value.

### Two things the bundle doesn't hand over

- **Images.** The bundle converts `imageKey` to a public `imageUrl` on the way
  out and drops the key. An export of URLs is an export of links into a bucket
  that outlives the campaign — and per `docs/features/images.md`, R2 objects are
  world-readable and never revoked. Either bundle the bytes into a zip, or emit
  URLs and say plainly in the UI that they are public links, not an archive.
- **`privateNotes`** are blanked for READ_ONLY. Not a problem in practice, since
  the export route should be ADMIN-only like the rest of settings, but the
  export must not be built on a bundle fetched at the wrong access level.

### Decide export-only vs restore up front

Backup-and-restore and escape-hatch are different products:

- **Escape hatch** — one JSON (or a zip of markdown files) a human or an LLM can
  read. Cheap, useful immediately, no import path.
- **Restore** — round-trips back into a new campaign. Much bigger: id
  collisions, re-uploading R2 objects, recreating tag rows through
  `applyEntityTags` so the case-insensitive reuse rule holds, and reconciling
  with the unique-name constraints.

An export-only first cut is defensible as long as the docs say so rather than
implying a backup that can't be restored.

### Relationship to the CSV work

Doesn't block on [[RDX-14 Tags in CSV import and export]] and doesn't replace
it. CSV stays the spreadsheet-editing path — bulk-authoring nouns in Excel is a
different job from archiving a campaign. But if both ship, they have to agree
on how a tag is represented, or a user round-tripping through the wrong one
loses data twice.
