import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Page } from "@/components/Page";
import {
	TemplateForm,
	type TemplateFormValues,
} from "@/components/TemplateForm";
import { getTemplate, updateTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/$templateId",
)({
	loader: ({ params }) =>
		getTemplate({
			data: {
				campaignId: params.campaignId,
				templateId: params.templateId,
			},
		}),
	head: ({ loaderData }) => ({
		meta: [
			{ title: `Edit ${loaderData?.name ?? "template"} - Rolldex` },
		],
	}),
	component: EditTemplatePage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function EditTemplatePage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const template = Route.useLoaderData();
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
