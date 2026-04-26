import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type Crumb = {
	label: string;
	to?: string;
	params?: Record<string, string | undefined>;
	search?: Record<string, unknown>;
};

interface Props {
	breadcrumbs?: Crumb[];
	title: string;
	secret?: boolean;
	actions?: ReactNode;
}

export function PageHeader({ breadcrumbs, title, secret, actions }: Props) {
	return (
		<header
			className="sticky top-0 z-50 px-4"
			style={{ backgroundColor: "var(--header-bg)" }}
		>
			<div className="page-wrap flex items-center gap-6 py-3">
				<Link to="/" className="flex-shrink-0 no-underline">
					<div
						className="text-2xl leading-none tracking-widest text-white"
						style={{ fontFamily: "var(--font-display)" }}
					>
						ROLLDEX
					</div>
				</Link>

				<div className="min-w-0 flex-1">
					{breadcrumbs && breadcrumbs.length > 0 && (
						<nav aria-label="Breadcrumb">
							<ol className="m-0 flex flex-wrap items-center gap-1.5 p-0 text-xs text-white/45">
								{breadcrumbs.map((c, i) => (
									<li key={c.label} className="flex items-center gap-1.5">
										{i > 0 && (
											<span aria-hidden className="text-white/25">
												›
											</span>
										)}
										{c.to ? (
											<Link
												to={c.to as never}
												params={c.params as never}
												search={c.search as never}
												className="no-underline transition hover:text-white/80"
											>
												{c.label}
											</Link>
										) : (
											<span>{c.label}</span>
										)}
									</li>
								))}
							</ol>
						</nav>
					)}
					<div className="flex items-center gap-3">
						<h1 className="display-title truncate text-2xl font-bold leading-tight text-white">
							{title}
						</h1>
						{secret && (
							<span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
								Secret
							</span>
						)}
					</div>
				</div>

				{actions && (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				)}
			</div>
		</header>
	);
}
