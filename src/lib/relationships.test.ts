import { describe, expect, it } from "vitest";
import {
	type CandidateEntity,
	computeRelatedEntities,
} from "@/lib/relationships";

const empty = { summary: "", notes: "", privateNotes: "" };

function candidate(
	overrides: Partial<CandidateEntity> & { id: string; name: string },
): CandidateEntity {
	return {
		entityType: "PERSON",
		imageUrl: null,
		...overrides,
	};
}

describe("computeRelatedEntities — forward direction", () => {
	it("matches when the current entity's notes mention a candidate by name", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "Met Gandalf in the tavern." },
			[candidate({ id: "g", name: "Gandalf" })],
		);
		expect(result.map((r) => r.id)).toEqual(["g"]);
	});

	it("matches across summary, notes, and privateNotes fields", () => {
		const candidates = [
			candidate({ id: "a", name: "Alpha" }),
			candidate({ id: "b", name: "Bravo" }),
			candidate({ id: "c", name: "Charlie" }),
		];
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{
				summary: "Alpha is a friend.",
				notes: "Bravo lives next door.",
				privateNotes: "Charlie is the secret villain.",
			},
			candidates,
		);
		expect(result.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
	});

	it("matches case-insensitively", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "GANDALF appeared." },
			[candidate({ id: "g", name: "gandalf" })],
		);
		expect(result.map((r) => r.id)).toEqual(["g"]);
	});

	it("does not match substrings inside other words (word boundary)", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "He went to the catacombs." },
			[candidate({ id: "c", name: "cat" })],
		);
		expect(result).toEqual([]);
	});
});

describe("computeRelatedEntities — apostrophe-s normalization", () => {
	it("matches a candidate name when text contains its possessive form", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "Gandalf's staff is broken." },
			[candidate({ id: "g", name: "Gandalf" })],
		);
		expect(result.map((r) => r.id)).toEqual(["g"]);
	});

	it("matches a candidate whose name itself ends in 's", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "Visited the Inn last night." },
			[candidate({ id: "i", name: "Inn's" })],
		);
		expect(result.map((r) => r.id)).toEqual(["i"]);
	});

	it("matches the current entity's name in possessive form (reverse direction)", () => {
		const result = computeRelatedEntities("current", "Hero", empty, [
			candidate({
				id: "c",
				name: "Castle",
				text: "Hero's banner flies above.",
			}),
		]);
		expect(result.map((r) => r.id)).toEqual(["c"]);
	});
});

describe("computeRelatedEntities — reverse direction", () => {
	it("matches when a candidate's text mentions the current entity", () => {
		const result = computeRelatedEntities("current", "Hero", empty, [
			candidate({
				id: "v",
				name: "Villain",
				text: "Defeated by Hero in the final battle.",
			}),
		]);
		expect(result.map((r) => r.id)).toEqual(["v"]);
	});

	it("does not match in reverse when candidate has no text", () => {
		const result = computeRelatedEntities("current", "Hero", empty, [
			candidate({ id: "v", name: "Villain" }),
		]);
		expect(result).toEqual([]);
	});

	it("respects word boundaries in reverse direction", () => {
		const result = computeRelatedEntities("current", "Cat", empty, [
			candidate({
				id: "p",
				name: "Place",
				text: "He went to the catacombs.",
			}),
		]);
		expect(result).toEqual([]);
	});
});

describe("computeRelatedEntities — regex-special characters", () => {
	it("treats regex metacharacters in a candidate name as literals", () => {
		// Without escaping, "[abc]" would be interpreted as a character class
		// matching a single 'a', 'b', or 'c'. After escaping, it should only
		// match the literal "[abc]" — and "a alone" should NOT trigger a match.
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "Found a clue." },
			[candidate({ id: "p", name: "[abc]" })],
		);
		expect(result).toEqual([]);
	});

	it("matches a candidate name containing a regex-special char as a literal", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "We played D&D last night." },
			[candidate({ id: "g", name: "D&D" })],
		);
		expect(result.map((r) => r.id)).toEqual(["g"]);
	});

	it("does not interpret a candidate name with '.' as a wildcard", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "She visited DrX yesterday." },
			[candidate({ id: "d", name: "Dr.X" })],
		);
		expect(result).toEqual([]);
	});

	it("does not interpret current name with regex chars as a pattern (reverse)", () => {
		const result = computeRelatedEntities("current", "A.B", empty, [
			candidate({ id: "x", name: "X", text: "AxB was here." }),
		]);
		expect(result).toEqual([]);
	});
});

describe("computeRelatedEntities — output shape", () => {
	it("excludes the current entity from results", () => {
		const result = computeRelatedEntities(
			"self",
			"Hero",
			{ ...empty, notes: "Hero is the protagonist." },
			[candidate({ id: "self", name: "Hero" })],
		);
		expect(result).toEqual([]);
	});

	it("strips the internal text field from returned entities", () => {
		const result = computeRelatedEntities("current", "Hero", empty, [
			candidate({
				id: "v",
				name: "Villain",
				text: "Hero defeated me.",
				summary: "The bad guy",
			}),
		]);
		expect(result).toEqual([
			{
				id: "v",
				name: "Villain",
				entityType: "PERSON",
				imageUrl: null,
				summary: "The bad guy",
			},
		]);
		expect(result[0]).not.toHaveProperty("text");
	});

	it("does not duplicate a candidate matched by both directions", () => {
		const result = computeRelatedEntities(
			"current",
			"Hero",
			{ ...empty, notes: "Met Villain." },
			[
				candidate({
					id: "v",
					name: "Villain",
					text: "Hero is my nemesis.",
				}),
			],
		);
		expect(result.map((r) => r.id)).toEqual(["v"]);
	});
});
