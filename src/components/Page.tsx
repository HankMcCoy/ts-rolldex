import type { ReactNode } from "react";
import { type Crumb, PageHeader } from "@/components/PageHeader";

interface Props {
	breadcrumbs?: Crumb[];
	title: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function Page({ breadcrumbs, title, actions, children }: Props) {
	return (
		<>
			<PageHeader breadcrumbs={breadcrumbs} title={title} actions={actions} />
			<main className="page-wrap px-4 pt-5 pb-10">{children}</main>
		</>
	);
}
