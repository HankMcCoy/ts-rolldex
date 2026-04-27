ALTER TABLE "campaigns" ADD COLUMN "calendar" jsonb DEFAULT '{"months":[{"name":"January","days":31},{"name":"February","days":28},{"name":"March","days":31},{"name":"April","days":30},{"name":"May","days":31},{"name":"June","days":30},{"name":"July","days":31},{"name":"August","days":31},{"name":"September","days":30},{"name":"October","days":31},{"name":"November","days":30},{"name":"December","days":31}]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "nouns" DROP COLUMN "date_label";--> statement-breakpoint
ALTER TABLE "nouns" DROP COLUMN "date_sort";--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "date_year" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "date_month" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "date_day" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD CONSTRAINT "nouns_date_all_or_none" CHECK (("nouns"."date_year" IS NULL) = ("nouns"."date_month" IS NULL) AND ("nouns"."date_year" IS NULL) = ("nouns"."date_day" IS NULL));--> statement-breakpoint
ALTER TABLE "game_sessions" DROP COLUMN "date_label";--> statement-breakpoint
ALTER TABLE "game_sessions" DROP COLUMN "date_sort";--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "date_year" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "date_month" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "date_day" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_date_all_or_none" CHECK (("game_sessions"."date_year" IS NULL) = ("game_sessions"."date_month" IS NULL) AND ("game_sessions"."date_year" IS NULL) = ("game_sessions"."date_day" IS NULL));
