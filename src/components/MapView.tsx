import { Link } from "@tanstack/react-router";
import { ImageOff, Plus, Trash2, Upload, X } from "lucide-react";
import {
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	TransformComponent,
	TransformWrapper,
	useTransformComponent,
} from "react-zoom-pan-pinch";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { NOUN_TYPE_LABELS, type NounType } from "@/lib/noun-types";

export interface MapPin {
	id: string;
	x: number;
	y: number;
	label: string | null;
	noun: {
		id: string;
		name: string;
		nounType: NounType;
		imageUrl: string | null;
		summary: string;
	} | null;
	session: { id: string; name: string; summary: string } | null;
}

interface NounCandidate {
	id: string;
	name: string;
	nounType: NounType;
	imageUrl: string | null;
}
interface SessionCandidate {
	id: string;
	name: string;
}

interface Props {
	campaignId: string;
	imageUrl: string;
	pins: MapPin[];
	canEdit: boolean;
	nouns: NounCandidate[];
	sessions: SessionCandidate[];
	onCreatePin: (input: {
		x: number;
		y: number;
		nounId?: string;
		sessionId?: string;
	}) => Promise<void>;
	onDeletePin: (pinId: string) => Promise<void>;
	onUpdatePinLabel: (pinId: string, label: string) => Promise<void>;
	onReplaceImage: (file: File) => Promise<void>;
	onRemoveImage: () => Promise<void>;
}

type PendingPin = { x: number; y: number };

/**
 * Counter-scales its children so they keep a constant on-screen size while the
 * surrounding TransformWrapper zooms. Unlike the library's `KeepScale`, this
 * reads the scale during render via `useTransformComponent` so the inverse is
 * applied on the very first paint (KeepScale only updates via onChange, which
 * doesn't fire on mount). Origin is pinned to 0 0 so the anchor — driven by the
 * caller's `left`/`top` — stays put regardless of zoom.
 */
function CounterScale({
	children,
	className,
	style,
}: {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}) {
	const scale = useTransformComponent(({ state }) => state.scale);
	return (
		<div
			className={className}
			style={{
				...style,
				transform: `scale(${1 / scale})`,
				transformOrigin: "0 0",
			}}
		>
			{children}
		</div>
	);
}

export function MapView({
	campaignId,
	imageUrl,
	pins,
	canEdit,
	nouns,
	sessions,
	onCreatePin,
	onDeletePin,
	onUpdatePinLabel,
	onReplaceImage,
	onRemoveImage,
}: Props) {
	const [adding, setAdding] = useState(false);
	const [pending, setPending] = useState<PendingPin | null>(null);
	const [activePinId, setActivePinId] = useState<string | null>(null);
	const [imageBusy, setImageBusy] = useState(false);
	const imageRef = useRef<HTMLImageElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setImageBusy(true);
		try {
			await onReplaceImage(file);
		} finally {
			setImageBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	async function handleRemoveImage() {
		if (!confirm("Remove this map image?")) return;
		setImageBusy(true);
		try {
			await onRemoveImage();
		} finally {
			setImageBusy(false);
		}
	}

	function handleImageClick(e: ReactMouseEvent<HTMLDivElement>) {
		if (!adding) return;
		const img = imageRef.current;
		if (!img) return;
		const rect = img.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width;
		const y = (e.clientY - rect.top) / rect.height;
		if (x < 0 || x > 1 || y < 0 || y > 1) return;
		setPending({ x, y });
	}

	async function handlePick(input: { nounId?: string; sessionId?: string }) {
		if (!pending) return;
		await onCreatePin({ ...pending, ...input });
		setPending(null);
		setAdding(false);
	}

	const activePin = pins.find((p) => p.id === activePinId) ?? null;

	return (
		<TooltipProvider delayDuration={150}>
			<div
				className={`relative h-full w-full overflow-hidden border-y border-[var(--line)] bg-white/90 ${adding ? "ring-2 ring-inset ring-[var(--lagoon-deep)]" : ""}`}
			>
				<TransformWrapper
					minScale={1}
					maxScale={6}
					initialScale={1}
					centerOnInit
					wheel={{ step: 0.1 }}
					doubleClick={{ disabled: true }}
					panning={{ disabled: adding }}
				>
					<TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
						{/* biome-ignore lint/a11y/noStaticElementInteractions: pin placement is a mouse-driven map interaction */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: pin placement requires pointer coordinates */}
						<div
							className="relative"
							onClick={handleImageClick}
							role={adding ? "application" : undefined}
						>
							<img
								ref={imageRef}
								src={imageUrl}
								alt=""
								decoding="async"
								className={`block max-h-none w-auto select-none ${adding ? "cursor-crosshair" : "cursor-grab"}`}
								draggable={false}
							/>
							{pins.map((pin) => (
								<PinMarker
									key={pin.id}
									pin={pin}
									active={pin.id === activePinId}
									onClick={() => setActivePinId(pin.id)}
								/>
							))}
							{pending && (
								<CounterScale
									className="pointer-events-none absolute"
									style={{
										left: `${pending.x * 100}%`,
										top: `${pending.y * 100}%`,
									}}
								>
									<div className="size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lagoon-deep)] ring-2 ring-white" />
								</CounterScale>
							)}
						</div>
					</TransformComponent>
				</TransformWrapper>

				{canEdit && (
					<div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onChange={handleFileChange}
							disabled={imageBusy}
							className="hidden"
						/>
						<div className="flex flex-col gap-2 rounded-lg bg-white/90 p-1.5 shadow-md backdrop-blur">
							<Button
								type="button"
								size="sm"
								variant={adding ? "default" : "outline"}
								onClick={() => {
									setAdding((a) => !a);
									setPending(null);
								}}
							>
								<Plus className="size-4" />
								{adding ? "Cancel" : "Add pin"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => fileInputRef.current?.click()}
								disabled={imageBusy}
							>
								<Upload className="size-4" />
								Replace
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={handleRemoveImage}
								disabled={imageBusy}
							>
								<ImageOff className="size-4" />
								Remove
							</Button>
						</div>
						{adding && (
							<div className="rounded bg-[var(--sea-ink)] px-2 py-1 text-xs text-white shadow">
								Click the map to place a pin.
							</div>
						)}
					</div>
				)}
			</div>

			{activePin && (
				<PinPopover
					campaignId={campaignId}
					pin={activePin}
					canEdit={canEdit}
					onClose={() => setActivePinId(null)}
					onDelete={async () => {
						await onDeletePin(activePin.id);
						setActivePinId(null);
					}}
					onSaveLabel={(label) => onUpdatePinLabel(activePin.id, label)}
				/>
			)}

			{pending && (
				<TargetPicker
					nouns={nouns}
					sessions={sessions}
					onCancel={() => setPending(null)}
					onPick={handlePick}
				/>
			)}
		</TooltipProvider>
	);
}

function PinMarker({
	pin,
	active,
	onClick,
}: {
	pin: MapPin;
	active: boolean;
	onClick: () => void;
}) {
	const name = pin.noun?.name ?? pin.session?.name ?? "Pin";
	const summary = pin.noun?.summary ?? pin.session?.summary ?? "";
	return (
		<CounterScale
			className="absolute"
			style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClick();
						}}
						className={`flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--sea-ink)] text-white shadow-sm transition hover:scale-110 ${active ? "ring-2 ring-[var(--lagoon-deep)]" : ""}`}
					>
						{pin.noun ? (
							<EntityAvatar
								entityType={pin.noun.nounType}
								imageUrl={pin.noun.imageUrl}
								name={pin.noun.name}
								className="size-5 rounded-full border-0"
							/>
						) : (
							<span className="text-[10px] font-bold">S</span>
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent
					side="top"
					className="block max-w-xs items-start gap-0 p-2 text-left"
				>
					<div className="text-sm font-semibold">{name}</div>
					{pin.label && (
						<div className="mt-0.5 text-xs italic opacity-80">{pin.label}</div>
					)}
					{summary && (
						<div className="mt-1 text-xs leading-snug opacity-80">
							{summary}
						</div>
					)}
				</TooltipContent>
			</Tooltip>
		</CounterScale>
	);
}

function PinPopover({
	campaignId,
	pin,
	canEdit,
	onClose,
	onDelete,
	onSaveLabel,
}: {
	campaignId: string;
	pin: MapPin;
	canEdit: boolean;
	onClose: () => void;
	onDelete: () => Promise<void>;
	onSaveLabel: (label: string) => Promise<void>;
}) {
	const [editingLabel, setEditingLabel] = useState(false);
	const [labelDraft, setLabelDraft] = useState(pin.label ?? "");
	const [savingLabel, setSavingLabel] = useState(false);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	async function handleSaveLabel() {
		setSavingLabel(true);
		try {
			await onSaveLabel(labelDraft);
			setEditingLabel(false);
		} finally {
			setSavingLabel(false);
		}
	}

	const targetLabel = pin.noun
		? NOUN_TYPE_LABELS[pin.noun.nounType]
		: "Session";

	return (
		<div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
			<div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
				<div className="mb-3 flex items-start justify-between gap-2">
					<div className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
						{targetLabel}
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="rounded p-1 text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
					>
						<X className="size-4" />
					</button>
				</div>
				{pin.noun && (
					<Link
						to="/campaigns/$campaignId/nouns/$nounId"
						params={{ campaignId, nounId: pin.noun.id }}
						className="flex items-center gap-3 rounded-lg p-2 no-underline transition hover:bg-[var(--surface)]"
					>
						<EntityAvatar
							entityType={pin.noun.nounType}
							imageUrl={pin.noun.imageUrl}
							name={pin.noun.name}
						/>
						<span className="font-medium">{pin.noun.name}</span>
					</Link>
				)}
				{pin.session && (
					<Link
						to="/campaigns/$campaignId/sessions/$sessionId"
						params={{ campaignId, sessionId: pin.session.id }}
						className="flex items-center gap-3 rounded-lg p-2 no-underline transition hover:bg-[var(--surface)]"
					>
						<EntityAvatar
							entityType="SESSION"
							imageUrl={null}
							name={pin.session.name}
						/>
						<span className="font-medium">{pin.session.name}</span>
					</Link>
				)}
				{editingLabel ? (
					<div className="mt-3 space-y-2 px-2">
						<Input
							autoFocus
							value={labelDraft}
							onChange={(e) => setLabelDraft(e.target.value)}
							placeholder="Optional label"
							maxLength={200}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleSaveLabel();
								}
							}}
						/>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								onClick={handleSaveLabel}
								disabled={savingLabel}
							>
								{savingLabel ? "Saving…" : "Save"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setEditingLabel(false);
									setLabelDraft(pin.label ?? "");
								}}
								disabled={savingLabel}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					pin.label && (
						<p className="mt-2 px-2 text-sm text-[var(--sea-ink-soft)]">
							{pin.label}
						</p>
					)
				)}
				{canEdit && !editingLabel && (
					<div className="mt-3 flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setEditingLabel(true)}
						>
							{pin.label ? "Edit label" : "Add label"}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onDelete}
						>
							<Trash2 className="size-4" />
							Remove
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

function TargetPicker({
	nouns,
	sessions,
	onCancel,
	onPick,
}: {
	nouns: NounCandidate[];
	sessions: SessionCandidate[];
	onCancel: () => void;
	onPick: (input: { nounId?: string; sessionId?: string }) => Promise<void>;
}) {
	const [query, setQuery] = useState("");

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onCancel();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onCancel]);

	const q = query.trim().toLowerCase();
	const filteredNouns = q
		? nouns.filter((n) => n.name.toLowerCase().includes(q))
		: nouns;
	const filteredSessions = q
		? sessions.filter((s) => s.name.toLowerCase().includes(q))
		: sessions;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-lg">
				<div className="border-b border-[var(--line)] p-3">
					<div className="mb-2 flex items-center justify-between gap-2">
						<h3 className="font-medium">Pin to…</h3>
						<button
							type="button"
							onClick={onCancel}
							aria-label="Close"
							className="rounded p-1 text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
						>
							<X className="size-4" />
						</button>
					</div>
					<Input
						autoFocus
						placeholder="Search entities and sessions…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<div className="flex-1 overflow-y-auto p-2">
					{filteredNouns.length === 0 && filteredSessions.length === 0 && (
						<p className="p-3 text-sm text-[var(--sea-ink-soft)]">
							No matches.
						</p>
					)}
					{filteredNouns.length > 0 && (
						<>
							<div className="px-2 pt-1 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
								Entities
							</div>
							{filteredNouns.map((n) => (
								<button
									key={n.id}
									type="button"
									onClick={() => onPick({ nounId: n.id })}
									className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[var(--surface)]"
								>
									<EntityAvatar
										entityType={n.nounType}
										imageUrl={n.imageUrl}
										name={n.name}
										className="size-7"
									/>
									<span className="flex-1 truncate">{n.name}</span>
									<span className="text-xs text-[var(--sea-ink-soft)]">
										{NOUN_TYPE_LABELS[n.nounType]}
									</span>
								</button>
							))}
						</>
					)}
					{filteredSessions.length > 0 && (
						<>
							<div className="mt-2 px-2 pt-1 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
								Sessions
							</div>
							{filteredSessions.map((s) => (
								<button
									key={s.id}
									type="button"
									onClick={() => onPick({ sessionId: s.id })}
									className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[var(--surface)]"
								>
									<EntityAvatar
										entityType="SESSION"
										imageUrl={null}
										name={s.name}
										className="size-7"
									/>
									<span className="flex-1 truncate">{s.name}</span>
								</button>
							))}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
