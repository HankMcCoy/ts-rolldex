import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";

export default function Footer() {
	const year = new Date().getFullYear();
	const { data: session } = useSession();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate({ href: "/login" });
	}

	return (
		<footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
			<div className="page-wrap flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-between">
				<p className="m-0">&copy; {year} Rolldex</p>
				{session && (
					<div className="flex items-center gap-3 text-xs">
						<span>{session.user.email}</span>
						<button
							type="button"
							onClick={handleSignOut}
							className="inline-flex items-center gap-1 rounded text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
						>
							<LogOut className="size-3.5" />
							Sign out
						</button>
					</div>
				)}
			</div>
		</footer>
	);
}
