import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Page } from "@/components/Page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	buildImportPreview,
	expectedColumns,
	type ImportKind,
	type ImportPreview,
	partitionPreview,
} from "@/lib/csv";
import { bundleKey, useCampaign, useNouns, useSessions } from "@/lib/queries";
import { importNouns, importSessions } from "@/server/import-csv";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/import",
)({
	head: () => ({ meta: [{ title: "Import CSV - Rolldex" }] }),
	component: ImportPage,
});

function ImportPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const allNouns = useNouns(campaignId);
	const allSessions = useSessions(campaignId);
	const queryClient = useQueryClient();
	const runImportNouns = useServerFn(importNouns);
	const runImportSessions = useServerFn(importSessions);

	const [kind, setKind] = useState<ImportKind>("nouns");
	const [csv, setCsv] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [resultMsg, setResultMsg] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const existing = useMemo(
		() => ({
			nouns: new Set(allNouns.map((n) => n.name.toLowerCase())),
			sessions: new Set(allSessions.map((s) => s.name.toLowerCase())),
		}),
		[allNouns, allSessions],
	);

	const preview: ImportPreview<ImportKind> | null = useMemo(() => {
		if (!csv) return null;
		return buildImportPreview(kind, csv, existing);
	}, [csv, kind, existing]);

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
			<Page breadcrumbs={breadcrumbs} title="Import CSV">
				<p>You don't have permission to import data into this campaign.</p>
			</Page>
		);
	}

	const partition = preview ? partitionPreview(preview) : null;
	const canSubmit =
		preview !== null &&
		partition !== null &&
		partition.errors.length === 0 &&
		partition.ok.length > 0 &&
		!busy;

	function reset() {
		setCsv(null);
		setFileName(null);
		setResultMsg(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setResultMsg(null);
		const text = await file.text();
		setCsv(text);
		setFileName(file.name);
	}

	async function handleSubmit() {
		if (!partition || partition.ok.length === 0) return;
		setBusy(true);
		setResultMsg(null);
		try {
			const rows = partition.ok.map((r) => r.data);
			const result =
				kind === "nouns"
					? await runImportNouns({ data: { campaignId, rows: rows as never } })
					: await runImportSessions({
							data: { campaignId, rows: rows as never },
						});
			await queryClient.invalidateQueries({ queryKey: bundleKey(campaignId) });
			const noun = kind === "nouns" ? "entit" : "session";
			const inserted = `${result.inserted} ${noun}${kind === "nouns" ? (result.inserted === 1 ? "y" : "ies") : result.inserted === 1 ? "" : "s"}`;
			setResultMsg(
				result.skipped > 0
					? `Imported ${inserted}; ${result.skipped} skipped as duplicates.`
					: `Imported ${inserted}.`,
			);
			setCsv(null);
			setFileName(null);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch (e) {
			setResultMsg(
				`Import failed: ${e instanceof Error ? e.message : String(e)}`,
			);
		} finally {
			setBusy(false);
		}
	}

	const cols = expectedColumns(kind);

	return (
		<Page breadcrumbs={breadcrumbs} title="Import CSV">
			<div className="max-w-2xl space-y-4">
				<p className="text-sm text-[var(--sea-ink-soft)]">
					Bulk-create entities or sessions from a CSV. Rows whose name already
					exists in this campaign are skipped. EVENT dates aren't supported yet
					— add them by editing the entity after import.
				</p>

				<div className="island-shell space-y-6 rounded-2xl p-6">
					<div className="space-y-2">
						<Label className="text-sm font-medium">
							What are you importing?
						</Label>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant={kind === "nouns" ? "default" : "outline"}
								onClick={() => {
									setKind("nouns");
									reset();
								}}
								disabled={busy}
							>
								Entities
							</Button>
							<Button
								type="button"
								size="sm"
								variant={kind === "sessions" ? "default" : "outline"}
								onClick={() => {
									setKind("sessions");
									reset();
								}}
								disabled={busy}
							>
								Sessions
							</Button>
						</div>
					</div>

					<div className="space-y-2 text-sm text-[var(--sea-ink-soft)]">
						<p>
							<span className="font-medium text-[var(--sea-ink)]">
								Required columns:
							</span>{" "}
							{cols.required.join(", ")}
						</p>
						<p>
							<span className="font-medium text-[var(--sea-ink)]">
								Optional columns:
							</span>{" "}
							{cols.optional.join(", ")}
						</p>
						{kind === "nouns" && (
							<p>
								<span className="font-medium text-[var(--sea-ink)]">type</span>{" "}
								must be one of: PERSON, PLACE, THING, FACTION, EVENT
								(case-insensitive).
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Label className="text-sm font-medium">CSV file</Label>
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv,text/csv"
							onChange={handleFile}
							disabled={busy}
							className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-[var(--line)] file:bg-white/90 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-white"
						/>
						{fileName && (
							<p className="text-xs text-[var(--sea-ink-soft)]">{fileName}</p>
						)}
					</div>

					{preview && partition && (
						<PreviewPanel preview={preview} partition={partition} />
					)}

					{resultMsg && (
						<div className="rounded-lg border border-[var(--line)] bg-white/90 px-4 py-3 text-sm">
							{resultMsg}
						</div>
					)}

					<div className="flex gap-3">
						<Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
							{busy
								? "Importing…"
								: partition && partition.ok.length > 0
									? `Import ${partition.ok.length} row${partition.ok.length === 1 ? "" : "s"}`
									: "Import"}
						</Button>
						{csv && (
							<Button
								type="button"
								variant="outline"
								onClick={reset}
								disabled={busy}
							>
								Clear
							</Button>
						)}
					</div>
				</div>
			</div>
		</Page>
	);
}

interface PreviewPanelProps {
	preview: ImportPreview<ImportKind>;
	partition: ReturnType<typeof partitionPreview<ImportKind>>;
}

function PreviewPanel({ preview, partition }: PreviewPanelProps) {
	const { ok, duplicates, errors } = partition;
	return (
		<div className="space-y-3 rounded-lg border border-[var(--line)] bg-white/90 p-4">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant="secondary">{preview.totalRows} rows in file</Badge>
				{ok.length > 0 && <Badge variant="outline">{ok.length} ready</Badge>}
				{duplicates.length > 0 && (
					<Badge variant="outline">{duplicates.length} duplicate</Badge>
				)}
				{errors.length > 0 && (
					<Badge variant="destructive">{errors.length} error</Badge>
				)}
			</div>

			{preview.unknownColumns.length > 0 && (
				<p className="text-xs text-[var(--sea-ink-soft)]">
					Unknown columns will be ignored: {preview.unknownColumns.join(", ")}
				</p>
			)}

			{errors.length > 0 && (
				<details className="text-sm" open>
					<summary className="cursor-pointer font-medium text-destructive">
						{errors.length} row{errors.length === 1 ? "" : "s"} need fixing
					</summary>
					<ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pl-4 text-xs text-[var(--sea-ink-soft)]">
						{errors.map((e) => (
							<li key={e.rowNumber}>
								Row {e.rowNumber}: {e.message}
							</li>
						))}
					</ul>
				</details>
			)}

			{duplicates.length > 0 && (
				<details className="text-sm">
					<summary className="cursor-pointer">
						{duplicates.length} duplicate{duplicates.length === 1 ? "" : "s"}{" "}
						(will be skipped)
					</summary>
					<ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pl-4 text-xs text-[var(--sea-ink-soft)]">
						{duplicates.map((d) => (
							<li key={d.rowNumber}>
								Row {d.rowNumber}: "{d.name}"{" "}
								{d.reason === "existing"
									? "already exists in this campaign"
									: "appears earlier in the CSV"}
							</li>
						))}
					</ul>
				</details>
			)}
		</div>
	);
}
