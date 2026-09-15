CREATE TABLE "entity_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"relationship_type_id" text NOT NULL,
	"source_noun_id" text,
	"source_session_id" text,
	"target_noun_id" text,
	"target_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entity_relationships_source_exclusive" CHECK (("entity_relationships"."source_noun_id" IS NULL) <> ("entity_relationships"."source_session_id" IS NULL)),
	CONSTRAINT "entity_relationships_target_exclusive" CHECK (("entity_relationships"."target_noun_id" IS NULL) <> ("entity_relationships"."target_session_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "relationship_types" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"forward_label" text NOT NULL,
	"reverse_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_relationship_type_id_relationship_types_id_fk" FOREIGN KEY ("relationship_type_id") REFERENCES "public"."relationship_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_source_noun_id_nouns_id_fk" FOREIGN KEY ("source_noun_id") REFERENCES "public"."nouns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_source_session_id_game_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_target_noun_id_nouns_id_fk" FOREIGN KEY ("target_noun_id") REFERENCES "public"."nouns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_target_session_id_game_sessions_id_fk" FOREIGN KEY ("target_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_types" ADD CONSTRAINT "relationship_types_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_types_campaign_name_unique" ON "relationship_types" USING btree ("campaign_id","name");