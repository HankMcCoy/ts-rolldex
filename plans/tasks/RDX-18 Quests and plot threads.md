---
status: todo
blockedBy: []
---

There is nowhere to track "what the party is currently trying to do". A quest
isn't a noun and isn't a session — it spans sessions, has a state, and involves
several entities.

## The question this task has to answer first

Is a quest a new resource, or does it fall out of work already planned?

The composition hypothesis is: **a quest is a noun of a user-defined type
([[RDX-04 Migrate noun type to a tag group]]), carrying a status from a
mutually-exclusive tag group ([[RDX-03 Tag groups]]), linked to the NPCs and
places involved by explicit relationships
([[RDX-09 Explicit relationships between entities]]).** No fourth content type,
no new table.

That is genuinely most of the way there, and it should be the starting
assumption. What follows is the audit of where it stops — researched against
what competitors actually ship, not against what their marketing says.

## What composition already gives you

More than it looks like, because a quest-as-noun inherits everything nouns have:

- A page with `summary`, `notes` and `privateNotes`, with the markdown editor,
  templates and callouts.
- `isSecret` and private notes — the player-facing / GM-only split that RPGX
  Quest Log (Foundry) builds by hand as two separate description fields.
- **Dates.** Nouns already carry start and end triplets, so a quest lands on the
  timeline for free. Kanka's quest entity has exactly one `date` field; Rolldex
  would have a range.
- **Implicit relationships.** A quest note that mentions Dave already surfaces
  Dave in the sidebar without anyone declaring a link. In Kanka and World Anvil
  that association is manual data entry. This is a real advantage and it means
  the "who is involved" list is partly free.
- Tags, Quick Find, CSV export, the whole bundle.

## Where it stops

Five things competitors ship that no combination of RDX-03/04/09 produces.
Roughly in descending order of how much they matter for Rolldex specifically.

### 1. Session-by-session progress, with a payload

This is the big one, and it's the one Rolldex is best positioned to do well.

CharGen calls it "session-level movement" and frames the payoff exactly right:
when the party walks back into the quest-giver's tavern, the DM wants to see
what changed *since the last time*, not re-read three session notes. The
argument they make is that this is "the difference between a tracker and a
to-do list".

RDX-09 can say *quest ↔ session*. What it cannot carry is **what changed** —
"session 12: the party learned the Baron already has the amulet". That is an
edge with a payload, ordered in time. A binary typed relationship has nowhere
to put it.

Worth noting that World Anvil, the most feature-dense tool in the market,
**doesn't have this either**: their Plot template preps what will happen and
the Session Report records what did, but session reports can only be linked to
sessions, not to plots. It is an open community suggestion on their own site.

Sessions are already a first-class content type in Rolldex in a way they aren't
in a pure worldbuilding wiki. A quest-progress log keyed on
`(quest, session, note)` is the feature that uses that, and it is also what
would make [[RDX-07 Rework the campaign home page]] genuinely useful — "open
threads, and where each one last moved" is a dashboard worth having, where a
list of every noun is not.

### 2. Ordered objectives with independent state and progressive reveal

RPGX Quest Log lets a GM add, complete, fail and remove **milestones**
individually, with hidden milestones for objectives the players haven't
discovered and a toggle to reveal them at the right moment. CharGen has
objective progress bars and check-offs directly on the quest card.

None of this composes. A tag group gives one status for the whole quest.
Objectives are a child collection that is:

- **ordered** — tags are an unordered set by construction;
- **individually completable** — one status per quest is not enough;
- **hidden, then revealed** — and this is the interesting part.

"Hidden now, shown later" is a **third visibility concept** that Rolldex's
access model has no vocabulary for. `isSecret` hides a whole row; `privateNotes`
hides a field; neither expresses progressive disclosure over time. Kanka has the
same idea one level down — each quest *element* carries its own `visibility_id`,
so a visible quest can have an invisible participant.

That generalises well beyond quests (the secret door on a map, the NPC's true
name), which argues for designing it once as a general capability rather than
bolting a `revealed` boolean onto an objectives table. It also means RDX-09 as
currently written is under-specified: an explicit relationship has no secrecy of
its own either.

### 3. A per-link role and description, scoped to the quest

Kanka's quest **elements** are the sharpest model in the market. Each element is
`{ entity_id, name, role, description, visibility_id }` — the `role` is free
text used to group and sort the elements list ("Quest giver", "Obstacle",
"Reward"), and each link carries its **own** description.

Compare RDX-09 as scoped today: a reusable relationship *type* with a forward
and optional reverse label, shared as campaign vocabulary, connecting two
entities. Three differences, all real:

| | RDX-09 relationship | Kanka quest element |
|---|---|---|
| Label belongs to | the type, reused everywhere | the instance, scoped to this quest |
| Per-link prose | none | `description` |
| Per-link visibility | none | `visibility_id` |

"Dave is the quest giver, and he'll only talk if they mention Ilsa" has nowhere
to live under composition except the quest's own notes — which works, but loses
the per-entity grouping that makes Kanka's Elements page useful at the table.

This is the cheapest gap to close: an optional per-instance note (and
visibility) on RDX-09's relationships would serve quests *and* everything else,
without a quest-specific table.

### 4. Status semantics, not just a status label

A mutually-exclusive tag group gives a label with exclusivity. It does not tell
the app **which value means finished**, and nearly everything useful keys off
that: defaulting a list to open quests, collapsing completed ones, dashboard
counts, sort order.

The market has also converged on more than two states, and specifically on
distinguishing "not started" from "stalled":

| Product | Statuses |
|---|---|
| RPGX Quest Log | Job Board, Active, Completed, Failed, Abandoned |
| Archivist | Planned, In Progress, Blocked, Failed, Done |
| Kanka | `is_completed` — a **boolean** |

Kanka being the weakest here is worth noticing: the tool with the most entity
types has the least status modelling, which is what "loosely typed" ends up
meaning in practice.

The fix is small and belongs in RDX-03 rather than here: let a tag group mark
which of its values are terminal. That one flag is what turns a label into a
state machine, and it's useful for anything else modelled as a status.

### 5. Hierarchy — sub-quests and plot trees

Kanka quests carry a `quest_id` parent and render nested. World Anvil plots have
a Parent Plot dropdown and render an automatic **plot tree** in the campaign
manager. Both let an arc decompose into chapters.

Tag groups are flat by construction, so composition gives nothing here. A
self-referencing parent on the entity would, but note the failure mode World
Anvil documents: a cycle of parent plots makes their plot list impossible to
view, and their own help page tells users how to break the loop. Cycle
detection is required, not a nicety.

## Two things to note before scoping this

**LegendKeeper — the most polished tool in the market — has no quest object at
all.** Quest flows are drawn on Boards as flowcharts: page cards for locations
and characters, labelled arrows between them. That is a real counter-argument to
building a quest table: the best-executed competitor decided the answer was a
freeform canvas plus good linking, not a schema.

**Per-player quest assignment is out of reach and should stay that way.** RPGX
shows players only the quests assigned to their character, with a public job
board they can claim from; Archivist exports a player-ready PDF. Rolldex's
access model is binary — one READ_ONLY tier, no per-member targeting — so this
needs more than [[RDX-17 Co-GM and ownership transfer]] delivers. Name it as a
non-goal rather than letting it creep in.

Structured **rewards** (Kanka inventories; RPGX auto-splitting currency and XP
across assigned characters) are VTT territory and already listed as a strategic
non-goal in `docs/competitive-analysis.md`.

## Where this lands

Composition covers the **page**. It does not cover the **tracking**. The three
things it genuinely can't express are the progress log (1), objectives with
progressive reveal (2), and per-link role/description/visibility (3) — and (3)
is better solved inside RDX-09 for everything, while (4) is better solved inside
RDX-03 for everything.

That suggests a staged answer rather than one big feature:

1. Fold terminal-value marking into RDX-03 and per-instance note + visibility
   into RDX-09. Both are small, both serve more than quests.
2. Ship quests as a user-defined type on top of that, and see whether the
   remaining gap is felt.
3. If it is, the missing piece is almost certainly the **session progress log**,
   not objectives — because sessions are Rolldex's structural advantage and
   nobody else does it well, whereas objectives are well served by a checklist
   in the notes field.

Decide 1 and 2 before writing schema. If a quest table does eventually happen,
it follows the standard path in `AGENTS.md`: schema in `src/db/schema/app.ts` →
`pnpm db:generate` → extend `getCampaignBundle` with access filtering →
selector hooks and patchers in `src/lib/queries.ts`.

## Sources

Researched 2026-09-07; see `docs/competitive-analysis.md` for the wider market
picture. Kanka quest and quest-element fields are from their public API docs;
RPGX Quest Log is a Foundry VTT module; CharGen and Archivist are AI-native
newcomers whose quest handling is unusually well specified.
