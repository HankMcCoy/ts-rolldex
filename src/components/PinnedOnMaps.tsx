import { Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import type { MapPinLocation } from "@/server/query-helpers";

interface Props {
	campaignId: string;
	locations: MapPinLocation[];
}

export function PinnedOnMaps({ campaignId, locations }: Props) {
	if (locations.length === 0) return null;

	return (
		<section>
			<h2 className="island-kicker mb-3">On the map</h2>
			<ul className="grid max-w-2xl gap-3 sm:grid-cols-2">
				{locations.map((loc) => (
					<li key={loc.map.id}>
						<Link
							to="/campaigns/$campaignId/maps/$mapId"
							params={{ campaignId, mapId: loc.map.id }}
							className="island-shell block overflow-hidden rounded-xl no-underline transition hover:-translate-y-0.5"
						>
							<div className="relative aspect-video w-full overflow-hidden bg-white/90">
								{loc.map.imageUrl ? (
									<img
										src={loc.map.imageUrl}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center text-[var(--sea-ink-soft)]">
										<MapIcon className="size-8" />
									</div>
								)}
								{loc.pins.map((pin) => (
									<span
										key={pin.id}
										className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--sea-ink)] shadow"
										style={{
											left: `${pin.x * 100}%`,
											top: `${pin.y * 100}%`,
										}}
										title={pin.label ?? undefined}
									/>
								))}
							</div>
							<div className="flex items-center justify-between gap-2 px-3 py-2">
								<span className="font-medium">{loc.map.name}</span>
								<span className="text-xs text-[var(--sea-ink-soft)]">
									{loc.pins.length} {loc.pins.length === 1 ? "pin" : "pins"}
								</span>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
