import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { gameSessions, mapPins, maps, nouns } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { isUniqueViolation } from "@/lib/db-errors";
import { err, ok } from "@/lib/result";
import { deleteObject } from "@/lib/storage";
import {
	imageUrlFor,
	performImageRemove,
	performImageUpload,
} from "@/server/image-uploads";
import { visibilityFilter } from "@/server/query-helpers";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export const getMaps = createServerFn()
	.inputValidator(z.object({ campaignId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		const rows = await db.query.maps.findMany({
			where: and(
				eq(maps.campaignId, data.campaignId),
				visibilityFilter(maps.isSecret, accessLevel),
			),
			orderBy: (m, { asc }) => asc(m.name),
		});

		return rows.map((m) => ({ ...m, imageUrl: imageUrlFor(m.imageKey) }));
	});

export const getMap = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), mapId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		const accessLevel = await requireCampaignAccess(data.campaignId, user);

		const map = await db.query.maps.findFirst({
			where: and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			with: {
				pins: {
					with: {
						noun: {
							columns: {
								id: true,
								name: true,
								nounType: true,
								imageKey: true,
								isSecret: true,
								summary: true,
							},
						},
						session: {
							columns: {
								id: true,
								name: true,
								isSecret: true,
								summary: true,
							},
						},
					},
				},
			},
		});

		if (!map) throw notFound();
		if (accessLevel === "READ_ONLY" && map.isSecret) throw notFound();

		const visiblePins = map.pins
			.filter((p) => {
				if (accessLevel !== "READ_ONLY") return true;
				if (p.noun) return !p.noun.isSecret;
				if (p.session) return !p.session.isSecret;
				return false;
			})
			.map((p) => ({
				id: p.id,
				x: p.x,
				y: p.y,
				label: p.label,
				noun: p.noun
					? {
							id: p.noun.id,
							name: p.noun.name,
							nounType: p.noun.nounType,
							imageUrl: imageUrlFor(p.noun.imageKey),
							summary: p.noun.summary,
						}
					: null,
				session: p.session
					? {
							id: p.session.id,
							name: p.session.name,
							summary: p.session.summary,
						}
					: null,
			}));

		return {
			map: {
				id: map.id,
				campaignId: map.campaignId,
				name: map.name,
				isSecret: map.isSecret,
				imageUrl: imageUrlFor(map.imageKey),
			},
			pins: visiblePins,
			accessLevel,
		};
	});

export const createMap = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			name: z.string().min(1).max(200),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.maps.findFirst({
			where: and(
				eq(maps.campaignId, data.campaignId),
				eq(maps.name, data.name),
			),
		});
		if (existing) {
			return err("A map with this name already exists in this campaign.");
		}

		try {
			const [map] = await db
				.insert(maps)
				.values({
					campaignId: data.campaignId,
					name: data.name,
					isSecret: data.isSecret,
				})
				.returning();
			return ok(map);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A map with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const updateMap = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			mapId: z.string(),
			name: z.string().min(1).max(200),
			isSecret: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.maps.findFirst({
			where: and(
				eq(maps.campaignId, data.campaignId),
				eq(maps.name, data.name),
				ne(maps.id, data.mapId),
			),
		});
		if (existing) {
			return err("A map with this name already exists in this campaign.");
		}

		try {
			const [map] = await db
				.update(maps)
				.set({
					name: data.name,
					isSecret: data.isSecret,
					updatedAt: new Date(),
				})
				.where(
					and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
				)
				.returning();
			return ok(map);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return err("A map with this name already exists in this campaign.");
			}
			throw e;
		}
	});

export const deleteMap = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), mapId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.maps.findFirst({
			where: and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			columns: { imageKey: true },
		});

		await db
			.delete(maps)
			.where(
				and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			);

		if (existing?.imageKey) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete map image from storage:", e);
			}
		}

		return { success: true };
	});

export const uploadMapImage = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => {
		if (!(data instanceof FormData)) throw new Error("Expected FormData");
		const campaignId = data.get("campaignId");
		const mapId = data.get("mapId");
		const file = data.get("file");
		if (typeof campaignId !== "string" || !campaignId) {
			throw new Error("Missing campaignId");
		}
		if (typeof mapId !== "string" || !mapId) {
			throw new Error("Missing mapId");
		}
		if (!(file instanceof File)) throw new Error("Missing file");
		return { campaignId, mapId, file };
	})
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const where = and(
			eq(maps.id, data.mapId),
			eq(maps.campaignId, data.campaignId),
		);

		return performImageUpload({
			file: data.file,
			maxBytes: MAX_IMAGE_BYTES,
			keyPrefix: `maps/${data.mapId}`,
			notFoundMessage: "Map not found.",
			loadExistingKey: () =>
				db.query.maps.findFirst({ where, columns: { imageKey: true } }),
			applyKey: async (key) => {
				await db
					.update(maps)
					.set({ imageKey: key, updatedAt: new Date() })
					.where(where);
			},
		});
	});

export const removeMapImage = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), mapId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const where = and(
			eq(maps.id, data.mapId),
			eq(maps.campaignId, data.campaignId),
		);

		return performImageRemove({
			notFoundMessage: "Map not found.",
			loadExistingKey: () =>
				db.query.maps.findFirst({ where, columns: { imageKey: true } }),
			applyKey: async (key) => {
				await db
					.update(maps)
					.set({ imageKey: key, updatedAt: new Date() })
					.where(where);
			},
		});
	});

export const createPin = createServerFn({ method: "POST" })
	.inputValidator(
		z
			.object({
				campaignId: z.string(),
				mapId: z.string(),
				nounId: z.string().optional(),
				sessionId: z.string().optional(),
				x: z.number().min(0).max(1),
				y: z.number().min(0).max(1),
				label: z.string().max(200).optional(),
			})
			.refine((d) => Boolean(d.nounId) !== Boolean(d.sessionId), {
				message: "Pin must reference exactly one of nounId or sessionId.",
			}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const map = await db.query.maps.findFirst({
			where: and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			columns: { id: true },
		});
		if (!map) return err("Map not found.");

		// Reject cross-campaign targets: the FK only proves the row exists somewhere,
		// not that it lives in this campaign. Without this check an admin who knows
		// a foreign noun/session ID could pin it and surface its name/summary/image
		// via the get-map join.
		if (data.nounId) {
			const noun = await db.query.nouns.findFirst({
				where: and(
					eq(nouns.id, data.nounId),
					eq(nouns.campaignId, data.campaignId),
				),
				columns: { id: true },
			});
			if (!noun) return err("Entity not found in this campaign.");
		} else if (data.sessionId) {
			const session = await db.query.gameSessions.findFirst({
				where: and(
					eq(gameSessions.id, data.sessionId),
					eq(gameSessions.campaignId, data.campaignId),
				),
				columns: { id: true },
			});
			if (!session) return err("Session not found in this campaign.");
		}

		const [pin] = await db
			.insert(mapPins)
			.values({
				mapId: data.mapId,
				nounId: data.nounId ?? null,
				sessionId: data.sessionId ?? null,
				x: data.x,
				y: data.y,
				label: data.label ?? null,
			})
			.returning();
		return ok(pin);
	});

export const updatePinLabel = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			campaignId: z.string(),
			pinId: z.string(),
			label: z.string().max(200),
		}),
	)
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const pin = await db.query.mapPins.findFirst({
			where: eq(mapPins.id, data.pinId),
			with: { map: { columns: { campaignId: true } } },
		});
		if (!pin || pin.map.campaignId !== data.campaignId) {
			return err("Pin not found.");
		}

		const trimmed = data.label.trim();
		await db
			.update(mapPins)
			.set({ label: trimmed.length > 0 ? trimmed : null })
			.where(eq(mapPins.id, data.pinId));
		return ok({ success: true });
	});

export const deletePin = createServerFn({ method: "POST" })
	.inputValidator(z.object({ campaignId: z.string(), pinId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const pin = await db.query.mapPins.findFirst({
			where: eq(mapPins.id, data.pinId),
			with: { map: { columns: { campaignId: true } } },
		});
		if (!pin || pin.map.campaignId !== data.campaignId) {
			return err("Pin not found.");
		}

		await db.delete(mapPins).where(eq(mapPins.id, data.pinId));
		return ok({ success: true });
	});
