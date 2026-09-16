# Tags

Free-form labels a DM can put on any noun or session. Tags are **scoped to a
campaign** — every other resource is, and a global-to-the-user tag vocabulary
would leak the shape of one campaign into another.

## The lifecycle rule

Ungrouped tags exist exactly as long as at least one noun or session carries
them. Typing a new name creates a tag on save; removing its last assignment
prunes it. `pruneOrphanTags` runs after entity saves and deletes.

**Grouped tags persist even when unused.** They are a vocabulary configured by
the DM, so removing an assignment must not erase a choice from the group.

## Tag groups

Campaign settings → **Tag groups** lets ADMINs create, rename, edit, and delete
named groups. Settings shows a searchable list of expandable groups with nested
tag rows. Create and rename groups in a dialog; add tags within a group and
remove individual tags from its rows. Names are normalized and unique per campaign case-insensitively.
The required entity Type group has additional rules described in
[entities-and-sessions.md](entities-and-sessions.md).

Each group owns up to 25 tags; an empty group is allowed. Enter new tag names
or choose existing ungrouped tags. A tag belongs to at most one group and its
name remains unique across the campaign, including other groups.

An entity or session can carry **at most one tag from each group**. Selecting
another tag from the same group replaces the previous chip. The picker labels
grouped chips with the group name. Its menu opens with groups and ungrouped
tags; opening a group shows all its choices, with the selected tag checked.
Search matches tag and group names across the campaign. Arrow keys navigate
choices; Right opens a group, Left (or Backspace in an empty input) goes back,
and Escape returns to the group list before closing the picker. Clicking a
selected choice removes it. Server-side validation
resolves names against the campaign's tags and rejects conflicting submissions
before writing entity fields, including submissions from stale forms.

Saving a group rejects membership changes if any noun or session already
carries multiple proposed members, including secret entities. The DM must
resolve those assignments first; group edits never silently remove them.
A tag owned by another group must first be removed from that group.

Removing a tag from a group, or deleting a group, preserves its assignments
and makes it ungrouped. Unused tags are then pruned. Group writes and cleanup
run in a transaction, so a failed edit cannot leave a partially changed group.
`src/server/tag-groups.ts` authorizes ADMIN writes; `tag-group-writes.ts`
implements these rules.

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
tag_groups  — id, campaignId, name, isEntityType          (unique per campaign on lower(name))
tags        — id, campaignId, name, groupId          (unique per campaign on lower(name))
entity_tags — id, tagId, nounId | sessionId (DB CHECK enforces XOR)
```

`entity_tags` mirrors `map_pins`: one polymorphic join table targeting exactly
one of a noun or a session. Two unique indexes — `(tag_id, noun_id)` and
`(tag_id, session_id)` — stop the same tag being applied twice. Postgres treats
NULLs as distinct, so the noun index doesn't constrain session rows or vice
versa.

## In the bundle

`getCampaignBundle` returns tags in three pieces:

- `bundle.tags` — every tag in the campaign, `{ id, name, groupId }`, name-sorted.
- `bundle.tagGroups` — `{ id, name, isEntityType }` groups, name-sorted.
- `tagIds: string[]` on each noun and session, ordered to match `bundle.tags`.

There is deliberately **no flat join array** on the client (unlike `mapPins`):
a tag carries no payload, so ids on the row are all a caller needs, and the
optimistic patchers stay simple.

`useTags(campaignId)` returns the campaign list; `useTagGroups` returns groups; `useNoun` / `useSession`
return a resolved `tags` array alongside the row.

### What READ_ONLY sees

`bundle.tags` is narrowed for READ_ONLY members to tags carried by at least one
**visible** entity, and assignments to hidden entities are dropped. Without
that, a tag applied only to secret nouns would leak its name through the
suggestion list — the tag rows themselves have no `isSecret` of their own.
Groups are likewise limited to those owning at least one visible tag; unused
group vocabulary and tags carried only by secret entities stay hidden.

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
   ungrouped ones left with no carrier — the client-side mirror of `applyEntityTags` +
   `pruneOrphanTags`.

## UI

`TagInput` (`src/components/TagInput.tsx`) is a chip input: type a name and
press Enter or comma to add it, Backspace on an empty box to remove the last
chip, arrow keys to walk the suggestion list. New and existing tags are entered
identically — there is no "create tag" affordance to hunt for, because the
server decides which is which. At the top level, a half-typed name is
committed on blur, so clicking Save does not silently drop it. Inside a group,
only that group's configured tags can be chosen; unmatched text is a search.

The real `<input>` carries the id and ARIA wiring, so `FormControl`'s Slot and
`<FormLabel htmlFor>` land on a focusable element (see `RDX-11`).

`TagList` (`src/components/TagList.tsx`) is the read side — chips on the noun
and session detail pages and in both list views. On the detail pages each chip
links to that collection's list filtered by the tag. In the **list** views the
chips are inert, because each row is already wrapped in a `<Link>` and nesting
anchors is invalid HTML — the list views put their toggles in `TagFilterBar`
instead. That's what `TagList`'s optional `filterLink` prop selects between.

Limits: `TAG_MAX_LENGTH` 40 characters, `MAX_TAGS_PER_ENTITY` 25 ordinary
tags, both in `src/lib/tags.ts`. Nouns also carry one required type assignment;
`nounTagRefsField` permits that additional entry. Server saves resolve and
validate it against the campaign’s designated Type group.

## Filtering a list by tag

The noun list and the session list both take a `tags` search param, and
`TagFilterBar` (`src/components/TagFilterBar.tsx`) renders one toggle chip per
tag above the list.

**The filter is carried as tag names, not ids.** Ids would be shorter, but a
tag row does not survive losing its last carrier (see the lifecycle rule
above), so retyping the same name mints a *new* id — a bookmarked or shared
`?tags=` URL would silently stop matching. Names also keep a hand-written URL
readable, and `tagFilterSchema` coerces a bare `?tags=villain` into a
one-element list so hand-writing one works. Matching is case-insensitive via
`tagKey`, like everywhere else.

**Multiple tags narrow with AND**, not OR: each extra chip shows fewer rows.
The pure helper is `filterByTagNames` (`src/lib/tags.ts`), applied by the
`useNouns` / `useSessions` selectors. A name matching no campaign tag yields an
empty list rather than being ignored — nothing can carry a tag that doesn't
exist, and silently dropping it would show a filtered view that isn't filtered.

The chips a view offers come from `useNounTagOptions` / `useSessionTagOptions`,
which list tags carried by at least one row *in scope* — so the bar never
offers a filter that would empty the list. Scope deliberately ignores the
active tag filter: recomputing the options as you select would make chips
vanish from under the pointer. `TagFilterBar` additionally renders any active
name that has no chip (its tag was pruned, or the noun type filter moved away
from it), so an active filter can always be switched off.

Toggling navigates with `replace: true` — the URL stays linkable, which is what
`RDX-05` needs, without filling the back button with every chip click. The
noun list's type buttons carry the tag filter across rather than dropping it.

## Not covered yet

- **Tags in Quick Find** is `RDX-05`.
- **CSV import/export ignores ordinary tags** — the column set in `src/lib/csv.ts` is
  unchanged, so a round-trip through export/import drops them. That's `RDX-14`.
