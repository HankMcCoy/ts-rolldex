import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bundleKey, useCampaign, useTemplates } from "@/lib/queries";
import { deleteTemplate } from "@/server/templates";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/templates/",
)({
	head: () => ({ meta: [{ title: "Templates - Rolldex" }] }),
	component: TemplatesSettingsPage,
});

function TemplatesSettingsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const templates = useTemplates(campaignId);
	const queryClient = useQueryClient();
	const remove = useServerFn(deleteTemplate);

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
			<Page breadcrumbs={breadcrumbs} title="Templates">
				<p>You don't have permission to manage templates.</p>
			</Page>
		);
	}

	return (
		<Page
			breadcrumbs={breadcrumbs}
			title="Templates"
			actions={
				<Button size="sm" asChild>
					<Link
						to="/campaigns/$campaignId/settings/templates/new"
						params={{ campaignId: campaign.id }}
					>
						+ Template
					</Link>
				</Button>
			}
		>
			<div className="max-w-2xl space-y-4">
				<p className="text-sm text-[var(--sea-ink-soft)]">
					Reusable markdown blocks that show up in the slash menu of any entity
					or session note. Use them for stat blocks, quest hand-outs, or
					anything you'd otherwise paste in by hand.
				</p>
				<div className="island-shell rounded-2xl p-6">
					{templates.length === 0 ? (
						<p className="text-sm text-[var(--sea-ink-soft)]">
							No templates yet. Click + Template to create one.
						</p>
					) : (
						<ul className="space-y-2">
							{templates.map((t) => (
								<li
									key={t.id}
									className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] px-4 py-2"
								>
									<div className="flex items-center gap-3">
										<Link
											to="/campaigns/$campaignId/settings/templates/$templateId"
											params={{
												campaignId: campaign.id,
												templateId: t.id,
											}}
											className="font-medium"
										>
											{t.name}
										</Link>
										{t.wrapInStatBlock && (
											<Badge variant="secondary">Stat block</Badge>
										)}
									</div>
									<button
										type="button"
										onClick={async () => {
											if (!confirm(`Delete template "${t.name}"?`)) return;
											await remove({
												data: { campaignId: campaign.id, templateId: t.id },
											});
											await queryClient.invalidateQueries({
												queryKey: bundleKey(campaign.id),
											});
										}}
										title="Delete template"
										aria-label="Delete template"
										className="rounded p-1.5 text-[var(--sea-ink-soft)] transition hover:text-destructive"
									>
										<Trash2 className="size-4" />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</Page>
	);
}
