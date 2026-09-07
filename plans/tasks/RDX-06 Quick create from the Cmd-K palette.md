---
status: todo
blockedBy: []
---

A "quick create" available from the Cmd-K palette that creates a new entity in a
modal or panel, and returns me to whatever I was looking at when I'm done.

## Notes

The use case is mid-session note-taking: an NPC or place gets invented at the
table, it needs to be jotted down in seconds, and then I need to be back in the
session note without losing my place or my cursor.

That framing sets the constraints:

- Must not navigate. Today creating a noun goes to
  `_app.campaigns.$campaignId.nouns.new.tsx` and then redirects to the new
  noun's detail page — both wrong here.
- Name + type, and nothing else, on the fast path. Details get filled in later.
- Unsaved edits in the session editor underneath have to survive it.
- Optimistic create means the new noun is immediately linkable from the session
  note. `useBundleMutation` with a client-supplied UUID already gives this.

Ideally the created entity is also inserted as a link at the cursor in the note I
was writing, though that's a second step and can follow.
