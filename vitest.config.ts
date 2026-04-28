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
			R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?? "test-account",
			R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? "test-access-key",
			R2_SECRET_ACCESS_KEY:
				process.env.R2_SECRET_ACCESS_KEY ?? "test-secret-key",
			R2_BUCKET: process.env.R2_BUCKET ?? "test-bucket",
			R2_PUBLIC_BASE_URL:
				process.env.R2_PUBLIC_BASE_URL ?? "http://localhost/test-r2",
		},
	},
});
