CREATE TABLE "entity_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"tag_id" text NOT NULL,
	"noun_id" text,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_tags_target_exclusive" CHECK (("entity_tags"."noun_id" IS NULL) <> ("entity_tags"."session_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_noun_id_nouns_id_fk" FOREIGN KEY ("noun_id") REFERENCES "public"."nouns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entity_tags_tag_noun_unique" ON "entity_tags" USING btree ("tag_id","noun_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_tags_tag_session_unique" ON "entity_tags" USING btree ("tag_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_campaign_name_unique" ON "tags" USING btree ("campaign_id",lower("name"));