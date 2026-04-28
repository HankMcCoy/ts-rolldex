import type { Editor } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	ArrowDownToLine,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { Callout } from "@/components/markdown/extensions/callout";
import { EnforceTableHeader } from "@/components/markdown/extensions/enforce-table-header";
import {
	type CommandItem,
	SlashCommand,
	type SlashCommandRendererHandlers,
} from "@/components/markdown/extensions/slash-command";
import { TableKeymap } from "@/components/markdown/extensions/table-keymap";
import { TsvPaste } from "@/components/markdown/extensions/tsv-paste";
import { SlashMenu, type SlashMenuItem } from "@/components/markdown/SlashMenu";
import { MARKDOWN_PROSE_CLASS } from "@/components/markdown-styles";

interface ContextItem extends SlashMenuItem {
	run: (editor: Editor) => void;
}

const TABLE_CONTEXT_ACTIONS: ContextItem[] = [
	{
		id: "row-above",
		label: "Add row above",
		icon: ArrowUpToLine,
		run: (editor) => editor.chain().focus().addRowBefore().run(),
	},
	{
		id: "row-below",
		label: "Add row below",
		icon: ArrowDownToLine,
		run: (editor) => editor.chain().focus().addRowAfter().run(),
	},
	{
		id: "col-left",
		label: "Add column left",
		icon: ArrowLeftToLine,
		run: (editor) => editor.chain().focus().addColumnBefore().run(),
	},
	{
		id: "col-right",
		label: "Add column right",
		icon: ArrowRightToLine,
		run: (editor) => editor.chain().focus().addColumnAfter().run(),
	},
	{
		id: "delete-row",
		label: "Delete row",
		icon: Trash2,
		run: (editor) => editor.chain().focus().deleteRow().run(),
	},
	{
		id: "delete-col",
		label: "Delete column",
		icon: Trash2,
		run: (editor) => editor.chain().focus().deleteColumn().run(),
	},
	{
		id: "delete-table",
		label: "Delete table",
		icon: Trash2,
		run: (editor) => editor.chain().focus().deleteTable().run(),
	},
];

interface ContextMenuState {
	x: number;
	y: number;
	activeIndex: number;
}

declare module "@tiptap/core" {
	interface Storage {
		markdown: MarkdownStorage;
	}
}

export interface MarkdownEditorImplProps {
	value: string;
	onChange: (markdown: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	minRows?: number;
	maxLength?: number;
	ariaLabel?: string;
	disabled?: boolean;
}

interface SlashState {
	items: CommandItem[];
	activeIndex: number;
	selectItem: (item: CommandItem) => void;
	rect: DOMRect | null;
}

export default function MarkdownEditorImpl({
	value,
	onChange,
	onBlur,
	placeholder,
	minRows = 5,
	maxLength,
	ariaLabel,
	disabled = false,
}: MarkdownEditorImplProps) {
	const [slash, setSlash] = useState<SlashState | null>(null);
	const slashRef = useRef<SlashState | null>(null);
	slashRef.current = slash;

	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const contextMenuRef = useRef<HTMLDivElement | null>(null);

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onBlurRef = useRef(onBlur);
	onBlurRef.current = onBlur;
	const lastEmittedRef = useRef(value);

	// Approximate min-height from minRows (line-height ~1.5 * text-sm).
	const minHeight = `${minRows * 1.6}rem`;

	const editor = useEditor({
		immediatelyRender: false,
		shouldRerenderOnTransaction: true,
		extensions: [
			StarterKit.configure({
				codeBlock: { HTMLAttributes: { class: "rounded bg-[var(--surface)]" } },
				link: {
					autolink: true,
					openOnClick: false,
					HTMLAttributes: { rel: "noopener noreferrer" },
				},
			}),
			Placeholder.configure({ placeholder: placeholder ?? "" }),
			CharacterCount.configure(maxLength != null ? { limit: maxLength } : {}),
			Table.configure({ resizable: true, allowTableNodeSelection: true }),
			TableRow,
			TableCell,
			TableHeader,
			TableKeymap,
			TsvPaste,
			EnforceTableHeader,
			Callout,
			Markdown.configure({
				html: false,
				breaks: false,
				linkify: true,
				transformPastedText: false,
				transformCopiedText: false,
				bulletListMarker: "-",
				tightLists: true,
			}),
			SlashCommand.configure({
				createRenderer: (): SlashCommandRendererHandlers => ({
					onStart: (props) => {
						const rect = props.clientRect ? props.clientRect() : null;
						setSlash({
							items: props.items,
							activeIndex: 0,
							selectItem: props.command,
							rect,
						});
					},
					onUpdate: (props) => {
						const rect = props.clientRect ? props.clientRect() : null;
						setSlash((prev) => ({
							items: props.items,
							activeIndex: Math.min(
								prev?.activeIndex ?? 0,
								Math.max(0, props.items.length - 1),
							),
							selectItem: props.command,
							rect,
						}));
					},
					onKeyDown: ({ event }) => {
						const current = slashRef.current;
						if (!current) return false;
						if (event.key === "ArrowDown") {
							setSlash((prev) =>
								prev
									? {
											...prev,
											activeIndex:
												prev.items.length > 0
													? (prev.activeIndex + 1) % prev.items.length
													: 0,
										}
									: prev,
							);
							return true;
						}
						if (event.key === "ArrowUp") {
							setSlash((prev) =>
								prev
									? {
											...prev,
											activeIndex:
												prev.items.length > 0
													? (prev.activeIndex - 1 + prev.items.length) %
														prev.items.length
													: 0,
										}
									: prev,
							);
							return true;
						}
						if (event.key === "Enter") {
							const item = current.items[current.activeIndex];
							if (item) {
								current.selectItem(item);
								return true;
							}
						}
						if (event.key === "Escape") {
							setSlash(null);
							return true;
						}
						return false;
					},
					onExit: () => setSlash(null),
				}),
			}),
		],
		content: value,
		editorProps: {
			attributes: {
				class: `${MARKDOWN_PROSE_CLASS} focus:outline-none rounded-md border border-[var(--line)] bg-transparent px-3 py-2`,
				style: `min-height: ${minHeight}`,
				...(ariaLabel ? { "aria-label": ariaLabel } : {}),
			},
			handleDOMEvents: {
				contextmenu: (view, event) => {
					const target = event.target as HTMLElement | null;
					if (!target?.closest("table")) return false;

					const coords = { left: event.clientX, top: event.clientY };
					const posResult = view.posAtCoords(coords);
					if (posResult) {
						const tr = view.state.tr.setSelection(
							TextSelection.near(view.state.doc.resolve(posResult.pos)),
						);
						view.dispatch(tr);
					}

					event.preventDefault();
					setContextMenu({
						x: event.clientX,
						y: event.clientY,
						activeIndex: 0,
					});
					return true;
				},
			},
		},
		onUpdate: ({ editor }) => {
			const md = editor.storage.markdown.getMarkdown() as string;
			if (md === lastEmittedRef.current) return;
			lastEmittedRef.current = md;
			onChangeRef.current(md);
		},
		onBlur: () => onBlurRef.current?.(),
	});

	// Sync external resets (e.g. form.reset() after a successful save).
	useEffect(() => {
		if (!editor) return;
		if (value === lastEmittedRef.current) return;
		lastEmittedRef.current = value;
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!disabled);
	}, [editor, disabled]);

	useEffect(() => {
		if (!contextMenu) return;
		const onMouseDown = (e: MouseEvent) => {
			if (
				e.target instanceof Node &&
				contextMenuRef.current?.contains(e.target)
			) {
				return;
			}
			setContextMenu(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setContextMenu(null);
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setContextMenu((prev) =>
					prev
						? {
								...prev,
								activeIndex:
									(prev.activeIndex + 1) % TABLE_CONTEXT_ACTIONS.length,
							}
						: prev,
				);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setContextMenu((prev) =>
					prev
						? {
								...prev,
								activeIndex:
									(prev.activeIndex - 1 + TABLE_CONTEXT_ACTIONS.length) %
									TABLE_CONTEXT_ACTIONS.length,
							}
						: prev,
				);
				return;
			}
			if (e.key === "Enter" && editor) {
				e.preventDefault();
				const action = TABLE_CONTEXT_ACTIONS[contextMenu.activeIndex];
				if (action) action.run(editor);
				setContextMenu(null);
			}
		};
		document.addEventListener("mousedown", onMouseDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [contextMenu, editor]);

	const charCount = editor?.storage.characterCount?.characters?.() ?? 0;
	const overLimit = maxLength != null && charCount > maxLength;
	const nearLimit = maxLength != null && charCount > maxLength * 0.9;

	return (
		<div className="relative">
			<EditorContent editor={editor} />
			{maxLength != null && (
				<div
					className={`mt-1 text-right text-xs ${overLimit ? "text-destructive" : nearLimit ? "text-amber-700" : "text-[var(--sea-ink-soft)]"}`}
				>
					{charCount.toLocaleString()} / {maxLength.toLocaleString()}
				</div>
			)}
			{slash?.rect &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="fixed z-50"
						style={{
							top: slash.rect.bottom + 4,
							left: slash.rect.left,
						}}
					>
						<SlashMenu
							items={slash.items}
							activeIndex={slash.activeIndex}
							onSelect={(item) => slash.selectItem(item)}
							onHoverIndex={(index) =>
								setSlash((prev) =>
									prev ? { ...prev, activeIndex: index } : prev,
								)
							}
						/>
					</div>,
					document.body,
				)}
			{contextMenu &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={contextMenuRef}
						className="fixed z-50"
						style={{ top: contextMenu.y, left: contextMenu.x }}
					>
						<SlashMenu
							items={TABLE_CONTEXT_ACTIONS}
							activeIndex={contextMenu.activeIndex}
							onSelect={(item) => {
								if (editor) item.run(editor);
								setContextMenu(null);
							}}
							onHoverIndex={(index) =>
								setContextMenu((prev) =>
									prev ? { ...prev, activeIndex: index } : prev,
								)
							}
						/>
					</div>,
					document.body,
				)}
		</div>
	);
}
