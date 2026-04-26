CREATE TABLE "map_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"map_id" text NOT NULL,
	"noun_id" text,
	"session_id" text,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "map_pins_target_exclusive" CHECK (("map_pins"."noun_id" IS NULL) <> ("map_pins"."session_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"image_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_noun_id_nouns_id_fk" FOREIGN KEY ("noun_id") REFERENCES "public"."nouns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_pins" ADD CONSTRAINT "map_pins_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maps_campaign_name_unique" ON "maps" USING btree ("campaign_id","name");