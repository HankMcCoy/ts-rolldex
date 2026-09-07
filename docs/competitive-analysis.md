# Competitive analysis

**Snapshot date: 2026-09-07.** Everything below was gathered from vendor
marketing pages and third-party round-ups on that date. Pricing and feature
lists in this market move; treat the numbers as "roughly this, last we looked"
and re-check a vendor's own pricing page before quoting it at anyone.

## What this doc is for

`docs/features/` describes what Rolldex does. This describes what *everyone
else* does, so that a decision about what to build next is made against the
market rather than against a blank page.

It is not a roadmap, but it feeds one. Every gap in "The gaps that are table
stakes" below now has a task in `plans/tasks/`, named by ID (`RDX-NN`); the
items in "The gaps that are strategic choices" deliberately do not, because
they are things Rolldex may well never build.

## The shape of the market

Four groups compete for the same job — "where do I keep my campaign?" — and
they lose customers to each other constantly.

| Group | Examples | What they're really selling |
|---|---|---|
| **Worldbuilding wikis** | World Anvil, Kanka, LegendKeeper, Scabard, Obsidian Portal | Structure and presentation for a setting |
| **General note tools** | Obsidian.md, Notion, Google Docs | Nothing TTRPG-specific; the user assembles it |
| **VTTs with journals** | Foundry VTT, Roll20 | Notes as a side-effect of running combat |
| **AI-native newcomers** | Chronica, The Goblin's Notebook, Epicly, The Chronicler, Grimoire, Multiloop | Removing the *writing* work, not organising it |

Rolldex sits in the first group but is architecturally unlike any of them (see
"Where Rolldex is actually different" below).

---

## The incumbents

### World Anvil

The feature-maximalist. Article-first: everything is a wiki article built from
one of 25+ templates, and the templates carry creative writing prompts to get
a blank page started.

- **Worldbuilding** — interactive maps with pins and multiple layers, historical
  timelines, fantasy calendars, family trees, diplomacy webs, whiteboards for
  mind-mapping and plotting.
- **RPG campaign manager** — a separate surface from the world: an online DM
  screen with in-session note-taking, music, dice rolling, NPC generation,
  stat-block reference and a peek at player character sheets.
- **Stat blocks and PC sheets** for 100+ game systems, plus a builder for
  homebrew systems. 5e and Pathfinder SRD lookups are built in.
- **Secrets and spoiler markers** — inline, *within* an article, not just
  per-article. Reading permissions are per-article and per-subscriber-group.
- **Publishing** — worlds are public websites with themes and custom CSS. The
  Sage tier supports monetisation (paid subscribers to your world).
- **Integrations** — a Foundry VTT bridge; a large community with contests,
  streams and a Discord.
- **Pricing** — Freeman (free) / Master / Grandmaster / Sage, paid from roughly
  $7/mo, with lifetime options. The free tier is tightly capped: ~100 MB media,
  2 worlds, a low-hundreds article limit, and ads.

Consistently criticised for interface density, a steep learning curve, and
inconsistent page load speeds. It is the tool people leave, and also the tool
they come back to because nothing else has the feature.

### Kanka

The structured, RPG-native one, and the closest philosophical relative to
Rolldex — except that where Rolldex has two content types, Kanka has ~20.

- **Entity types** — characters, locations, families, organisations, items,
  quests, journals, calendars, events, abilities, timelines, maps, notes, races,
  creatures, and more. Each type can be enabled or disabled per campaign.
- **Relations** — explicit, named, directional connections between any two
  entities, pinned to the sidebar of the entity overview. Visualised as a
  connection graph (paid) and as family trees.
- **Attributes / properties** — arbitrary key-value fields on any entity (HP,
  level, population), so the schema is user-extensible without code.
- **Inventories** — any entity can hold items: a character's possessions, a
  shop's stock, a quest's reward, a family's treasury.
- **Quests** with conditions and rewards; **journals** for session recaps.
- **Calendars** with moons, seasons and recurring events; **timelines** split
  into eras with entries that link back to entities.
- **Maps** with layers, grouped pins and per-pin visibility.
- **Editor** — rich text with `@mention` autocomplete that creates a real link
  to another entity.
- **Permissions** — granular per-entity, per-role, with multiple roles beyond a
  single read-only tier.
- **Extensibility** — a community plugin library (themes, character sheets),
  custom CSS, Discord webhooks, a public API, and a self-hostable open-source
  codebase.
- **Pricing** — a genuinely generous free tier ("Kobold"), paid from ~$4.99/mo
  for premium features on at least one campaign.

Criticised mainly for *loose* typing — 20 entity types is a lot of near-empty
forms, and nothing forces a campaign to use them consistently.

### LegendKeeper

The polished, map-first one. Fewer features than either of the above, executed
better.

- **Lore** — a wiki where terms auto-link as you type them, sections can be
  hidden from players inline, and pages can be templated.
- **Maps** — infinite-canvas and **nested**: a continent pin opens a city map,
  a city pin opens a crypt. Pins link to wiki pages and can be player-hidden.
- **Timelines** — eras, parallel storylines, lineages, cause-and-effect links,
  moon phases, fantasy calendars.
- **Boards** — infinite whiteboards for conspiracy webs, family trees, magic
  system design and quest flows, with images and notes connected to the wiki.
- **Offline mode** with later sync; real-time multi-user collaboration; instant
  search; export in several formats.
- **Permissions** — the strongest player-share model of the wiki tools, by
  general consensus.
- **Pricing** — free tier is view/export/collaborate only. Pro is $9/mo or
  ~$7.50/mo billed annually ($90/yr), unlimited everything, 14-day trial.

Weaknesses: no custom CSS or fonts, relational queries need manual work, no AI.

### Obsidian Portal

The old guard (unrelated to Obsidian.md). Campaign *websites*: a wiki, an
adventure log, character pages, a map, file storage.

- Every page — wiki, log entry, character — has a **"GM only" section**, which
  is exactly Rolldex's `privateNotes` split.
- **Ascendant** ($5.99/mo, $49.99/yr) adds per-player secrets, page version
  history with diffing, privacy settings, custom CSS, promoting a player to
  **co-GM**, campaign forums, and a campaign calendar.
- Free tier: 2 campaigns, wiki, adventure log, 1 map, characters.

Dated, but it establishes two expectations Rolldex doesn't meet: version
history, and a second GM.

### Scabard

Wiki-style, cheap, with an explicit relationship model and an AI layer.

- Wiki templates, **auto-linking**, a **graph viewer** of connections, character
  sheets, timelines, session logs, maps.
- "Connections" are first-class and richly typed — the pitch is that
  interconnectedness is what makes a world feel real.
- **Campaign-aware AI** for ideas, backstories, rumours and adventure seeds.
- Pricing: free / ~$3.95 / ~$5.95 per month.

---

## The substitutes

### Obsidian.md (+ TTRPG plugins)

Local markdown files, backlinks, a graph view, and a large plugin ecosystem
(Fantasy Statblocks, dice rollers, initiative trackers). Free; Sync $5/mo,
Publish $10/mo.

Why it wins: speed, total data ownership, no subscription, infinite
extensibility. Why it loses: the user has to build the campaign structure
themselves, sharing with players needs paid Publish, and the graph shows
*mentions*, not typed relationships.

**Note the overlap.** Obsidian's backlink graph is the same idea as Rolldex's
implicit relationship detection — mention-based, not declared. Rolldex should
expect to be compared to it.

### Notion

Databases with relations, rollups, custom views, templates, real-time
collaboration, web publishing. Free tier is enough for a campaign. Loses on
having no TTRPG affordances at all and on being painful to restructure once a
schema is in use.

### Foundry VTT / Roll20

Journal entries with rich text, cross-links to actors/items/roll tables, and
multi-user editing; compendia for rules content. These are *play-session*
tools — the notes exist to be dragged onto a battle map. Nobody uses them as
the canonical home for a setting, but they are where the notes end up during a
session, which is a real integration surface (World Anvil ships a Foundry
bridge precisely for this).

### AI-native newcomers

The fastest-moving part of the market, and the newest competitive pressure:

- **Epicly / The Chronicler** — record the session audio, transcribe it, and
  generate a structured recap. Turns 30–60 minutes of post-session writing into
  reviewing a draft.
- **Chronica** — session journaling with tags for characters, locations and
  events.
- **The Goblin's Notebook** — a single-pane view spanning pre-session planning,
  in-session capture and post-session recap.
- **Grimoire** — 14 typed entity schemas, a knowledge graph, a player portal
  with three visibility tiers, and MCP integration so an AI assistant reads the
  live campaign. Free tier: 1 campaign, unlimited entities.
- **Multiloop** — "campaign memory" and character continuity across sessions,
  with reviewable AI suggestions.

Their common bet is that the bottleneck is *writing the notes*, not organising
them. That is a different bottleneck from the one Rolldex currently addresses.

---

## Feature matrix

Rolldex's column is what actually ships today, per `docs/features/`.

| Capability | Rolldex | World Anvil | Kanka | LegendKeeper | Obsidian Portal | Scabard |
|---|---|---|---|---|---|---|
| Wiki-style entity pages | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdown / rich text editor | ✅ Tiptap | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reusable templates | ✅ slash menu | ✅ 25+ w/ prompts | ✅ | ✅ | — | ✅ |
| GM-only private notes | ✅ field-level | ✅ inline spoilers | ✅ | ✅ inline | ✅ section | ✅ |
| Hide whole entity from players | ✅ `isSecret` | ✅ | ✅ granular | ✅ granular | ✅ | ✅ |
| Free-form tags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Filter lists by tag | ❌ `RDX-02` | ✅ | ✅ | ✅ | ✅ | ✅ |
| User-definable entity types | ❌ 5 hard enum, `RDX-04` | ✅ | ✅ ~20 | ✅ free-form | — | ✅ |
| Custom fields / attributes | ❌ | ✅ | ✅ | ✅ | — | ✅ |
| **Explicit typed relationships** | ❌ `RDX-09` | ✅ | ✅ | ✅ | — | ✅ |
| Implicit / mention-based relations | ✅ **distinctive** | — | — | partial (auto-link) | — | partial |
| Relationship graph view | ❌ | ✅ webs | ✅ (paid) | ✅ boards | — | ✅ |
| Inline `@mention` entity links | ❌ `RDX-15` | ✅ | ✅ | ✅ auto-link | ✅ | ✅ |
| Interactive maps with pins | ✅ | ✅ | ✅ | ✅ | ✅ (1 free) | ✅ |
| Nested / layered maps | ❌ | ✅ layers | ✅ layers | ✅ nested | — | — |
| Custom fantasy calendar | ✅ **strong** | ✅ | ✅ +moons/seasons | ✅ +moons | ✅ (paid) | — |
| Timeline | ✅ flat, date-sorted | ✅ eras | ✅ eras | ✅ eras, parallel | — | ✅ |
| Quests / plots / arcs | ❌ `RDX-18` | ✅ plots | ✅ quests | ✅ | — | ✅ adventures |
| Session notes | ✅ first-class | ✅ | ✅ journals | ✅ | ✅ adventure log | ✅ |
| Stat blocks (structured) | ⚠️ markdown callout only | ✅ 100+ systems | ✅ sheets | — | ✅ | ✅ |
| SRD / rules reference | ❌ | ✅ 5e, PF | — | — | — | — |
| Dice roller / DM screen | ❌ | ✅ | — | — | — | — |
| Inventories / items | ❌ | ✅ | ✅ | — | — | ✅ |
| Full-text search of notes | ❌ names only, `RDX-16` | ✅ | ✅ | ✅ instant | ✅ | ✅ |
| Command palette | ✅ Cmd-K | — | — | ✅ | — | — |
| Multiple GMs / co-authors | ❌ single ADMIN, `RDX-17` | ✅ | ✅ roles | ✅ | ✅ (paid) | ✅ |
| Real-time collaboration | ❌ | partial | ✅ | ✅ | — | — |
| Granular per-player permissions | ❌ binary | ✅ | ✅ | ✅ | ✅ (paid) | ✅ |
| Public web publishing | ❌ | ✅ themes | ✅ | ✅ | ✅ | ✅ |
| Version history | ❌ `RDX-20` | ✅ | ✅ recovery | — | ✅ (paid) | — |
| Custom CSS / theming | ❌ | ✅ | ✅ | ❌ | ✅ | — |
| Import / export | ⚠️ CSV, lossy, `RDX-19` | ✅ | ✅ + API | ✅ multi-format | — | — |
| Offline / local-first | ❌ | — | — | ✅ | — | — |
| VTT integration | ❌ | ✅ Foundry | — | — | — | — |
| Discord / webhooks | ❌ | — | ✅ | — | — | — |
| AI assistance | ❌ | partial | — | ❌ | — | ✅ |
| OAuth / social login | ❌ email+password only | ✅ | ✅ | ✅ | ✅ | ✅ |

### Zooming in: quest and plot tracking

The matrix has one row for quests, which hides that "quest tracking" is five
separate capabilities. Worth decomposing, because it's the largest single gap
and the one most likely to be over- or under-built. Full analysis in
`plans/tasks/RDX-18`.

| Capability | Who does it | Shape |
|---|---|---|
| Quest as a page with a status | Kanka, Scabard, CharGen, Archivist | Kanka's is a **boolean** `is_completed`; RPGX and Archivist both use five states and both distinguish "not started" from "stalled" |
| Ordered objectives / milestones | RPGX Quest Log, CharGen | Individually completable, with **hidden milestones** a GM reveals later |
| Per-link role on involved entities | Kanka | Quest *elements*: `{ entity_id, role, description, visibility_id }` — the label, the prose and the secrecy all belong to the link, not the entity |
| Hierarchy — sub-quests, plot trees | Kanka (`quest_id`), World Anvil (parent plot) | WA warns that a parent cycle makes the plot list unviewable, so cycle detection is mandatory |
| Progress per session | CharGen ("session-level movement") | **World Anvil does not have this** — session reports link to sessions, not plots; it's an open community request on their own site |

Two findings that cut against building a quest table:

- **LegendKeeper, the best-executed tool in the market, has no quest object at
  all.** Quest flows are drawn on Boards as flowcharts — page cards joined by
  labelled arrows. Their answer was a canvas plus good linking, not a schema.
- Kanka has ~20 entity types and the *weakest* status model of anyone. More
  types is not the same as better tracking.

And one that cuts for it: progress-per-session is barely served anywhere, and
sessions are already first-class in Rolldex in a way they aren't in a
worldbuilding wiki. That's the part worth building, if any of it is.

---

## Where Rolldex is actually different

Three things are genuinely not commodity, and they all fall out of the
local-first campaign bundle described in `AGENTS.md`:

1. **Everything is instant.** The entire campaign arrives in one round-trip, so
   Quick Find, related entities, the timeline and CSV duplicate detection are
   synchronous in-memory work. No spinners, no debounce, no pagination. World
   Anvil's most-cited weakness is page load speed; LegendKeeper's most-cited
   strength is that it *isn't* slow. This is a competitive axis, not just an
   implementation detail.
2. **Relationships require no bookkeeping.** `computeRelatedEntities` infers
   links from name mentions in prose. Every incumbent makes the GM declare
   links by hand, and the universal complaint about wiki tools is the
   maintenance burden. Obsidian's graph is the only close analogue, and it's a
   general-purpose tool.
3. **The calendar refuses to corrupt data.** `updateCalendar` blocks a change
   that would orphan existing dates and names the offenders. Most competitors
   let you edit a calendar and silently break every date on it.

Rolldex is also keyboard-first (Cmd-K / Cmd-E / Cmd-S) in a market where only
LegendKeeper bothers, and single-tenant-friendly with no pricing tiers to
model.

## The gaps that are table stakes

These are things a DM evaluating Rolldex against any of the five wiki tools
will notice within ten minutes. Each is now tracked; roughly in order of how
loudly they're missing:

1. **Inline entity links** (`RDX-15`). There is no way to write `[[Dave]]` in a
   session note and get a link. Every competitor has this, usually as
   `@mention` autocomplete. It is also the natural companion to `RDX-06`'s
   quick-create, which already contemplates inserting a link at the cursor.
   The open question is the storage format, since markdown round-tripping is a
   hard contract and renames break name-based links.
2. **Explicit relationships** (`RDX-09`). Implicit inference is a differentiator
   *in addition to* declared links, not a replacement for them — "Rachel is
   Dave's daughter" is not expressible today.
3. **Full-text search** (`RDX-16`). Quick Find matches names only, on
   substring, capped at 5 per group in bundle order. The bundle already
   contains every note body; this is client-side work, not a backend project.
4. **Tag filtering** (`RDX-02`) — tag chips are currently inert text, which
   reads as broken rather than incomplete.
5. **A second admin** (`RDX-17`). `memberTypeEnum` has one value and
   `createdById` is the only route to ADMIN. Co-GMs and ownership transfer are
   ordinary asks; the current model can't express either.
6. **Quest / plot tracking** (`RDX-18`). The one content shape every
   RPG-native competitor has that Rolldex doesn't. The composition of `RDX-03`,
   `RDX-04` and `RDX-09` covers the quest *page* but not the *tracking* — see
   "Zooming in" above. Two of the gaps are better closed inside those tasks
   than here: terminal-value marking on a tag group, and a per-instance note
   and visibility on a relationship.
7. **Full-fidelity export** (`RDX-19`). CSV covers nouns and sessions and
   silently drops tags (`RDX-14`), maps, pins and templates. "You own your
   data" is a stated selling point for LegendKeeper and Obsidian, and a real
   objection for a hosted tool with no export. The bundle is already almost
   exactly the right payload, which makes this cheap for its weight.
8. **User-definable entity types** (`RDX-04`). Five hard-coded types is the
   fewest in the market by a wide margin.
9. **Version history** (`RDX-20`). Nothing protects against a bad edit to a
   50,000-character note. Two competitors sell this as a paid feature. Note
   this is an undo of last resort, not the concurrent-edit handling `AGENTS.md`
   rules out.

## The gaps that are strategic choices

Not obviously worth building — listed so the decision is explicit rather than
accidental:

- **Public publishing and theming.** World Anvil's whole business. A large
  surface, and orthogonal to running a game.
- **Stat blocks, SRDs, dice, DM screen.** This is VTT territory. The `stat-block`
  callout is a deliberate low-cost stand-in.
- **Real-time collaboration.** `AGENTS.md` explicitly rules out the concurrency
  work this needs, and the stated assumption (one DM editing at a time) holds.
- **Inventories and attributes.** Kanka's answer to "my system needs a field you
  don't have". Structured attributes would compete with the markdown-notes
  approach rather than complement it.
- **AI session recaps.** The newcomers' entire pitch. Different problem, but
  the one with the most current market momentum — and Rolldex's whole-campaign
  bundle is an unusually good context payload for it.
- **Nested maps.** LegendKeeper's signature feature. Pins already carry a
  target XOR; a map-targeting pin is a small schema change and a large UX one.

## Positioning

The honest read: Rolldex is a **fast, low-ceremony campaign notebook**, not a
worldbuilding publishing platform. It competes with Kanka and LegendKeeper on
speed and on not making the DM do bookkeeping, and it does not compete with
World Anvil on breadth or with the VTTs on play.

The sharpest version of that positioning is *mid-session capture*: an NPC gets
invented at the table, and it takes seconds to record without losing your
place. `RDX-06` is that use case stated outright, and nothing in the market is
optimised for it — the wikis are all built for prep time, and the AI tools all
work after the session ends. That is the gap worth widening.
