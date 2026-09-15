import { expect, test, type Page } from "@playwright/test";
import {
	createCampaign,
	registerAndLogin,
	waitForHydration,
} from "./helpers/auth";

async function createNoun(
	page: Page,
	campaignId: string,
	name: string,
	summary: string,
) {
	await page.goto(`/campaigns/${campaignId}/nouns/new`);
	await waitForHydration(page);
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Summary").fill(summary);
	await page
		.getByRole("button", { name: /create entity|create/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/nouns\/[0-9a-f-]{36}$/);
	const url = page.url();
	const id = new URL(url).pathname.split("/").pop();
	if (!id) throw new Error(`Could not parse noun id from ${url}`);
	return { id, url };
}

async function createSession(page: Page, campaignId: string, name: string) {
	await page.goto(`/campaigns/${campaignId}/sessions/new`);
	await waitForHydration(page);
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Summary").fill(`${name} summary.`);
	await page
		.getByRole("button", { name: /create session|create/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);
	const url = page.url();
	const id = new URL(url).pathname.split("/").pop();
	if (!id) throw new Error(`Could not parse session id from ${url}`);
	return { id, url };
}

test("declared relationships are directional and replace implicit matches (RDX-09)", async ({
	page,
}) => {
	await registerAndLogin(page);
	const campaignId = await createCampaign(
		page,
		`Relationships ${Date.now().toString(36)}`,
	);
	const dave = await createNoun(page, campaignId, "Dave", "Rachel's father.");
	const rachel = await createNoun(
		page,
		campaignId,
		"Rachel",
		"Dave's daughter.",
	);
	const lagos = await createNoun(page, campaignId, "Lagos", "A coastal city.");
	const arrival = await createSession(page, campaignId, "Arrival in Lagos");

	await page.goto(rachel.url);
	const related = page.locator("aside").filter({ hasText: "Related" });
	await expect(related.getByRole("link", { name: "Dave" })).toBeVisible();
	await related
		.getByRole("button", { name: "Declare relationship with Dave" })
		.click();
	await expect(page.getByLabel("Relationship target")).toBeDisabled();
	await page.getByLabel("Category name").fill("Family");
	await page.getByLabel("Forward label").fill("daughter of");
	await page.getByLabel("Reverse label").fill("father of");
	await page.getByRole("button", { name: "Save relationship" }).click();

	await expect(page.getByRole("dialog")).not.toBeVisible();
	await expect(related.getByText("Family", { exact: true })).toBeVisible();
	await expect(related.getByText("daughter of", { exact: true })).toBeVisible();
	await expect(
		related.getByRole("button", { name: "Declare relationship with Dave" }),
	).not.toBeVisible();

	await page.goto(dave.url);
	await expect(related.getByText("father of", { exact: true })).toBeVisible();
	await expect(related.getByRole("link", { name: "Rachel" })).toBeVisible();
	await expect(
		related.getByRole("button", { name: "Declare relationship with Rachel" }),
	).not.toBeVisible();

	// Labels are stored on the edge. Existing labels in the selected category
	// are autocomplete suggestions, not canonical dropdown entries.
	await related.getByRole("button", { name: "Add relationship" }).click();
	await page.getByLabel("Relationship target").selectOption(lagos.id);
	await expect(page.getByLabel("Relationship category")).toContainText(
		"Family",
	);
	await page
		.getByLabel("Relationship category")
		.selectOption({ label: "Family" });
	await expect(
		page.locator('#relationship-label-suggestions option[value="daughter of"]'),
	).toHaveCount(1);
	await page.getByLabel("Relationship category").selectOption("new");
	await page.getByLabel("Category name").fill("Origins");
	await page.getByLabel("Forward label").fill("born in");
	await page.getByRole("button", { name: "Save relationship" }).click();
	await expect(related.getByText("born in", { exact: true })).toBeVisible();
	await expect(related.getByRole("link", { name: "Lagos" })).toBeVisible();

	await page.goto(lagos.url);
	const origins = related.locator("section").filter({ hasText: "Origins" });
	await expect(origins.getByRole("link", { name: "Dave" })).toBeVisible();
	await expect(origins.getByText("born in", { exact: true })).not.toBeVisible();
	await expect(related.getByRole("link", { name: "Dave" })).toBeVisible();

	// Nouns and game sessions share the same relationship model.
	await related.getByRole("button", { name: "Add relationship" }).click();
	await page.getByLabel("Relationship target").selectOption(arrival.id);
	await page.getByLabel("Relationship category").selectOption("new");
	await page.getByLabel("Category name").fill("Chronicle");
	await page.getByLabel("Forward label").fill("featured in");
	await page.getByLabel("Reverse label").fill("features");
	await page.getByRole("button", { name: "Save relationship" }).click();
	await expect(related.getByText("featured in", { exact: true })).toBeVisible();
	await expect(
		related.getByRole("link", { name: "Arrival in Lagos" }),
	).toBeVisible();

	await page.goto(arrival.url);
	await expect(related.getByText("features", { exact: true })).toBeVisible();
	await expect(related.getByRole("link", { name: "Lagos" })).toBeVisible();

	// Both labels may be omitted. Category alone is enough to make a symmetric
	// connection, and an exact duplicate is rejected without preventing another
	// distinct relationship between the same pair and category.
	await related.getByRole("button", { name: "Add relationship" }).click();
	await page.getByLabel("Relationship target").selectOption(rachel.id);
	await page.getByLabel("Relationship category").selectOption("new");
	await page.getByLabel("Category name").fill("Associates");
	await page.getByRole("button", { name: "Save relationship" }).click();
	const associates = related
		.locator("section")
		.filter({ hasText: "Associates" });
	await expect(associates.getByRole("link", { name: "Rachel" })).toHaveCount(1);

	await related.getByRole("button", { name: "Add relationship" }).click();
	await page.getByLabel("Relationship target").selectOption(rachel.id);
	await page
		.getByLabel("Relationship category")
		.selectOption({ label: "Associates" });
	await page.getByRole("button", { name: "Save relationship" }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"That relationship already exists.",
	);
	await page.getByLabel("Forward label").fill("knows about");
	await page.getByRole("button", { name: "Save relationship" }).click();
	await expect(associates.getByRole("link", { name: "Rachel" })).toHaveCount(2);
	await expect(
		associates.getByText("knows about", { exact: true }),
	).toBeVisible();

	await page.goto(rachel.url);
	await expect(
		associates.getByRole("link", { name: "Arrival in Lagos" }),
	).toHaveCount(2);
	await related.getByRole("button", { name: "Add relationship" }).click();
	await page.getByLabel("Relationship target").selectOption(arrival.id);
	await page
		.getByLabel("Relationship category")
		.selectOption({ label: "Associates" });
	await page.getByRole("button", { name: "Save relationship" }).click();
	await expect(page.getByRole("alert")).toHaveText(
		"That relationship already exists.",
	);

	// Removing the declared family edge makes the text-derived match available
	// again on both pages.
	await page.goto(dave.url);
	await related
		.getByRole("button", { name: "Delete relationship with Rachel" })
		.click();
	await expect(
		related.getByRole("button", { name: "Declare relationship with Rachel" }),
	).toBeVisible();
});
