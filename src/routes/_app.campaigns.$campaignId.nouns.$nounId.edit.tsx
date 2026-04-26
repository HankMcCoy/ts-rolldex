import {
	createFileRoute,
	getRouteApi,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EntityImage } from "@/components/EntityImage";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@/lib/form-resolver";
import { NOUN_TYPE_LABELS, NOUN_TYPES, nounTypeSchema } from "@/lib/noun-types";
import { removeNounImage, updateNoun, uploadNounImage } from "@/server/nouns";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId/edit",
)({
	component: EditNounPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const nounRoute = getRouteApi("/_app/campaigns/$campaignId/nouns/$nounId");

const schema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	nounType: nounTypeSchema,
	summary: z.string(),
	notes: z.string(),
	privateNotes: z.string(),
	isSecret: z.boolean(),
});
type Values = z.infer<typeof schema>;

function EditNounPage() {
	const { noun, accessLevel } = nounRoute.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const update = useServerFn(updateNoun);
	const uploadImage = useServerFn(uploadNounImage);
	const removeImage = useServerFn(removeNounImage);

	const [imageUrl, setImageUrl] = useState<string | null>(noun.imageUrl);
	const [imageError, setImageError] = useState<string | null>(null);
	const [imageBusy, setImageBusy] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: noun.name,
			nounType: noun.nounType,
			summary: noun.summary,
			notes: noun.notes,
			privateNotes: noun.privateNotes,
			isSecret: noun.isSecret,
		},
	});

	const typeLabel = NOUN_TYPE_LABELS[noun.nounType];
	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: `${typeLabel}s`,
			to: "/campaigns/$campaignId/nouns" as const,
			params: { campaignId: campaign.id },
			search: { type: noun.nounType },
		},
		{
			label: noun.name,
			to: "/campaigns/$campaignId/nouns/$nounId" as const,
			params: { campaignId: campaign.id, nounId: noun.id },
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
			formData.append("nounId", noun.id);
			formData.append("file", file);
			const result = await uploadImage({ data: formData });
			if (!result.ok) {
				setImageError(result.error);
				return;
			}
			setImageUrl(result.value.imageUrl);
			await router.invalidate();
		} finally {
			setImageBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	async function handleRemoveImage() {
		setImageError(null);
		setImageBusy(true);
		try {
			const result = await removeImage({
				data: { campaignId: campaign.id, nounId: noun.id },
			});
			if (!result.ok) {
				setImageError(result.error);
				return;
			}
			setImageUrl(null);
			await router.invalidate();
		} finally {
			setImageBusy(false);
		}
	}

	async function onSubmit(values: Values) {
		const result = await update({
			data: { campaignId: campaign.id, nounId: noun.id, ...values },
		});
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId/nouns/$nounId",
			params: { campaignId: campaign.id, nounId: noun.id },
		});
	}

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title={`Edit ${noun.name}`}>
				<p>You don't have permission to edit entities.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title={`Edit ${noun.name}`}>
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-2">
							<div className="text-sm font-medium">Image</div>
							<div className="flex items-start gap-4">
								<div className="w-32 shrink-0">
									<EntityImage
										nounType={noun.nounType}
										imageUrl={imageUrl}
										name={noun.name}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<input
										ref={fileInputRef}
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onChange={handleFileChange}
										disabled={imageBusy}
										className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80 disabled:opacity-50"
									/>
									{imageUrl && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleRemoveImage}
											disabled={imageBusy}
										>
											Remove image
										</Button>
									)}
									<p className="text-xs text-[var(--sea-ink-soft)]">
										JPEG, PNG, or WebP. Up to 5 MB.
									</p>
									{imageError && (
										<p className="text-xs text-destructive">{imageError}</p>
									)}
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="nounType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Type</FormLabel>
										<FormControl>
											<select
												{...field}
												className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
											>
												{NOUN_TYPES.map((t) => (
													<option key={t} value={t}>
														{NOUN_TYPE_LABELS[t]}
													</option>
												))}
											</select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="summary"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Summary</FormLabel>
									<FormControl>
										<Textarea rows={2} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea rows={5} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="privateNotes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Private notes</FormLabel>
									<FormControl>
										<Textarea rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="isSecret"
							render={({ field }) => (
								<FormItem className="flex items-center gap-3">
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
									<FormLabel className="!mt-0">
										Secret (hidden from players)
									</FormLabel>
								</FormItem>
							)}
						/>
						<div className="flex gap-3">
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Saving…" : "Save changes"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/campaigns/$campaignId/nouns/$nounId",
										params: { campaignId: campaign.id, nounId: noun.id },
									})
								}
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</Page>
	);
}
