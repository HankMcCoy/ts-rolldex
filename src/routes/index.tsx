import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getOptionalSession } from "@/lib/access";

const checkSession = createServerFn().handler(async () => {
	const session = await getOptionalSession();
	if (session) throw redirect({ href: "/campaigns" });
});

export const Route = createFileRoute("/")({
	loader: () => checkSession(),
	component: App,
});

function App() {
	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<p className="island-kicker mb-3">Campaign Compendium</p>
				<h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
					Keep your tabletop world at hand.
				</h1>
				<p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
					Rolldex is a campaign manager for tabletop RPGs. Track the people,
					places, factions, and session notes that make up your world — and
					share read-only access with your players.
				</p>
				<div className="flex flex-wrap gap-3">
					<Link
						to="/register"
						className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
					>
						Create an account
					</Link>
					<Link
						to="/login"
						className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
					>
						Sign in
					</Link>
				</div>
			</section>

			<section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[
					[
						"People, places, factions",
						"Capture every NPC, location, and faction in a single searchable index.",
					],
					[
						"Session journals",
						"Write up each session as you go; references to past entities link automatically.",
					],
					[
						"Public and private notes",
						"Keep DM-only twists separate from what your players are allowed to see.",
					],
					[
						"Read-only invites",
						"Share a campaign with your table by email — players see the world, not the spoilers.",
					],
				].map(([title, desc], index) => (
					<article
						key={title}
						className="island-shell feature-card rise-in rounded-2xl p-5"
						style={{ animationDelay: `${index * 90 + 80}ms` }}
					>
						<h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
							{title}
						</h2>
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
					</article>
				))}
			</section>
		</main>
	);
}
