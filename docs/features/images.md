# Images

Nouns and maps can each carry one image. Storage is Cloudflare R2, accessed
with the S3 SDK.

## Flow

`src/lib/storage.ts` is the R2 client (`uploadObject`, `deleteObject`,
`publicUrlFor`). `src/server/image-uploads.ts` holds the shared logic; the
noun- and map-specific server fns supply closures for loading and persisting
the key, so neither duplicates the validation or cleanup.

`performImageUpload`:

1. Reject unless the MIME type is JPEG, PNG, or WebP.
2. Reject if over the caller's byte limit.
3. Load the row (404 as a `Result` error if missing).
4. Write to `<prefix>/<uuid>.<ext>` — `nouns/$nounId/…` or `maps/$mapId/…`.
   Keys are always freshly generated, never reused.
5. Persist the new key.
6. **Best-effort** delete the previous object, logging and swallowing failures
   so a storage hiccup can't fail an otherwise successful upload.

`performImageRemove` nulls the key first, then best-effort deletes.

| | Max size |
|---|---|
| Noun images | 5 MB |
| Map images | 15 MB |

## Uploads skip optimistic updates

Image mutations are the documented exception to `useBundleMutation`. The
eventual `imageUrl` is server-generated, so there's nothing meaningful to patch
optimistically. They use `useServerFn` plus a manual
`queryClient.invalidateQueries({ queryKey: bundleKey(campaignId) })`.

Uploads are `FormData`, so their `inputValidator` is a hand-written function
rather than a Zod schema — it asserts the `File` and the string ids by hand.

## URLs

The bundle converts `imageKey` → `imageUrl` via `publicUrlFor` on the way out;
`imageKey` itself is not part of the client-facing map shape. `EntityAvatar`
falls back to a per-type Lucide icon when `imageUrl` is null.

## Security note

Bucket objects are **world-readable**. Once a URL has been observed, marking
the entity `isSecret` later does not revoke access — the bundle stops emitting
the URL, but the object is still fetchable by anyone who kept it. Treat image
contents as public.

## Cleanup gaps

- `deleteNoun` and `deleteMap` delete the object best-effort.
- `deleteCampaign` relies on DB cascade and **does not** touch R2, so deleting
  a campaign orphans every image it contained.

## Config

All five `R2_*` vars are required at boot — `src/lib/env.ts` parses
`process.env` with Zod at module load, so a missing var is a startup crash, not
a runtime surprise.
