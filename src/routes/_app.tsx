import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getOptionalSession } from "@/lib/access";

const getSessionOrRedirect = createServerFn().handler(async () => {
	const session = await getOptionalSession();
	if (!session) throw redirect({ href: "/login" });
	return { user: session.user };
});

export const Route = createFileRoute("/_app")({
	loader: () => getSessionOrRedirect(),
	component: () => <Outlet />,
});
