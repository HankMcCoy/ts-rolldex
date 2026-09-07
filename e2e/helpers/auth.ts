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
 * Registers a new account and waits for the post-signup redirect to
 * /campaigns. Registration establishes a session directly, so there's no
 * separate login step.
 */
/**
 * Registers a new account and waits for the post-signup redirect to
 * /campaigns. Registration establishes a session directly, so there's no
 * separate login step.
 *
 * Fields are located by placeholder rather than by label. That is deliberate
 * and temporary: `FormControl` puts its id on a wrapper div instead of the
 * input, so `<label for>` resolves to a non-labelable element and the inputs
 * have no accessible name. Switch these to `getByLabel` once RDX-11 lands —
 * that is the locator we actually want.
 */
/**
 * Blocks until React has hydrated `selector`, by looking for the fiber/props
 * keys React attaches to real DOM nodes.
 *
 * Necessary because Playwright is faster than hydration: the SSR'd HTML has a
 * fully-formed <form> with no `method` or `action`, so a click that lands
 * before `onSubmit` is wired does a **native GET** and reloads the page with
 * every field — passwords included — in the query string. Without this gate
 * these tests fail intermittently on a cold Vite start. (Tracked as RDX-12.)
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

export async function registerAndLogin(
	page: Page,
	user: TestUser = makeTestUser(),
): Promise<TestUser> {
	await page.goto("/register");
	await waitForHydration(page);
	await page.getByPlaceholder("Your name").fill(user.name);
	await page.getByPlaceholder("you@example.com").fill(user.email);

	// Both password fields share a placeholder, so go by type and position.
	const passwords = page.locator('input[type="password"]');
	await passwords.nth(0).fill(user.password);
	await passwords.nth(1).fill(user.password);

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
	await page.getByPlaceholder(/lost mines/i).fill(name);
	await page.getByPlaceholder(/short description/i).fill(summary);
	await page.getByRole("button", { name: "Create campaign" }).click();
	await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
	const id = new URL(page.url()).pathname.split("/").pop();
	if (!id) throw new Error(`Could not parse campaign id from ${page.url()}`);
	return id;
}
