import {
	type QueryClient,
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import type { NounType } from "@/lib/noun-types";
import {
	type CandidateEntity,
	computeRelatedEntities,
} from "@/lib/relationships";
import { buildTimeline, type TimelineEntry } from "@/lib/timeline";
import { getCampaignBundle } from "@/server/campaigns";

// Inferring the bundle type from the server fn keeps client and server in sync
// without an explicit shared interface.
export type CampaignBundle =
	Awaited<ReturnType<typeof getCampaignBundle>> extends infer T ? T : never;

export type BundleNoun = CampaignBundle["nouns"][number];
export type BundleSession = CampaignBundle["sessions"][number];
export type BundleMap = CampaignBundle["maps"][number];
export type BundleMapPin = CampaignBundle["mapPins"][number];
export type BundleMember = CampaignBundle["members"][number];
export type BundleTemplate = CampaignBundle["templates"][number];

export const bundleKey = (campaignId: string) =>
	["campaign-bundle", campaignId] as const;

export const campaignBundleQuery = (campaignId: string) =>
	queryOptions({
		queryKey: bundleKey(campaignId),
		queryFn: () => getCampaignBundle({ data: { campaignId } }),
	});

/**
 * Loader helper used by the four `$entityId.tsx` parent routes: ensures the
 * campaign bundle is in cache, then returns the row matching `id`. Throws
 * `notFound()` if the row is missing or filtered out by access level. Each
 * route still owns its own `head`, `component`, and `loaderData` shape.
 */
export async function ensureBundleRow<
	K extends "nouns" | "sessions" | "maps" | "templates",
>(
	queryClient: QueryClient,
	campaignId: string,
	collection: K,
	id: string,
): Promise<CampaignBundle[K][number]> {
	const bundle = await queryClient.ensureQueryData(
		campaignBundleQuery(campaignId),
	);
	const row = bundle[collection].find((r) => r.id === id);
	if (!row) throw notFound();
	return row;
}

/**
 * Most selectors below assume the loader has run and the bundle is in cache.
 * Loaders call `ensureQueryData(campaignBundleQuery(...))` before the route
 * renders, so `useQuery(...).data` is guaranteed populated by the time any
 * component runs. The runtime check makes the invariant explicit and surfaces
 * a useful error if it's ever violated (e.g. by mounting one of these hooks
 * outside the campaign route subtree).
 */
function useBundle(campaignId: string): CampaignBundle {
	const { data } = useQuery(campaignBundleQuery(campaignId));
	if (data === undefined) {
		throw new Error(
			`Campaign bundle for ${campaignId} missing from cache — was the route loader skipped?`,
		);
	}
	return data;
}

export function useCampaign(campaignId: string) {
	const b = useBundle(campaignId);
	return {
		campaign: b.campaign,
		accessLevel: b.accessLevel,
		templates: b.templates,
	};
}

export function useAccessLevel(campaignId: string) {
	return useBundle(campaignId).accessLevel;
}

export function useNouns(campaignId: string, type?: NounType) {
	const b = useBundle(campaignId);
	return type ? b.nouns.filter((n) => n.nounType === type) : b.nouns;
}

export function useSessions(campaignId: string) {
	return useBundle(campaignId).sessions;
}

export function useMaps(campaignId: string) {
	return useBundle(campaignId).maps;
}

export function useTemplates(campaignId: string) {
	return useBundle(campaignId).templates;
}

export function useTemplate(campaignId: string, templateId: string) {
	const b = useBundle(campaignId);
	const t = b.templates.find((t) => t.id === templateId);
	if (!t) throw notFound();
	return t;
}

export function useTimeline(campaignId: string, limit?: number) {
	const b = useBundle(campaignId);
	return buildTimeline(b.nouns, b.sessions, b.campaign.calendar, limit);
}

/**
 * `nouns + sessions` shaped into the relationship algorithm's CandidateEntity
 * format, with notes (and privateNotes for ADMINs) joined into a searchable
 * text field. Memoization isn't worth it — the list is tiny.
 */
function buildCandidates(b: CampaignBundle): CandidateEntity[] {
	const includePrivate = b.accessLevel !== "READ_ONLY";
	return [
		...b.nouns.map((n) => ({
			id: n.id,
			name: n.name,
			entityType: n.nounType as CandidateEntity["entityType"],
			imageUrl: n.imageUrl,
			summary: n.summary,
			text: includePrivate
				? `${n.summary} ${n.notes} ${n.privateNotes}`
				: `${n.summary} ${n.notes}`,
		})),
		...b.sessions.map((s) => ({
			id: s.id,
			name: s.name,
			entityType: "SESSION" as const,
			imageUrl: null,
			summary: s.summary,
			text: includePrivate
				? `${s.summary} ${s.notes} ${s.privateNotes}`
				: `${s.summary} ${s.notes}`,
		})),
	];
}

export interface MapPinLocation {
	map: { id: string; name: string; imageUrl: string | null };
	pins: { id: string; x: number; y: number; label: string | null }[];
}

function pinsForTarget(
	b: CampaignBundle,
	predicate: (pin: BundleMapPin) => boolean,
): MapPinLocation[] {
	const grouped = new Map<string, MapPinLocation>();
	for (const pin of b.mapPins) {
		if (!predicate(pin)) continue;
		const map = b.maps.find((m) => m.id === pin.mapId);
		if (!map) continue;
		const entry = grouped.get(map.id);
		const pinShape = { id: pin.id, x: pin.x, y: pin.y, label: pin.label };
		if (entry) {
			entry.pins.push(pinShape);
		} else {
			grouped.set(map.id, {
				map: { id: map.id, name: map.name, imageUrl: map.imageUrl },
				pins: [pinShape],
			});
		}
	}
	return Array.from(grouped.values()).sort((a, b) =>
		a.map.name.localeCompare(b.map.name),
	);
}

export function useNoun(campaignId: string, nounId: string) {
	const b = useBundle(campaignId);
	const noun = b.nouns.find((n) => n.id === nounId);
	if (!noun) throw notFound();
	const related = computeRelatedEntities(
		noun.id,
		noun.name,
		{
			summary: noun.summary,
			notes: noun.notes,
			privateNotes: noun.privateNotes,
		},
		buildCandidates(b),
	);
	const mapPinLocations = pinsForTarget(b, (p) => p.nounId === noun.id);
	return { noun, accessLevel: b.accessLevel, related, mapPinLocations };
}

export function useSession(campaignId: string, sessionId: string) {
	const b = useBundle(campaignId);
	const session = b.sessions.find((s) => s.id === sessionId);
	if (!session) throw notFound();
	const related = computeRelatedEntities(
		session.id,
		session.name,
		{
			summary: session.summary,
			notes: session.notes,
			privateNotes: session.privateNotes,
		},
		buildCandidates(b),
	);
	const mapPinLocations = pinsForTarget(b, (p) => p.sessionId === session.id);
	return { session, accessLevel: b.accessLevel, related, mapPinLocations };
}

/**
 * Map detail with pins joined to their target entities — matches the shape the
 * old `getMap` server fn returned (including the noun + session candidates the
 * pin-creation UI needs).
 */
export function useMapWithPins(campaignId: string, mapId: string) {
	const b = useBundle(campaignId);
	const map = b.maps.find((m) => m.id === mapId);
	if (!map) throw notFound();

	const pins = b.mapPins
		.filter((p) => p.mapId === mapId)
		.map((p) => {
			const noun = p.nounId ? b.nouns.find((n) => n.id === p.nounId) : null;
			const session = p.sessionId
				? b.sessions.find((s) => s.id === p.sessionId)
				: null;
			return {
				id: p.id,
				x: p.x,
				y: p.y,
				label: p.label,
				noun: noun
					? {
							id: noun.id,
							name: noun.name,
							nounType: noun.nounType,
							imageUrl: noun.imageUrl,
							summary: noun.summary,
						}
					: null,
				session: session
					? {
							id: session.id,
							name: session.name,
							summary: session.summary,
						}
					: null,
			};
		});

	return {
		map,
		pins,
		accessLevel: b.accessLevel,
		nouns: b.nouns,
		sessions: b.sessions,
	};
}

/**
 * Dashboard-shaped slice. Matches the legacy `getCampaignDashboard` return so
 * the dashboard component doesn't need to change.
 */
export function useCampaignDashboard(campaignId: string) {
	const b = useBundle(campaignId);
	return {
		campaign: b.campaign,
		accessLevel: b.accessLevel,
		entities: b.nouns.map((n) => ({
			id: n.id,
			name: n.name,
			nounType: n.nounType,
			summary: n.summary,
			isSecret: n.isSecret,
			imageUrl: n.imageUrl,
		})),
		recentSessions: b.sessions.slice(0, 5).map((s) => ({
			id: s.id,
			name: s.name,
			summary: s.summary,
			createdAt: s.createdAt,
		})),
		members: b.members,
		maps: b.maps.map((m) => ({
			id: m.id,
			name: m.name,
			isSecret: m.isSecret,
			imageUrl: m.imageUrl,
		})),
		timelinePreview: buildTimeline(b.nouns, b.sessions, b.campaign.calendar, 5),
	};
}

export function useSettingsSummary(campaignId: string) {
	const b = useBundle(campaignId);
	// Settings hub counts members excluding the synthetic DM entry.
	return {
		accessLevel: b.accessLevel,
		memberCount: b.members.filter((m) => m.role !== "DM").length,
		templateCount: b.templates.length,
	};
}

// Re-export TimelineEntry for downstream consumers (timeline route, dashboard).
export type { TimelineEntry };

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Some server fns return `{ ok: false, error }` for expected business errors
 * (unique-name collisions, invalid pin targets) instead of throwing. Detect
 * those so `useBundleMutation` can route them through the same rollback path
 * as a thrown error.
 */
function isFailedResult(r: unknown): r is { ok: false; error: string } {
	return (
		typeof r === "object" &&
		r !== null &&
		"ok" in r &&
		(r as { ok: unknown }).ok === false
	);
}

/**
 * Thrown by `useBundleMutation` when a server fn returns `{ ok: false }`. The
 * caller should `try { await mut.mutateAsync(...) } catch (e) { ... }` and
 * read `e.message` (or check `e instanceof BundleMutationError`) to surface
 * the message in the UI. The optimistic patch has already been rolled back
 * by the time this is thrown.
 */
export class BundleMutationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BundleMutationError";
	}
}

type BundlePatcher<TVars> = (
	bundle: CampaignBundle,
	vars: TVars,
) => CampaignBundle;

/**
 * Wraps a server-fn mutation with the bundle's optimistic-update lifecycle:
 *
 *   1. `onMutate` snapshots the current bundle and applies `patch` so the UI
 *      reflects the change before the request goes out.
 *   2. If the server fn rejects (network error or thrown), `onError` restores
 *      the snapshot.
 *   3. If the server fn returns `{ ok: false }`, the mutationFn wrapper throws
 *      a `BundleMutationError` so the same rollback path runs and the caller's
 *      try/catch can surface the message.
 *   4. `onSettled` invalidates the bundle so a background refetch reconciles
 *      the optimistic patch with the server's canonical row (server-generated
 *      `updatedAt`, etc.).
 *
 * `patch` is optional — omit it to get a non-optimistic mutation that still
 * benefits from automatic invalidation.
 */
export function useBundleMutation<TVars, TResult>(opts: {
	campaignId: string;
	mutationFn: (vars: TVars) => Promise<TResult>;
	patch?: BundlePatcher<TVars>;
}) {
	const qc = useQueryClient();
	type Ctx = { previous: CampaignBundle | undefined };
	return useMutation<TResult, Error, TVars, Ctx>({
		mutationFn: async (vars) => {
			const result = await opts.mutationFn(vars);
			if (isFailedResult(result)) {
				throw new BundleMutationError(result.error);
			}
			return result;
		},
		onMutate: async (vars) => {
			if (!opts.patch) return { previous: undefined };
			const key = bundleKey(opts.campaignId);
			await qc.cancelQueries({ queryKey: key });
			const previous = qc.getQueryData<CampaignBundle>(key);
			if (previous) qc.setQueryData(key, opts.patch(previous, vars));
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) {
				qc.setQueryData(bundleKey(opts.campaignId), ctx.previous);
			}
		},
		onSettled: () => {
			void qc.invalidateQueries({ queryKey: bundleKey(opts.campaignId) });
		},
	});
}

// ---------------------------------------------------------------------------
// Patcher helpers — the small set of bundle transforms we need across routes.
// Kept here (rather than inlined per call site) so mutation hooks read cleanly.
// ---------------------------------------------------------------------------

export function patchAddNoun(
	bundle: CampaignBundle,
	noun: BundleNoun,
): CampaignBundle {
	return {
		...bundle,
		nouns: [...bundle.nouns, noun].sort((a, b) => a.name.localeCompare(b.name)),
	};
}

export function patchUpdateNoun(
	bundle: CampaignBundle,
	nounId: string,
	updater: (n: BundleNoun) => BundleNoun,
): CampaignBundle {
	return {
		...bundle,
		nouns: bundle.nouns
			.map((n) => (n.id === nounId ? updater(n) : n))
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}

export function patchRemoveNoun(
	bundle: CampaignBundle,
	nounId: string,
): CampaignBundle {
	return {
		...bundle,
		nouns: bundle.nouns.filter((n) => n.id !== nounId),
		// Pins targeting the deleted noun are cascaded by the DB on delete; mirror
		// that on the client so the optimistic state matches what we'll refetch.
		mapPins: bundle.mapPins.filter((p) => p.nounId !== nounId),
	};
}

export function patchAddSession(
	bundle: CampaignBundle,
	session: BundleSession,
): CampaignBundle {
	// Sessions are ordered by createdAt desc — newest first.
	return { ...bundle, sessions: [session, ...bundle.sessions] };
}

export function patchUpdateSession(
	bundle: CampaignBundle,
	sessionId: string,
	updater: (s: BundleSession) => BundleSession,
): CampaignBundle {
	return {
		...bundle,
		sessions: bundle.sessions.map((s) => (s.id === sessionId ? updater(s) : s)),
	};
}

export function patchRemoveSession(
	bundle: CampaignBundle,
	sessionId: string,
): CampaignBundle {
	return {
		...bundle,
		sessions: bundle.sessions.filter((s) => s.id !== sessionId),
		mapPins: bundle.mapPins.filter((p) => p.sessionId !== sessionId),
	};
}

export function patchAddMap(
	bundle: CampaignBundle,
	map: BundleMap,
): CampaignBundle {
	return {
		...bundle,
		maps: [...bundle.maps, map].sort((a, b) => a.name.localeCompare(b.name)),
	};
}

export function patchUpdateMap(
	bundle: CampaignBundle,
	mapId: string,
	updater: (m: BundleMap) => BundleMap,
): CampaignBundle {
	return {
		...bundle,
		maps: bundle.maps
			.map((m) => (m.id === mapId ? updater(m) : m))
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}

export function patchRemoveMap(
	bundle: CampaignBundle,
	mapId: string,
): CampaignBundle {
	return {
		...bundle,
		maps: bundle.maps.filter((m) => m.id !== mapId),
		mapPins: bundle.mapPins.filter((p) => p.mapId !== mapId),
	};
}

export function patchAddPin(
	bundle: CampaignBundle,
	pin: BundleMapPin,
): CampaignBundle {
	return { ...bundle, mapPins: [...bundle.mapPins, pin] };
}

export function patchUpdatePin(
	bundle: CampaignBundle,
	pinId: string,
	updater: (p: BundleMapPin) => BundleMapPin,
): CampaignBundle {
	return {
		...bundle,
		mapPins: bundle.mapPins.map((p) => (p.id === pinId ? updater(p) : p)),
	};
}

export function patchRemovePin(
	bundle: CampaignBundle,
	pinId: string,
): CampaignBundle {
	return { ...bundle, mapPins: bundle.mapPins.filter((p) => p.id !== pinId) };
}

export function patchAddTemplate(
	bundle: CampaignBundle,
	template: BundleTemplate,
): CampaignBundle {
	return {
		...bundle,
		templates: [...bundle.templates, template].sort((a, b) =>
			a.name.localeCompare(b.name),
		),
	};
}

export function patchUpdateTemplate(
	bundle: CampaignBundle,
	templateId: string,
	updater: (t: BundleTemplate) => BundleTemplate,
): CampaignBundle {
	return {
		...bundle,
		templates: bundle.templates
			.map((t) => (t.id === templateId ? updater(t) : t))
			.sort((a, b) => a.name.localeCompare(b.name)),
	};
}

export function patchRemoveTemplate(
	bundle: CampaignBundle,
	templateId: string,
): CampaignBundle {
	return {
		...bundle,
		templates: bundle.templates.filter((t) => t.id !== templateId),
	};
}

export function patchAddMember(
	bundle: CampaignBundle,
	member: BundleMember,
): CampaignBundle {
	return { ...bundle, members: [...bundle.members, member] };
}

export function patchRemoveMember(
	bundle: CampaignBundle,
	memberId: string,
): CampaignBundle {
	return {
		...bundle,
		members: bundle.members.filter((m) => m.id !== memberId),
	};
}

export function patchUpdateCampaign(
	bundle: CampaignBundle,
	updater: (c: CampaignBundle["campaign"]) => CampaignBundle["campaign"],
): CampaignBundle {
	return { ...bundle, campaign: updater(bundle.campaign) };
}
