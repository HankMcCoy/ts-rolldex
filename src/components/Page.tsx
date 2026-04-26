import type { ReactNode } from "react";
import { type Crumb, PageHeader } from "@/components/PageHeader";

interface Props {
	breadcrumbs?: Crumb[];
	title: string;
	secret?: boolean;
	actions?: ReactNode;
	children: ReactNode;
	/**
	 * When true, render `main` as a full-bleed area sized to the remaining
	 * viewport (no page-wrap, no padding). Use for canvas-style pages that
	 * need every available pixel — e.g. a map.
	 */
	fullBleed?: boolean;
}

export function Page({
	breadcrumbs,
	title,
	secret,
	actions,
	children,
	fullBleed,
}: Props) {
	return (
		<>
			<PageHeader
				breadcrumbs={breadcrumbs}
				title={title}
				secret={secret}
				actions={actions}
			/>
			<main
				className={
					fullBleed
						? "h-[calc(100dvh-var(--page-header-h,80px))]"
						: "page-wrap px-4 pt-5 pb-10"
				}
			>
				{children}
			</main>
		</>
	);
}
