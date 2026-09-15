import { Link } from "@tanstack/react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { Callout } from "@/components/markdown/Callout";
import { MARKDOWN_PROSE_CLASS } from "@/components/markdown-styles";
import { type EntityLinkTarget, parseEntityLinkHref } from "@/lib/entity-links";

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
	/** Visible in-campaign targets, used to resolve durable entity links. */
	entityLinks?: EntityLinkTarget[];
	campaignId?: string;
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

function markdownComponents(
	campaignId: string | undefined,
	entityLinks: readonly EntityLinkTarget[],
): Components {
	const targets = new Map(
		entityLinks.map((target) => [`${target.collection}:${target.id}`, target]),
	);
	return {
		...components,
		a: ({ href, children }) => {
			const parsed =
				typeof href === "string" && campaignId
					? parseEntityLinkHref(href, campaignId)
					: null;
			if (!parsed) return <a href={href}>{children}</a>;

			const target = targets.get(`${parsed.collection}:${parsed.id}`);
			// An ID-shaped local link whose target isn't in the viewer's bundle is
			// either deleted or secret. Keep the prose but don't create a probe.
			if (!target) return <>{children}</>;
			// `parsed` can only be non-null when `campaignId` was supplied above.
			const activeCampaignId = campaignId as string;

			return (
				<Link
					to={
						target.collection === "nouns"
							? "/campaigns/$campaignId/nouns/$nounId"
							: "/campaigns/$campaignId/sessions/$sessionId"
					}
					params={
						target.collection === "nouns"
							? { campaignId: activeCampaignId, nounId: target.id }
							: { campaignId: activeCampaignId, sessionId: target.id }
					}
				>
					{target.name}
				</Link>
			);
		},
	};
}

export function MarkdownRenderer({
	content,
	entityLinks = [],
	campaignId,
}: Props) {
	return (
		<div className={MARKDOWN_PROSE_CLASS}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveAsHast]}
				components={markdownComponents(campaignId, entityLinks)}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
