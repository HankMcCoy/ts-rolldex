---
status: todo
blockedBy: []
---

There is no way to write a link to another entity inside a note. Typing "Dave"
in a session note gets you the name in prose and an entry in the related-entities
sidebar, but not something a reader can click.

## Notes

This is the most conspicuous gap against every competitor — World Anvil, Kanka,
LegendKeeper, Obsidian Portal and Scabard all have it, usually as `@mention`
autocomplete. See `docs/competitive-analysis.md`.

The trigger machinery already exists. `@tiptap/suggestion` is a dependency and
`markdown/extensions/slash-command.ts` already drives a filtered palette off a
callback; an `@` suggestion listing nouns and sessions is the same shape, and
the bundle is in memory so there is nothing to fetch.

### The real decision is the storage format

Markdown is the storage format and round-tripping is the core contract
(`MarkdownEditor.roundtrip.test.ts`) — whatever this emits has to survive
markdown → ProseMirror → markdown unchanged, and a case belongs in that test
before the extension is written.

Two candidate formats, and the choice is really a choice about renames:

- **Id-based** — `[Dave](/campaigns/$campaignId/nouns/$nounId)`. Survives a
  rename, but the display text is a stale copy of the name unless the renderer
  re-resolves it from the bundle. Plain markdown, so it degrades to a working
  link anywhere else.
- **Name-based** — `[[Dave]]`. Reads well in raw markdown and in a CSV export,
  and matches what Obsidian users expect, but a rename silently breaks every
  link unless renaming rewrites note bodies across the campaign.

Id-based with the name re-resolved at render time is probably right, but it
means the renderer needs the bundle, which `MarkdownRenderer.tsx` does not
currently take.

### Read side

`MarkdownRenderer` has to turn the link into a router `<Link>` rather than an
anchor, and needs a defined state for a target that isn't in the bundle —
deleted, or hidden by `isSecret` for a READ_ONLY viewer. Render it as inert
text, not a dead link.

Note this is not a new leak: prose already mentions secret entities by name
today, and the note body is shipped either way. The requirement is only that a
link doesn't become a probe for what exists.

### Two tasks this touches

- [[RDX-06 Quick create from the Cmd-K palette]] wants to insert a link at the
  cursor after creating an entity. That step needs this one first.
- [[RDX-09 Explicit relationships between entities]] raises the question of
  suppressing an implicit relationship when an explicit one exists. An inline
  link is a third signal, stronger than a name mention and weaker than a
  declared relationship. Decide whether a linked entity is surfaced by
  `computeRelatedEntities` at all, and if so how it's ranked — but decide it
  once, alongside RDX-09, rather than twice.
