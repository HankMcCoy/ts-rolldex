---
status: done
blockedBy: []
---

The ability to define an explicit relationship between two entities, rather than
relying on the implicit ones. I should be able to say "Rachel is Dave's daughter
and Dave is Rachel's father", as well as "Dave is born in Lagos".

## Notes

A relationship needs a category, while its labels may describe either, both, or
neither direction. The daughter/father example uses both labels; "born in" uses
only the forward label; a neutral association can rely on its category alone.

The final design separates a reusable relationship *category* from the
instance-specific labels. `Family` is a category; `daughter of`, `brother of`,
and `adopted uncle of` belong to individual edges. Both directional labels are
optional, and previously used labels are autocomplete suggestions rather than
canonical dropdown entries.

Two affordances:

- Create a relationship from scratch, from either entity's detail page.
- **Promote** an implicit relationship to an explicit one — the pair is already
  on screen in the related-entities sidebar, so this should be a single action
  there that asks which category applies and optionally accepts labels.

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
- Do relationship categories live per-campaign (like templates) or per-user?
- Does an explicit relationship need its own `isSecret` handling, or does it
  inherit visibility from the two entities it connects? Inheriting is simpler and
  probably right — a relationship to a hidden entity should vanish for READ_ONLY
  users along with the entity itself.

## Resolution

Implemented for nouns and sessions. Relationship categories are campaign-scoped
and group the sidebar; optional forward and reverse labels live on each edge.
Existing labels in the selected category appear as autocomplete suggestions.
Relationships inherit visibility from both endpoints and have no separate
`isSecret` flag. ADMINs can create a relationship directly or promote an
implicit match, and a declared edge symmetrically suppresses the corresponding
implicit match.
