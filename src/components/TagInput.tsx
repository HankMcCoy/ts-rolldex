import { X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
	MAX_TAGS_PER_ENTITY,
	normalizeTagName,
	TAG_MAX_LENGTH,
	tagKey,
} from "@/lib/tags";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

interface TagInputProps
	extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
	/** Tag names, in the order they should render as chips. */
	value: string[];
	onChange: (next: string[]) => void;
	/** Every tag name already used in the campaign, for the suggestion list. */
	suggestions: readonly string[];
}

/**
 * Chip input for free-form tags: type a name and press Enter (or comma) to add
 * it, or pick an existing one from the suggestion list. New names and existing
 * ones are entered identically — the server decides which is which by matching
 * case-insensitively — so there is no "create tag" step to find.
 *
 * The real `<input>` carries the id and ARIA props, so `FormControl`'s Slot
 * wiring and `<FormLabel htmlFor>` both land on a focusable element.
 */
export function TagInput({
	value,
	onChange,
	suggestions,
	className,
	disabled,
	placeholder,
	onBlur,
	onKeyDown,
	...inputProps
}: TagInputProps) {
	const [draft, setDraft] = React.useState("");
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const [open, setOpen] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const listId = `${React.useId()}-tag-suggestions`;

	const selected = new Set(value.map(tagKey));
	const query = tagKey(draft);
	const matches = suggestions
		.filter((s) => !selected.has(tagKey(s)))
		.filter((s) => query === "" || tagKey(s).includes(query))
		.slice(0, MAX_SUGGESTIONS);
	const atLimit = value.length >= MAX_TAGS_PER_ENTITY;
	const showList = open && matches.length > 0;

	function add(raw: string) {
		const name = normalizeTagName(raw).slice(0, TAG_MAX_LENGTH);
		setDraft("");
		setActiveIndex(-1);
		if (!name || atLimit || selected.has(tagKey(name))) return;
		onChange([...value, name]);
	}

	function removeAt(index: number) {
		onChange(value.filter((_, i) => i !== index));
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		onKeyDown?.(event);
		if (event.defaultPrevented) return;

		if (event.key === "Enter") {
			// An empty box with nothing highlighted falls through, so Enter still
			// submits the form the way it does from any other field.
			if (activeIndex < 0 && !draft.trim()) return;
			event.preventDefault();
			add(activeIndex >= 0 ? matches[activeIndex] : draft);
			return;
		}
		if (event.key === ",") {
			event.preventDefault();
			add(draft);
			return;
		}
		if (event.key === "Backspace" && draft === "" && value.length > 0) {
			event.preventDefault();
			removeAt(value.length - 1);
			return;
		}
		if (event.key === "ArrowDown" && matches.length > 0) {
			event.preventDefault();
			setOpen(true);
			setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
			return;
		}
		if (event.key === "ArrowUp" && matches.length > 0) {
			event.preventDefault();
			setActiveIndex((i) => Math.max(i - 1, -1));
			return;
		}
		if (event.key === "Escape" && open) {
			event.preventDefault();
			setOpen(false);
			setActiveIndex(-1);
		}
	}

	return (
		<div className="relative">
			<div
				className={cn(
					"flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-white/90 px-2 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-3 has-[[aria-invalid=true]]:ring-destructive/20",
					disabled && "pointer-events-none opacity-50",
					className,
				)}
			>
				{value.map((name, index) => (
					<Badge key={tagKey(name)} variant="secondary" className="gap-1 pr-1">
						{name}
						<button
							type="button"
							onClick={() => removeAt(index)}
							aria-label={`Remove tag ${name}`}
							className="rounded-full opacity-60 transition hover:opacity-100"
						>
							<X className="size-3" />
						</button>
					</Badge>
				))}
				<input
					{...inputProps}
					ref={inputRef}
					type="text"
					role="combobox"
					aria-expanded={showList}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={
						activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
					}
					autoComplete="off"
					disabled={disabled}
					value={draft}
					maxLength={TAG_MAX_LENGTH}
					placeholder={
						atLimit
							? `Limit of ${MAX_TAGS_PER_ENTITY} tags reached`
							: (placeholder ?? "Add a tag…")
					}
					onChange={(event) => {
						setDraft(event.target.value);
						setOpen(true);
						setActiveIndex(-1);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={handleKeyDown}
					onBlur={(event) => {
						// Commit whatever is half-typed rather than dropping it when the
						// user tabs away or clicks Save.
						add(draft);
						setOpen(false);
						onBlur?.(event);
					}}
					className="h-6 min-w-32 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
				/>
			</div>
			{showList && (
				<div
					id={listId}
					role="listbox"
					className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-input bg-white p-1 shadow-md"
				>
					{matches.map((name, index) => (
						// Options stay out of the tab order: the combobox input keeps focus
						// and points at the highlighted one via aria-activedescendant.
						<button
							key={tagKey(name)}
							id={`${listId}-${index}`}
							type="button"
							role="option"
							tabIndex={-1}
							aria-selected={index === activeIndex}
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => {
								add(name);
								inputRef.current?.focus();
							}}
							onMouseEnter={() => setActiveIndex(index)}
							className={cn(
								"block w-full cursor-pointer rounded px-2 py-1 text-left text-sm",
								index === activeIndex && "bg-muted",
							)}
						>
							{name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
