import type { Result } from "@/lib/result";
import { err, ok } from "@/lib/result";
import { deleteObject, publicUrlFor, uploadObject } from "@/lib/storage";

export const ALLOWED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

export function extensionFor(contentType: string): string {
	if (contentType === "image/jpeg") return "jpg";
	if (contentType === "image/png") return "png";
	if (contentType === "image/webp") return "webp";
	return "bin";
}

export function imageUrlFor(imageKey: string | null): string | null {
	return imageKey ? publicUrlFor(imageKey) : null;
}

function bytesToMb(bytes: number): string {
	return `${Math.floor(bytes / 1024 / 1024)} MB`;
}

interface UploadOptions {
	file: File;
	maxBytes: number;
	/** Path prefix inside the bucket, e.g. "nouns/$id" or "maps/$id". */
	keyPrefix: string;
	notFoundMessage: string;
	/** Returns the row's current imageKey, or null if the row doesn't exist. */
	loadExistingKey: () => Promise<{ imageKey: string | null } | null | undefined>;
	/** Persists the new key on the row. */
	applyKey: (key: string) => Promise<void>;
}

/**
 * Validates the upload, writes the file to R2, persists the new key via the
 * caller's `applyKey` closure, then best-effort deletes the prior object if
 * one existed. Returning `Result` keeps the error messaging out of the
 * caller's handler.
 */
export async function performImageUpload(
	opts: UploadOptions,
): Promise<Result<{ imageKey: string; imageUrl: string }>> {
	if (!ALLOWED_IMAGE_TYPES.has(opts.file.type)) {
		return err("Image must be a JPEG, PNG, or WebP file.");
	}
	if (opts.file.size > opts.maxBytes) {
		return err(`Image must be ${bytesToMb(opts.maxBytes)} or smaller.`);
	}

	const existing = await opts.loadExistingKey();
	if (!existing) return err(opts.notFoundMessage);

	const ext = extensionFor(opts.file.type);
	const key = `${opts.keyPrefix}/${crypto.randomUUID()}.${ext}`;
	const bytes = new Uint8Array(await opts.file.arrayBuffer());

	await uploadObject(key, bytes, opts.file.type);
	await opts.applyKey(key);

	if (existing.imageKey && existing.imageKey !== key) {
		try {
			await deleteObject(existing.imageKey);
		} catch (e) {
			console.error("Failed to delete prior image:", e);
		}
	}

	return ok({ imageKey: key, imageUrl: publicUrlFor(key) });
}

interface RemoveOptions {
	notFoundMessage: string;
	loadExistingKey: () => Promise<{ imageKey: string | null } | null | undefined>;
	applyKey: (key: string | null) => Promise<void>;
}

export async function performImageRemove(
	opts: RemoveOptions,
): Promise<Result<{ success: true }>> {
	const existing = await opts.loadExistingKey();
	if (!existing) return err(opts.notFoundMessage);

	await opts.applyKey(null);

	if (existing.imageKey) {
		try {
			await deleteObject(existing.imageKey);
		} catch (e) {
			console.error("Failed to delete image:", e);
		}
	}

	return ok({ success: true });
}
