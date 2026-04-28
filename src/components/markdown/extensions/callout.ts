import { mergeAttributes, Node, wrappingInputRule } from "@tiptap/core";
import container from "markdown-it-container";
import { calloutClass } from "@/components/markdown/callout-styles";

interface MarkdownItToken {
	nesting: number;
	info: string;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		callout: {
			setCallout: (attrs?: { name?: string }) => ReturnType;
			unsetCallout: () => ReturnType;
			toggleCallout: (attrs?: { name?: string }) => ReturnType;
		};
	}
}

const INPUT_RULE = /^:::([a-z][a-z0-9-]*)\s$/i;

/**
 * markdown-it-container nests containers by requiring the outer fence to use
 * *more* colons than the inner. Returns how deep callout nesting goes inside
 * `node` (0 = no nested callouts, 1 = one level, …) so the serializer can
 * emit a fence one colon longer than the deepest inner fence.
 */
// biome-ignore lint/suspicious/noExplicitAny: ProseMirror node walking is loosely typed
function maxCalloutDepth(node: any): number {
	let max = 0;
	// biome-ignore lint/suspicious/noExplicitAny: same
	node.forEach((child: any) => {
		const childContrib = child.type.name === "callout" ? 1 : 0;
		const depth = maxCalloutDepth(child) + childContrib;
		if (depth > max) max = depth;
	});
	return max;
}

/**
 * Container directive: `:::name ... :::` block fences. Renders as a styled
 * card in the editor and (via remark-directive) in the read view. Round-trips
 * through tiptap-markdown by registering a markdown-it-container plugin that
 * emits `<div data-callout-name="…">` HTML, which `parseHTML` then matches.
 */
export const Callout = Node.create({
	name: "callout",
	group: "block",
	content: "block+",
	defining: true,

	addAttributes() {
		return {
			name: {
				default: "note",
				parseHTML: (el: HTMLElement) =>
					el.getAttribute("data-callout-name") ?? "note",
				renderHTML: (attrs: { name: string }) => ({
					"data-callout-name": attrs.name,
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: "div[data-callout-name]" }];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { class: calloutClass(node.attrs.name) }),
			0,
		];
	},

	addCommands() {
		return {
			setCallout:
				(attrs) =>
				({ commands }) =>
					commands.wrapIn(this.name, { name: attrs?.name ?? "note" }),
			unsetCallout:
				() =>
				({ commands }) =>
					commands.lift(this.name),
			toggleCallout:
				(attrs) =>
				({ commands }) =>
					commands.toggleWrap(this.name, { name: attrs?.name ?? "note" }),
		};
	},

	addInputRules() {
		return [
			wrappingInputRule({
				find: INPUT_RULE,
				type: this.type,
				getAttributes: (match) => ({ name: match[1].toLowerCase() }),
			}),
		];
	},

	addKeyboardShortcuts() {
		return {
			"Mod-Shift-c": () => this.editor.commands.toggleCallout({ name: "note" }),
		};
	},

	addStorage() {
		return {
			markdown: {
				// biome-ignore lint/suspicious/noExplicitAny: tiptap-markdown serializer state has no exported types
				serialize(state: any, node: any) {
					const fence = ":".repeat(3 + maxCalloutDepth(node));
					state.write(`${fence}${node.attrs.name}\n`);
					state.renderContent(node);
					state.write(fence);
					state.closeBlock(node);
				},
				parse: {
					// biome-ignore lint/suspicious/noExplicitAny: markdown-it ships no types in this codebase
					setup(md: any) {
						md.use(container, "callout", {
							validate: (params: string) =>
								/^[a-z][a-z0-9-]*\s*$/i.test(params.trim()),
							render: (tokens: MarkdownItToken[], idx: number) => {
								const token = tokens[idx];
								if (token.nesting === 1) {
									const name = token.info.trim();
									return `<div data-callout-name="${escapeAttr(name)}">\n`;
								}
								return "</div>\n";
							},
						});
					},
				},
			},
		};
	},
});

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}
