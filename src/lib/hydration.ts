import { useSyncExternalStore } from "react";

// The store never changes, so the subscribe callback is a no-op unsubscribe.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during SSR and the first client render, `true` once hydrated.
 *
 * Used to keep submit buttons disabled until React has attached its handlers.
 * The SSR'd markup is a complete `<form>`, so a click that lands before
 * hydration triggers the browser's *native* submit — which, with no `method`,
 * is a GET that puts every field in the query string, passwords included.
 */
export function useHydrated(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
