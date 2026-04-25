import { Landmark, Package, User, Users } from "lucide-react";
import type { ComponentType } from "react";
import type { NounType } from "@/lib/noun-types";
import { cn } from "@/lib/utils";

const ICON_FOR_TYPE: Record<NounType, ComponentType<{ className?: string }>> = {
	PERSON: User,
	PLACE: Landmark,
	THING: Package,
	FACTION: Users,
};

interface Props {
	nounType: NounType;
	imageUrl: string | null;
	name: string;
	className?: string;
}

export function EntityImage({ nounType, imageUrl, name, className }: Props) {
	const Icon = ICON_FOR_TYPE[nounType];
	return (
		<div
			className={cn(
				"relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-white/90 shadow-sm",
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
