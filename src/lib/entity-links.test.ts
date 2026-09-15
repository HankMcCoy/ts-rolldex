import { describe, expect, it } from "vitest";
import {
	entityLinkHref,
	extractEntityLinkIds,
	parseEntityLinkHref,
} from "@/lib/entity-links";

describe("entity links", () => {
	const campaignId = "campaign-1";

	it("writes an ID-backed path for a noun or session", () => {
		expect(
			entityLinkHref(campaignId, { id: "noun-1", collection: "nouns" }),
		).toBe("/campaigns/campaign-1/nouns/noun-1");
		expect(
			entityLinkHref(campaignId, {
				id: "session-1",
				collection: "sessions",
			}),
		).toBe("/campaigns/campaign-1/sessions/session-1");
	});

	it("recognises only links to an entity in the current campaign", () => {
		expect(
			parseEntityLinkHref("/campaigns/campaign-1/nouns/noun-1", campaignId),
		).toEqual({ collection: "nouns", id: "noun-1" });
		expect(
			parseEntityLinkHref("/campaigns/elsewhere/nouns/noun-1", campaignId),
		).toBeNull();
		expect(parseEntityLinkHref("https://example.com", campaignId)).toBeNull();
	});

	it("extracts unique in-campaign entity ids from markdown links", () => {
		expect([
			...extractEntityLinkIds(
				[
					"[Dave](/campaigns/campaign-1/nouns/noun-1)",
					"[Session](/campaigns/campaign-1/sessions/session-1)",
					"[Dave again](/campaigns/campaign-1/nouns/noun-1)",
					"[Elsewhere](/campaigns/campaign-2/nouns/hidden)",
					"[External](https://example.com)",
				].join(" "),
				campaignId,
			),
		]).toEqual(["noun-1", "session-1"]);
	});
});
