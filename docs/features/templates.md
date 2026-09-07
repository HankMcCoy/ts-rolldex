# Templates

Reusable markdown blocks that appear in the editor's slash menu. Intended for
things a DM re-types constantly — stat blocks, location write-ups.

## Model

`campaign_templates` — `name` (unique per campaign, ≤80), `body` (≤50,000
markdown), `wrapInStatBlock` (boolean).

**ADMIN-only, entirely.** `getCampaignBundle` skips the query altogether for
READ_ONLY viewers and returns `templates: []`, so players never receive them.

## Seeding

New campaigns get `STARTER_TEMPLATES` (`src/server/template-seeds.ts`) inserted
by `createCampaign` — currently one "Adversary" stat block, a Daggerheart-style
adversary sheet with `wrapInStatBlock: true`. The file notes this is a
placeholder until modular system imports exist, at which point the seed should
move out of the codebase.

## `wrapInStatBlock`

When set, insertion wraps the body in a `:::stat-block … :::` callout so it
picks up the card styling described in [markdown-notes.md](markdown-notes.md),
rather than storing those fence lines in `body`.

The wrapping is computed, not hardcoded: `wrapInStatBlock()` in
`markdown/extensions/slash-command.ts` scans the body for the longest existing
`:::` run and emits a fence one colon longer. A template whose body already
contains callouts would otherwise be closed early by its own inner fence.

## Surfaces

- Managed at `/campaigns/$campaignId/settings/templates` — index, `new`, and
  `$templateId` routes, sharing `TemplateForm`.
- Consumed by passing `templates` into `MarkdownEditor` on the four
  entity/session create and edit routes. Each becomes a slash item with a
  `FileCode` icon whose command deletes the `/query` range and inserts the
  (optionally wrapped) body at the cursor.

## Known issues

> Templates are known to be buggy; the specific defects have not been written
> down yet. Tracked as `RDX-08` in `plans/tasks/` — the first step there is
> reproducing and listing them, not fixing blind.

Surface area to check when investigating: `src/server/templates.ts`,
`template-seeds.ts`, `TemplateForm.tsx`, the slash-menu integration in
`slash-command.ts`, and the settings routes.
