import {
	createFileRoute,
	getRouteApi,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
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
import { updateCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/$campaignId/edit")({
	component: EditCampaignPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

const schema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	summary: z.string(),
});
type Values = z.infer<typeof schema>;

function EditCampaignPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const update = useServerFn(updateCampaign);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: campaign.name, summary: campaign.summary },
	});

	async function onSubmit(values: Values) {
		const result = await update({
			data: { campaignId: campaign.id, ...values },
		});
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await router.invalidate();
		await navigate({
			to: "/campaigns/$campaignId",
			params: { campaignId: campaign.id },
		});
	}

	if (accessLevel !== "ADMIN") {
		return (
			<>
				<PageHeader
					breadcrumbs={[
						{ label: "Campaigns", to: "/campaigns" },
						{
							label: campaign.name,
							to: "/campaigns/$campaignId",
							params: { campaignId: campaign.id },
						},
					]}
					title="Edit campaign"
				/>
				<main className="page-wrap px-4 pt-5 pb-10">
					<p>You don't have permission to edit this campaign.</p>
				</main>
			</>
		);
	}

	return (
		<>
			<PageHeader
				breadcrumbs={[
					{ label: "Campaigns", to: "/campaigns" },
					{
						label: campaign.name,
						to: "/campaigns/$campaignId",
						params: { campaignId: campaign.id },
					},
				]}
				title="Edit campaign"
			/>
			<main className="page-wrap px-4 pt-5 pb-10">
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
											<Textarea rows={3} {...field} />
										</FormControl>
										<FormMessage />
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
											to: "/campaigns/$campaignId",
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
		</>
	);
}
