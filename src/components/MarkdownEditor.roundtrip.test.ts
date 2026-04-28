// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { describe, expect, it } from "vitest";
import { Callout } from "@/components/markdown/extensions/callout";
import { EnforceTableHeader } from "@/components/markdown/extensions/enforce-table-header";

declare module "@tiptap/core" {
	interface Storage {
		markdown: MarkdownStorage;
	}
}

function makeEditor(content: string): Editor {
	return new Editor({
		extensions: [
			StarterKit.configure({
				link: { autolink: true, openOnClick: false },
			}),
			Table.configure({ resizable: true }),
			TableRow,
			TableCell,
			TableHeader,
			EnforceTableHeader,
			Callout,
			CharacterCount.configure({}),
			Markdown.configure({
				html: false,
				breaks: false,
				linkify: true,
				transformPastedText: false,
				transformCopiedText: false,
				bulletListMarker: "-",
				tightLists: true,
			}),
		],
		content,
	});
}

function roundtrip(markdown: string): string {
	const editor = makeEditor(markdown);
	const out = editor.storage.markdown.getMarkdown();
	editor.destroy();
	return out;
}

/**
 * tiptap-markdown normalises markdown on first parse (e.g. list indent,
 * smart paragraph wrapping). The fidelity contract we hold: the FIRST pass
 * may rewrite trivia, but the SECOND pass must be a no-op. Otherwise edits
 * would mutate stored content silently every save.
 */
function expectIdempotent(markdown: string) {
	const first = roundtrip(markdown);
	const second = roundtrip(first);
	expect(second).toBe(first);
	return first;
}

describe("markdown editor round-trip", () => {
	it("plain paragraph", () => {
		expectIdempotent("Hello, world.\n");
	});

	it("emphasis and strong", () => {
		expectIdempotent("Some **bold** and *italic* and ***both***.\n");
	});

	it("inline code and links", () => {
		expectIdempotent(
			"Use `pnpm install` then visit [docs](https://example.com).\n",
		);
	});

	it("headings h1 through h3", () => {
		expectIdempotent("# H1\n\n## H2\n\n### H3\n\nbody\n");
	});

	it("bullet list", () => {
		expectIdempotent("- one\n- two\n- three\n");
	});

	it("ordered list", () => {
		expectIdempotent("1. first\n2. second\n3. third\n");
	});

	it("nested lists", () => {
		expectIdempotent("- top\n    - nested\n        - deeper\n- back\n");
	});

	it("blockquote", () => {
		expectIdempotent("> a quote\n>\n> with two paragraphs\n");
	});

	it("horizontal rule", () => {
		expectIdempotent("before\n\n---\n\nafter\n");
	});

	it("fenced code block", () => {
		expectIdempotent("```\nconst x = 1;\n```\n");
	});

	it("GFM table", () => {
		expectIdempotent(
			"| Name | Role |\n| ---- | ---- |\n| Eos  | Goddess |\n| Felton | Farmer |\n",
		);
	});

	it("kitchen sink doc", () => {
		expectIdempotent(
			"# Session 1\n\nThe party arrives in **Barnslow** to investigate the *Dimmer Sisters*.\n\n## NPCs\n\n- Eos — goddess of dawn\n- Felton — changeling\n\n## Notable rolls\n\n| Player | Roll |\n| ------ | ---- |\n| Maude  | 18 |\n| Milly  | 7 |\n\n> Quote of the night.\n\n---\n\nSee `notes.md` for more.\n",
		);
	});

	it("auto-promotes the first row to a header when a table has none", () => {
		const editor = makeEditor("");
		editor
			.chain()
			.focus()
			.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
			.run();
		const md = editor.storage.markdown.getMarkdown();
		// Without the EnforceTableHeader extension, this serialises to
		// `[table]`. With it, the first row is promoted so we get valid GFM.
		expect(md).toContain("| --- |");
		editor.destroy();
	});

	it("basic callout", () => {
		expectIdempotent(":::note\nHello, world.\n:::\n");
	});

	it("callout with nested heading, list, and bold", () => {
		expectIdempotent(
			":::stat-block\n## Title\n\n**Bold** intro.\n\n- one\n- two\n:::\n",
		);
	});

	it("callout adjacent to other markdown", () => {
		expectIdempotent("Before.\n\n:::note\nMid.\n:::\n\nAfter.\n");
	});

	it("inserting markdown into an empty editor round-trips through stat-block", () => {
		const md = ":::stat-block\n## Adversary\n\n**Stats:** HP 7\n:::\n";
		expectIdempotent(md);
	});

	it("nested callout uses a longer outer fence so it round-trips", () => {
		// Inner :::note ... ::: would close an outer ::: prematurely. The
		// serializer must emit a fence with one more colon than the deepest
		// nested fence — here ::::stat-block ... :::: with a 3-colon :::note
		// inside.
		const md = roundtrip(
			":::stat-block\n**Outer text.**\n\n:::note\nInner stuff.\n:::\n\nMore outer text.\n:::\n",
		);
		expect(md).toContain("::::stat-block");
		expect(md).toContain(":::note");
		expect(md).not.toContain("\n:::\n:::\n"); // collapsed double-close => bad
		expectIdempotent(md);
	});

	it("re-promotes a body row to header after the original header is removed", () => {
		const md = roundtrip("| H1 | H2 |\n| --- | --- |\n| a | b |\n| c | d |\n");
		const editor = makeEditor(md);
		editor.chain().focus().setTextSelection(2).deleteRow().run();
		const out = editor.storage.markdown.getMarkdown();
		expect(out).toContain("| --- |");
		expect(out).not.toContain("[table]");
		editor.destroy();
	});
});
