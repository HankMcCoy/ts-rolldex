import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import {
	campaigns,
	campaignTemplates,
	entityTags,
	gameSessions,
	mapPins,
	maps,
	members,
	nouns,
	tags,
	users,
} from "@/db/schema/index";
import {
	requireCampaign,
	requireCampaignAccess,
	requireSession,
} from "@/lib/access";
import { EARTH_GREGORIAN_CALENDAR } from "@/lib/calendar";
import { publicUrlFor } from "@/lib/storage";
import { visibilityFilter } from "@/server/query-helpers";
import { STARTER_TEMPLATES } from "@/server/template-seeds";
import { withUniqueName } from "@/server/unique-name";

const CAMPAIGN_NAME_CONFLICT = "You already have a campaign with this name.";

export const getCampaigns = createServerFn().handler(async () => {
	const { user } = await requireSession();

	// All campaigns the user created or is a member of.
	// Email fallback (userId IS NULL) handles invite-before-account rows only —
	// once linked, the userId match is authoritative.
	const memberCampaignIds = await db.query.members.findMany({
		where: or(
			eq(members.userId, user.id),
			and(eq(members.email, user.email.toLowerCase()), isNull(members.userId)),
		),
		columns: { campaignId: true },
	});

	const memberIds = memberCampaignIds.map((m) => m.campaignId);

	return db.query.campaigns.findMany({
		where: (c, { or, eq, inArray }) =>
			or(
				eq(c.createdById, user.id),
				memberIds.length > 0 ? inArray(c.id, memberIds) : undefined,
			),
		with: {
			nouns: { columns: { id: true } },
			gameSessions: { columns: { id: true } },
		},
		orderBy: (c, { desc }) => desc(c.createdAt),
	});
});

/**
 * Single source of truth for the campaign route tree. Returns everything a
 * client needs to render any view inside `/campaigns/$campaignId/*` from one
 * round-trip: the campaign row, all visible entities, sessions, maps, pins,
 * members, and (for ADMINs) templates. Visibility filtering — `isSecret`
 * hiding, `privateNotes` stripping, member-email redaction, template hiding —
 * happens server-side, so the client never sees data it shouldn't.
 *
 * Children consume slices via the selector hooks in `src/lib/queries.ts`.
 */
export const getCampaignBundle = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const { campaign, accessLevel } = await requireCampaign(
			data.campaignId,
			user,
		);

		// Creator lookup is its own await rather than a slot in Promise.all — its
		// only consumer is the synthetic DM entry in members[], so it doesn't
		// belong with the bundle's user-facing collection queries.
		const creator = await db.query.users.findFirst({
			where: eq(users.id, campaign.createdById),
			columns: { id: true, name: true, email: true },
		});

		const [
			allNouns,
			allSessions,
			allMaps,
			allPins,
			allMembers,
			allTemplates,
			allTags,
			allEntityTags,
		] = await Promise.all([
			db.query.nouns.findMany({
				where: and(
					eq(nouns.campaignId, data.campaignId),
					visibilityFilter(nouns.isSecret, accessLevel),
				),
				orderBy: (n, { asc }) => asc(n.name),
			}),
			db.query.gameSessions.findMany({
				where: and(
					eq(gameSessions.campaignId, data.campaignId),
					visibilityFilter(gameSessions.isSecret, accessLevel),
				),
				orderBy: (s, { desc }) => desc(s.createdAt),
			}),
			db.query.maps.findMany({
				where: and(
					eq(maps.campaignId, data.campaignId),
					visibilityFilter(maps.isSecret, accessLevel),
				),
				orderBy: (m, { asc }) => asc(m.name),
			}),
			db
				.select({
					id: mapPins.id,
					mapId: mapPins.mapId,
					nounId: mapPins.nounId,
					sessionId: mapPins.sessionId,
					x: mapPins.x,
					y: mapPins.y,
					label: mapPins.label,
				})
				.from(mapPins)
				.innerJoin(maps, eq(mapPins.mapId, maps.id))
				.where(eq(maps.campaignId, data.campaignId)),
			db.query.members.findMany({
				where: eq(members.campaignId, data.campaignId),
				with: { user: { columns: { id: true, name: true, email: true } } },
			}),
			accessLevel === "ADMIN"
				? db.query.campaignTemplates.findMany({
						where: eq(campaignTemplates.campaignId, data.campaignId),
						orderBy: (t, { asc }) => asc(t.name),
					})
				: Promise.resolve([] as (typeof campaignTemplates.$inferSelect)[]),
			db.query.tags.findMany({
				where: eq(tags.campaignId, data.campaignId),
				columns: { id: true, name: true },
				orderBy: (t, { asc }) => asc(t.name),
			}),
			db
				.select({
					tagId: entityTags.tagId,
					nounId: entityTags.nounId,
					sessionId: entityTags.sessionId,
				})
				.from(entityTags)
				.innerJoin(tags, eq(entityTags.tagId, tags.id))
				.where(eq(tags.campaignId, data.campaignId)),
		]);

		// Drop pins on hidden maps and pins targeting hidden entities.
		const visibleMapIds = new Set(allMaps.map((m) => m.id));
		const visibleNounIds = new Set(allNouns.map((n) => n.id));
		const visibleSessionIds = new Set(allSessions.map((s) => s.id));
		const visiblePins = allPins.filter((p) => {
			if (!visibleMapIds.has(p.mapId)) return false;
			if (p.nounId) return visibleNounIds.has(p.nounId);
			if (p.sessionId) return visibleSessionIds.has(p.sessionId);
			return false;
		});

		const isReadOnly = accessLevel === "READ_ONLY";
		// Tags ride on their entity rather than in a flat join list: a tag has no
		// payload of its own, so `tagIds` on each row is all the client needs and
		// keeps the optimistic patchers simple. Assignments to hidden entities are
		// dropped, and for READ_ONLY the tag list itself is narrowed to tags that
		// survive that filter — otherwise a tag applied only to secret entities
		// would leak its name through the picker and the filter chips.
		const tagOrder = new Map(allTags.map((t, i) => [t.id, i]));
		const tagIdsFor = (
			key: "nounId" | "sessionId",
			id: string,
			visible: Set<string>,
		) =>
			allEntityTags
				.filter((et) => et[key] === id && visible.has(et.tagId))
				.map((et) => et.tagId)
				.sort((a, b) => (tagOrder.get(a) ?? 0) - (tagOrder.get(b) ?? 0));

		const usedTagIds = new Set(
			allEntityTags
				.filter(
					(et) =>
						(et.nounId && visibleNounIds.has(et.nounId)) ||
						(et.sessionId && visibleSessionIds.has(et.sessionId)),
				)
				.map((et) => et.tagId),
		);
		const visibleTags = isReadOnly
			? allTags.filter((t) => usedTagIds.has(t.id))
			: allTags;
		const visibleTagIds = new Set(visibleTags.map((t) => t.id));

		// Single normalized shape so the client doesn't have to branch on access
		// level when rendering members. READ_ONLY just gets email=null and pending
		// invites filtered out below.
		type BundleMemberEntry = {
			id: string;
			role: "DM" | "READ_ONLY";
			email: string | null;
			user: { name: string } | null;
		};

		const dmEntry: BundleMemberEntry = {
			id: `dm-${campaign.createdById}`,
			role: "DM",
			email: !isReadOnly ? (creator?.email ?? null) : null,
			user: creator ? { name: creator.name } : null,
		};

		const memberEntries: BundleMemberEntry[] = isReadOnly
			? allMembers
					.filter((m) => m.user)
					.map((m) => ({
						id: m.id,
						role: "READ_ONLY",
						email: null,
						user: { name: m.user?.name ?? "" },
					}))
			: allMembers.map((m) => ({
					id: m.id,
					role: "READ_ONLY",
					email: m.email,
					user: m.user ? { name: m.user.name } : null,
				}));

		const memberList: BundleMemberEntry[] = [dmEntry, ...memberEntries];

		return {
			campaign,
			accessLevel,
			nouns: allNouns.map((n) => ({
				...n,
				imageUrl: n.imageKey ? publicUrlFor(n.imageKey) : null,
				privateNotes: isReadOnly ? "" : n.privateNotes,
				tagIds: tagIdsFor("nounId", n.id, visibleTagIds),
			})),
			sessions: allSessions.map((s) => ({
				...s,
				privateNotes: isReadOnly ? "" : s.privateNotes,
				tagIds: tagIdsFor("sessionId", s.id, visibleTagIds),
			})),
			maps: allMaps.map((m) => ({
				id: m.id,
				campaignId: m.campaignId,
				name: m.name,
				isSecret: m.isSecret,
				imageUrl: m.imageKey ? publicUrlFor(m.imageKey) : null,
			})),
			mapPins: visiblePins,
			tags: visibleTags,
			members: memberList,
			templates: allTemplates,
		};
	});

export const createCampaign = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1).max(100),
			summary: z.string().max(5_000),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();

		return withUniqueName(
			CAMPAIGN_NAME_CONFLICT,
			() =>
				db.query.campaigns.findFirst({
					where: and(
						eq(campaigns.name, data.name),
						eq(campaigns.createdById, user.id),
					),
					columns: { id: true },
				}),
			async () => {
				const [campaign] = await db
					.insert(campaigns)
					.values({
						name: data.name,
						summary: data.summary,
						calendar: EARTH_GREGORIAN_CALENDAR,
						createdById: user.id,
					})
					.returning();

				if (STARTER_TEMPLATES.length > 0) {
					await db.insert(campaignTemplates).values(
						STARTER_TEMPLATES.map((t) => ({
							campaignId: campaign.id,
							name: t.name,
							body: t.body,
							wrapInStatBlock: t.wrapInStatBlock,
						})),
					);
				}

				return campaign;
			},
		);
	});

export const updateCampaign = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(100),
			summary: z.string().max(5_000),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		return withUniqueName(
			CAMPAIGN_NAME_CONFLICT,
			() =>
				db.query.campaigns.findFirst({
					where: and(
						eq(campaigns.name, data.name),
						eq(campaigns.createdById, user.id),
						ne(campaigns.id, data.campaignId),
					),
					columns: { id: true },
				}),
			async () => {
				const [campaign] = await db
					.update(campaigns)
					.set({
						name: data.name,
						summary: data.summary,
						updatedAt: new Date(),
					})
					.where(eq(campaigns.id, data.campaignId))
					.returning();
				return campaign;
			},
		);
	});

export const deleteCampaign = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");
		await db.delete(campaigns).where(eq(campaigns.id, data.campaignId));
		return { success: true };
	});
