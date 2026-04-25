import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	return (
		<main className="page-wrap px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">About</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
					A compendium for the campaigns you actually run.
				</h1>
				<p className="m-0 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
					Rolldex is a small, opinionated tool for tabletop RPG dungeon masters.
					Build up the people, places, things, and factions of your world over
					time, write up each session, and let your players read along without
					seeing the parts you haven't revealed yet.
				</p>
			</section>
		</main>
	);
}
