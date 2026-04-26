import { type Editor, Extension, type Range } from "@tiptap/core";
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionProps,
} from "@tiptap/suggestion";
import {
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Minus,
	Quote,
	SquareCode,
	Table as TableIcon,
} from "lucide-react";
import type { SlashMenuItem } from "@/components/markdown/SlashMenu";

interface CommandItem extends SlashMenuItem {
	keywords: string[];
	command: (ctx: { editor: Editor; range: Range }) => void;
}

const ITEMS: CommandItem[] = [
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
		id: "table",
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
		id: "hr",
		label: "Divider",
		hint: "---",
		icon: Minus,
		keywords: ["divider", "hr", "rule", "separator"],
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
	},
];

function filter(query: string): CommandItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return ITEMS;
	return ITEMS.filter((item) => {
		if (item.label.toLowerCase().includes(q)) return true;
		return item.keywords.some((k) => k.includes(q));
	});
}

export interface SlashCommandRendererHandlers {
	onStart: (props: SuggestionProps<CommandItem>) => void;
	onUpdate: (props: SuggestionProps<CommandItem>) => void;
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
	onExit: () => void;
}

export interface SlashCommandOptions {
	createRenderer: () => SlashCommandRendererHandlers;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
	name: "slashCommand",

	addOptions() {
		return {
			createRenderer: () => {
				throw new Error("SlashCommand: createRenderer must be provided");
			},
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion<CommandItem>({
				editor: this.editor,
				char: "/",
				startOfLine: false,
				allowSpaces: false,
				items: ({ query }) => filter(query),
				command: ({ editor, range, props }) => props.command({ editor, range }),
				render: this.options.createRenderer,
			}),
		];
	},
});

export type { CommandItem };
