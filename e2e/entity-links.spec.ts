import { expect, test } from "@playwright/test";
import {
	createCampaign,
	registerAndLogin,
	waitForHydration,
} from "./helpers/auth";

test("@mention inserts a durable in-campaign entity link (RDX-15)", async ({
	page,
}) => {
	await registerAndLogin(page);
	const campaignId = await createCampaign(
		page,
		`Links ${Date.now().toString(36)}`,
	);

	await page.goto(`/campaigns/${campaignId}/nouns/new`);
	await waitForHydration(page);
	await page.getByLabel("Name").fill("Baron Talver");
	await page.getByLabel("Summary").fill("A suspicious patron.");
	await page
		.getByRole("button", { name: /create entity|create/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/nouns\/[0-9a-f-]{36}$/);
	const targetUrl = page.url();

	await page.goto(`/campaigns/${campaignId}/sessions/new`);
	await waitForHydration(page);
	await page.waitForSelector(".ProseMirror");
	await page.getByLabel("Name").fill("The First Lead");
	await page.getByLabel("Summary").fill("The party meets a contact.");
	const notes = page.getByLabel("Notes", { exact: true });
	await notes.click();
	await page.keyboard.type("Meet @Bar");
	await expect(
		page.getByRole("button", { name: "Baron Talver" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Baron Talver" }).click();
	// A chosen mention ends the link mark. Text typed after it must survive the
	// reader resolving the link label to the target's current name.
	await page.keyboard.type(" is a cow.");
	await expect(notes).toContainText("Meet Baron Talver is a cow.");

	await page
		.getByRole("button", { name: /create session|create/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);

	const link = page
		.getByRole("paragraph")
		.filter({ hasText: "Meet Baron Talver" })
		.getByRole("link", { name: "Baron Talver" });
	await expect(
		page
			.getByRole("paragraph")
			.filter({ hasText: "Meet Baron Talver is a cow." }),
	).toBeVisible();
	await expect(link).toHaveAttribute("href", new URL(targetUrl).pathname);
	await link.click();
	await expect(page).toHaveURL(targetUrl);
});
