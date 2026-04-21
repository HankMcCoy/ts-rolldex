# Old Rolldex (Remix) — Feature Summary

Source: https://github.com/HankMcCoy/rolldex-remix

This document summarizes the functionality of the original Remix-based Rolldex app to guide reimplementation.

---

## Purpose

Rolldex is a campaign management tool for tabletop RPGs. Game masters (and optionally players) use it to organize campaigns, track characters, locations, factions, objects, and game sessions. A key feature is automatic relationship detection between entities based on name references in content.

---

## Data Model

### User
- `id`, `email`, `passwordHash`, `createdAt`
- Owns campaigns, can be a member of others

### Campaign
- `id`, `name` (unique), `summary`, `createdAt`, `updatedAt`, `createdById`
- Central organizing entity. Has nouns, sessions, and members.

### Noun
The core entity type. Represents anything noteworthy in a campaign.

- `id`, `campaignId`, `name` (unique per campaign), `summary`
- `notes` — public markdown content
- `privateNotes` — admin-only markdown content
- `nounType` — one of: `PERSON`, `PLACE`, `THING`, `FACTION`
- `isSecret` — if true, hidden from read-only members

### Session
Represents an actual game session or narrative event.

- `id`, `campaignId`, `name` (unique per campaign), `summary`
- `notes` — public markdown content
- `privateNotes` — admin-only markdown content
- `isSecret` — if true, hidden from read-only members

### Member
Associates a user (by email) with a campaign.

- `id`, `campaignId`, `email`, `memberType` (always `READ_ONLY`), `userId` (nullable)
- Members can be invited before they have an account — matched by email on registration
- Unique constraint: `campaignId + email`

---

## Access Control

Three access levels, checked on every route:

| Level | Who | Permissions |
|---|---|---|
| **ADMIN** | Campaign creator | Full read/write/delete; sees private notes and secret items |
| **READ_ONLY** | Invited members | View non-secret content; private notes stripped from responses |
| **NONE** | Everyone else | 404 / rejected |

---

## Features

### Authentication
- Email/password signup and login
- bcrypt password hashing
- Cookie-based sessions (30-day expiration)
- Invite-before-account: members invited by email gain access when they register

### Campaigns
- Create, edit campaigns (name + summary)
- Dashboard shows overview of nouns, sessions, and members
- List view shows all campaigns the user owns or is a member of

### Nouns (People, Places, Things, Factions)
- Create, view, edit, delete
- Fields: name, summary, public notes (markdown), private notes (markdown), isSecret toggle
- Filtered list view by type
- Admin-only: edit/delete, view private notes, toggle isSecret

### Sessions
- Create, view, edit, delete
- Same fields as nouns minus nounType
- Sorted newest-first
- Admin-only: edit/delete, view private notes, toggle isSecret

### Members
- Admin invites by email address
- Member list visible on campaign dashboard
- Admin can remove members

### Automatic Relationship Detection
The most distinctive feature. When viewing any noun or session, a sidebar automatically shows related entities — no explicit links required.

**Algorithm:** For each other noun/session in the campaign, check whether its name appears anywhere in the current entity's `summary`, `notes`, or `privateNotes` (case-insensitive, possessives stripped — e.g. "John's" matches "John").

The sidebar groups related entities by type:
- Related People
- Related Places
- Related Things
- Related Factions
- Related Sessions (when viewing a noun)

### Quick-Find Search
- Modal search (keyboard shortcut `Mod+K` or similar)
- Searches noun and session names, case-insensitive contains match
- Returns up to 5 results per category
- Served from a dedicated JSON API endpoint: `GET /campaigns/:id/quick-find`

### Markdown Support
- Notes and private notes fields use a rich markdown editor (SimpleMDE/EasyMDE)
- Rendered with `react-remarkable` on display pages

---

## Route Structure

```
/                                         → redirect to /campaigns
/login                                    → login
/register                                 → signup
/logout                                   → destroy session

/campaigns                                → list all user's campaigns
/campaigns/add                            → create campaign
/campaigns/:campaignId                    → campaign dashboard
/campaigns/:campaignId/edit               → edit campaign

/campaigns/:campaignId/nouns              → list nouns (filter by type via query param)
/campaigns/:campaignId/nouns/add          → create noun (type via query param)
/campaigns/:campaignId/nouns/:nounId      → view noun
/campaigns/:campaignId/nouns/:nounId/edit → edit noun

/campaigns/:campaignId/sessions/add             → create session
/campaigns/:campaignId/sessions/:sessionId      → view session
/campaigns/:campaignId/sessions/:sessionId/edit → edit session

/campaigns/:campaignId/members/invite         → invite member
/campaigns/:campaignId/members/:memberId      → delete member (DELETE)

/campaigns/:campaignId/quick-find             → search API (returns JSON)
```

---

## Key Implementation Notes

- **Access control is everywhere.** Every loader and action must check access level before returning data or mutating.
- **Private notes are stripped server-side** for READ_ONLY members — not just hidden on the client.
- **Secret items** (`isSecret: true`) are excluded entirely from READ_ONLY member responses.
- **Relationships are computed, not stored.** No join table; the algorithm scans all entity names at read time.
- **Unique name constraints** on nouns and sessions within a campaign — handle duplicate name errors in forms.
- **Email-based invitations** mean `Member.userId` can be null until the invited person registers.
- **All notes fields** support markdown in both edit (rich editor) and view (rendered) modes.
- **Form validation** uses Zod with field-level error display.
