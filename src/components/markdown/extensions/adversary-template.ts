/**
 * ProseMirror JSON inserted by the "Adversary stat block" slash command.
 * A single Callout node (name "stat-block") populated with placeholder
 * heading + bold-label paragraphs + FEATURES section, modelled on the
 * Daggerheart stat-block reference image. User overwrites the placeholders.
 */
export const ADVERSARY_TEMPLATE_NODES = {
	type: "callout",
	attrs: { name: "stat-block" },
	content: [
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Adversary Name" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "italic" }],
					text: "Tier 1 Standard (Tag)",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", marks: [{ type: "bold" }], text: "Description: " },
				{
					type: "text",
					text: "One evocative line about how the adversary appears and fights.",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Motives & Tactics: ",
				},
				{ type: "text", text: "What it wants, how it pursues it." },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }],
					text: "Weapon: ",
				},
				{
					type: "text",
					text: "Range — d8+2 phy · ATK +2 · Difficulty 13",
				},
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "Thresholds 7 / 14 · HP ☐ ☐ ☐ ☐ ☐ ☐ ☐ · Stress ☐ ☐ ☐",
				},
			],
		},
		{
			type: "heading",
			attrs: { level: 3 },
			content: [{ type: "text", text: "FEATURES" }],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }, { type: "italic" }],
					text: "Passive Feature — Passive: ",
				},
				{ type: "text", text: "Describe what this feature does." },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }, { type: "italic" }],
					text: "Action Feature — Action: ",
				},
				{ type: "text", text: "Describe what this feature does." },
			],
		},
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					marks: [{ type: "bold" }, { type: "italic" }],
					text: "Reaction Feature — Reaction: ",
				},
				{ type: "text", text: "Describe what this feature does." },
			],
		},
	],
};
