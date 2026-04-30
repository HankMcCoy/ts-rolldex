import { eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AccessLevel } from "@/lib/access";

/**
 * Returns eq(col, false) for READ_ONLY users so secret entities are hidden,
 * or undefined (no filter) for ADMIN users.
 */
export function visibilityFilter(col: AnyPgColumn, accessLevel: AccessLevel) {
	return accessLevel === "READ_ONLY" ? eq(col, false) : undefined;
}
