---
status: todo
blockedBy: []
---

The ability to define an explicit relationship between two entities, rather than
relying on the implicit ones. I should be able to say "Rachel is Dave's daughter
and Dave is Rachel's father", as well as "Dave is born in Lagos".

## Notes

Two things need defining: the relationship itself, and the label for one or both
directions. The daughter/father example is the general case — the label differs
per direction and both are worth showing. "Born in" is the degenerate case where
only the forward direction has a natural label.

That points at a reusable relationship *type* (forward label, optional reverse
label) plus instances that connect two entities, rather than free text typed per
pair. Same shape of user-definable vocabulary as [[RDX-03 Tag groups]], though
neither blocks the other.

Two affordances:

- Create a relationship from scratch, from either entity's detail page.
- **Promote** an implicit relationship to an explicit one — the pair is already
  on screen in the related-entities sidebar, so this should be a single action
  there that just asks which relationship type applies.

### Suppressing the implicit one

If an entity has an explicit relationship to another entity, the implicit
relationship to that same entity must not also be shown. `computeRelatedEntities`
in `src/lib/relationships.ts` is a pure client-side derivation over the bundle, so
this is a filter on its output: drop any candidate that already appears in the
explicit set for the current entity.

Note that implicit relationships are currently bidirectional-by-mention (forward:
does A's text mention B; reverse: does B's text mention A). Suppression has to be
symmetric too — an explicit link recorded from either side hides the implicit one
on both pages.

### Surface area

`src/lib/relationships.ts`, `src/components/RelatedEntities.tsx`, and the noun and
session detail routes. Relationships are campaign-scoped and small, so they belong
in `getCampaignBundle` with the usual selector hook and patchers per `AGENTS.md`.

Open questions:

- Can a relationship connect a noun to a session, or only noun-to-noun? The
  implicit system already spans both.
- Do relationship types live per-campaign (like templates) or per-user?
- Does an explicit relationship need its own `isSecret` handling, or does it
  inherit visibility from the two entities it connects? Inheriting is simpler and
  probably right — a relationship to a hidden entity should vanish for READ_ONLY
  users along with the entity itself.
