ALTER TABLE "tag_groups" ADD COLUMN "is_entity_type" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_groups_entity_type_unique" ON "tag_groups" USING btree ("campaign_id") WHERE "tag_groups"."is_entity_type";--> statement-breakpoint
-- Preserve existing groups/tags if their names collide with the seeded vocabulary.
-- Never reuse a free-form tag as a type: it may already label a different type.
DO $$
DECLARE
 c record;
 label text;
 group_id text;
 tag_id text;
 candidate text;
 suffix integer;
BEGIN
 FOR c IN SELECT id FROM campaigns LOOP
  candidate := 'Type'; suffix := 1;
  WHILE EXISTS (SELECT 1 FROM tag_groups WHERE campaign_id = c.id AND lower(name) = lower(candidate)) LOOP
   candidate := 'Entity type ' || suffix; suffix := suffix + 1;
  END LOOP;
  group_id := gen_random_uuid()::text;
  INSERT INTO tag_groups (id, campaign_id, name, is_entity_type) VALUES (group_id, c.id, candidate, true);
  FOREACH label IN ARRAY ARRAY['Person', 'Place', 'Thing', 'Faction', 'Event'] LOOP
   IF EXISTS (SELECT 1 FROM tags WHERE campaign_id = c.id AND lower(name) = lower(label)) THEN
    suffix := 1; candidate := label || ' (tag ' || suffix || ')';
    WHILE EXISTS (SELECT 1 FROM tags WHERE campaign_id = c.id AND lower(name) = lower(candidate)) LOOP
     suffix := suffix + 1; candidate := label || ' (tag ' || suffix || ')';
    END LOOP;
    UPDATE tags SET name = candidate WHERE campaign_id = c.id AND lower(name) = lower(label);
   END IF;
   tag_id := gen_random_uuid()::text;
   INSERT INTO tags (id, campaign_id, name, group_id) VALUES (tag_id, c.id, label, group_id);
   INSERT INTO entity_tags (id, tag_id, noun_id)
    SELECT gen_random_uuid()::text, tag_id, id FROM nouns WHERE campaign_id = c.id AND noun_type::text = upper(label);
  END LOOP;
 END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "nouns" DROP COLUMN "noun_type";--> statement-breakpoint
DROP TYPE "public"."noun_type";