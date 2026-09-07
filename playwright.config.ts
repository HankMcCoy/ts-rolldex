import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Browser tooling, not a maintained regression suite — see `e2e/README.md`.
 *
 * `webServer` runs `pnpm dev`, which brings up the Postgres container and
 * applies migrations before Vite starts, so a cold `pnpm e2e` on a machine
 * with nothing running still works. `reuseExistingServer` is unconditional:
 * locally you usually already have `pnpm dev` up, and reusing it is much
 * faster than a second boot.
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm dev",
		url: BASE_URL,
		reuseExistingServer: true,
		timeout: 180_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
