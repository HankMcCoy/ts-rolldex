import { expect, test } from "@playwright/test";
import { createCampaign, registerAndLogin } from "./helpers/auth";

/**
 * Proves the harness works end to end: a real browser, a booted app, a live
 * database, auth, a write, and a bundle-backed read. If this passes, ad-hoc
 * browser checks against a feature branch will work too.
 */
test("register, create a campaign, and see it on the dashboard", async ({
	page,
}) => {
	await registerAndLogin(page);

	const name = `Smoke ${Date.now().toString(36)}`;
	await createCampaign(page, name);

	// The campaign dashboard renders the name as its page title.
	await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();

	// And it shows up back on the index.
	await page.goto("/campaigns");
	await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
});

test("unauthenticated visitors are redirected to login", async ({ page }) => {
	await page.goto("/campaigns");
	await expect(page).toHaveURL(/\/login$/);
});
