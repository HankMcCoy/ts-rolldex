import ReactMarkdown, { type Components } from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { Callout } from "@/components/markdown/Callout";
import { MARKDOWN_PROSE_CLASS } from "@/components/markdown-styles";

// biome-ignore lint/suspicious/noExplicitAny: mdast types are loose
function walk(node: any, fn: (n: any) => void) {
	fn(node);
	if (Array.isArray(node?.children)) {
		for (const child of node.children) walk(child, fn);
	}
}

/**
 * remark-directive produces `containerDirective` nodes in the mdast, but
 * `mdast-util-to-hast` (which the rehype step uses) doesn't know how to
 * convert them to HAST by default — the nodes get dropped and the callout
 * collapses into flat content. Bridge it: set `hName` + `hProperties` so
 * the directive surfaces as a `<div data-callout-name="…">` HAST element,
 * which the components map below intercepts.
 */
function remarkDirectiveAsHast() {
	return (tree: unknown) => {
		walk(tree, (node) => {
			if (node?.type !== "containerDirective") return;
			if (!node.data) node.data = {};
			node.data.hName = "div";
			node.data.hProperties = {
				"data-callout-name": node.name ?? "note",
			};
		});
	};
}

interface Props {
	content: string;
}

// Markdown can't otherwise produce a top-level `<div>`, so intercepting
// `div` here is safe — the only divs we'll see come from our directive bridge.
const components: Components = {
	// biome-ignore lint/suspicious/noExplicitAny: react-markdown's Components type doesn't expose hast props inline
	div: ({ node, children }: any) => {
		const name = node?.properties?.["data-callout-name"];
		if (typeof name === "string") {
			return <Callout name={name}>{children}</Callout>;
		}
		return <div>{children}</div>;
	},
} as Components;

export function MarkdownRenderer({ content }: Props) {
	return (
		<div className={MARKDOWN_PROSE_CLASS}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveAsHast]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
