import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
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
import { zodResolver } from "@/lib/form-resolver";
import { createCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/new")({
	component: NewCampaignPage,
});

const schema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	summary: z.string(),
});
type Values = z.infer<typeof schema>;

function NewCampaignPage() {
	const navigate = useNavigate();
	const create = useServerFn(createCampaign);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", summary: "" },
	});

	async function onSubmit(values: Values) {
		const result = await create({ data: values });
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId",
			params: { campaignId: result.value.id },
		});
	}

	return (
		<>
			<PageHeader
				breadcrumbs={[{ label: "Campaigns", to: "/campaigns" }]}
				title="New campaign"
			/>
			<main className="page-wrap px-4 py-10">
				<div className="island-shell max-w-lg rounded-2xl p-6">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												placeholder="The Lost Mines of Phandelver"
												{...field}
											/>
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
											<Textarea
												placeholder="A short description of the campaign…"
												rows={3}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex gap-3">
								<Button type="submit" disabled={form.formState.isSubmitting}>
									{form.formState.isSubmitting
										? "Creating…"
										: "Create campaign"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate({ to: "/campaigns" })}
								>
									Cancel
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</main>
		</>
	);
}
