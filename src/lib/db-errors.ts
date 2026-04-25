/**
 * Returns true if `e` is a Postgres unique-violation (SQLSTATE 23505).
 * Used to translate race conditions on findFirst-then-insert into the same
 * friendly Result.err that the up-front check produces.
 */
export function isUniqueViolation(e: unknown): boolean {
	return (
		typeof e === "object" &&
		e !== null &&
		(e as { code?: string }).code === "23505"
	);
}
