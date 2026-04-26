import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/react-router";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@/lib/form-resolver";
import { createMap } from "@/server/maps";

export const Route = createFileRoute("/_app/campaigns/$campaignId/maps/new")({
	head: () => ({ meta: [{ title: "New map - Rolldex" }] }),
	component: NewMapPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

const schema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	isSecret: z.boolean(),
});
type Values = z.infer<typeof schema>;

function NewMapPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const create = useServerFn(createMap);

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", isSecret: false },
	});

	async function onSubmit(values: Values) {
		const result = await create({
			data: { campaignId: campaign.id, ...values },
		});
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId/maps/$mapId",
			params: { campaignId: campaign.id, mapId: result.value.id },
		});
	}

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

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title="New map">
				<p>You don't have permission to create maps.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="New map">
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
						<p className="text-sm text-[var(--sea-ink-soft)]">
							You'll upload the map image and place pins on the next screen.
						</p>
						<div className="flex gap-3">
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Creating…" : "Create map"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/campaigns/$campaignId/maps",
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
