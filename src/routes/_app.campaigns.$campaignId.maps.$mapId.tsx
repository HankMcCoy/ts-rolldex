import {
	createFileRoute,
	getRouteApi,
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
	getMap,
	removeMapImage,
	updatePinLabel,
	uploadMapImage,
} from "@/server/maps";
import { getNouns } from "@/server/nouns";
import { getSessions } from "@/server/sessions";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/$mapId")(
	{
		loader: async ({ params }) => {
			const [mapData, nouns, sessions] = await Promise.all([
				getMap({
					data: { campaignId: params.campaignId, mapId: params.mapId },
				}),
				getNouns({ data: { campaignId: params.campaignId } }),
				getSessions({ data: { campaignId: params.campaignId } }),
			]);
			return { ...mapData, nouns, sessions };
		},
		head: ({ loaderData }) => ({
			meta: [{ title: `${loaderData?.map.name ?? "Map"} - Rolldex` }],
		}),
		component: MapPage,
	},
);

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function MapPage() {
	const { campaign } = parentRoute.useLoaderData();
	const { map, pins, accessLevel, nouns, sessions } = Route.useLoaderData();
	const router = useRouter();
	const navigate = useNavigate();
	const upload = useServerFn(uploadMapImage);
	const removeImage = useServerFn(removeMapImage);
	const remove = useServerFn(deleteMap);
	const create = useServerFn(createPin);
	const removePin = useServerFn(deletePin);
	const updateLabel = useServerFn(updatePinLabel);

	const [imageError, setImageError] = useState<string | null>(null);
	const [imageBusy, setImageBusy] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setImageError(null);
		setImageBusy(true);
		try {
			const formData = new FormData();
			formData.append("campaignId", campaign.id);
			formData.append("mapId", map.id);
			formData.append("file", file);
			const result = await upload({ data: formData });
			if (!result.ok) {
				setImageError(result.error);
				return;
			}
			await router.invalidate();
		} finally {
			setImageBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	async function handleRemoveImage() {
		if (!confirm("Remove this map image?")) return;
		setImageError(null);
		setImageBusy(true);
		try {
			const result = await removeImage({
				data: { campaignId: campaign.id, mapId: map.id },
			});
			if (!result.ok) setImageError(result.error);
			await router.invalidate();
		} finally {
			setImageBusy(false);
		}
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

	return (
		<Page
			breadcrumbs={breadcrumbs}
			title={map.name}
			secret={map.isSecret}
			actions={
				isAdmin && (
					<button
						type="button"
						onClick={handleDeleteMap}
						title="Delete map"
						aria-label="Delete map"
						className="rounded p-1.5 text-white/55 transition hover:text-destructive"
					>
						<Trash2 className="size-4" />
					</button>
				)
			}
		>
			{map.imageUrl ? (
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
				/>
			) : (
				<div className="island-shell rounded-xl p-10 text-center">
					<p className="mb-4 text-[var(--sea-ink-soft)]">
						No image uploaded yet.
					</p>
					{isAdmin && (
						<Button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={imageBusy}
						>
							{imageBusy ? "Uploading…" : "Upload image"}
						</Button>
					)}
				</div>
			)}

			{isAdmin && (
				<div className="mt-4 flex flex-wrap items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={handleFileChange}
						disabled={imageBusy}
						className="hidden"
					/>
					{map.imageUrl && (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={imageBusy}
							>
								Replace image
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleRemoveImage}
								disabled={imageBusy}
							>
								Remove image
							</Button>
						</>
					)}
					{imageError && (
						<span className="text-sm text-destructive">{imageError}</span>
					)}
				</div>
			)}
		</Page>
	);
}
