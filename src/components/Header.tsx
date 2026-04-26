import { Link, useMatches } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";

export default function Header() {
	const matches = useMatches();
	const { data: session } = useSession();

	const isAppRoute = matches.some((m) => m.routeId.startsWith("/_app"));
	if (isAppRoute) return null;

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
				</Link>

				<div className="ml-auto flex items-center gap-5 text-sm font-medium">
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
			</nav>
		</header>
	);
}
