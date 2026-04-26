ALTER TYPE "public"."noun_type" ADD VALUE 'EVENT';--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "date_label" text;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "date_sort" text;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "date_label" text;--> statement-breakpoint
ALTER TABLE "nouns" ADD COLUMN "date_sort" text;