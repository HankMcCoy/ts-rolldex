import { useEffect, useRef } from "react";

/** Cross-platform Cmd+key on macOS / Ctrl+key elsewhere. */
function isModChord(e: KeyboardEvent, key: string): boolean {
	if (!(e.metaKey || e.ctrlKey)) return false;
	if (e.altKey || e.shiftKey) return false;
	return e.key.toLowerCase() === key.toLowerCase();
}

/**
 * Mounts a document-level keydown listener for `key` (Cmd/Ctrl-prefixed).
 * Always `preventDefault`s when the chord matches so we don't fall through to
 * the browser's "save page as" or similar default. The handler is read from a
 * ref so callers can pass a fresh closure on every render without remounting
 * the listener.
 */
function useModShortcut(
	key: string,
	handler: () => void,
	enabled: boolean,
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;
	useEffect(() => {
		if (!enabled) return;
		function onKey(e: KeyboardEvent) {
			if (!isModChord(e, key)) return;
			e.preventDefault();
			handlerRef.current();
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [key, enabled]);
}

/**
 * Cmd/Ctrl+E. Used on detail pages to jump into the matching edit route.
 * Pass `enabled=false` for non-ADMIN viewers who can't edit.
 */
export function useEditShortcut(onEdit: () => void, enabled = true): void {
	useModShortcut("e", onEdit, enabled);
}

/**
 * Cmd/Ctrl+S. Used on edit / new forms to submit. Always `preventDefault`s so
 * the browser's "save page as" never appears, even when the form is on a
 * route where the shortcut isn't wired (those pages just don't mount this).
 */
export function useSaveShortcut(onSave: () => void, enabled = true): void {
	useModShortcut("s", onSave, enabled);
}
