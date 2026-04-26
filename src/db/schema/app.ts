import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	doublePrecision,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { idColumn } from "./columns";

export const nounTypeEnum = pgEnum("noun_type", [
	"PERSON",
	"PLACE",
	"THING",
	"FACTION",
	"EVENT",
]);

export const memberTypeEnum = pgEnum("member_type", ["READ_ONLY"]);

export const campaigns = pgTable(
	"campaigns",
	{
		id: idColumn(),
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
		id: idColumn(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		nounType: nounTypeEnum("noun_type").notNull(),
		summary: text("summary").notNull().default(""),
		notes: text("notes").notNull().default(""),
		privateNotes: text("private_notes").notNull().default(""),
		isSecret: boolean("is_secret").notNull().default(false),
		imageKey: text("image_key"),
		dateLabel: text("date_label"),
		dateSort: text("date_sort"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [uniqueIndex("nouns_campaign_name_unique").on(t.campaignId, t.name)],
);

export const gameSessions = pgTable(
	"game_sessions",
	{
		id: idColumn(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		summary: text("summary").notNull().default(""),
		notes: text("notes").notNull().default(""),
		privateNotes: text("private_notes").notNull().default(""),
		isSecret: boolean("is_secret").notNull().default(false),
		dateLabel: text("date_label"),
		dateSort: text("date_sort"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("game_sessions_campaign_name_unique").on(t.campaignId, t.name),
	],
);

export const maps = pgTable(
	"maps",
	{
		id: idColumn(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		isSecret: boolean("is_secret").notNull().default(false),
		imageKey: text("image_key"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [uniqueIndex("maps_campaign_name_unique").on(t.campaignId, t.name)],
);

export const mapPins = pgTable(
	"map_pins",
	{
		id: idColumn(),
		mapId: text("map_id")
			.notNull()
			.references(() => maps.id, { onDelete: "cascade" }),
		nounId: text("noun_id").references(() => nouns.id, {
			onDelete: "cascade",
		}),
		sessionId: text("session_id").references(() => gameSessions.id, {
			onDelete: "cascade",
		}),
		x: doublePrecision("x").notNull(),
		y: doublePrecision("y").notNull(),
		label: text("label"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(t) => [
		check(
			"map_pins_target_exclusive",
			sql`(${t.nounId} IS NULL) <> (${t.sessionId} IS NULL)`,
		),
	],
);

export const members = pgTable(
	"members",
	{
		id: idColumn(),
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
	maps: many(maps),
}));

export const mapsRelations = relations(maps, ({ one, many }) => ({
	campaign: one(campaigns, {
		fields: [maps.campaignId],
		references: [campaigns.id],
	}),
	pins: many(mapPins),
}));

export const mapPinsRelations = relations(mapPins, ({ one }) => ({
	map: one(maps, { fields: [mapPins.mapId], references: [maps.id] }),
	noun: one(nouns, { fields: [mapPins.nounId], references: [nouns.id] }),
	session: one(gameSessions, {
		fields: [mapPins.sessionId],
		references: [gameSessions.id],
	}),
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
