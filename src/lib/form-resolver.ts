import { zodResolver as baseResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * Wraps @hookform/resolvers/zod to paper over the Zod 4.3.x minor-version
 * type mismatch. Remove this wrapper once the resolvers package is updated.
 */
export function zodResolver<T extends FieldValues>(
	schema: ZodType,
): Resolver<T> {
	// biome-ignore lint/suspicious/noExplicitAny: version mismatch workaround
	return baseResolver(schema as never) as Resolver<T>;
}
