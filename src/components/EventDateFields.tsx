import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Calendar } from "@/lib/calendar";

interface DateFieldShape {
	dateYear?: number;
	dateMonth?: number;
	dateDay?: number;
}

interface Props<T extends FieldValues & DateFieldShape> {
	form: UseFormReturn<T>;
	calendar: Calendar;
}

/**
 * Year + month-select + day inputs for entries that should appear on the
 * timeline. The day's max is bounded by the chosen month's day count from
 * the campaign's calendar. All three fields are written together — the form
 * schema enforces all-or-none.
 */
export function EventDateFields<T extends FieldValues & DateFieldShape>({
	form,
	calendar,
}: Props<T>) {
	const yearName = "dateYear" as Path<T>;
	const monthName = "dateMonth" as Path<T>;
	const dayName = "dateDay" as Path<T>;
	const selectedMonth = form.watch(monthName);
	const selectedIndex =
		typeof selectedMonth === "number" ? selectedMonth : undefined;
	const maxDays =
		selectedIndex !== undefined && calendar.months[selectedIndex]
			? calendar.months[selectedIndex].days
			: undefined;

	return (
		<div className="space-y-2">
			<div className="grid gap-4 sm:grid-cols-3">
				<FormField
					control={form.control}
					name={yearName}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Year</FormLabel>
							<FormControl>
								<Input
									type="number"
									step="1"
									placeholder="e.g. 1492"
									value={typeof field.value === "number" ? field.value : ""}
									onChange={(e) => {
										const raw = e.target.value;
										field.onChange(raw === "" ? undefined : Number(raw));
									}}
									onBlur={field.onBlur}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name={monthName}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Month</FormLabel>
							<FormControl>
								<select
									value={
										typeof field.value === "number" ? String(field.value) : ""
									}
									onChange={(e) => {
										const raw = e.target.value;
										field.onChange(raw === "" ? undefined : Number(raw));
									}}
									onBlur={field.onBlur}
									className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
								>
									<option value="">—</option>
									{calendar.months.map((m, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: month identity is its position
										<option key={i} value={i}>
											{m.name}
										</option>
									))}
								</select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name={dayName}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Day</FormLabel>
							<FormControl>
								<Input
									type="number"
									step="1"
									min={1}
									max={maxDays}
									placeholder={maxDays ? `1–${maxDays}` : "1"}
									value={typeof field.value === "number" ? field.value : ""}
									onChange={(e) => {
										const raw = e.target.value;
										field.onChange(raw === "" ? undefined : Number(raw));
									}}
									onBlur={field.onBlur}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
			<p className="text-xs text-[var(--sea-ink-soft)]">
				Leave blank to keep this entry off the timeline. Months are defined in
				the campaign settings.
			</p>
		</div>
	);
}
