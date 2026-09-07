import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export interface TestUser {
	name: string;
	email: string;
	password: string;
}

/**
 * A fresh user per call. There is no teardown — these runs leave rows in
 * whatever database `.env` points at, which is why the local one is a
 * throwaway container (`pnpm db:reset` wipes it).
 *
 * `.test` is a reserved TLD (RFC 2606), so these addresses can never resolve
 * to a real mailbox.
 */
export function makeTestUser(label = "e2e"): TestUser {
	const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
	return {
		name: `E2E ${label}`,
		email: `${label}-${unique}@example.test`,
		password: "playwright-test-password",
	};
}

/**
 * Blocks until React has hydrated `selector`.
 *
 * Submit buttons are rendered disabled until hydration (RDX-12), so
 * Playwright's actionability check already waits before *clicking*. This gate
 * covers the other half: the fields are controlled inputs, and text typed into
 * one before hydration is wiped when React takes over.
 */
export async function waitForHydration(page: Page, selector = "form") {
	await page.waitForFunction((sel) => {
		const el = document.querySelector(sel);
		if (!el) return false;
		return Object.keys(el).some(
			(k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
		);
	}, selector);
}

/**
 * Registers a new account and waits for the post-signup redirect to
 * /campaigns. Registration establishes a session directly, so there's no
 * separate login step.
 */
export async function registerAndLogin(
	page: Page,
	user: TestUser = makeTestUser(),
): Promise<TestUser> {
	await page.goto("/register");
	await waitForHydration(page);
	await page.getByLabel("Name").fill(user.name);
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password", { exact: true }).fill(user.password);
	await page.getByLabel("Confirm password").fill(user.password);
	await page.getByRole("button", { name: /create account/i }).click();
	await expect(page).toHaveURL(/\/campaigns$/);
	return user;
}

/** Creates a campaign and returns its id, parsed from the post-create URL. */
export async function createCampaign(
	page: Page,
	name: string,
	summary = "Created by an e2e run.",
): Promise<string> {
	await page.goto("/campaigns/new");
	await waitForHydration(page);
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Summary").fill(summary);
	await page.getByRole("button", { name: "Create campaign" }).click();
	await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
	const id = new URL(page.url()).pathname.split("/").pop();
	if (!id) throw new Error(`Could not parse campaign id from ${page.url()}`);
	return id;
}
