import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		env: {
			DATABASE_URL:
				process.env.DATABASE_URL ??
				"postgres://postgres:postgres@localhost:5432/rolldex",
			BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-secret",
		},
	},
});
