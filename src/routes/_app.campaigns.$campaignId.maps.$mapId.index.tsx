import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import {
	BundleMutationError,
	bundleKey,
	patchAddPin,
	patchRemoveMap,
	patchRemovePin,
	patchUpdatePin,
	useBundleMutation,
	useCampaign,
	useMapWithPins,
} from "@/lib/queries";
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

function MapPage() {
	const { campaignId, mapId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const { map, pins, accessLevel, nouns, sessions } = useMapWithPins(
		campaignId,
		mapId,
	);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const upload = useServerFn(uploadMapImage);
	const removeImage = useServerFn(removeMapImage);

	const deleteMapMutation = useBundleMutation({
		campaignId: campaign.id,
		mutationFn: (vars: { mapId: string }) =>
			deleteMap({ data: { campaignId: campaign.id, mapId: vars.mapId } }),
		patch: (bundle, vars) => patchRemoveMap(bundle, vars.mapId),
	});

	const createPinMutation = useBundleMutation({
		campaignId: campaign.id,
		mutationFn: (vars: {
			id: string;
			mapId: string;
			x: number;
			y: number;
			nounId?: string;
			sessionId?: string;
			label?: string;
		}) => createPin({ data: { campaignId: campaign.id, ...vars } }),
		patch: (bundle, vars) =>
			patchAddPin(bundle, {
				id: vars.id,
				mapId: vars.mapId,
				nounId: vars.nounId ?? null,
				sessionId: vars.sessionId ?? null,
				x: vars.x,
				y: vars.y,
				label: vars.label ?? null,
			}),
	});

	const deletePinMutation = useBundleMutation({
		campaignId: campaign.id,
		mutationFn: (vars: { pinId: string }) =>
			deletePin({ data: { campaignId: campaign.id, pinId: vars.pinId } }),
		patch: (bundle, vars) => patchRemovePin(bundle, vars.pinId),
	});

	const updatePinLabelMutation = useBundleMutation({
		campaignId: campaign.id,
		mutationFn: (vars: { pinId: string; label: string }) =>
			updatePinLabel({
				data: {
					campaignId: campaign.id,
					pinId: vars.pinId,
					label: vars.label,
				},
			}),
		patch: (bundle, vars) =>
			patchUpdatePin(bundle, vars.pinId, (p) => ({
				...p,
				label: vars.label.trim().length > 0 ? vars.label.trim() : null,
			})),
	});

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
		await queryClient.invalidateQueries({ queryKey: bundleKey(campaign.id) });
	}

	async function handleRemoveImage() {
		const result = await removeImage({
			data: { campaignId: campaign.id, mapId: map.id },
		});
		if (!result.ok) {
			alert(result.error);
			return;
		}
		await queryClient.invalidateQueries({ queryKey: bundleKey(campaign.id) });
	}

	async function handleDeleteMap() {
		if (!confirm(`Delete "${map.name}"? This cannot be undone.`)) return;
		await deleteMapMutation.mutateAsync({ mapId: map.id });
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
		try {
			await createPinMutation.mutateAsync({
				id: crypto.randomUUID(),
				mapId: map.id,
				x: input.x,
				y: input.y,
				nounId: input.nounId,
				sessionId: input.sessionId,
			});
		} catch (e) {
			if (e instanceof BundleMutationError) alert(e.message);
			else throw e;
		}
	}

	async function handleDeletePin(pinId: string) {
		try {
			await deletePinMutation.mutateAsync({ pinId });
		} catch (e) {
			if (e instanceof BundleMutationError) alert(e.message);
			else throw e;
		}
	}

	async function handleUpdatePinLabel(pinId: string, label: string) {
		try {
			await updatePinLabelMutation.mutateAsync({ pinId, label });
		} catch (e) {
			if (e instanceof BundleMutationError) alert(e.message);
			else throw e;
		}
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
