# Rolldex plans

An Obsidian vault. Vault root is `plans/`. Open it with **Open folder as vault**.

## Conventions

One task per file in `tasks/`, named `RDX-NN Short title.md`. The `RDX-NN` prefix is
the task's permanent ID — use it in commit messages, branch names, and when talking
to an agent. Titles can be reworded freely; the ID never changes.

Frontmatter:

```yaml
---
status: todo        # todo | doing | done | dropped
blockedBy:
  - "[[RDX-01 Some other task]]"
---
```

Only `blockedBy` is recorded. The reverse direction — what a task *blocks* — comes
free from Obsidian's backlinks pane, so there is no `blocks` property to keep in sync.

Everything else is prose in the note body. No estimates, no priorities, no assignees.

## Views

`Tasks.base` is the main interface:

- **Ready** — open tasks whose blockers are all `done`. Work from here.
- **Blocked** — open tasks still waiting on something, with the blockers listed.
- **All open** — everything not `done` or `dropped`.
- **Done** — the archive. Completed tasks stay in `tasks/`; nothing gets moved.

## Adding a task

Next ID = highest number in `tasks/` + 1. Insert the `Templates/Task.md` template
(Cmd-P → "Insert template") into a new note.
