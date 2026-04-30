import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@/lib/form-resolver";
import { bundleKey, useCampaign } from "@/lib/queries";
import { updateCampaign } from "@/server/campaigns";

export const Route = createFileRoute("/_app/campaigns/$campaignId/edit")({
	head: () => ({ meta: [{ title: "Edit campaign - Rolldex" }] }),
	component: EditCampaignPage,
});

const schema = z.object({
	name: z.string().min(1, "Name is required").max(100),
	summary: z.string(),
});
type Values = z.infer<typeof schema>;

function EditCampaignPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
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
		await queryClient.invalidateQueries({ queryKey: bundleKey(campaign.id) });
		await navigate({
			to: "/campaigns/$campaignId",
			params: { campaignId: campaign.id },
		});
	}

	const breadcrumbs = [
		{ label: "Campaigns", to: "/campaigns" },
		{
			label: campaign.name,
			to: "/campaigns/$campaignId",
			params: { campaignId: campaign.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title="Edit campaign">
				<p>You don't have permission to edit this campaign.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="Edit campaign">
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
		</Page>
	);
}
