---
status: todo
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
