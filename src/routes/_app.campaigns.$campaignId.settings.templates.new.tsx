import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/Page";
import {
	TemplateForm,
	type TemplateFormValues,
} from "@/components/TemplateForm";
import {
	BundleMutationError,
	patchAddTemplate,
	useBundleMutation,
	useCampaign,
} from "@/lib/queries";
import { err, ok, type Result } from "@/lib/result";
import { createTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/new",
)({
	head: () => ({ meta: [{ title: "New template - Rolldex" }] }),
	component: NewTemplatePage,
});

function NewTemplatePage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);

	const createMutation = useBundleMutation({
		campaignId,
		mutationFn: (vars: TemplateFormValues & { id: string }) =>
			createTemplate({ data: { campaignId, ...vars } }),
		patch: (bundle, vars) => {
			const now = new Date();
			return patchAddTemplate(bundle, {
				id: vars.id,
				campaignId,
				name: vars.name,
				body: vars.body,
				wrapInStatBlock: vars.wrapInStatBlock,
				createdAt: now,
				updatedAt: now,
			});
		},
	});

	async function onSubmit(
		values: TemplateFormValues,
	): Promise<Result<unknown>> {
		try {
			await createMutation.mutateAsync({ id: crypto.randomUUID(), ...values });
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
					onSubmit={onSubmit}
				/>
			</div>
		</Page>
	);
}
