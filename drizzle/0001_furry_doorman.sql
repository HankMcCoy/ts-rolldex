ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_creator_name_unique" ON "campaigns" USING btree ("created_by_id","name");