import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Calendar, calendarSchema, daysPerYear } from "@/lib/calendar";
import { useSaveShortcut } from "@/lib/keyboard";
import {
	BundleMutationError,
	patchUpdateCampaign,
	useBundleMutation,
} from "@/lib/queries";
import { updateCalendar } from "@/server/calendar";

interface Props {
	campaignId: string;
	initial: Calendar;
	onSaved?: () => void;
}

interface RowState {
	name: string;
	days: string;
}

export function CalendarEditor({ campaignId, initial, onSaved }: Props) {
	const [rows, setRows] = useState<RowState[]>(() =>
		initial.months.map((m) => ({ name: m.name, days: String(m.days) })),
	);
	const [error, setError] = useState<string | null>(null);

	const saveMutation = useBundleMutation({
		campaignId,
		mutationFn: (vars: { calendar: Calendar }) =>
			updateCalendar({ data: { campaignId, calendar: vars.calendar } }),
		patch: (bundle, vars) =>
			patchUpdateCampaign(bundle, (c) => ({ ...c, calendar: vars.calendar })),
	});

	function update(i: number, patch: Partial<RowState>) {
		setRows((r) =>
			r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
		);
	}

	function addMonth() {
		setRows((r) => [...r, { name: "", days: "30" }]);
	}

	function removeMonth(i: number) {
		setRows((r) => r.filter((_, idx) => idx !== i));
	}

	async function onSave() {
		setError(null);
		const months = rows.map((r) => ({
			name: r.name.trim(),
			days: Number(r.days),
		}));
		const parsed = calendarSchema.safeParse({ months });
		if (!parsed.success) {
			const first = parsed.error.issues[0];
			setError(first?.message ?? "Calendar is invalid");
			return;
		}
		try {
			await saveMutation.mutateAsync({ calendar: parsed.data });
			onSaved?.();
		} catch (e) {
			if (e instanceof BundleMutationError) setError(e.message);
			else throw e;
		}
	}

	const busy = saveMutation.isPending;

	useSaveShortcut(onSave, !busy);

	const totalDays = rows.reduce((s, r) => {
		const n = Number(r.days);
		return s + (Number.isFinite(n) ? n : 0);
	}, 0);
	const initialTotal = daysPerYear(initial);
	const dirty =
		rows.length !== initial.months.length ||
		rows.some(
			(r, i) =>
				r.name !== initial.months[i].name ||
				Number(r.days) !== initial.months[i].days,
		);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				{rows.map((row, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: row identity is its position
						key={i}
						className="grid grid-cols-[1fr_120px_auto] gap-3"
					>
						<div>
							{i === 0 && <Label className="mb-1 block">Month name</Label>}
							<Input
								value={row.name}
								onChange={(e) => update(i, { name: e.target.value })}
								placeholder={`Month ${i + 1}`}
							/>
						</div>
						<div>
							{i === 0 && <Label className="mb-1 block">Days</Label>}
							<Input
								type="number"
								min={1}
								step={1}
								value={row.days}
								onChange={(e) => update(i, { days: e.target.value })}
							/>
						</div>
						<div className="flex items-end">
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={() => removeMonth(i)}
								disabled={busy || rows.length <= 1}
								aria-label={`Remove ${row.name.trim() || `month ${i + 1}`}`}
								title="Remove month"
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					</div>
				))}
			</div>
			<div className="flex items-center justify-between">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={addMonth}
					disabled={busy}
				>
					<Plus className="size-3.5" /> Add month
				</Button>
				<p className="text-xs text-[var(--sea-ink-soft)]">
					Year length: {totalDays} day{totalDays === 1 ? "" : "s"}
					{totalDays !== initialTotal && ` (was ${initialTotal})`}
				</p>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<div className="flex gap-3">
				<Button type="button" onClick={onSave} disabled={busy || !dirty}>
					{busy ? "Saving…" : "Save calendar"}
				</Button>
			</div>
		</div>
	);
}
