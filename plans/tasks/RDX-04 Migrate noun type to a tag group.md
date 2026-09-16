---
status: done
blockedBy:
  - "[[RDX-03 Tag groups]]"
---

Migrate the entity type (PERSON / PLACE / THING / FACTION / EVENT) to being a tag
group, so users can define their own types.

## Notes

`nounType` is currently a hard `pgEnum` (`noun_type` in `src/db/schema/app.ts`)
and is threaded through a lot: the noun list grouping, `EntityAvatar`, icon
choice, `computeRelatedEntities`, CSV import/export, and the seeded templates.

This is the risky one. Needs a real data migration that creates a per-campaign
"Type" group with the five current values and points every existing noun at the
matching tag. Worth deciding whether the enum column stays as a denormalized
fallback during the transition or is dropped outright.

Mutual exclusivity within the group is what preserves today's behaviour — a noun
has exactly one type — so it can't ship before [[RDX-03 Tag groups]] enforces that.

## Resolution

Types now live in the campaign's required `isEntityType` tag group. The migration
seeds the five legacy choices and assigns every existing noun before dropping
the enum column. Names colliding with existing vocabulary are disambiguated
without changing those tags' assignments. New campaigns seed the same group.

Custom types are available in forms, list filters, related entities, maps,
timeline, Quick Find and CSV. Saves/imports require one valid campaign type and
persist it atomically with the noun. The required group cannot be deleted or
emptied; in-use types must be reassigned before removal. See
`docs/features/entities-and-sessions.md` for the full rules.
