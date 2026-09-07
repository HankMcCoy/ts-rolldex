---
status: todo
blockedBy: []
---

The campaign home page needs to be better. The list of entities down the right
side gets *super* long and isn't particularly useful.

## Notes

`src/routes/_app.campaigns.$campaignId.index.tsx`, fed by `useCampaignDashboard`
in `src/lib/queries.ts`.

What would actually be useful is TBD — that's the real work here, not the
implementation. Things to consider: recency over completeness (last few sessions,
recently touched nouns), what's coming up on the timeline, and unfinished
business rather than an exhaustive index. The exhaustive index already exists at
`/nouns`; the home page duplicating it is the core problem.

Worth doing after [[RDX-01 Arbitrary tags on nouns and sessions]] lands if tags
turn out to be the right organizing principle for the page.
