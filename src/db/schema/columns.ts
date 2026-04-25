import { text } from "drizzle-orm/pg-core";

export const idColumn = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
