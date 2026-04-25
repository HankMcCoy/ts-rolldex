import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { createNoun } from "@/server/nouns";

export const Route = createFileRoute("/_app/campaigns/$campaignId/nouns/new")({
	validateSearch: z.object({ type: nounTypeSchema.optional() }),
	component: NewNounPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

const schema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	nounType: nounTypeSchema,
	summary: z.string(),
	notes: z.string(),
	privateNotes: z.string(),
	isSecret: z.boolean(),
});
type Values = z.infer<typeof schema>;

function NewNounPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const { type } = Route.useSearch();
	const navigate = useNavigate();
	const create = useServerFn(createNoun);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: "",
			nounType: type ?? "PERSON",
			summary: "",
			notes: "",
			privateNotes: "",
			isSecret: false,
		},
	});

	async function onSubmit(values: Values) {
		const result = await create({
			data: { campaignId: campaign.id, ...values },
		});
		if ("error" in result) {
			form.setError("name", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId/nouns/$nounId",
			params: { campaignId: campaign.id, nounId: result.noun.id },
		});
	}

	if (accessLevel !== "ADMIN") {
		return (
			<main className="page-wrap px-4 py-10">
				<p>You don't have permission to create entities.</p>
			</main>
		);
	}

	return (
		<main className="page-wrap px-4 py-10">
			<h1 className="display-title mb-6 text-3xl font-bold">New entity</h1>
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
								{form.formState.isSubmitting ? "Creating…" : "Create entity"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/campaigns/$campaignId/nouns",
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
		</main>
	);
}
