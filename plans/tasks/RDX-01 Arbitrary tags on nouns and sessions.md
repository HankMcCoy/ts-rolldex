---
status: done
blockedBy: []
---

The ability to add an arbitrary tag to an entity or session.

## Notes

Foundation for the rest of the tagging work. Needs a `tags` table plus a join to
both `nouns` and `game_sessions` (a single polymorphic join table with a nounId /
sessionId XOR, mirroring how `map_pins` already does it, is probably the closest
fit to existing patterns).

Per `AGENTS.md`, this means: schema in `src/db/schema/app.ts` → migration →
extend `getCampaignBundle` in `src/server/campaigns.ts` (tags are campaign-scoped
and small, they belong in the bundle) → selector hooks + `patchAddTag` /
`patchUpdateTag` / `patchRemoveTag` in `src/lib/queries.ts`.

Open question: are tags campaign-scoped or global to the user? Campaign-scoped is
the safer default and matches every other resource.

**Resolved:** campaign-scoped. Shipped as `tags` + `entity_tags` (noun/session
XOR, mirroring `map_pins`), with tags saved as part of the entity's own save
rather than through a server fn of their own. Tags have no independent
lifecycle — one exists as long as something carries it — which
[[RDX-03 Tag groups]] will likely need to revisit. See `docs/features/tags.md`.
