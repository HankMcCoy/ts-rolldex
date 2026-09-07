# Calendar and timeline

Campaigns keep in-world dates on a **custom calendar**, so a homebrew year with
five 70-day months sorts and formats correctly.

## The calendar

Stored as `campaigns.calendar` (`jsonb`), validated by `calendarSchema`
(`src/lib/calendar.ts`): an array of 1–100 months, each `{ name, days }` with
1–1,000 days. New campaigns get `EARTH_GREGORIAN_CALENDAR` (the 12 real months,
February fixed at 28 — there are no leap years).

Edited at `/campaigns/$campaignId/settings/calendar` via `CalendarEditor`.

## Dates on rows

Nouns and sessions each carry two triplets: `dateYear/dateMonth/dateDay` and
`endDateYear/endDateMonth/endDateDay`. `dateMonth` is a **0-based index** into
`calendar.months` everywhere — schema, forms, CSV. It is never a month number.

Three invariants, enforced in three places:

| Invariant | DB CHECK | Zod | Notes |
|---|---|---|---|
| Start triplet all-or-none | `nouns_date_all_or_none` | `applyDateRefinements` | |
| End triplet all-or-none | `nouns_end_date_all_or_none` | `applyDateRefinements` | |
| End requires start | `nouns_end_date_requires_start` | `applyDateRefinements` | |
| Day ≤ days in that month | **no** | `validateDateAgainstCalendar` | App-code only — the DB can't see the calendar |
| End ≥ start | **no** | `resolveDateColumns` | App-code only |

`applyDateRefinements` + `dateFields` (`src/lib/date-schema.ts`) are spread into
both the server `inputValidator` and the client form schema, so the same three
rules apply on both sides. The calendar-aware checks then run server-side in
`resolveDateColumns` (`src/server/date-resolver.ts`), which loads the campaign's
calendar and returns either ready-to-spread column values or a `Result` error.

## Changing a calendar can orphan dates

Shortening a month or removing one could leave existing rows pointing at a day
that no longer exists. `updateCalendar` (`src/server/calendar.ts`) refuses
rather than corrupting data: it loads every dated noun and session, checks both
start and end against the proposed months, and returns an error naming up to
five offenders ("Cannot save: 3 dated entries would become invalid — …").

## Sorting and formatting

`toAbsoluteDay(date, calendar)` flattens a date to one integer:
`year * daysPerYear + priorMonthDays + (day - 1)`. It is monotonic across the
year boundary and handles negative years, so it sorts BCE-style dates
correctly.

`formatDateRange(start, end, calendar)` collapses redundant parts:

| Case | Output |
|---|---|
| No end, or end equals start | `1492 Hammer 15` |
| Same year and month | `1492 Hammer 15–18` |
| Same year, different month | `1492 Hammer 15 – Mirtul 3` |
| Different years | `1492 Hammer 15 – 1493 Mirtul 3` |

An out-of-range month index falls back to `Month N` rather than crashing.

## The timeline

`buildTimeline` (`src/lib/timeline.ts`) is pure and runs client-side off the
bundle. It takes every noun and session with a **start date** (undated rows are
skipped entirely), merges them, and sorts by `toAbsoluteDay`, tie-breaking on
name. An optional `limit` truncates — the dashboard passes 5, the
`/timeline` route passes nothing.

Sessions get `nounType: null` and `imageUrl: null` in the entry, and render
with the dedicated `SESSION` avatar; the `?? "EVENT"` fallback in the timeline
and dashboard is defensive only, since `nounType` is `NOT NULL` on nouns.

Because it derives from the already-filtered bundle, secret entries simply
aren't there for READ_ONLY viewers — no extra check needed.
