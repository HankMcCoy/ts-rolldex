import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/index";
import { campaigns, members } from "@/db/schema/index";
import { auth } from "@/lib/auth";

export type AccessLevel = "ADMIN" | "READ_ONLY" | "NONE";

export interface SessionUser {
	id: string;
	email: string;
	name: string;
}

/**
 * Gets the current Better Auth session.
 * Throws a redirect to /login if no session exists.
 */
export async function requireSession(): Promise<{ user: SessionUser }> {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		throw redirect({ href: "/login" });
	}
	return {
		user: {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
		},
	};
}

/**
 * Gets the current session without throwing.
 * Returns null if no session.
 */
export async function getOptionalSession(): Promise<{
	user: SessionUser;
} | null> {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return null;
	return {
		user: {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
		},
	};
}

/**
 * Determines a user's access level for a campaign.
 * ADMIN = campaign creator
 * READ_ONLY = invited member (matched by userId or email for invite-before-account)
 * NONE = no access
 */
export async function getCampaignAccess(
	campaignId: string,
	userId: string,
	userEmail: string,
): Promise<AccessLevel> {
	const campaign = await db.query.campaigns.findFirst({
		where: eq(campaigns.id, campaignId),
	});

	if (!campaign) return "NONE";
	if (campaign.createdById === userId) return "ADMIN";

	const member = await db.query.members.findFirst({
		where: and(
			eq(members.campaignId, campaignId),
			or(
				eq(members.userId, userId),
				and(eq(members.email, userEmail.toLowerCase()), isNull(members.userId)),
			),
		),
	});

	return member ? "READ_ONLY" : "NONE";
}

/**
 * Requires a minimum access level for a campaign.
 * Throws notFound() if access is NONE or below minimumLevel.
 */
export async function requireCampaignAccess(
	campaignId: string,
	userId: string,
	userEmail: string,
	minimumLevel: "ADMIN" | "READ_ONLY" = "READ_ONLY",
): Promise<"ADMIN" | "READ_ONLY"> {
	const access = await getCampaignAccess(campaignId, userId, userEmail);

	if (access === "NONE") {
		throw new Response("Not Found", { status: 404 });
	}

	if (minimumLevel === "ADMIN" && access !== "ADMIN") {
		throw new Response("Forbidden", { status: 403 });
	}

	return access as "ADMIN" | "READ_ONLY";
}
