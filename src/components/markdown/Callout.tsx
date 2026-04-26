import type { ReactNode } from "react";
import { calloutClass } from "@/components/markdown/callout-styles";

interface Props {
	name?: string;
	children: ReactNode;
}

/**
 * Read-view component for `:::name ... :::` directive blocks. Mirrors the
 * styling applied by the editor's Callout node so the two views match.
 */
export function Callout({ name, children }: Props) {
	return (
		<div data-callout-name={name ?? "note"} className={calloutClass(name)}>
			{children}
		</div>
	);
}
