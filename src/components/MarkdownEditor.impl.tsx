import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import {
	type CommandItem,
	SlashCommand,
	type SlashCommandRendererHandlers,
} from "@/components/markdown/extensions/slash-command";
import { TableKeymap } from "@/components/markdown/extensions/table-keymap";
import { TsvPaste } from "@/components/markdown/extensions/tsv-paste";
import { SlashMenu } from "@/components/markdown/SlashMenu";
import { MARKDOWN_PROSE_CLASS } from "@/components/markdown-styles";

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
			CharacterCount.configure({}),
			Table.configure({ resizable: true, allowTableNodeSelection: true }),
			TableRow,
			TableCell,
			TableHeader,
			TableKeymap,
			TsvPaste,
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
		</div>
	);
}
