# Story / Journal System — Design Spec (v0.108.15)

> Written BEFORE implementation, per Dre's standing rule: the story/journal
> system gets its own spec, not crammed into a feature batch. This spec
> covers the v0.108.15 slice only. Nothing here invents lore.

## Principle

The journal reports what the player has ALREADY done, using data the game
already tracks. No new storylines, no invented NPC backstories, no new
characters, no new lore text. Every journal line traces to one of: an
active quest from the StorylineEngine, an unlocked achievement, a visited
city, an owned property / business / vehicle, a job, or a relationship
value. If a fact is not in existing state, the journal does not claim it.

## Surface

- Command: `journal` (alias: `story`). Text view, same as every other
  info command (`status`, `quests`, `achievements`). No client screen
  work in this version — the .14 menu work stays untouched, and a
  dedicated client journal screen is a follow-up, not a silent cut:
  the command IS the v0.108.15 journal screen for a text game.
- Help: listed under Info alongside `quests` / `achievements`.

## Sections (in order)

1. **Active quests** — straight from `StorylineEngine.getActiveQuests()`
   (the same source as `quests`), with completed/total objectives.
   Empty state: "No active quests — talk to NPCs and ask for a quest."
2. **Story arcs** — milestone tracks computed from live player state.
   Each arc shows its current stage and the next milestone. Arcs:
   - *Making a Living* — stages: Unemployed → First job → 10 shifts →
     50 shifts (source: `player.job`, `workDaysCompleted`).
   - *Putting Down Roots* — stages: No property → First property →
     3 properties → Renovated property (source: `properties`,
     `renovationLevel`).
   - *Knowing the City* — stages: 1 city → 5 cities → 10 cities, plus
     people met (source: `visitedCities`, count of `relationships`).
   - *On the Road* — stages: No vehicle → First vehicle → Upgraded
     vehicle (source: `vehicles`, performance `upgrades`).
   - *Building a Business* — stages: No business → First business →
     3 businesses (source: `businesses`, new in v0.108.15).
   - *Inner Circle* — stages: No close friend → 1 friend at 50+ →
     1 close friend at 75+ (source: `relationships` values).
   Arc stage text uses only these counters. No narrative prose is
   invented about the player's life beyond the milestone itself.
3. **Journal log** — a short, capped (50 entries, newest first) list of
   dated entries the game appends when something reportable happens:
   a quest starts, an achievement unlocks. Entry format: game-date +
   one line naming the quest / achievement. Nothing else writes to
   the log in this version, so it cannot drift from real events.

## State (all additive — old saves load unchanged)

- `player.journalLog?: { date: string; text: string }[]` — appended on
  quest start (in the conversation quest hook) and on achievement
  unlock (in the command wrapper, next to the existing unlock
  announcement). Missing on old saves = empty log.
- No other new persisted state. Arcs are computed, never stored, so
  they can never go stale relative to the save.

## What this version deliberately does NOT do

- No quest-chain authoring, no branching story, no new NPC dialogue.
- No rewards for reading the journal (it is a record, not a farm).
- No changes to quest completion, dialogue, or Optra behavior.
- No client menu/screen changes.

## Verification

- `journal` on a fresh save shows all six arcs at stage 1 and an
  empty log, without error.
- `journal` after a quest start shows that quest and a log entry.
- `journal` after an achievement unlock shows the unlock in the log.
- An old save (no `journalLog` field) loads and `journal` works.
