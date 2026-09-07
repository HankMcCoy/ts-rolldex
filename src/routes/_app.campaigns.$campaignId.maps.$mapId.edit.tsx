import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { useSaveShortcut } from "@/lib/keyboard";
import {
	BundleMutationError,
	patchUpdateMap,
	useBundleMutation,
	useCampaign,
	useMapWithPins,
} from "@/lib/queries";
import { updateMap } from "@/server/maps";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/maps/$mapId/edit",
)({
	head: ({ matches }) => {
		const parent = matches.find(
			(m) =>
				(m.routeId as string) === "/_app/campaigns/$campaignId/maps/$mapId",
		);
		const name = (parent?.loaderData as { map?: { name?: string } } | undefined)
			?.map?.name;
		return { meta: [{ title: `Edit ${name ?? "map"} - Rolldex` }] };
	},
	component: EditMapPage,
});

const schema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	isSecret: z.boolean(),
});
type Values = z.infer<typeof schema>;

function EditMapPage() {
	const { campaignId, mapId } = Route.useParams();
	const { campaign } = useCampaign(campaignId);
	const { map, accessLevel } = useMapWithPins(campaignId, mapId);
	const navigate = useNavigate();

	const updateMutation = useBundleMutation({
		campaignId: campaign.id,
		mutationFn: (vars: Values) =>
			updateMap({ data: { campaignId: campaign.id, mapId: map.id, ...vars } }),
		patch: (bundle, vars) =>
			patchUpdateMap(bundle, map.id, (m) => ({
				...m,
				name: vars.name,
				isSecret: vars.isSecret,
			})),
	});

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { name: map.name, isSecret: map.isSecret },
	});

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
		{
			label: map.name,
			to: "/campaigns/$campaignId/maps/$mapId" as const,
			params: { campaignId: campaign.id, mapId: map.id },
		},
	];

	async function onSubmit(values: Values) {
		try {
			await updateMutation.mutateAsync(values);
		} catch (e) {
			if (e instanceof BundleMutationError) {
				form.setError("name", { message: e.message });
				return;
			}
			throw e;
		}
		await navigate({
			to: "/campaigns/$campaignId/maps/$mapId",
			params: { campaignId: campaign.id, mapId: map.id },
		});
	}

	useSaveShortcut(form.handleSubmit(onSubmit), accessLevel === "ADMIN");

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title={`Edit ${map.name}`}>
				<p>You don't have permission to edit maps.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title={`Edit ${map.name}`}>
			<div className="island-shell max-w-lg rounded-2xl p-6">
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
										to: "/campaigns/$campaignId/maps/$mapId",
										params: { campaignId: campaign.id, mapId: map.id },
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
