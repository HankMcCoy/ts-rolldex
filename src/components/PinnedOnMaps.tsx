import { Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
							<MapThumbnail imageUrl={loc.map.imageUrl} pins={loc.pins} />
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

interface ImageBox {
	left: number;
	top: number;
	width: number;
	height: number;
}

/**
 * Renders the map image at object-contain in a fixed-aspect container, then
 * computes the image's actual rendered rect within the container so pins
 * (whose coords are percentages of the *image*, not the container) land on
 * the right point even when the image's aspect ratio doesn't match the box.
 */
function MapThumbnail({
	imageUrl,
	pins,
}: {
	imageUrl: string | null;
	pins: MapPinLocation["pins"];
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [box, setBox] = useState<ImageBox | null>(null);

	const measure = useCallback(() => {
		const img = imgRef.current;
		const container = containerRef.current;
		if (!img || !container || !img.naturalWidth || !img.naturalHeight) return;
		const cw = container.clientWidth;
		const ch = container.clientHeight;
		if (cw === 0 || ch === 0) return;
		const naturalRatio = img.naturalWidth / img.naturalHeight;
		const containerRatio = cw / ch;
		let width: number;
		let height: number;
		if (naturalRatio > containerRatio) {
			// Image is wider than container — width fills, height letterboxes.
			width = cw;
			height = cw / naturalRatio;
		} else {
			height = ch;
			width = ch * naturalRatio;
		}
		setBox({
			left: (cw - width) / 2,
			top: (ch - height) / 2,
			width,
			height,
		});
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const ro = new ResizeObserver(measure);
		ro.observe(container);
		return () => ro.disconnect();
	}, [measure]);

	if (!imageUrl) {
		return (
			<div className="relative aspect-video w-full overflow-hidden bg-white/90">
				<div className="flex h-full w-full items-center justify-center text-[var(--sea-ink-soft)]">
					<MapIcon className="size-8" />
				</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="relative aspect-video w-full overflow-hidden bg-white/90"
		>
			<img
				ref={imgRef}
				src={imageUrl}
				alt=""
				onLoad={measure}
				className="h-full w-full object-contain"
			/>
			{box &&
				pins.map((pin) => (
					<span
						key={pin.id}
						className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--sea-ink)] shadow"
						style={{
							left: `${box.left + pin.x * box.width}px`,
							top: `${box.top + pin.y * box.height}px`,
						}}
						title={pin.label ?? undefined}
					/>
				))}
		</div>
	);
}
