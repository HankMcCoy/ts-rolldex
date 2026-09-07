# Maps and pins

A map is an uploaded image with entities pinned to coordinates on it.

## Model

`maps` — `name` (unique per campaign), `isSecret`, `imageKey`. A map can exist
without an image; the detail route shows an upload prompt instead of the
viewer.

`map_pins` — belongs to a map, references **exactly one** of `nounId` or
`sessionId`. A DB CHECK enforces the XOR:

```sql
(noun_id IS NULL) <> (session_id IS NULL)
```

`x` and `y` are `doublePrecision` **fractions of the image, 0–1** — not
pixels. That's what makes pins survive zooming and different render sizes.
`label` is optional free text; blank labels are normalised to `NULL` on update.

## The FK is not an authorization check

`createPin` (`src/server/maps.ts`) explicitly verifies that the target noun or
session lives in **this campaign** before inserting. The foreign key only
proves the row exists *somewhere*. Without the check, an admin who knew a
foreign entity id could pin it and surface its name, summary, and image
through the pin join.

`updatePinLabel` and `deletePin` do the equivalent by loading the pin with its
map and comparing `map.campaignId`.

## Visibility

Pins are fetched in the bundle by joining through `maps` to scope by campaign,
then post-filtered in JS: a pin survives only if its map is visible **and** its
target entity is visible. So a public pin on a public map pointing at a secret
NPC disappears for READ_ONLY viewers rather than leaking the name.

`useMapWithPins` rehydrates each pin with its target's display fields, and also
returns the full noun and session lists — the pin-creation UI needs them as
candidates.

## Reverse view

`pinsForTarget` (`src/lib/queries.ts`) groups pins by map for a single entity,
sorted by map name. It powers `PinnedOnMaps`, the "appears on these maps"
section of a noun or session detail page.

## MapView

`src/components/MapView.tsx` — the largest component in the codebase.

- Zoom and pan via `react-zoom-pan-pinch`.
- `CounterScale` keeps pin markers a constant on-screen size while the image
  zooms. It exists because the library's own `KeepScale` reads scale from an
  `onChange` that doesn't fire on mount, so markers were mis-sized on first
  paint; `CounterScale` reads scale during render via `useTransformComponent`
  instead. `transformOrigin: 0 0` keeps the anchor pinned.
- Add-pin mode: toggle, click the image, pick a noun or session. The click
  handler converts client coordinates to 0–1 fractions against the image
  element.
- Image replace/remove live here too, both `confirm()`-gated for removal.
