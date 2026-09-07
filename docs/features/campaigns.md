# Campaigns

A campaign is the top-level container. Everything else — nouns, sessions, maps,
pins, members, templates — belongs to exactly one campaign and cascades on
delete.

## Model

`campaigns` (`src/db/schema/app.ts`)

| Column | Notes |
|---|---|
| `name` | Required, ≤100 chars. Unique **per owner** (`campaigns_creator_name_unique` on `createdById, name`) — two different DMs can each have a "Curse of Strahd" |
| `summary` | Optional, ≤5,000 chars. Plain text, not markdown |
| `calendar` | `jsonb`, defaults to `EARTH_GREGORIAN_CALENDAR`. See [calendar-and-timeline.md](calendar-and-timeline.md) |
| `createdById` | The owner. This is the *only* thing that grants ADMIN |

There is no ownership transfer and no second admin — see
[access-control-and-sharing.md](access-control-and-sharing.md).

## Creating a campaign

`createCampaign` (`src/server/campaigns.ts`) inserts the row and then seeds
`STARTER_TEMPLATES` (`src/server/template-seeds.ts`) into
`campaign_templates`. Today that's a single "Adversary" stat block. A campaign
therefore never starts with an empty slash menu.

## Routes

| Route | File | Purpose |
|---|---|---|
| `/campaigns` | `_app.campaigns.index.tsx` | All campaigns the user owns or was invited to |
| `/campaigns/new` | `_app.campaigns.new.tsx` | Create form |
| `/campaigns/$campaignId` | `_app.campaigns.$campaignId.index.tsx` | Dashboard |
| `/campaigns/$campaignId/edit` | `_app.campaigns.$campaignId.edit.tsx` | Name + summary |
| `/campaigns/$campaignId/settings` | `_app.campaigns.$campaignId.settings.index.tsx` | Settings hub |

`getCampaigns` is the only campaign-scoped read that *isn't* the bundle — the
list page needs rows across campaigns, so it can't use a per-campaign bundle.
It resolves membership with the same userId-or-unlinked-email rule described in
the access doc.

The layout route `_app.campaigns.$campaignId.tsx` does two things: loads the
bundle via `ensureQueryData`, and mounts `QuickFindDialog` so Cmd-K works
anywhere inside a campaign.

## Dashboard

`useCampaignDashboard` (`src/lib/queries.ts`) shapes the bundle into six
sections. Left column: recent sessions (5), maps, timeline preview (5),
members. Right column: **all entities**.

> **Known problem.** The entities column renders every noun in the campaign,
> unpaginated and unfiltered, so it grows without bound and duplicates the
> `/nouns` index it links to. Tracked as `RDX-07` in `plans/tasks/`. What the
> home page *should* show is still open.

## Settings hub

Four cards, each ADMIN-gated (`useSettingsSummary` supplies the counts):

- **Calendar** → months of the in-world year
- **Templates** → slash-menu blocks
- **Members** → invites
- **Import / Export** → CSV

Non-ADMIN visitors to any settings route get a "You don't have permission"
message rather than a 404, because the campaign itself is visible to them.

## Deletion

`deleteCampaign` is ADMIN-only and relies on `ON DELETE CASCADE` for every
child table. **Uploaded images are not cleaned up** — noun and map image
deletion is handled per-row in `deleteNoun` / `deleteMap`, which a cascading
campaign delete bypasses. Objects are orphaned in R2.
