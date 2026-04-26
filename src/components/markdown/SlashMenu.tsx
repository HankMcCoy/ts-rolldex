import type { LucideIcon } from "lucide-react";

export interface SlashMenuItem {
	id: string;
	label: string;
	icon: LucideIcon;
	hint?: string;
}

interface Props<T extends SlashMenuItem> {
	items: T[];
	activeIndex: number;
	onSelect: (item: T) => void;
	onHoverIndex: (index: number) => void;
}

export function SlashMenu<T extends SlashMenuItem>({
	items,
	activeIndex,
	onSelect,
	onHoverIndex,
}: Props<T>) {
	if (items.length === 0) {
		return (
			<div className="rounded-lg border border-[var(--line)] bg-white p-2 text-sm text-[var(--sea-ink-soft)] shadow-md">
				No matches
			</div>
		);
	}
	return (
		<div className="max-h-64 w-56 overflow-y-auto rounded-lg border border-[var(--line)] bg-white p-1 shadow-md">
			{items.map((item, index) => {
				const Icon = item.icon;
				const active = index === activeIndex;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onSelect(item)}
						onMouseEnter={() => onHoverIndex(index)}
						className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${active ? "bg-[var(--surface)] text-[var(--sea-ink)]" : "text-[var(--sea-ink)]"}`}
					>
						<Icon className="size-4 shrink-0 text-[var(--sea-ink-soft)]" />
						<span className="flex-1 truncate">{item.label}</span>
						{item.hint && (
							<span className="text-xs text-[var(--sea-ink-soft)]">
								{item.hint}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
