import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Page } from "@/components/Page";
import {
	TemplateForm,
	type TemplateFormValues,
} from "@/components/TemplateForm";
import { createTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/new",
)({
	head: () => ({ meta: [{ title: "New template - Rolldex" }] }),
	component: NewTemplatePage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

function NewTemplatePage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const create = useServerFn(createTemplate);

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
			<Page breadcrumbs={breadcrumbs} title="New template">
				<p>You don't have permission to manage templates.</p>
			</Page>
		);
	}

	return (
		<Page breadcrumbs={breadcrumbs} title="New template">
			<div className="island-shell max-w-2xl rounded-2xl p-6">
				<TemplateForm
					campaignId={campaign.id}
					defaults={{ name: "", body: "", wrapInStatBlock: false }}
					submitLabel="Create template"
					pendingLabel="Creating…"
					onSubmit={(values: TemplateFormValues) =>
						create({ data: { campaignId: campaign.id, ...values } })
					}
				/>
			</div>
		</Page>
	);
}
