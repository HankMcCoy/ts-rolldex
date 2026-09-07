import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

// `onnotice` silences the "already exists, skipping" NOTICEs drizzle
// triggers on every run; genuine errors still reject.
const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "drizzle" });
await client.end();
console.log("Migrations applied");
