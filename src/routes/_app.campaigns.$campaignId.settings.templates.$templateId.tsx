import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Page } from "@/components/Page";
import {
	TemplateForm,
	type TemplateFormValues,
} from "@/components/TemplateForm";
import { campaignBundleQuery, useCampaign, useTemplate } from "@/lib/queries";
import { updateTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/$templateId",
)({
	loader: async ({ context, params }) => {
		const bundle = await context.queryClient.ensureQueryData(
			campaignBundleQuery(params.campaignId),
		);
		const template = bundle.templates.find((t) => t.id === params.templateId);
		if (!template) throw notFound();
		return { template };
	},
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
	const update = useServerFn(updateTemplate);

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
					onSubmit={(values: TemplateFormValues) =>
						update({
							data: {
								campaignId: campaign.id,
								templateId: template.id,
								...values,
							},
						})
					}
				/>
			</div>
		</Page>
	);
}
