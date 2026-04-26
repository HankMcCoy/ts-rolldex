import {
	createFileRoute,
	getRouteApi,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@/lib/form-resolver";
import { updateSession } from "@/server/sessions";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/sessions/$sessionId/edit",
)({
	head: ({ matches }) => {
		const parent = matches.find(
			(m) =>
				(m.routeId as string) ===
				"/_app/campaigns/$campaignId/sessions/$sessionId",
		);
		const name = (
			parent?.loaderData as { session?: { name?: string } } | undefined
		)?.session?.name;
		return {
			meta: [{ title: `Edit ${name ?? "session"} - Rolldex` }],
		};
	},
	component: EditSessionPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");
const sessionRoute = getRouteApi(
	"/_app/campaigns/$campaignId/sessions/$sessionId",
);

const schema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	summary: z.string().min(1, "Summary is required").max(5_000),
	notes: z.string(),
	privateNotes: z.string(),
	isSecret: z.boolean(),
	dateLabel: z.string().max(200).optional(),
	dateSort: z.string().max(200).optional(),
});
type Values = z.infer<typeof schema>;

function EditSessionPage() {
	const { session, accessLevel } = sessionRoute.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const update = useServerFn(updateSession);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: session.name,
			summary: session.summary,
			notes: session.notes,
			privateNotes: session.privateNotes,
			isSecret: session.isSecret,
			dateLabel: session.dateLabel ?? "",
			dateSort: session.dateSort ?? "",
		},
	});

	async function onSubmit(values: Values) {
		const result = await update({
			data: { campaignId: campaign.id, sessionId: session.id, ...values },
		});
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId/sessions/$sessionId",
			params: { campaignId: campaign.id, sessionId: session.id },
		});
	}

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
		{
			label: session.name,
			to: "/campaigns/$campaignId/sessions/$sessionId" as const,
			params: { campaignId: campaign.id, sessionId: session.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title={`Edit ${session.name}`}>
				<p>You don't have permission to edit sessions.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title={`Edit ${session.name}`}>
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
						<EventDateFields form={form} />
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
										to: "/campaigns/$campaignId/sessions/$sessionId",
										params: {
											campaignId: campaign.id,
											sessionId: session.id,
										},
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
