import { relations } from "drizzle-orm";
import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const nounTypeEnum = pgEnum("noun_type", [
	"PERSON",
	"PLACE",
	"THING",
	"FACTION",
]);

export const memberTypeEnum = pgEnum("member_type", ["READ_ONLY"]);

export const campaigns = pgTable(
	"campaigns",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		summary: text("summary").notNull().default(""),
		createdById: text("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("campaigns_creator_name_unique").on(t.createdById, t.name),
	],
);

export const nouns = pgTable(
	"nouns",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		nounType: nounTypeEnum("noun_type").notNull(),
		summary: text("summary").notNull().default(""),
		notes: text("notes").notNull().default(""),
		privateNotes: text("private_notes").notNull().default(""),
		isSecret: boolean("is_secret").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [uniqueIndex("nouns_campaign_name_unique").on(t.campaignId, t.name)],
);

export const gameSessions = pgTable(
	"game_sessions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		summary: text("summary").notNull().default(""),
		notes: text("notes").notNull().default(""),
		privateNotes: text("private_notes").notNull().default(""),
		isSecret: boolean("is_secret").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("game_sessions_campaign_name_unique").on(t.campaignId, t.name),
	],
);

export const members = pgTable(
	"members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		userId: text("user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		memberType: memberTypeEnum("member_type").notNull().default("READ_ONLY"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("members_campaign_email_unique").on(t.campaignId, t.email),
	],
);

// Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [campaigns.createdById],
		references: [users.id],
	}),
	nouns: many(nouns),
	gameSessions: many(gameSessions),
	members: many(members),
}));

export const nounsRelations = relations(nouns, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [nouns.campaignId],
		references: [campaigns.id],
	}),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [gameSessions.campaignId],
		references: [campaigns.id],
	}),
}));

export const membersRelations = relations(members, ({ one }) => ({
	campaign: one(campaigns, {
		fields: [members.campaignId],
		references: [campaigns.id],
	}),
	user: one(users, {
		fields: [members.userId],
		references: [users.id],
	}),
}));
