import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { mapPins, maps } from "@/db/schema/index";
import { requireCampaignAccess, requireSession } from "@/lib/access";
import { isUniqueViolation } from "@/lib/db-errors";
import { err, ok } from "@/lib/result";
import { deleteObject, publicUrlFor, uploadObject } from "@/lib/storage";
import { visibilityFilter } from "@/server/query-helpers";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function extensionFor(contentType: string): string {
	if (contentType === "image/jpeg") return "jpg";
	if (contentType === "image/png") return "png";
	if (contentType === "image/webp") return "webp";
	return "bin";
}

function imageUrlFor(imageKey: string | null): string | null {
	return imageKey ? publicUrlFor(imageKey) : null;
}

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
							},
						},
						session: {
							columns: { id: true, name: true, isSecret: true },
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
						}
					: null,
				session: p.session ? { id: p.session.id, name: p.session.name } : null,
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

export const createMap = createServerFn()
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

export const updateMap = createServerFn()
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

export const deleteMap = createServerFn()
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

		if (!ALLOWED_IMAGE_TYPES.has(data.file.type)) {
			return err("Image must be a JPEG, PNG, or WebP file.");
		}
		if (data.file.size > MAX_IMAGE_BYTES) {
			return err("Image must be 15 MB or smaller.");
		}

		const existing = await db.query.maps.findFirst({
			where: and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			columns: { imageKey: true },
		});
		if (!existing) return err("Map not found.");

		const ext = extensionFor(data.file.type);
		const key = `maps/${data.mapId}/${crypto.randomUUID()}.${ext}`;
		const bytes = new Uint8Array(await data.file.arrayBuffer());

		await uploadObject(key, bytes, data.file.type);

		await db
			.update(maps)
			.set({ imageKey: key, updatedAt: new Date() })
			.where(
				and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			);

		if (existing.imageKey && existing.imageKey !== key) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete prior map image:", e);
			}
		}

		return ok({ imageKey: key, imageUrl: publicUrlFor(key) });
	});

export const removeMapImage = createServerFn()
	.inputValidator(z.object({ campaignId: z.string(), mapId: z.string() }))
	.handler(async ({ data }) => {
		const { user } = await requireSession();
		await requireCampaignAccess(data.campaignId, user, "ADMIN");

		const existing = await db.query.maps.findFirst({
			where: and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			columns: { imageKey: true },
		});
		if (!existing) return err("Map not found.");

		await db
			.update(maps)
			.set({ imageKey: null, updatedAt: new Date() })
			.where(
				and(eq(maps.id, data.mapId), eq(maps.campaignId, data.campaignId)),
			);

		if (existing.imageKey) {
			try {
				await deleteObject(existing.imageKey);
			} catch (e) {
				console.error("Failed to delete map image:", e);
			}
		}

		return ok({ success: true });
	});

export const createPin = createServerFn()
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

export const deletePin = createServerFn()
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
