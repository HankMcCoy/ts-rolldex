import { Link, useNavigate } from "@tanstack/react-router";
import { signOut, useSession } from "@/lib/auth-client";

export default function Header() {
	const { data: session } = useSession();
	const navigate = useNavigate();

	async function handleSignOut() {
		await signOut();
		navigate({ href: "/login" });
	}

	return (
		<header
			className="sticky top-0 z-50 px-4"
			style={{ backgroundColor: "var(--header-bg)" }}
		>
			<nav className="page-wrap flex items-center gap-6 py-3">
				<Link to="/" className="flex-shrink-0 no-underline">
					<div
						className="text-2xl leading-none tracking-widest text-white"
						style={{ fontFamily: "var(--font-display)" }}
					>
						ROLLDEX
					</div>
					<div
						className="text-[9px] tracking-[0.2em] text-white/40"
						style={{
							fontFamily: "ui-monospace, monospace",
							textTransform: "uppercase",
						}}
					>
						Campaign Compendium
					</div>
				</Link>

				<div className="flex items-center gap-5 text-sm font-medium">
					{session ? (
						<Link
							to="/campaigns"
							className="nav-link"
							activeProps={{ className: "nav-link is-active" }}
						>
							Campaigns
						</Link>
					) : (
						<>
							<Link to="/login" className="nav-link">
								Login
							</Link>
							<Link to="/register" className="nav-link">
								Register
							</Link>
						</>
					)}
				</div>

				{session && (
					<div className="ml-auto flex items-center gap-3">
						<span className="text-sm text-white/50">{session.user.name}</span>
						<button
							type="button"
							onClick={handleSignOut}
							className="rounded border border-white/25 px-3 py-1 text-sm text-white/80 transition hover:border-white/50 hover:text-white"
						>
							Sign Out
						</button>
					</div>
				)}
			</nav>
		</header>
	);
}
