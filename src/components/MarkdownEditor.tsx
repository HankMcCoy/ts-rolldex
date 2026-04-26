import { lazy, Suspense } from "react";

export interface MarkdownEditorProps {
	value: string;
	onChange: (markdown: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	minRows?: number;
	maxLength?: number;
	ariaLabel?: string;
	disabled?: boolean;
}

const MarkdownEditorImpl = lazy(() => import("./MarkdownEditor.impl"));

/**
 * Public entry point for the markdown editor. The Tiptap implementation is
 * lazy-loaded so the (~120 KB gz) editor bundle only ships on routes that
 * actually mount it. While the impl is loading or during SSR/hydration, fall
 * back to a plain `<textarea>` so the form is functional and the user can
 * keep typing without blocking on JS.
 */
export function MarkdownEditor(props: MarkdownEditorProps) {
	return (
		<Suspense fallback={<TextareaFallback {...props} />}>
			<MarkdownEditorImpl {...props} />
		</Suspense>
	);
}

function TextareaFallback({
	value,
	onChange,
	onBlur,
	placeholder,
	minRows = 5,
	maxLength,
	ariaLabel,
	disabled,
}: MarkdownEditorProps) {
	return (
		<textarea
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			placeholder={placeholder}
			rows={minRows}
			maxLength={maxLength}
			aria-label={ariaLabel}
			disabled={disabled}
			className="block w-full rounded-md border border-[var(--line)] bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
		/>
	);
}
