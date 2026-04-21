import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/form-resolver";
import { updateNoun } from "@/server/nouns";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const nounTypeSchema = z.enum(["PERSON", "PLACE", "THING", "FACTION"]);
type NounType = z.infer<typeof nounTypeSchema>;

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

const NOUN_TYPES: NounType[] = ["PERSON", "PLACE", "THING", "FACTION"];

function EditNounPage() {
	const { noun, accessLevel } = nounRoute.useLoaderData();
	const { campaign } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const update = useServerFn(updateNoun);

	if (accessLevel !== "ADMIN") {
		return (
			<main className="page-wrap px-4 py-10">
				<p>You don't have permission to edit entities.</p>
			</main>
		);
	}

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

	async function onSubmit(values: Values) {
		const result = await update({
			data: { campaignId: campaign.id, nounId: noun.id, ...values },
		});
		if ("error" in result) {
			form.setError("name", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId/nouns/$nounId",
			params: { campaignId: campaign.id, nounId: noun.id },
		});
	}

	return (
		<main className="page-wrap px-4 py-10">
			<h1 className="display-title mb-6 text-3xl font-bold">Edit {noun.name}</h1>
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
														{t.charAt(0) + t.slice(1).toLowerCase()}
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
									<FormLabel className="!mt-0">Secret (hidden from players)</FormLabel>
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
		</main>
	);
}
