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
	tags: string[],
) {
	await page.goto(`/campaigns/${campaignId}/nouns/new`);
	await waitForHydration(page);
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Summary").fill(`${name} summary`);
	const tagInput = page.getByLabel("Tags");
	for (const tag of tags) {
		await tagInput.fill(tag);
		await tagInput.press("Enter");
	}
	await page.getByRole("button", { name: /create entity|create/i }).first().click();
	await expect(page).toHaveURL(/\/nouns\/[0-9a-f-]{36}$/);
}

async function createSession(
	page: Page,
	campaignId: string,
	name: string,
	tags: string[],
) {
	await page.goto(`/campaigns/${campaignId}/sessions/new`);
	await waitForHydration(page);
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Summary").fill(`${name} summary`);
	const tagInput = page.getByLabel("Tags");
	for (const tag of tags) {
		await tagInput.fill(tag);
		await tagInput.press("Enter");
	}
	await page.getByRole("button", { name: /create session|create/i }).first().click();
	await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);
}

test("noun tag filters narrow with AND and stay in the URL (RDX-02)", async ({
	page,
}) => {
	await registerAndLogin(page);
	const campaignId = await createCampaign(page, `Tags ${Date.now().toString(36)}`);

	await createNoun(page, campaignId, "Baron", ["Villain"]);
	await createNoun(page, campaignId, "Mara", ["Villain", "Ally"]);
	await createNoun(page, campaignId, "Innkeeper", ["Ally"]);

	await page.goto(`/campaigns/${campaignId}/nouns`);
	await page.getByRole("button", { name: "Villain" }).click();
	expect(new URL(page.url()).searchParams.get("tags")).toBe(
		'["Villain"]',
	);
	await expect(page.getByText("Baron", { exact: true })).toBeVisible();
	await expect(page.getByText("Mara", { exact: true })).toBeVisible();
	await expect(page.getByText("Innkeeper", { exact: true })).not.toBeVisible();

	await page.getByRole("button", { name: "Ally" }).click();
	expect(new URL(page.url()).searchParams.get("tags")).toBe(
		'["Villain","Ally"]',
	);
	await expect(page.getByText("Mara", { exact: true })).toBeVisible();
	await expect(page.getByText("Baron", { exact: true })).not.toBeVisible();
	await expect(page.getByText("Innkeeper", { exact: true })).not.toBeVisible();

	// A hand-written one-tag URL is accepted too, even though TanStack Router
	// serializes arrays as JSON when the filter chips write the search state.
	await page.goto(`/campaigns/${campaignId}/nouns?tags=Ally`);
	await expect(page.getByText("Mara", { exact: true })).toBeVisible();
	await expect(page.getByText("Innkeeper", { exact: true })).toBeVisible();
	await expect(page.getByText("Baron", { exact: true })).not.toBeVisible();
});

test("session tag filters use the same URL-backed AND semantics (RDX-02)", async ({
	page,
}) => {
	await registerAndLogin(page);
	const campaignId = await createCampaign(page, `Session tags ${Date.now().toString(36)}`);

	await createSession(page, campaignId, "Session One", ["Travel"]);
	await createSession(page, campaignId, "Session Two", ["Travel", "Combat"]);

	await page.goto(`/campaigns/${campaignId}/sessions`);
	await page.getByRole("button", { name: "Travel" }).click();
	await page.getByRole("button", { name: "Combat" }).click();

	expect(new URL(page.url()).searchParams.get("tags")).toBe(
		'["Travel","Combat"]',
	);
	await expect(page.getByText("Session Two", { exact: true })).toBeVisible();
	await expect(page.getByText("Session One", { exact: true })).not.toBeVisible();
});
