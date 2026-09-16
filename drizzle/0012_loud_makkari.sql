CREATE TABLE "tag_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "tag_groups" ADD CONSTRAINT "tag_groups_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tag_groups_campaign_name_unique" ON "tag_groups" USING btree ("campaign_id",lower("name"));--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_group_id_tag_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tag_groups"("id") ON DELETE set null ON UPDATE no action;