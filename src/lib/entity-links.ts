/** A visible noun or session that can be linked from campaign markdown. */
export interface EntityLinkTarget {
	id: string;
	name: string;
	collection: "nouns" | "sessions";
}

/**
 * Durable markdown location for an entity link. IDs, rather than names, mean
 * renaming an entity never invalidates links already written in campaign notes.
 */
export function entityLinkHref(
	campaignId: string,
	target: Pick<EntityLinkTarget, "id" | "collection">,
) {
	return `/campaigns/${campaignId}/${target.collection}/${target.id}`;
}

/**
 * Recognise the internal entity-link shape emitted by `EntityMention`.
 * Deliberately only accepts a link in this campaign: MarkdownRenderer uses a
 * null result to leave normal external links alone, and to render a missing or
 * hidden in-campaign target as inert text rather than a dead navigation.
 */
export function parseEntityLinkHref(
	href: string,
	campaignId: string,
): {
	id: string;
	collection: EntityLinkTarget["collection"];
} | null {
	let url: URL;
	try {
		url = new URL(href, "https://rolldex.invalid");
	} catch {
		return null;
	}

	if (url.origin !== "https://rolldex.invalid") return null;
	const parts = url.pathname.split("/");
	if (
		parts.length !== 5 ||
		parts[1] !== "campaigns" ||
		parts[2] !== campaignId ||
		(parts[3] !== "nouns" && parts[3] !== "sessions") ||
		!parts[4]
	) {
		return null;
	}

	return { collection: parts[3], id: parts[4] };
}
