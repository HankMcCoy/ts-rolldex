import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1),
	R2_ACCOUNT_ID: z.string().min(1),
	R2_ACCESS_KEY_ID: z.string().min(1),
	R2_SECRET_ACCESS_KEY: z.string().min(1),
	R2_BUCKET: z.string().min(1),
	R2_PUBLIC_BASE_URL: z.string().min(1),
});

export const env = envSchema.parse(process.env);
