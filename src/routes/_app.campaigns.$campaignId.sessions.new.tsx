import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EventDateFields } from "@/components/EventDateFields";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Page } from "@/components/Page";
import { TagInput } from "@/components/TagInput";
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
import { applyDateRefinements, dateFields } from "@/lib/date-schema";
import { zodResolver } from "@/lib/form-resolver";
import { useSaveShortcut } from "@/lib/keyboard";
import {
	BundleMutationError,
	patchAddSession,
	patchSyncTags,
	useBundleMutation,
	useCampaign,
	useTags,
} from "@/lib/queries";
import { MAX_TAGS_PER_ENTITY, resolveTagRefs, type TagRef } from "@/lib/tags";
import { createSession } from "@/server/sessions";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/new",
)({
	head: () => ({ meta: [{ title: "New session - Rolldex" }] }),
	component: NewSessionPage,
});

const schema = applyDateRefinements(
	z.object({
		name: z.string().min(1, "Name is required").max(200),
		summary: z.string().min(1, "Summary is required").max(5_000),
		notes: z.string(),
		privateNotes: z.string(),
		isSecret: z.boolean(),
		tags: z.array(z.string()).max(MAX_TAGS_PER_ENTITY),
		...dateFields,
	}),
);
type Values = z.infer<typeof schema>;
type CreateVars = Values & { id: string; tagRefs: TagRef[] };

function NewSessionPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel, templates } = useCampaign(campaignId);
	const campaignTags = useTags(campaignId);
	const navigate = useNavigate();

	const createMutation = useBundleMutation({
		campaignId: campaign.id,
		// The form carries tag *names*; `tagRefs` pairs them with ids (existing
		// where the name already exists) so the optimistic patch and the row the
		// server writes agree.
		mutationFn: ({ tags: _names, tagRefs, ...vars }: CreateVars) =>
			createSession({
				data: { campaignId: campaign.id, ...vars, tags: tagRefs },
			}),
		patch: (bundle, vars) => {
			const now = new Date();
			const withSession = patchAddSession(bundle, {
				id: vars.id,
				campaignId: campaign.id,
				name: vars.name,
				summary: vars.summary,
				notes: vars.notes,
				privateNotes: vars.privateNotes,
				isSecret: vars.isSecret,
				dateYear: vars.dateYear ?? null,
				dateMonth: vars.dateMonth ?? null,
				dateDay: vars.dateDay ?? null,
				endDateYear: vars.endDateYear ?? null,
				endDateMonth: vars.endDateMonth ?? null,
				endDateDay: vars.endDateDay ?? null,
				tagIds: vars.tagRefs.map((t) => t.id),
				createdAt: now,
				updatedAt: now,
			});
			return patchSyncTags(withSession, vars.tagRefs);
		},
	});

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			summary: "",
			notes: "",
			privateNotes: "",
			isSecret: false,
			tags: [],
			dateYear: undefined,
			dateMonth: undefined,
			dateDay: undefined,
			endDateYear: undefined,
			endDateMonth: undefined,
			endDateDay: undefined,
		},
	});

	async function onSubmit(values: Values) {
		const id = crypto.randomUUID();
		const tagRefs = resolveTagRefs(campaignTags, values.tags);
		try {
			await createMutation.mutateAsync({ id, tagRefs, ...values });
		} catch (e) {
			if (e instanceof BundleMutationError) {
				form.setError("name", { message: e.message });
				return;
			}
			throw e;
		}
		await navigate({
			to: "/campaigns/$campaignId/sessions/$sessionId",
			params: { campaignId: campaign.id, sessionId: id },
		});
	}

	useSaveShortcut(form.handleSubmit(onSubmit));

	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: "Sessions",
			to: "/campaigns/$campaignId/sessions" as const,
			params: { campaignId: campaign.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title="New session">
				<p>You don't have permission to create sessions.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="New session">
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<Form {...form}>
					<form
						method="post"
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
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
						<EventDateFields form={form} calendar={campaign.calendar} />
						<FormField
							control={form.control}
							name="tags"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tags</FormLabel>
									<FormControl>
										<TagInput
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											suggestions={campaignTags.map((t) => t.name)}
										/>
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
										<MarkdownEditor
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											minRows={5}
											maxLength={50_000}
											ariaLabel="Notes"
											templates={templates}
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
											templates={templates}
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
								{form.formState.isSubmitting ? "Creating…" : "Create session"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/campaigns/$campaignId/sessions",
										params: { campaignId: campaign.id },
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
