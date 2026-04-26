import { useEffect } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface DateFieldShape {
	dateLabel?: string;
	dateSort?: string;
}

interface Props<T extends FieldValues & DateFieldShape> {
	form: UseFormReturn<T>;
}

/**
 * Date label + sort key inputs for entries that should appear on the
 * timeline (events and sessions). The sort key is what we lex-sort by;
 * the label is what we show. Until the user explicitly touches the sort
 * key, it auto-mirrors whatever they type into the label so most people
 * never have to think about the second field.
 */
export function EventDateFields<T extends FieldValues & DateFieldShape>({
	form,
}: Props<T>) {
	const dateLabelName = "dateLabel" as Path<T>;
	const dateSortName = "dateSort" as Path<T>;
	const dateLabel = form.watch(dateLabelName);
	const sortDirty = Boolean(
		(form.formState.dirtyFields as Record<string, unknown>).dateSort,
	);

	useEffect(() => {
		if (sortDirty) return;
		if (typeof dateLabel !== "string") return;
		form.setValue(dateSortName, dateLabel as T[Path<T>], {
			shouldDirty: false,
		});
	}, [dateLabel, sortDirty, form, dateSortName]);

	return (
		<div className="space-y-2">
			<div className="grid gap-4 sm:grid-cols-2">
				<FormField
					control={form.control}
					name={dateLabelName}
					render={({ field }) => (
						<FormItem>
							<FormLabel>In-world date</FormLabel>
							<FormControl>
								<Input
									{...field}
									value={typeof field.value === "string" ? field.value : ""}
									placeholder="e.g. 1492 Hammer 15"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name={dateSortName}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Sort key</FormLabel>
							<FormControl>
								<Input
									{...field}
									value={typeof field.value === "string" ? field.value : ""}
									placeholder="e.g. 1492-Hammer-15"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
			<p className="text-xs text-[var(--sea-ink-soft)]">
				The timeline sorts entries lexically by the sort key. Pick a zero-padded
				format (ISO dates, <code>1492-Hammer-15</code>, or{" "}
				<code>Year 0001 Day 005</code>) so neighbours order correctly.
			</p>
		</div>
	);
}
