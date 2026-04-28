import { type Editor, Extension, type Range } from "@tiptap/core";
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionProps,
} from "@tiptap/suggestion";
import {
	ArrowDownToLine,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	FileCode,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Megaphone,
	Minus,
	Quote,
	Rows3,
	SquareCode,
	Table as TableIcon,
	Trash2,
} from "lucide-react";
import type { SlashMenuItem } from "@/components/markdown/SlashMenu";

export interface CampaignTemplate {
	id: string;
	name: string;
	body: string;
	wrapInStatBlock: boolean;
}

interface CommandItem extends SlashMenuItem {
	keywords: string[];
	command: (ctx: { editor: Editor; range: Range }) => void;
}

const TEXT_ITEMS: CommandItem[] = [
	{
		id: "h1",
		label: "Heading 1",
		hint: "#",
		icon: Heading1,
		keywords: ["h1", "heading", "title"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 1 })
				.run(),
	},
	{
		id: "h2",
		label: "Heading 2",
		hint: "##",
		icon: Heading2,
		keywords: ["h2", "heading", "subtitle"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 2 })
				.run(),
	},
	{
		id: "h3",
		label: "Heading 3",
		hint: "###",
		icon: Heading3,
		keywords: ["h3", "heading"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 3 })
				.run(),
	},
	{
		id: "bullet-list",
		label: "Bullet list",
		icon: List,
		keywords: ["bullet", "list", "ul", "unordered"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleBulletList().run(),
	},
	{
		id: "ordered-list",
		label: "Numbered list",
		icon: ListOrdered,
		keywords: ["ordered", "numbered", "list", "ol"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
	},
	{
		id: "code-block",
		label: "Code block",
		hint: "```",
		icon: SquareCode,
		keywords: ["code", "block", "codeblock", "pre"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setCodeBlock().run(),
	},
	{
		id: "quote",
		label: "Blockquote",
		hint: ">",
		icon: Quote,
		keywords: ["quote", "blockquote"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setBlockquote().run(),
	},
	{
		id: "table-2x2",
		label: "Table 2 × 2",
		icon: TableIcon,
		keywords: ["table", "tbl", "grid", "small"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertTable({ rows: 2, cols: 2, withHeaderRow: true })
				.run(),
	},
	{
		id: "table-3x3",
		label: "Table 3 × 3",
		icon: TableIcon,
		keywords: ["table", "tbl", "grid"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
				.run(),
	},
	{
		id: "table-5x3",
		label: "Table 5 × 3",
		icon: TableIcon,
		keywords: ["table", "tbl", "grid", "big", "large"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertTable({ rows: 5, cols: 3, withHeaderRow: true })
				.run(),
	},
	{
		id: "callout",
		label: "Callout",
		hint: ":::",
		icon: Megaphone,
		keywords: ["callout", "card", "note", "admonition", "block"],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setCallout({ name: "note" })
				.run(),
	},
	{
		id: "hr",
		label: "Divider",
		hint: "---",
		icon: Minus,
		keywords: ["divider", "hr", "rule", "separator"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
	},
];

const TABLE_ITEMS: CommandItem[] = [
	{
		id: "row-after",
		label: "Add row below",
		icon: ArrowDownToLine,
		keywords: ["row", "add", "below", "after", "insert"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).addRowAfter().run(),
	},
	{
		id: "row-before",
		label: "Add row above",
		icon: ArrowUpToLine,
		keywords: ["row", "add", "above", "before", "insert"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).addRowBefore().run(),
	},
	{
		id: "col-after",
		label: "Add column right",
		icon: ArrowRightToLine,
		keywords: ["column", "col", "add", "after", "right"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).addColumnAfter().run(),
	},
	{
		id: "col-before",
		label: "Add column left",
		icon: ArrowLeftToLine,
		keywords: ["column", "col", "add", "before", "left"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).addColumnBefore().run(),
	},
	{
		id: "delete-row",
		label: "Delete row",
		icon: Rows3,
		keywords: ["delete", "remove", "row"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).deleteRow().run(),
	},
	{
		id: "delete-col",
		label: "Delete column",
		icon: Rows3,
		keywords: ["delete", "remove", "column", "col"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).deleteColumn().run(),
	},
	{
		id: "delete-table",
		label: "Delete table",
		icon: Trash2,
		keywords: ["delete", "remove", "table"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).deleteTable().run(),
	},
];

function filter(items: CommandItem[], query: string): CommandItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items;
	return items.filter((item) => {
		if (item.label.toLowerCase().includes(q)) return true;
		return item.keywords.some((k) => k.includes(q));
	});
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.min(hi, Math.max(lo, n));
}

const DIMENSION_RE = /^\s*(\d{1,2})\s*[x×X]\s*(\d{1,2})\s*$/;

/**
 * If the slash query parses as `N x M` (e.g. `5x3`, `2×4`), surface a
 * dynamic "Table N × M" item alongside the static presets so users aren't
 * stuck with only the preset sizes.
 */
function dynamicTableItem(query: string): CommandItem | null {
	const match = query.match(DIMENSION_RE);
	if (!match) return null;
	const rows = clamp(Number.parseInt(match[1], 10), 1, 50);
	const cols = clamp(Number.parseInt(match[2], 10), 1, 20);
	return {
		id: `table-dyn-${rows}x${cols}`,
		label: `Table ${rows} × ${cols}`,
		icon: TableIcon,
		keywords: [],
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.insertTable({ rows, cols, withHeaderRow: true })
				.run(),
	};
}

export interface SlashCommandRendererHandlers {
	onStart: (props: SuggestionProps<CommandItem>) => void;
	onUpdate: (props: SuggestionProps<CommandItem>) => void;
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
	onExit: () => void;
}

export interface SlashCommandOptions {
	createRenderer: () => SlashCommandRendererHandlers;
	/**
	 * Per-render callback so the menu always sees the latest templates without
	 * needing to recreate the editor when the campaign's template list changes.
	 */
	getTemplates: () => CampaignTemplate[];
}

function templateItem(template: CampaignTemplate): CommandItem {
	return {
		id: `template-${template.id}`,
		label: template.name,
		icon: FileCode,
		keywords: ["template"],
		command: ({ editor, range }) => {
			const md = template.wrapInStatBlock
				? `:::stat-block\n${template.body}\n:::`
				: template.body;
			editor.chain().focus().deleteRange(range).insertContent(md).run();
		},
	};
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
	name: "slashCommand",

	addOptions() {
		return {
			createRenderer: () => {
				throw new Error("SlashCommand: createRenderer must be provided");
			},
			getTemplates: () => [],
		};
	},

	addProseMirrorPlugins() {
		const getTemplates = this.options.getTemplates;
		return [
			Suggestion<CommandItem>({
				editor: this.editor,
				char: "/",
				startOfLine: false,
				allowSpaces: false,
				items: ({ query, editor }) => {
					if (editor.isActive("table")) {
						return filter(TABLE_ITEMS, query);
					}
					const templates = getTemplates().map(templateItem);
					const filtered = filter([...TEXT_ITEMS, ...templates], query);
					const dynamic = dynamicTableItem(query);
					if (dynamic && !filtered.some((i) => i.id === dynamic.id)) {
						filtered.unshift(dynamic);
					}
					return filtered;
				},
				command: ({ editor, range, props }) => props.command({ editor, range }),
				render: this.options.createRenderer,
			}),
		];
	},
});

export type { CommandItem };
