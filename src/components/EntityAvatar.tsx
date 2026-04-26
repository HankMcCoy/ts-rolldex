import { Landmark, Package, ScrollText, User, Users } from "lucide-react";
import type { ComponentType } from "react";
import type { EntityType } from "@/lib/relationships";
import { cn } from "@/lib/utils";

const ICON_FOR_TYPE: Record<
	EntityType,
	ComponentType<{ className?: string }>
> = {
	PERSON: User,
	PLACE: Landmark,
	THING: Package,
	FACTION: Users,
	SESSION: ScrollText,
};

interface Props {
	entityType: EntityType;
	imageUrl: string | null;
	name: string;
	className?: string;
}

export function EntityAvatar({ entityType, imageUrl, name, className }: Props) {
	const Icon = ICON_FOR_TYPE[entityType];
	return (
		<div
			className={cn(
				"relative size-10 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white/90",
				className,
			)}
		>
			{imageUrl ? (
				<img src={imageUrl} alt={name} className="h-full w-full object-cover" />
			) : (
				<div className="flex h-full w-full items-center justify-center text-[var(--sea-ink-soft)]">
					<Icon className="h-1/2 w-1/2" />
				</div>
			)}
		</div>
	);
}
