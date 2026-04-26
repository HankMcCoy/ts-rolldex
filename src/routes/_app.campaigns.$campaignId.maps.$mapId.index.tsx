import {
	createFileRoute,
	getRouteApi,
	Link,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import {
	createPin,
	deleteMap,
	deletePin,
	removeMapImage,
	updatePinLabel,
	uploadMapImage,
} from "@/server/maps";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/maps/$mapId/",
)({
	component: MapPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const mapRoute = getRouteApi("/_app/campaigns/$campaignId/maps/$mapId");

function MapPage() {
	const { campaign } = parentRoute.useLoaderData();
	const { map, pins, accessLevel, nouns, sessions } = mapRoute.useLoaderData();
	const router = useRouter();
	const navigate = useNavigate();
	const upload = useServerFn(uploadMapImage);
	const removeImage = useServerFn(removeMapImage);
	const remove = useServerFn(deleteMap);
	const create = useServerFn(createPin);
	const removePin = useServerFn(deletePin);
	const updateLabel = useServerFn(updatePinLabel);

	const isAdmin = accessLevel === "ADMIN";

	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: "Maps",
			to: "/campaigns/$campaignId/maps" as const,
			params: { campaignId: campaign.id },
		},
	];

	async function handleReplaceImage(file: File) {
		const formData = new FormData();
		formData.append("campaignId", campaign.id);
		formData.append("mapId", map.id);
		formData.append("file", file);
		const result = await upload({ data: formData });
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await router.invalidate();
	}

	async function handleRemoveImage() {
		const result = await removeImage({
			data: { campaignId: campaign.id, mapId: map.id },
		});
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await router.invalidate();
	}

	async function handleDeleteMap() {
		if (!confirm(`Delete "${map.name}"? This cannot be undone.`)) return;
		await remove({ data: { campaignId: campaign.id, mapId: map.id } });
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId/maps",
			params: { campaignId: campaign.id },
		});
	}

	async function handleCreatePin(input: {
		x: number;
		y: number;
		nounId?: string;
		sessionId?: string;
	}) {
		const result = await create({
			data: {
				campaignId: campaign.id,
				mapId: map.id,
				x: input.x,
				y: input.y,
				nounId: input.nounId,
				sessionId: input.sessionId,
			},
		});
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await router.invalidate();
	}

	async function handleDeletePin(pinId: string) {
		const result = await removePin({
			data: { campaignId: campaign.id, pinId },
		});
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await router.invalidate();
	}

	async function handleUpdatePinLabel(pinId: string, label: string) {
		const result = await updateLabel({
			data: { campaignId: campaign.id, pinId, label },
		});
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await router.invalidate();
	}

	const adminActions = isAdmin && (
		<>
			<Button variant="outline" size="sm" asChild>
				<Link
					to="/campaigns/$campaignId/maps/$mapId/edit"
					params={{ campaignId: campaign.id, mapId: map.id }}
				>
					Edit
				</Link>
			</Button>
			<button
				type="button"
				onClick={handleDeleteMap}
				title="Delete map"
				aria-label="Delete map"
				className="rounded p-1.5 text-white/55 transition hover:text-destructive"
			>
				<Trash2 className="size-4" />
			</button>
		</>
	);

	if (!map.imageUrl) {
		return (
			<Page
				breadcrumbs={breadcrumbs}
				title={map.name}
				secret={map.isSecret}
				actions={adminActions}
			>
				<EmptyMapPrompt isAdmin={isAdmin} onUpload={handleReplaceImage} />
			</Page>
		);
	}

	return (
		<Page
			breadcrumbs={breadcrumbs}
			title={map.name}
			secret={map.isSecret}
			actions={adminActions}
			fullBleed
		>
			<MapView
				campaignId={campaign.id}
				imageUrl={map.imageUrl}
				pins={pins}
				canEdit={isAdmin}
				nouns={nouns}
				sessions={sessions}
				onCreatePin={handleCreatePin}
				onDeletePin={handleDeletePin}
				onUpdatePinLabel={handleUpdatePinLabel}
				onReplaceImage={handleReplaceImage}
				onRemoveImage={handleRemoveImage}
			/>
		</Page>
	);
}

function EmptyMapPrompt({
	isAdmin,
	onUpload,
}: {
	isAdmin: boolean;
	onUpload: (file: File) => Promise<void>;
}) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setBusy(true);
		try {
			await onUpload(file);
		} finally {
			setBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	return (
		<div className="island-shell rounded-xl p-10 text-center">
			<p className="mb-4 text-[var(--sea-ink-soft)]">No image uploaded yet.</p>
			{isAdmin && (
				<>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={handleChange}
						disabled={busy}
						className="hidden"
					/>
					<Button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={busy}
					>
						{busy ? "Uploading…" : "Upload image"}
					</Button>
				</>
			)}
		</div>
	);
}
