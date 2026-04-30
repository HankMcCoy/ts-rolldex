import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/Page";
import {
	TemplateForm,
	type TemplateFormValues,
} from "@/components/TemplateForm";
import {
	BundleMutationError,
	ensureBundleRow,
	patchUpdateTemplate,
	useBundleMutation,
	useCampaign,
	useTemplate,
} from "@/lib/queries";
import { err, ok, type Result } from "@/lib/result";
import { updateTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/$templateId",
)({
	loader: async ({ context, params }) => ({
		template: await ensureBundleRow(
			context.queryClient,
			params.campaignId,
			"templates",
			params.templateId,
		),
	}),
	head: ({ loaderData }) => ({
		meta: [
			{ title: `Edit ${loaderData?.template.name ?? "template"} - Rolldex` },
		],
	}),
	component: EditTemplatePage,
});

function EditTemplatePage() {
	const { campaignId, templateId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const template = useTemplate(campaignId, templateId);

	const updateMutation = useBundleMutation({
		campaignId,
		mutationFn: (vars: TemplateFormValues) =>
			updateTemplate({
				data: { campaignId, templateId: template.id, ...vars },
			}),
		patch: (bundle, vars) =>
			patchUpdateTemplate(bundle, template.id, (t) => ({
				...t,
				name: vars.name,
				body: vars.body,
				wrapInStatBlock: vars.wrapInStatBlock,
				updatedAt: new Date(),
			})),
	});

	async function onSubmit(
		values: TemplateFormValues,
	): Promise<Result<unknown>> {
		try {
			await updateMutation.mutateAsync(values);
			return ok(undefined);
		} catch (e) {
			if (e instanceof BundleMutationError) return err(e.message);
			throw e;
		}
	}

	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: "Settings",
			to: "/campaigns/$campaignId/settings" as const,
			params: { campaignId: campaign.id },
		},
		{
			label: "Templates",
			to: "/campaigns/$campaignId/settings/templates" as const,
			params: { campaignId: campaign.id },
		},
	];

	if (accessLevel !== "ADMIN") {
		return (
			<Page breadcrumbs={breadcrumbs} title={`Edit ${template.name}`}>
				<p>You don't have permission to manage templates.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title={`Edit ${template.name}`}>
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<TemplateForm
					campaignId={campaign.id}
					defaults={{
						name: template.name,
						body: template.body,
						wrapInStatBlock: template.wrapInStatBlock,
					}}
					submitLabel="Save changes"
					pendingLabel="Saving…"
					onSubmit={onSubmit}
				/>
			</div>
		</Page>
	);
}
