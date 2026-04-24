import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { zodResolver } from "@/lib/form-resolver";
import { inviteMember } from "@/server/members";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/members/invite",
)({
	component: InviteMemberPage,
});

const parentRoute = getRouteApi("/_app/campaigns/$campaignId");

const schema = z.object({ email: z.string().email("Invalid email address") });
type Values = z.infer<typeof schema>;

function InviteMemberPage() {
	const { campaign, accessLevel } = parentRoute.useLoaderData();
	const navigate = useNavigate();
	const invite = useServerFn(inviteMember);

	if (accessLevel !== "ADMIN") {
		return (
			<main className="page-wrap px-4 py-10">
				<p>You don't have permission to invite members.</p>
			</main>
		);
	}

	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { email: "" },
	});

	async function onSubmit(values: Values) {
		const result = await invite({
			data: { campaignId: campaign.id, email: values.email },
		});
		if ("error" in result) {
			form.setError("email", { message: result.error });
			return;
		}
		await navigate({
			to: "/campaigns/$campaignId",
			params: { campaignId: campaign.id },
		});
	}

	return (
		<main className="page-wrap px-4 py-10">
			<h1 className="display-title mb-2 text-3xl font-bold">Invite member</h1>
			<p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
				Enter the email address of the person you want to invite to{" "}
				<strong>{campaign.name}</strong>. They'll get read-only access when they
				register.
			</p>
			<div className="island-shell max-w-sm rounded-2xl p-6">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email address</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="player@example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="flex gap-3">
							<Button type="submit" disabled={form.formState.isSubmitting}>
								{form.formState.isSubmitting ? "Inviting…" : "Send invite"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									navigate({
										to: "/campaigns/$campaignId",
										params: { campaignId: campaign.id },
									})
								}
							>
								Cancel
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</main>
	);
}
