# Markdown notes

`notes` and `privateNotes` on nouns and sessions are markdown. There are two
independent implementations — a WYSIWYG editor and a read-side renderer — and
keeping them visually and semantically in sync is most of the complexity here.

## Editor

`MarkdownEditor` (`src/components/MarkdownEditor.tsx`) is a thin wrapper. The
Tiptap implementation (`MarkdownEditor.impl.tsx`, ~120 KB gzipped) is
`lazy()`-loaded, and the Suspense fallback is a **plain `<textarea>` bound to
the same value and onChange**. So during SSR, hydration, and chunk load the
form is fully usable — you can start typing before the editor arrives.

Mounted on four routes: `nouns/new`, `nouns/$nounId/edit`, `sessions/new`,
`sessions/$sessionId/edit` — once for `notes`, once for `privateNotes`.

Markdown is the storage format; Tiptap holds a ProseMirror document and
`tiptap-markdown` serialises on every update. `onUpdate` compares against
`lastEmittedRef` before calling `onChange`, and the external-value effect
compares the same way, so `form.reset()` after a save doesn't loop.

**Round-tripping is the core contract** — anything the editor can produce must
survive markdown → ProseMirror → markdown unchanged.
`MarkdownEditor.roundtrip.test.ts` covers it: paragraphs, emphasis, inline code
and links, h1–h3, bullet/ordered/nested lists, blockquotes, rules, fenced code,
GFM tables, callouts (basic, nested, adjacent), and the header-promotion cases
below. Add a case there before touching the editor extensions.

## Callouts

`:::name … :::` container fences render as styled cards. This required work at
both ends:

- **Editor** (`markdown/extensions/callout.ts`) — a Tiptap `Node` that
  round-trips by registering a `markdown-it-container` plugin emitting
  `<div data-callout-name="…">`, which `parseHTML` matches back.
- **Renderer** (`MarkdownRenderer.tsx`) — `remark-directive` produces
  `containerDirective` mdast nodes, but `mdast-util-to-hast` drops them by
  default. `remarkDirectiveAsHast` bridges the gap by setting `hName` and
  `hProperties`, so they surface as the same `<div data-callout-name>` and get
  intercepted by the `components.div` override.

Both sides share `calloutClass()` (`markdown/callout-styles.ts`) so the editor
and the read view can't drift — as they also share `MARKDOWN_PROSE_CLASS`
(`markdown-styles.ts`) for the surrounding prose typography. `stat-block` is the one special name, adding a
dark header bar for the first `<h2>`.

**Fence lengths are load-bearing.** `markdown-it-container` only nests when the
outer fence has *more* colons than the inner one. Two places compute this:

- The callout serializer emits `":".repeat(3 + maxCalloutDepth(node))`.
- `wrapInStatBlock` (in `slash-command.ts`) scans the template body for the
  longest existing `:::` run and uses one more.

Get this wrong and the first inner `:::` closes the outer block.

## Tables

Three extensions guard GFM's limitations:

- **`EnforceTableHeader`** — GFM markdown cannot represent a header-less table.
  Delete a header row and `tiptap-markdown` would fall back to a `[table]`
  placeholder, losing the data. This runs as an `appendTransaction` that
  promotes an orphaned first body row back to header cells after any
  doc-changing transaction.
- **`TsvPaste`** — builds a real table from plain-text TSV. Only fires when the
  clipboard has *no* `text/html`; Excel, Sheets, and Notion already ship HTML
  that the base extension handles.
- **`TableKeymap`** — makes Enter in the last cell of a table add a new row.
  Tiptap's default leaves Enter as an in-cell hard break, which makes typing
  tabular data feel like a form rather than a spreadsheet. In-cell newline
  behaviour elsewhere is unchanged.

Right-clicking inside a table opens a context menu (add/delete row, column, or
the whole table), rendered through the same `SlashMenu` component as the slash
palette and portalled to `document.body`.

## Slash menu

`markdown/extensions/slash-command.ts`, triggered by `/`.

The item list is **context-dependent**: inside a table you get only the table
operations; elsewhere you get block formatting plus the campaign's templates.
Filtering matches the label or any keyword.

Two nice touches worth knowing before adding items:

- Typing dimensions produces a dynamic item — `5x3` or `2×4` offers
  "Table 5 × 3", clamped to 50 rows and 20 columns, alongside the presets.
- Templates come from a `getTemplates()` callback, not a captured array, so the
  menu always sees the current list without recreating the editor when
  templates change.

## Character limits

`maxLength` wires a `CharacterCount` extension and a counter under the field
that goes amber past 90% and destructive past the limit. Callers pass 50,000
for notes to match the schema.
