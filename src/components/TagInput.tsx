import { ArrowLeft, Check, ChevronRight, Layers, Tag, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
	MAX_TAGS_PER_ENTITY,
	normalizeTagName,
	selectTagName,
	TAG_MAX_LENGTH,
	type TagRef,
	tagKey,
} from "@/lib/tags";
import { cn } from "@/lib/utils";

interface TagInputProps
	extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
	/** Tag names, in the order they should render as chips. */
	value: string[];
	onChange: (next: string[]) => void;
	/** Every tag name already used in the campaign, for the suggestion list. */
	suggestions: readonly string[];
	tags?: readonly (TagRef & { groupId: string | null })[];
	groups?: readonly TagRef[];
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
	tags = [],
	groups = [],
	className,
	disabled,
	placeholder,
	onBlur,
	onKeyDown,
	...inputProps
}: TagInputProps) {
	const [groupId, setGroupId] = React.useState<string | null>(null);
	const [draft, setDraft] = React.useState("");
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const [open, setOpen] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const listRef = React.useRef<HTMLDivElement>(null);
	const listId = `${React.useId()}-tag-suggestions`;

	const selected = new Set(value.map(tagKey));
	const query = tagKey(draft);

	const tagByName = new Map(tags.map((t) => [tagKey(t.name), t]));
	const currentGroup = groups.find((g) => g.id === groupId);
	type Option = { kind: "group" | "tag"; id: string; name: string };
	const matches: Option[] = currentGroup
		? suggestions
				.filter(
					(name) =>
						tagByName.get(tagKey(name))?.groupId === currentGroup.id &&
						tagKey(name).includes(query),
				)
				.map((name) => ({ kind: "tag", id: tagKey(name), name }))
		: query
			? suggestions
					.filter(
						(name) =>
							tagKey(name).includes(query) ||
							tagKey(groupLabel(name) ?? "").includes(query),
					)
					.map((name) => ({ kind: "tag", id: tagKey(name), name }))
			: [
					...groups.map(
						(g): Option => ({ kind: "group", id: g.id, name: g.name }),
					),
					...suggestions
						.filter(
							(name) =>
								!tagByName.get(tagKey(name))?.groupId ||
								!groups.some(
									(g) => g.id === tagByName.get(tagKey(name))?.groupId,
								),
						)
						.map((name): Option => ({ kind: "tag", id: tagKey(name), name })),
				];
	const atLimit = value.length >= MAX_TAGS_PER_ENTITY;
	const showList = open && (groups.length > 0 || matches.length > 0);
	const activeOption = matches[activeIndex];
	React.useEffect(() => {
		if (activeIndex >= 0)
			listRef.current
				?.querySelector<HTMLElement>(`[id="${listId}-${activeIndex}"]`)
				?.scrollIntoView?.({ block: "nearest" });
	}, [activeIndex, listId]);

	function browse(id: string | null) {
		setGroupId(id);
		setDraft("");
		setActiveIndex(-1);
		setOpen(true);
		inputRef.current?.focus();
	}
	function choose(option: Option) {
		if (option.kind === "group") {
			browse(option.id);
			return;
		}
		if (selected.has(tagKey(option.name)))
			onChange(value.filter((n) => tagKey(n) !== tagKey(option.name)));
		else add(option.name);
		setDraft("");
		setActiveIndex(-1);
	}

	function add(raw: string) {
		const name = normalizeTagName(raw).slice(0, TAG_MAX_LENGTH);
		setDraft("");
		setActiveIndex(-1);
		if (!name || selected.has(tagKey(name))) return;
		if (
			currentGroup &&
			!tags.some(
				(t) => t.groupId === currentGroup.id && tagKey(t.name) === tagKey(name),
			)
		)
			return;
		onChange(selectTagName(value, name, tags));
	}

	function groupLabel(name: string) {
		const groupId = tags.find((t) => tagKey(t.name) === tagKey(name))?.groupId;
		return groups.find((g) => g.id === groupId)?.name;
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
			if (activeOption) choose(activeOption);
			else add(draft);
			return;
		}
		if (event.key === ",") {
			event.preventDefault();
			add(draft);
			return;
		}
		if (
			(event.key === "ArrowLeft" || event.key === "Backspace") &&
			draft === "" &&
			currentGroup
		) {
			event.preventDefault();
			browse(null);
			return;
		}
		if (event.key === "ArrowRight" && activeOption?.kind === "group") {
			event.preventDefault();
			browse(activeOption.id);
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
			if (currentGroup) browse(null);
			else setOpen(false);
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
						{groupLabel(name) && (
							<span className="opacity-60">{groupLabel(name)}:</span>
						)}
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
						showList && activeOption ? `${listId}-${activeIndex}` : undefined
					}
					autoComplete="off"
					disabled={disabled}
					value={draft}
					maxLength={TAG_MAX_LENGTH}
					placeholder={
						atLimit
							? `Limit of ${MAX_TAGS_PER_ENTITY} tags reached`
							: currentGroup
								? `Choose ${currentGroup.name.toLowerCase()}…`
								: (placeholder ?? "Search tags or groups…")
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
						setGroupId(null);
						setActiveIndex(-1);
						onBlur?.(event);
					}}
					className="h-6 min-w-32 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
				/>
			</div>
			{showList && (
				<div className="absolute z-20 mt-1 w-full min-w-56 rounded-lg border border-input bg-popover p-1 shadow-md">
					{currentGroup && (
						<div className="mb-1 flex items-center gap-2 border-b px-1 pb-1">
							<button
								type="button"
								aria-label="Back to all tags"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => browse(null)}
								className="rounded p-1.5 hover:bg-muted"
							>
								<ArrowLeft className="size-3.5" />
							</button>
							<span className="text-sm font-medium">{currentGroup.name}</span>
							<span className="ml-auto pr-2 text-xs text-muted-foreground">
								Choose one
							</span>
						</div>
					)}
					<div
						id={listId}
						ref={listRef}
						role="listbox"
						aria-label={
							currentGroup ? `${currentGroup.name} tags` : "Tags and groups"
						}
						aria-multiselectable="true"
						className="max-h-60 overflow-auto"
					>
						{matches.length === 0 && (
							<p className="px-2 py-3 text-sm text-muted-foreground">
								{currentGroup
									? "No matching tags in this group."
									: "No matching tags."}
							</p>
						)}
						{matches.map((option, index) => {
							const checked =
								option.kind === "tag" && selected.has(tagKey(option.name));
							const groupSelection =
								option.kind === "group"
									? value.find(
											(n) => tagByName.get(tagKey(n))?.groupId === option.id,
										)
									: undefined;
							return (
								<button
									key={`${option.kind}-${option.id}`}
									id={`${listId}-${index}`}
									type="button"
									role="option"
									aria-label={
										option.kind === "group"
											? `${option.name} group`
											: groupLabel(option.name)
												? `${option.name} (${groupLabel(option.name)})`
												: option.name
									}
									tabIndex={-1}
									aria-selected={checked}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										choose(option);
										inputRef.current?.focus();
									}}
									onMouseEnter={() => setActiveIndex(index)}
									className={cn(
										"flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left text-sm",
										index === activeIndex && "bg-muted",
									)}
								>
									{option.kind === "group" ? (
										<Layers className="size-3.5 shrink-0 text-muted-foreground" />
									) : (
										<Tag className="size-3.5 shrink-0 text-muted-foreground" />
									)}
									<span className="truncate">{option.name}</span>
									{option.kind === "group" ? (
										<>
											<span className="ml-auto truncate text-xs text-muted-foreground">
												{groupSelection}
											</span>
											<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
										</>
									) : (
										<>
											<span className="ml-auto truncate text-xs text-muted-foreground">
												{!currentGroup && groupLabel(option.name)}
											</span>
											{checked && <Check className="size-3.5 shrink-0" />}
										</>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
