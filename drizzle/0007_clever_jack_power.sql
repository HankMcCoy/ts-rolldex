ALTER TABLE "game_sessions" ADD COLUMN "end_date_year" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "end_date_month" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "end_date_day" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "end_date_year" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "end_date_month" integer;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "end_date_day" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_end_date_all_or_none" CHECK (("game_sessions"."end_date_year" IS NULL) = ("game_sessions"."end_date_month" IS NULL) AND ("game_sessions"."end_date_year" IS NULL) = ("game_sessions"."end_date_day" IS NULL));--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_end_date_requires_start" CHECK ("game_sessions"."end_date_year" IS NULL OR "game_sessions"."date_year" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "nouns" ADD CONSTRAINT "nouns_end_date_all_or_none" CHECK (("nouns"."end_date_year" IS NULL) = ("nouns"."end_date_month" IS NULL) AND ("nouns"."end_date_year" IS NULL) = ("nouns"."end_date_day" IS NULL));--> statement-breakpoint
ALTER TABLE "nouns" ADD CONSTRAINT "nouns_end_date_requires_start" CHECK ("nouns"."end_date_year" IS NULL OR "nouns"."date_year" IS NOT NULL);