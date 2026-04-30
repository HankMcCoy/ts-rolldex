import { isUniqueViolation } from "@/lib/db-errors";
import { err, ok, type Result } from "@/lib/result";

/**
 * Wraps an insert-or-update around a unique-name conflict check. We both
 * pre-check (so a typical conflict surfaces a friendly error) and catch the
 * Postgres 23505 violation (so a concurrent writer that beat the pre-check
 * still produces the same message). The pre-check `where` clause varies —
 * `eq(name)` for create, `and(eq(name), ne(id))` for update — so the caller
 * supplies it as a closure.
 */
export async function withUniqueName<T>(
	conflictMessage: string,
	preCheck: () => Promise<unknown>,
	perform: () => Promise<T>,
): Promise<Result<T>> {
	const existing = await preCheck();
	if (existing) return err(conflictMessage);
	try {
		return ok(await perform());
	} catch (e) {
		if (isUniqueViolation(e)) return err(conflictMessage);
		throw e;
	}
}
