ALTER TABLE "relationship_types" RENAME TO "relationship_categories";--> statement-breakpoint
ALTER TABLE "entity_relationships" RENAME COLUMN "relationship_type_id" TO "relationship_category_id";--> statement-breakpoint
ALTER TABLE "entity_relationships" DROP CONSTRAINT "entity_relationships_relationship_type_id_relationship_types_id_fk";
--> statement-breakpoint
ALTER TABLE "relationship_categories" DROP CONSTRAINT "relationship_types_campaign_id_campaigns_id_fk";
--> statement-breakpoint
DROP INDEX "relationship_types_campaign_name_unique";--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD COLUMN "forward_label" text;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD COLUMN "reverse_label" text;--> statement-breakpoint
UPDATE "entity_relationships"
SET
	"forward_label" = "relationship_categories"."forward_label",
	"reverse_label" = "relationship_categories"."reverse_label"
FROM "relationship_categories"
WHERE "entity_relationships"."relationship_category_id" = "relationship_categories"."id";--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_relationship_category_id_relationship_categories_id_fk" FOREIGN KEY ("relationship_category_id") REFERENCES "public"."relationship_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_categories" ADD CONSTRAINT "relationship_categories_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_categories_campaign_name_unique" ON "relationship_categories" USING btree ("campaign_id","name");--> statement-breakpoint
ALTER TABLE "relationship_categories" DROP COLUMN "forward_label";--> statement-breakpoint
ALTER TABLE "relationship_categories" DROP COLUMN "reverse_label";
