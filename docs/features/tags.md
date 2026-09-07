# Tags

Free-form labels a DM can put on any noun or session. Tags are **scoped to a
campaign** — every other resource is, and a global-to-the-user tag vocabulary
would leak the shape of one campaign into another.

## The lifecycle rule

Tags have no CRUD surface of their own. There is no "manage tags" screen, no
create step, and no delete button: **a tag exists exactly as long as at least
one noun or session carries it.**

- Typing a name that isn't in use yet creates the tag as part of saving the
  entity.
- Removing the last chip that referenced a tag deletes the tag row.

That is what `pruneOrphanTags` (`src/server/tags.ts`) enforces, and it runs
after every write that can drop the last assignment — a noun or session save,
and a noun or session **delete** (where the join rows cascade away). The point
is that a typo can't outlive the entity you typo'd it on and pollute the
suggestion list forever.

`RDX-03` (tag groups) introduces user-defined groups, which will almost
certainly give tags an independent lifecycle. Expect this rule to change then.

## Identity is case-insensitive

`tags` is uniquely indexed on `(campaign_id, lower(name))`, so "Villain" and
"villain" are the same tag. Typing an existing name in a different case reuses
the existing row, keeping its original spelling — the picker can never show two
chips that read alike.

The shared normalisation lives in `src/lib/tags.ts` (`normalizeTagName` trims
and collapses whitespace, `tagKey` lowercases it). Both the server fn and the
client's optimistic patch use it, and they have to agree: if they disagreed,
the optimistic chips would differ from what the refetch brings back.

## Schema

```
tags        — id, campaignId, name          (unique per campaign on lower(name))
entity_tags — id, tagId, nounId | sessionId (DB CHECK enforces XOR)
```

`entity_tags` mirrors `map_pins`: one polymorphic join table targeting exactly
one of a noun or a session. Two unique indexes — `(tag_id, noun_id)` and
`(tag_id, session_id)` — stop the same tag being applied twice. Postgres treats
NULLs as distinct, so the noun index doesn't constrain session rows or vice
versa.

## In the bundle

`getCampaignBundle` returns tags in two pieces:

- `bundle.tags` — every tag in the campaign, `{ id, name }`, name-sorted.
- `tagIds: string[]` on each noun and session, ordered to match `bundle.tags`.

There is deliberately **no flat join array** on the client (unlike `mapPins`):
a tag carries no payload, so ids on the row are all a caller needs, and the
optimistic patchers stay simple.

`useTags(campaignId)` returns the campaign list; `useNoun` / `useSession`
return a resolved `tags` array alongside the row.

### What READ_ONLY sees

`bundle.tags` is narrowed for READ_ONLY members to tags carried by at least one
**visible** entity, and assignments to hidden entities are dropped. Without
that, a tag applied only to secret nouns would leak its name through the
suggestion list — the tag rows themselves have no `isSecret` of their own.

## Saving

Tags ride along with the entity save rather than having their own server fn:
`createNoun`, `updateNoun`, `createSession`, and `updateSession` all take a
`tags: { id, name }[]` field and delegate to `applyEntityTags`. One save, one
mutation, one optimistic patch.

The ids in that array are **client-supplied proposals**, the same pattern as
`create*`'s optional `id`. The server matches each name against existing
campaign tags first and only uses the proposed id when the name is genuinely
new — a client can't hijack or invent a tag id.

Client side:

1. The form field holds tag **names** (`string[]`).
2. On submit, `resolveTagRefs(campaignTags, names)` (`src/lib/tags.ts`) pairs
   each name with the existing tag's id, or a fresh UUID.
3. The patcher writes `tagIds` on the entity, then `patchSyncTags`
   (`src/lib/queries.ts`) merges any new tags into `bundle.tags` and prunes
   ones left with no carrier — the client-side mirror of `applyEntityTags` +
   `pruneOrphanTags`.

## UI

`TagInput` (`src/components/TagInput.tsx`) is a chip input: type a name and
press Enter or comma to add it, Backspace on an empty box to remove the last
chip, arrow keys to walk the suggestion list. New and existing tags are entered
identically — there is no "create tag" affordance to hunt for, because the
server decides which is which. A half-typed name is committed on blur, so
clicking Save doesn't silently drop it.

The real `<input>` carries the id and ARIA wiring, so `FormControl`'s Slot and
`<FormLabel htmlFor>` land on a focusable element (see `RDX-11`).

`TagList` (`src/components/TagList.tsx`) is the read side — chips on the noun
and session detail pages and in both list views.

Limits: `TAG_MAX_LENGTH` 40 characters, `MAX_TAGS_PER_ENTITY` 25, both in
`src/lib/tags.ts` and enforced on the server by `tagRefsField`.

## Not covered yet

- **Filtering a list by tag** is `RDX-02`; the chips are currently inert text.
- **Tags in Quick Find** is `RDX-05`.
- **CSV import/export ignores tags** — the column set in `src/lib/csv.ts` is
  unchanged, so a round-trip through export/import drops them. That's `RDX-14`.
