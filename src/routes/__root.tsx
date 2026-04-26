import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import Footer from "../components/Footer";
import Header from "../components/Header";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Rolldex" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		],
	}),
	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere]">
				<Header />
				{children}
				<Footer />
				<Scripts />
			</body>
		</html>
	);
}

function NotFound() {
	return (
		<main className="page-wrap px-4 py-20 text-center">
			<h1 className="display-title mb-4 text-4xl font-bold">404</h1>
			<p className="mb-6 text-[var(--sea-ink-soft)]">
				This page doesn't exist.
			</p>
			<Link to="/" className="text-sm underline">
				Go home
			</Link>
		</main>
	);
}
