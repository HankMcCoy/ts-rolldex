import { describe, expect, it } from "vitest";
import {
	MAX_TAGS_PER_ENTITY,
	normalizeTagName,
	normalizeTagNames,
	resolveTagRefs,
	TAG_MAX_LENGTH,
	tagKey,
} from "@/lib/tags";

describe("normalizeTagName", () => {
	it("trims and collapses whitespace", () => {
		expect(normalizeTagName("  red   dragon ")).toBe("red dragon");
	});
});

describe("tagKey", () => {
	it("treats case variants as the same tag", () => {
		expect(tagKey("Villain")).toBe(tagKey(" villain "));
	});
});

describe("normalizeTagNames", () => {
	it("drops blanks and keeps the first spelling of a duplicate", () => {
		expect(normalizeTagNames(["Villain", "  ", "villain", "Ally"])).toEqual([
			"Villain",
			"Ally",
		]);
	});

	it("clips over-long names and caps the list", () => {
		expect(normalizeTagNames(["x".repeat(100)])[0]).toHaveLength(
			TAG_MAX_LENGTH,
		);
		const many = Array.from({ length: 40 }, (_, i) => `tag-${i}`);
		expect(normalizeTagNames(many)).toHaveLength(MAX_TAGS_PER_ENTITY);
	});
});

describe("resolveTagRefs", () => {
	const existing = [{ id: "tag-1", name: "Villain" }];

	it("reuses the existing tag's id and spelling for a case variant", () => {
		expect(resolveTagRefs(existing, ["villain"])).toEqual([
			{ id: "tag-1", name: "Villain" },
		]);
	});

	it("mints an id for a name the campaign hasn't seen", () => {
		let n = 0;
		expect(resolveTagRefs(existing, ["Ally"], () => `new-${n++}`)).toEqual([
			{ id: "new-0", name: "Ally" },
		]);
	});
});
