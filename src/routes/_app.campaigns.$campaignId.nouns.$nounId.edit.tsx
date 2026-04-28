import {
	createFileRoute,
	getRouteApi,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EntityImage } from "@/components/EntityImage";
import { EventDateFields } from "@/components/EventDateFields";
import { MarkdownEditor } from "@/components/MarkdownEditor";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyDateRefinements, dateFields } from "@/lib/date-schema";
import { zodResolver } from "@/lib/form-resolver";
import { NOUN_TYPE_LABELS, NOUN_TYPES, nounTypeSchema } from "@/lib/noun-types";
import { removeNounImage, updateNoun, uploadNounImage } from "@/server/nouns";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/nouns/$nounId/edit",
)({
	head: ({ matches }) => {
		const parent = matches.find(
			(m) =>
				(m.routeId as string) === "/_app/campaigns/$campaignId/nouns/$nounId",
		);
		const name = (
			parent?.loaderData as { noun?: { name?: string } } | undefined
		)?.noun?.name;
		return {
			meta: [{ title: `Edit ${name ?? "entity"} - Rolldex` }],
		};
	},
	component: EditNounPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const nounRoute = getRouteApi("/_app/campaigns/$campaignId/nouns/$nounId");

const schema = applyDateRefinements(
	z.object({
		name: z.string().min(1, "Name is required").max(200),
		nounType: nounTypeSchema,
		summary: z.string().min(1, "Summary is required").max(5_000),
		notes: z.string(),
		privateNotes: z.string(),
		isSecret: z.boolean(),
		...dateFields,
	}),
);
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
			dateYear: noun.dateYear ?? undefined,
			dateMonth: noun.dateMonth ?? undefined,
			dateDay: noun.dateDay ?? undefined,
			endDateYear: noun.endDateYear ?? undefined,
			endDateMonth: noun.endDateMonth ?? undefined,
			endDateDay: noun.endDateDay ?? undefined,
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
						<div className="grid gap-4 sm:grid-cols-[1fr_180px]">
							<div className="space-y-4">
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
													className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
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
							</div>
							<div className="space-y-2">
								<EntityImage
									nounType={noun.nounType}
									imageUrl={imageUrl}
									name={noun.name}
								/>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/webp"
									onChange={handleFileChange}
									disabled={imageBusy}
									className="hidden"
								/>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => fileInputRef.current?.click()}
										disabled={imageBusy}
										className="flex-1"
									>
										Choose
									</Button>
									{imageUrl && (
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											onClick={handleRemoveImage}
											disabled={imageBusy}
											aria-label="Remove image"
										>
											<Trash2 />
										</Button>
									)}
								</div>
								{imageError && (
									<p className="text-xs text-destructive">{imageError}</p>
								)}
							</div>
						</div>
						{form.watch("nounType") === "EVENT" && (
							<EventDateFields form={form} calendar={campaign.calendar} />
						)}
						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<MarkdownEditor
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											minRows={5}
											maxLength={50_000}
											ariaLabel="Notes"
										/>
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
										<MarkdownEditor
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											minRows={3}
											maxLength={50_000}
											ariaLabel="Private notes"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="isSecret"
							render={({ field }) => (
								<FormItem>
									<Label className="flex cursor-pointer items-center gap-3">
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
										<span>Secret (hidden from players)</span>
									</Label>
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
