import { useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Calendar } from "@/lib/calendar";

interface DateFieldShape {
	dateYear?: number;
	dateMonth?: number;
	dateDay?: number;
	endDateYear?: number;
	endDateMonth?: number;
	endDateDay?: number;
}

interface Props<T extends FieldValues & DateFieldShape> {
	form: UseFormReturn<T>;
	calendar: Calendar;
}

/**
 * Year + month-select + day inputs for entries that should appear on the
 * timeline. The day's max is bounded by the chosen month's day count from
 * the campaign's calendar. All three fields are written together — the form
 * schema enforces all-or-none. When the multi-day toggle is on, an end
 * year/month/day trio is also captured.
 */
export function EventDateFields<T extends FieldValues & DateFieldShape>({
	form,
	calendar,
}: Props<T>) {
	const yearName = "dateYear" as Path<T>;
	const monthName = "dateMonth" as Path<T>;
	const dayName = "dateDay" as Path<T>;
	const endYearName = "endDateYear" as Path<T>;
	const endMonthName = "endDateMonth" as Path<T>;
	const endDayName = "endDateDay" as Path<T>;

	const initialValues = form.getValues();
	const [multiDay, setMultiDay] = useState(
		initialValues.endDateYear !== undefined ||
			initialValues.endDateMonth !== undefined ||
			initialValues.endDateDay !== undefined,
	);

	const selectedMonth = form.watch(monthName);
	const selectedIndex =
		typeof selectedMonth === "number" ? selectedMonth : undefined;
	const maxDays =
		selectedIndex !== undefined && calendar.months[selectedIndex]
			? calendar.months[selectedIndex].days
			: undefined;

	const selectedEndMonth = form.watch(endMonthName);
	const selectedEndIndex =
		typeof selectedEndMonth === "number" ? selectedEndMonth : undefined;
	const endMaxDays =
		selectedEndIndex !== undefined && calendar.months[selectedEndIndex]
			? calendar.months[selectedEndIndex].days
			: undefined;

	function toggleMultiDay(next: boolean) {
		setMultiDay(next);
		const current = form.getValues();
		if (next) {
			// Seed the end-date fields with the start values so the common case
			// (multi-day inside one month) needs minimal typing.
			form.setValue(endYearName, current.dateYear as T[Path<T>], {
				shouldDirty: true,
			});
			form.setValue(endMonthName, current.dateMonth as T[Path<T>], {
				shouldDirty: true,
			});
			form.setValue(endDayName, current.dateDay as T[Path<T>], {
				shouldDirty: true,
			});
		} else {
			form.setValue(endYearName, undefined as T[Path<T>], {
				shouldDirty: true,
			});
			form.setValue(endMonthName, undefined as T[Path<T>], {
				shouldDirty: true,
			});
			form.setValue(endDayName, undefined as T[Path<T>], {
				shouldDirty: true,
			});
		}
	}

	return (
		<div className="space-y-3">
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
			<Label className="flex cursor-pointer items-center gap-3">
				<Switch checked={multiDay} onCheckedChange={toggleMultiDay} />
				<span>Multi-day event</span>
			</Label>
			{multiDay && (
				<div className="grid gap-4 sm:grid-cols-3">
					<FormField
						control={form.control}
						name={endYearName}
						render={({ field }) => (
							<FormItem>
								<FormLabel>End year</FormLabel>
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
						name={endMonthName}
						render={({ field }) => (
							<FormItem>
								<FormLabel>End month</FormLabel>
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
						name={endDayName}
						render={({ field }) => (
							<FormItem>
								<FormLabel>End day</FormLabel>
								<FormControl>
									<Input
										type="number"
										step="1"
										min={1}
										max={endMaxDays}
										placeholder={endMaxDays ? `1–${endMaxDays}` : "1"}
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
			)}
			<p className="text-xs text-[var(--sea-ink-soft)]">
				Leave blank to keep this entry off the timeline. Months are defined in
				the campaign settings.
			</p>
		</div>
	);
}
