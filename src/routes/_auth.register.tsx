import { zodResolver } from "@/lib/form-resolver";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { linkMemberAccounts } from "@/server/members";
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

export const Route = createFileRoute("/_auth/register")({
	component: RegisterPage,
});

const registerSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Invalid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterPage() {
	const navigate = useNavigate();

	const form = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
	});

	async function onSubmit(values: RegisterValues) {
		const result = await authClient.signUp.email({
			name: values.name,
			email: values.email,
			password: values.password,
		});

		if (result.error) {
			form.setError("root", {
				message: result.error.message ?? "Registration failed",
			});
			return;
		}

		// Backfill member rows for any pre-existing invites matching this email
		if (result.data?.user) {
			await linkMemberAccounts({
				data: { email: values.email, userId: result.data.user.id },
			});
		}

		await navigate({ href: "/campaigns" });
	}

	return (
		<div className="island-shell rounded-2xl p-8">
			<h1 className="display-title mb-1 text-2xl font-bold">Create account</h1>
			<p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
				Start managing your campaigns
			</p>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{form.formState.errors.root && (
						<p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{form.formState.errors.root.message}
						</p>
					)}

					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input placeholder="Your name" autoComplete="name" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										type="email"
										placeholder="you@example.com"
										autoComplete="email"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Password</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="••••••••"
										autoComplete="new-password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Confirm password</FormLabel>
								<FormControl>
									<Input
										type="password"
										placeholder="••••••••"
										autoComplete="new-password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button
						type="submit"
						className="w-full"
						disabled={form.formState.isSubmitting}
					>
						{form.formState.isSubmitting ? "Creating account…" : "Create account"}
					</Button>
				</form>
			</Form>

			<p className="mt-4 text-center text-sm text-[var(--sea-ink-soft)]">
				Already have an account?{" "}
				<Link
					to="/login"
					className="font-medium text-[var(--lagoon-deep)] hover:underline"
				>
					Sign in
				</Link>
			</p>
		</div>
	);
}
