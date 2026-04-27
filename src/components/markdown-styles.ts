/**
 * Tailwind class chain shared by `MarkdownRenderer` (read view) and the
 * Tiptap-based `MarkdownEditor` (edit view) so they cannot drift apart.
 *
 * Heading scale + asymmetric margins follow the typographic hierarchy we
 * settled on: clear size steps for h1/h2/h3, top margins larger than bottom
 * to mark new sections, list/paragraph rhythm at 9px (my-2).
 */
export const MARKDOWN_PROSE_CLASS =
	"prose prose-sm max-w-none prose-headings:font-semibold prose-headings:leading-tight prose-h1:text-2xl prose-h1:mt-7 prose-h1:mb-2 prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_table]:border-collapse [&_table]:border [&_table]:border-[var(--line)] [&_th]:border [&_th]:border-[var(--line)] [&_th]:bg-[var(--surface)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-[var(--line)] [&_td]:px-2 [&_td]:py-1 [&_td]:align-top";
