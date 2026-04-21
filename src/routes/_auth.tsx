import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<Outlet />
			</div>
		</div>
	);
}
