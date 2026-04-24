import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@/lib/form-resolver";

export const Route = createFileRoute("/_auth/login")({
	component: LoginPage,
});

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginPage() {
	const navigate = useNavigate();

	const form = useForm<LoginValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(values: LoginValues) {
		const result = await authClient.signIn.email({
			email: values.email,
			password: values.password,
		});

		if (result.error) {
			form.setError("root", {
				message: result.error.message ?? "Invalid email or password",
			});
			return;
		}

		await navigate({ href: "/campaigns" });
	}

	return (
		<div className="island-shell rounded-2xl p-8">
			<h1 className="display-title mb-1 text-2xl font-bold">Welcome back</h1>
			<p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
				Sign in to your account
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
										autoComplete="current-password"
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
						{form.formState.isSubmitting ? "Signing in…" : "Sign in"}
					</Button>
				</form>
			</Form>

			<p className="mt-4 text-center text-sm text-[var(--sea-ink-soft)]">
				Don't have an account?{" "}
				<Link
					to="/register"
					className="font-medium text-[var(--lagoon-deep)] hover:underline"
				>
					Register
				</Link>
			</p>
		</div>
	);
}
