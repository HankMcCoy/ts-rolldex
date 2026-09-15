import { Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionProps,
} from "@tiptap/suggestion";
import { AtSign } from "lucide-react";
import type { SlashMenuItem } from "@/components/markdown/SlashMenu";
import { type EntityLinkTarget, entityLinkHref } from "@/lib/entity-links";

const entityMentionPluginKey = new PluginKey("entityMention");

export interface EntityMentionItem extends SlashMenuItem {
	target: EntityLinkTarget;
	command: (ctx: { range: Range }) => void;
}

export interface EntityMentionRendererHandlers {
	onStart: (props: SuggestionProps<EntityMentionItem>) => void;
	onUpdate: (props: SuggestionProps<EntityMentionItem>) => void;
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
	onExit: () => void;
}

export interface EntityMentionOptions {
	campaignId: string;
	/** Kept as a callback so cache updates never require rebuilding the editor. */
	getTargets: () => EntityLinkTarget[];
	createRenderer: () => EntityMentionRendererHandlers;
}

export const EntityMention = Extension.create<EntityMentionOptions>({
	name: "entityMention",

	addOptions() {
		return {
			campaignId: "",
			getTargets: () => [],
			createRenderer: () => {
				throw new Error("EntityMention: createRenderer must be provided");
			},
		};
	},

	addProseMirrorPlugins() {
		const { campaignId, getTargets } = this.options;
		return [
			Suggestion<EntityMentionItem>({
				editor: this.editor,
				pluginKey: entityMentionPluginKey,
				char: "@",
				startOfLine: false,
				allowSpaces: true,
				items: ({ query }) => {
					const normalized = query.trim().toLocaleLowerCase();
					return getTargets()
						.filter((target) =>
							normalized === ""
								? true
								: target.name.toLocaleLowerCase().includes(normalized),
						)
						.slice(0, 10)
						.map((target) => ({
							id: `${target.collection}-${target.id}`,
							label: target.name,
							hint: target.collection === "nouns" ? "Entity" : "Session",
							icon: AtSign,
							target,
							command: ({ range }) => {
								this.editor
									.chain()
									.focus()
									.deleteRange(range)
									.insertContent({
										type: "text",
										text: target.name,
										marks: [
											{
												type: "link",
												attrs: { href: entityLinkHref(campaignId, target) },
											},
										],
									})
									// `insertContent` leaves its inserted range selected. Collapse
									// at its end before unsetting the stored mark; otherwise
									// `unsetLink` removes the link we just made.
									.setTextSelection(range.from + target.name.length)
									// Keep the selected name linked, but make subsequent typing
									// ordinary prose. Otherwise the renderer correctly resolves
									// the whole expanded label back to the target name on save.
									.unsetMark("link", { extendEmptyMarkRange: false })
									.run();
							},
						}));
				},
				command: ({ range, props }) => props.command({ range }),
				render: this.options.createRenderer,
			}),
		];
	},
});
