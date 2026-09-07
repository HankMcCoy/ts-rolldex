---
status: todo
blockedBy:
  - "[[RDX-01 Arbitrary tags on nouns and sessions]]"
---

The ability to filter views by tags.

## Notes

Applies at least to the noun list (`_app.campaigns.$campaignId.nouns.index.tsx`)
and the session list. Filtering is pure client-side work over the bundle — no new
server fn.

Decide early whether the active filter lives in the URL as a search param. It
should: it makes filtered views linkable, which is what [[RDX-05 Tag views in the Cmd-K palette]]
depends on.
