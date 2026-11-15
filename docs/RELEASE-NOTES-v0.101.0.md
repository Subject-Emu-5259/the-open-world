# THE OPEN WORLD — v0.101.0 Release Notes

**Release Date:** August 25, 2026  
**Status:** Submitted to Reddit Devvit for review

---

## Summary

This patch fixes the core social bug that made NPCs feel like bots and hardens the save flow so progress survives refreshes, reinstalls, and accidental tab closes.

Two root issues were fixed:

1. **Relationship data was stored as a JavaScript `Map`**, which does not survive JSON serialization to Redis. Every command returned a player object that dropped the relationship record’s value, flags, and memory, so NPCs repeated their opening greeting and ignored context.
2. **The save flow relied on the client to call `/api/save` after each command**. A reload before the async background request completed could erase recent progress.

v0.101.0 converts relationships to a plain JSON-safe record and makes the server authoritative for persistence: every command is written to Redis inside the request before the response returns. A synchronous `navigator.sendBeacon` flush also fires on tab close/refresh. NPC conversation now uses a new memory-aware local reply generator that recognizes introductions, answers questions, and carries context.

---

## Fixed

- **NPC conversation amnesia** — relationships are now a `Record<string, Relationship>` with `value`, `flags`, `metAt`, `lastInteracted`, and `memory`. The server returns the full record to the client, and `loadState` restores it intact.
- **Repeated “Name’s X. What’s yours?” loops** — the `knows_name` flag survives serialization, and a new name-extraction pattern recognizes `I'm…`, `I am…`, `call me…`, and `my name is…`.
- **Memory loss between commands** — NPCs now recall the last few exchanges within the active conversation thread.
- **Progress loss on refresh** — the server now auto-saves to Redis immediately after every command before returning the response; `navigator.sendBeacon` guarantees a synchronous server flush on `beforeunload`.
- **Relationship bank lookup in `assist`** — `helpNPC` now uses the same plain-record format.
- **Quest reward relationship writes** — `storyline-engine.ts` now updates `relationships[target].value` with a proper record instead of Map methods.

## Added

- **Local NPC reply generator** (`src/server/ai-npc-provider.ts`) — an on-device, zero-dependency “AI bridge” that reads conversation memory, relationship value, NPC personality, time of day, and recent player input to produce contextual greetings, introductions, answers, small talk, farewells, and generic follow-ups.
- **Learned-name propagation** — when the AI generator extracts a name, the conversation engine stores the `knows_name` and `known_name:` flags in the relationship record.
- **Beacon flush on tab close** — `beforeunload` now sends the latest player state to `/api/save` via `navigator.sendBeacon` before falling back to `localStorage`.

## Changed

- `src/server/index.ts`
  - Added `savePlayer()` helper that writes to Redis.
  - `POST /api/init` saves the latest player to slot 1 after character creation and after every command before returning JSON.
  - Empty or invalid save requests fail gracefully with a clear error.
- `src/server/game-engine.ts`
  - `PlayerState.relationships` changed from `Map<string, number>` to `Record<string, Relationship>`.
  - `initPlayer()` initializes `relationships: {}`.
  - `getPlayer()` no longer needs `Object.fromEntries` conversion.
  - `loadState()` keeps relationships as a plain object and defaults to `{}`.
  - `helpNPC()` uses bracket access on the record.
- `src/server/storyline-engine.ts`
  - Quest relationship rewards now read/write `player.relationships[target].value`.
- `src/server/conversation-engine.ts`
  - `tryAI()` now uses `generateNPCReply()` from the local bridge.
  - `wrapAIResponse()` records AI replies in memory, updates relationship value, and sets name flags when a name is learned.
- `src/client/game.ts`
  - Added `relationships` and `currentConversation` fields to the client `PlayerState` interface for type parity.
  - `beforeunload` now calls `navigator.sendBeacon('/api/save', …)` for a synchronous server flush.
  - Updated the in-game update log for v0.101.0.
- `src/shared/types.ts`
  - Added optional `name?: string` to `Player` so runtime display names are typed.
- Versions synced to **v0.101.0** in `src/shared/version.ts`, `package.json`, and `src/server/game-engine.ts` header.
- `devvit.json` version property removed to match Devvit schema requirements.

---

## Validation

- `npm run type-check` passed.
- `npm run build` passed.
- `devvit publish --public --bump minor` completed and uploaded **v0.101.0**.

---

## How the old bug reproduced

1. Start a new game.
2. `talk Marcus Williams` → NPC greets first, conversation lock is set.
3. Say your name → NPC would reply with another greeting instead of recognizing the introduction.
4. Because the `knows_name` flag and relationship memory were lost on every request, every line felt like the first line.

## After the fix

1. NPC greets you.
2. You reply.
3. The NPC recognizes introductions, answers questions, responds to small talk, and refers to you by name once it knows you.
4. After `bye`, `exit`, `leave`, `later`, `im out`, or `ima head out`, the conversation lock clears normally.
5. Refresh the page — your save, relationships, and current conversation state return.

---

## Files touched

- `src/server/index.ts`
- `src/server/ai-npc-provider.ts`
- `src/server/game-engine.ts`
- `src/server/storyline-engine.ts`
- `src/server/conversation-engine.ts`
- `src/client/game.ts`
- `src/shared/types.ts`
- `src/shared/version.ts`
- `package.json`
- `devvit.json`
- `docs/RELEASE-NOTES-v0.101.0.md`
- `docs/REDDIT-UPDATE-v0.101.0.md`
- `docs/UPDATE-LOGS.md`
- `AGENTS.md`

---

*Built for Reddit Devvit — play it directly inside your subreddit.*
