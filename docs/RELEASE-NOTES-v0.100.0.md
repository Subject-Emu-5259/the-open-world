# THE OPEN WORLD — v0.100.0 Release Notes

**Release Date:** August 25, 2026  
**Status:** Submitted to Reddit Devvit for review

---

## Summary

This patch fixes the core social bug that made NPCs feel like bots. Player relationships were stored as JavaScript `Map`s on the server, which do not survive JSON serialization cleanly. Every command returned a player object that dropped the relationship record’s value, flags, and memory. NPCs therefore repeated their opening greeting and ignored what the player just said. v0.100.0 converts relationships to a plain JSON-safe record so every conversation persists across commands and browser refreshes.

---

## Fixed

- **NPC conversation amnesia** — relationships are now a `Record<string, Relationship>` with `value`, `flags`, `metAt`, `lastInteracted`, and `memory`. The server returns the full record to the client, and `loadState` restores it intact.
- **Repeated “Name’s X. What’s yours?” loops** — because the `knows_name` flag now survives, the conversation engine recognizes player introductions instead of restarting the greeting cycle.
- **Memory loss between commands** — NPCs now recall the last few exchanges within the active conversation thread.
- **Relationship bank lookup in `assist`** — `helpNPC` now uses the same plain-record format.
- **Quest reward relationship writes** — `storyline-engine.ts` now updates `relationships[target].value` with a proper record instead of `Map` methods.

## Changed

- `src/server/game-engine.ts`
  - `PlayerState.relationships` changed from `Map<string, number>` to `Record<string, Relationship>`.
  - `initPlayer()` initializes `relationships: {}`.
  - `getPlayer()` no longer needs `Object.fromEntries` conversion.
  - `loadState()` keeps relationships as a plain object and defaults to `{}`.
  - `helpNPC()` uses bracket access on the record.
- `src/server/storyline-engine.ts`
  - quest relationship rewards now read/write `player.relationships[target].value`.
- `src/client/game.ts`
  - Added `relationships` and `currentConversation` fields to the client `PlayerState` interface for type parity.
  - Added v0.100.0 entry to the in-game update log.
- Versions synced to **v0.100.0** in `src/shared/version.ts`, `package.json`, and `src/server/game-engine.ts` header.
- `devvit.json` version property removed to match Devvit schema requirements.

---

## Validation

- `npm run type-check` passed.
- `npm run build` passed.
- `devvit publish --public --bump minor` completed and uploaded **v0.100.0**.

---

## How the old bug reproduced

1. Start a new game.
2. `talk Marcus Williams` → NPC greets first, conversation lock is set.
3. Say your name → NPC would reply with another greeting instead of recognizing the introduction.
4. Because the `knows_name` flag and relationship memory were lost on every request, every line felt like the first line.

## After the fix

1. NPC greets you.
2. You reply.
3. The NPC responds to the actual topic, remembers your name, and the relationship value increases or decreases based on intent.
4. After `bye`, `exit`, `leave`, `later`, `im out`, or `ima head out`, the conversation lock clears normally.

---

## Files touched

- `src/server/game-engine.ts`
- `src/server/storyline-engine.ts`
- `src/client/game.ts`
- `src/shared/version.ts`
- `package.json`
- `devvit.json`
- `docs/RELEASE-NOTES-v0.100.0.md`
- `docs/REDDIT-UPDATE-v0.100.0.md`
- `docs/UPDATE-LOGS.md`
- `docs/roadmap.md`
- `AGENTS.md`

---

*Built for Reddit Devvit — play it directly inside your subreddit.*
