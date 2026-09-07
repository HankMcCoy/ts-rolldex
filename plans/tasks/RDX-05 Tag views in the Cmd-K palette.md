---
status: todo
blockedBy:
  - "[[RDX-02 Filter views by tag]]"
---

The ability to jump to a filtered view of a tag from the Cmd-K quick nav.

## Notes

`src/components/QuickFindDialog.tsx` filters the in-memory bundle synchronously.
Tags are in the bundle by this point, so they just become another result kind
alongside nouns and sessions — selecting one navigates to the filtered list URL
from [[RDX-02 Filter views by tag]].
