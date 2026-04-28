import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	doublePrecision,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { type Calendar, EARTH_GREGORIAN_CALENDAR } from "@/lib/calendar";
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
		calendar: jsonb("calendar")
			.$type<Calendar>()
			.notNull()
			.default(EARTH_GREGORIAN_CALENDAR),
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
		dateYear: integer("date_year"),
		dateMonth: integer("date_month"),
		dateDay: integer("date_day"),
		endDateYear: integer("end_date_year"),
		endDateMonth: integer("end_date_month"),
		endDateDay: integer("end_date_day"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("nouns_campaign_name_unique").on(t.campaignId, t.name),
		check(
			"nouns_date_all_or_none",
			sql`(${t.dateYear} IS NULL) = (${t.dateMonth} IS NULL) AND (${t.dateYear} IS NULL) = (${t.dateDay} IS NULL)`,
		),
		check(
			"nouns_end_date_all_or_none",
			sql`(${t.endDateYear} IS NULL) = (${t.endDateMonth} IS NULL) AND (${t.endDateYear} IS NULL) = (${t.endDateDay} IS NULL)`,
		),
		check(
			"nouns_end_date_requires_start",
			sql`${t.endDateYear} IS NULL OR ${t.dateYear} IS NOT NULL`,
		),
	],
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
		dateYear: integer("date_year"),
		dateMonth: integer("date_month"),
		dateDay: integer("date_day"),
		endDateYear: integer("end_date_year"),
		endDateMonth: integer("end_date_month"),
		endDateDay: integer("end_date_day"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("game_sessions_campaign_name_unique").on(t.campaignId, t.name),
		check(
			"game_sessions_date_all_or_none",
			sql`(${t.dateYear} IS NULL) = (${t.dateMonth} IS NULL) AND (${t.dateYear} IS NULL) = (${t.dateDay} IS NULL)`,
		),
		check(
			"game_sessions_end_date_all_or_none",
			sql`(${t.endDateYear} IS NULL) = (${t.endDateMonth} IS NULL) AND (${t.endDateYear} IS NULL) = (${t.endDateDay} IS NULL)`,
		),
		check(
			"game_sessions_end_date_requires_start",
			sql`${t.endDateYear} IS NULL OR ${t.dateYear} IS NOT NULL`,
		),
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

export const campaignTemplates = pgTable(
	"campaign_templates",
	{
		id: idColumn(),
		campaignId: text("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		body: text("body").notNull().default(""),
		// When true the body is wrapped in a `:::stat-block ... :::` callout at
		// insert time so the rendered note picks up the stat-block card styling.
		wrapInStatBlock: boolean("wrap_in_stat_block").notNull().default(false),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("campaign_templates_campaign_name_unique").on(
			t.campaignId,
			t.name,
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
	templates: many(campaignTemplates),
}));

export const campaignTemplatesRelations = relations(
	campaignTemplates,
	({ one }) => ({
		campaign: one(campaigns, {
			fields: [campaignTemplates.campaignId],
			references: [campaigns.id],
		}),
	}),
);

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
