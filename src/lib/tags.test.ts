import { describe, expect, it } from "vitest";
import {
	filterByTagNames,
	MAX_TAGS_PER_ENTITY,
	normalizeTagName,
	normalizeTagNames,
	resolveTagRefs,
	selectTagName,
	TAG_MAX_LENGTH,
	tagFilterSchema,
	tagKey,
	toggleTagName,
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

describe("toggleTagName", () => {
	it("adds a name that isn't active", () => {
		expect(toggleTagName(["Ally"], "Villain")).toEqual(["Ally", "Villain"]);
	});

	it("removes a case variant of an active name", () => {
		expect(toggleTagName(["Ally", "Villain"], "villain")).toEqual(["Ally"]);
	});
});

describe("filterByTagNames", () => {
	const tags = [
		{ id: "t1", name: "Villain" },
		{ id: "t2", name: "Ally" },
	];
	const rows = [
		{ id: "a", tagIds: ["t1"] },
		{ id: "b", tagIds: ["t1", "t2"] },
		{ id: "c", tagIds: [] },
	];

	it("returns every row when no names are given", () => {
		expect(filterByTagNames(rows, tags, [])).toEqual(rows);
	});

	it("matches names case-insensitively", () => {
		expect(filterByTagNames(rows, tags, ["villain"]).map((r) => r.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("ANDs multiple names rather than ORing them", () => {
		expect(
			filterByTagNames(rows, tags, ["Villain", "Ally"]).map((r) => r.id),
		).toEqual(["b"]);
	});

	it("returns nothing when a name matches no campaign tag", () => {
		expect(filterByTagNames(rows, tags, ["Ghost"])).toEqual([]);
	});
});

describe("tagFilterSchema", () => {
	it("coerces a hand-written single value into a list", () => {
		expect(tagFilterSchema.parse("villain")).toEqual(["villain"]);
	});

	it("passes an absent filter through as undefined", () => {
		expect(tagFilterSchema.parse(undefined)).toBeUndefined();
	});
});

describe("selectTagName", () => {
	const tags = [
		{ id: "a", name: "Active", groupId: "status" },
		{ id: "c", name: "Complete", groupId: "status" },
		{ id: "p", name: "Person", groupId: "type" },
	];
	it("replaces only the same group, case-insensitively", () => {
		expect(
			selectTagName(["ACTIVE", "Person", "Free"], "complete", tags),
		).toEqual(["Person", "Free", "complete"]);
	});
	it("allows replacement at the entity tag limit", () => {
		const value = [
			"Active",
			...Array.from({ length: 24 }, (_, i) => `Tag ${i}`),
		];
		expect(selectTagName(value, "Complete", tags)).toHaveLength(25);
		expect(selectTagName(value, "Complete", tags)).not.toContain("Active");
		expect(selectTagName(value, "New", tags)).toEqual(value);
	});
});
