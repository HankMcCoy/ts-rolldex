---
status: todo
blockedBy:
  - "[[RDX-01 Arbitrary tags on nouns and sessions]]"
---

The ability to define a tag group, similar to Linear's tag/label groups.

## Notes

A named group owns a set of tags and constrains how they can be applied — in
Linear a group is mutually exclusive, so an issue carries at most one label from
it. That exclusivity constraint is the interesting part and the thing
[[RDX-04 Migrate noun type to a tag group]] needs.

Groups are user-definable, so this is a CRUD surface under campaign settings,
alongside templates.
