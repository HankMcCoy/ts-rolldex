import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { db } from "@/db/index";

it("migrates all five legacy types without reusing conflicting tags or groups", async () => {
	await db.transaction(async (tx) => {
		// Temporary tables shadow the real tables. Exercise the actual migration SQL
		// without touching campaign data, even when the local database is migrated.
		await tx.execute(
			sql.raw(`
   CREATE TYPE pg_temp.noun_type AS ENUM ('PERSON','PLACE','THING','FACTION','EVENT');
   CREATE TEMP TABLE campaigns (id text PRIMARY KEY) ON COMMIT DROP;
   CREATE TEMP TABLE nouns (id text PRIMARY KEY, campaign_id text, noun_type pg_temp.noun_type NOT NULL) ON COMMIT DROP;
   CREATE TEMP TABLE tag_groups (id text PRIMARY KEY, campaign_id text, name text) ON COMMIT DROP;
   CREATE TEMP TABLE tags (id text PRIMARY KEY, campaign_id text, name text, group_id text) ON COMMIT DROP;
   CREATE TEMP TABLE entity_tags (id text PRIMARY KEY, tag_id text, noun_id text, session_id text) ON COMMIT DROP;
   CREATE UNIQUE INDEX ON tag_groups (campaign_id, lower(name));
   CREATE UNIQUE INDEX ON tags (campaign_id, lower(name));
   INSERT INTO campaigns VALUES ('one'), ('empty');
   INSERT INTO nouns SELECT lower(t), 'one', t::pg_temp.noun_type FROM unnest(ARRAY['PERSON','PLACE','THING','FACTION','EVENT']) t;
   INSERT INTO tag_groups VALUES ('existing-group','one','Type');
   INSERT INTO tags VALUES ('existing-tag','one','PERSON','existing-group'), ('collision','one','Person (tag 1)',NULL);
   INSERT INTO entity_tags VALUES ('existing-assignment','existing-tag','place',NULL);
  `),
		);
		const migration = readFileSync(
			new URL("../../drizzle/0013_odd_mysterio.sql", import.meta.url),
			"utf8",
		).replace('"public"."noun_type"', 'pg_temp."noun_type"');
		for (const statement of migration.split("--> statement-breakpoint"))
			await tx.execute(sql.raw(statement));
		const assigned = await tx.execute(
			sql.raw(
				`SELECT n.id, t.name FROM nouns n JOIN entity_tags et ON et.noun_id = n.id JOIN tags t ON t.id = et.tag_id JOIN tag_groups g ON g.id = t.group_id WHERE g.is_entity_type ORDER BY n.id`,
			),
		);
		expect(assigned).toEqual([
			{ id: "event", name: "Event" },
			{ id: "faction", name: "Faction" },
			{ id: "person", name: "Person" },
			{ id: "place", name: "Place" },
			{ id: "thing", name: "Thing" },
		]);
		expect(
			await tx.execute(
				sql.raw(`SELECT name FROM tags WHERE id = 'existing-tag'`),
			),
		).toEqual([{ name: "Person (tag 2)" }]);
		expect(
			await tx.execute(
				sql.raw(
					`SELECT tag_id FROM entity_tags WHERE id = 'existing-assignment'`,
				),
			),
		).toEqual([{ tag_id: "existing-tag" }]);
		expect(
			await tx.execute(
				sql.raw(
					`SELECT count(*)::int AS count FROM tags t JOIN tag_groups g ON g.id = t.group_id WHERE g.campaign_id = 'empty' AND g.is_entity_type`,
				),
			),
		).toEqual([{ count: 5 }]);
	});
});
