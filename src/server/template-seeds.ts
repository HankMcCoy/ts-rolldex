/**
 * Markdown bodies seeded as starter templates when a new campaign is created.
 * Currently mirrors the legacy hard-coded "Adversary stat block" slash item;
 * once we have modular system imports this seed will move out of the codebase.
 */
export interface TemplateSeed {
	name: string;
	body: string;
	wrapInStatBlock: boolean;
}

const ADVERSARY_BODY = `## Adversary Name

*Tier 1 Standard (Tag)*

**Description:** One evocative line about how the adversary appears and fights.

**Motives & Tactics:** What it wants, how it pursues it.

**Weapon:** Range — d8+2 phy · ATK +2 · Difficulty 13

Thresholds 7 / 14 · HP ☐ ☐ ☐ ☐ ☐ ☐ ☐ · Stress ☐ ☐ ☐

### FEATURES

***Passive Feature — Passive:*** Describe what this feature does.

***Action Feature — Action:*** Describe what this feature does.

***Reaction Feature — Reaction:*** Describe what this feature does.`;

export const STARTER_TEMPLATES: TemplateSeed[] = [
	{ name: "Adversary", body: ADVERSARY_BODY, wrapInStatBlock: true },
];
