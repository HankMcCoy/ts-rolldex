import { expect, test } from "@playwright/test";
import {
	createCampaign,
	registerAndLogin,
	waitForHydration,
} from "./helpers/auth";

/**
 * Regression tests for two bugs found while first wiring up this harness.
 * Both are cheap to re-break, and neither is visible in a unit test.
 */

test("form labels are associated with their controls (RDX-11)", async ({
	page,
}) => {
	await page.goto("/register");

	// getByLabel resolves through the accessibility tree, so these only pass
	// when <label for> actually points at the input rather than a wrapper div.
	await expect(page.getByLabel("Name")).toBeVisible();
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Confirm password")).toBeVisible();

	// Clicking a label must focus its field — the thing an inert `for` breaks.
	await page.getByText("Confirm password", { exact: true }).click();
	await expect(page.getByLabel("Confirm password")).toBeFocused();
});

test("server-rendered forms cannot submit before hydration (RDX-12)", async ({
	request,
}) => {
	// Read the raw SSR payload — no browser, so nothing has hydrated.
	const html = await (await request.get("/register")).text();

	// Native fallback must be POST, so fields can never land in the URL.
	expect(html).toMatch(/<form[^>]*method="post"/);

	// And the submit button ships disabled, so the fallback can't fire at all.
	const submit = html.match(/<button[^>]*type="submit"[^>]*>/);
	expect(submit?.[0], "submit button should be present in SSR html").toBeTruthy();
	expect(submit?.[0]).toMatch(/\bdisabled\b/);
});

test("every control type is reachable by its label (RDX-11)", async ({ page }) => {
	await registerAndLogin(page);
	const id = await createCampaign(page, `Ctl ${Date.now().toString(36)}`);

	await page.goto(`/campaigns/${id}/nouns/new`);
	await waitForHydration(page);

	// Input, native select, Textarea, and two Tiptap editors.
	await expect(page.getByLabel("Name")).toBeVisible();
	await expect(page.getByLabel("Type")).toBeVisible();
	await expect(page.getByLabel("Summary")).toBeVisible();
	await expect(page.getByLabel("Notes", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Private notes")).toBeVisible();

	await page.getByLabel("Name").fill("Dave the Innkeeper");
	await page.getByLabel("Type").selectOption("PERSON");
	await page.getByLabel("Summary").fill("Runs the Silver Eel.");
	await page.getByLabel("Notes", { exact: true }).fill("Knows every rumour.");

	await page.getByRole("button", { name: /create entity|create/i }).first().click();
	await expect(page).toHaveURL(/\/nouns\/[0-9a-f-]{36}$/);
	await expect(page.getByRole("heading", { name: "Dave the Innkeeper", level: 1 })).toBeVisible();
	await expect(page.getByText("Knows every rumour.")).toBeVisible();
});

test("validation state lands on the input, not a wrapper (RDX-11)", async ({ page }) => {
	await registerAndLogin(page);
	const id = await createCampaign(page, `Val ${Date.now().toString(36)}`);
	await page.goto(`/campaigns/${id}/nouns/new`);
	await waitForHydration(page);

	// Submit empty -> required errors. aria-invalid must land on the input.
	await page.getByRole("button", { name: /create entity|create/i }).first().click();
	const name = page.getByLabel("Name");
	await expect(name).toHaveAttribute("aria-invalid", "true");
	const describedBy = await name.getAttribute("aria-describedby");
	expect(describedBy, "input should point at its message element").toBeTruthy();
});
