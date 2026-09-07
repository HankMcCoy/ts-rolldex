import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@/lib/form-resolver";
import { useSaveShortcut } from "@/lib/keyboard";
import type { Result } from "@/lib/result";

const schema = z.object({
	name: z.string().min(1, "Name is required").max(80),
	body: z.string().max(50_000),
	wrapInStatBlock: z.boolean(),
});

export type TemplateFormValues = z.infer<typeof schema>;

interface Props {
	campaignId: string;
	defaults: TemplateFormValues;
	submitLabel: string;
	pendingLabel: string;
	onSubmit: (values: TemplateFormValues) => Promise<Result<unknown>>;
}

export function TemplateForm({
	campaignId,
	defaults,
	submitLabel,
	pendingLabel,
	onSubmit,
}: Props) {
	const navigate = useNavigate();

	const form = useForm<TemplateFormValues>({
		resolver: zodResolver(schema),
		defaultValues: defaults,
	});

	async function handleSubmit(values: TemplateFormValues) {
		const result = await onSubmit(values);
		if (!result.ok) {
			form.setError("name", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId/settings",
			params: { campaignId },
		});
	}

	useSaveShortcut(form.handleSubmit(handleSubmit));

	return (
		<Form {...form}>
			<form
				method="post"
				onSubmit={form.handleSubmit(handleSubmit)}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="body"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Body</FormLabel>
							<FormControl>
								<MarkdownEditor
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
									minRows={10}
									maxLength={50_000}
									ariaLabel="Template body"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="wrapInStatBlock"
					render={({ field }) => (
						<FormItem>
							<Label className="flex cursor-pointer items-start gap-3">
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
								<span>
									<span className="block">Wrap in stat-block callout</span>
									<span className="block text-xs text-[var(--sea-ink-soft)]">
										Wrap the body in <code>:::stat-block ... :::</code> when
										inserted, so it renders as a styled card.
									</span>
								</span>
							</Label>
						</FormItem>
					)}
				/>
				<div className="flex gap-3">
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting ? pendingLabel : submitLabel}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							navigate({
								to: "/campaigns/$campaignId/settings/templates",
								params: { campaignId },
							})
						}
					>
						Cancel
					</Button>
				</div>
			</form>
		</Form>
	);
}
