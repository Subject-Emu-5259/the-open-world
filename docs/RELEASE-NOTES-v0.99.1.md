# THE OPEN WORLD v0.99.1

## Save System Rebuild + NPC Conversation Overhaul

**Release Date:** August 24, 2026
**Build Status:** `npm run type-check` ✅ | `npm run build` ✅

---

## 🔥 What We Fixed

### 1. Save System Rebuilt from the Ground Up

Players reported that every refresh or browser reload wiped their progress and forced a new game.

**Root Cause**

- `GET /api/init` always returned `hasPlayer: false`, so the client never offered “Continue.”
- The client only attempted auto-resume from session state, which is cleared on refresh.
- Auto-save only fired from menu actions; normal gameplay commands never saved progress.
- Save success was reported before the server sync finished, masking failures.
- Server-side save keys depended on `context.username` with no fallback in some paths.

**What Changed**

- `GET /api/init` now checks Redis for an existing save in slot 1 and returns `hasPlayer: true` and the full player object if one exists.
- The landing screen now performs an async save probe and shows **Continue** when a save is found, otherwise **New Game**.
- `startGame()` now calls `clientLoad(1)` automatically when starting a new session if no session state exists.
- Every successful command now triggers a fire-and-forget `clientSave(1, player)` so progress is persisted continuously.
- `clientSave()` now waits for the server response, surfaces sync failures, and only reports success after the server confirms.
- Added `window.onbeforeunload` to attempt a final save when the player leaves Reddit or refreshes.
- Removed the dead duplicate `file src/server/server.ts` that contained conflicting logic and ignored the real `GameEngine`.
- Save probes use a stable fallback key derived from both username and user ID to survive missing `context.username`.

### 2. NPC Conversation System Overhauled

Players reported that NPCs “act like bots” — they never started talking, replies were repetitive, and conversations felt disconnected.

**Root Cause**

- `talk` / `greet` commands set `currentConversation` but never cleared it, so commands were swallowed after a goodbye.
- Replies came from 3–5 keyword-matched strings with no context, relationship, mood, or world-state influence.
- NPCs never greeted the player first; they only responded after the player spoke.
- No location gating meant players could talk to NPCs anywhere in the world instantly.
- `text [contact]` was broken because relationships were stored as a plain object, not a `Map`, returning neutral replies for everyone.

**What Changed**

- Added `generateGreeting()` to the conversation engine so NPCs can open dialogue contextually when `talk` or `greet` begins.
- `talk` and `greet` now emit a greeting line immediately, then keep the conversation open for the player’s next input.
- Farewells and conversation-end commands now properly clear `currentConversation`, freeing the command input.
- Replies now incorporate:
  - NPC mood & relationship toward the player
  - Current city and district
  - Time of day
  - Faction allegiance
  - Memory of recent interactions
- Added cooldowns and location logic so NPCs react differently based on schedule context and proximity.
- Fixed `text` / SMS responses by reading relationships through `npc.relationship` (numeric) instead of a non-existent `Map` method.
- Social commands now validate the NPC is reachable before responding.

### 3. Cohesion & Stability

- Updated `file docs/UPDATE-LOGS.md`, `file docs/bugs.md`, and this release note.
- Bumped version indicator strings to `0.99.1` across the client.
- Cleaned stale audit files and outdated comments.
- Verified with `npm run type-check` and `npm run build`. No compile-time errors.

---

## ⚠️ Known Limitations

- **Reddit iframe localStorage:** The game still runs in Reddit’s sandbox, so `localStorage` is cleared across sessions. Progress relies on Reddit Devvit Redis, which is why the server-side save path had to be hardened.
- **Old saves created before v0.99.1:** They will be detected automatically if they live in Redis slot 1. If a player created multiple manual slots, only slot 1 is checked at startup; other slots remain accessible through the load flow.
- **First-load latency:** The save probe on the landing screen adds one async roundtrip, but it eliminates the “fresh game every refresh” bug.

---

## 📋 Dev Notes for Rebuild

For future reference, the save loop now works like this:

1. Client loads and calls `GET /api/init`.
2. Server checks Redis for `save:<username>:1` → if found, returns `hasPlayer: true` + player JSON.
3. Client renders **Continue** or **New Game**.
4. If Continue or auto-load, `clientLoad(1)` hydrates `state.player` from Redis.
5. Every command response includes the updated player state; on success the client immediately calls `clientSave(1, state.player)`.
6. If the save fails, the client logs the error in the game console and retries on the next command.

The conversation loop now works like this:

1. Player uses `talk [name]` or `greet [name]`.
2. Server validates location/proximity and starts a conversation context.
3. Server emits an NPC greeting line generated from mood, place, time, faction, and relationship.
4. Player’s next free-text input is routed through the conversation engine instead of the regular command dispatcher.
5. Replies use contextual branch logic and memory.
6. Farewell commands clear the conversation context and restore normal command input.

---

## 🙏 Community

Thanks to everyone who reported the save wipes and NPC behavior issues. This rebuild targets the exact failure points raised by players.

Next up: expanded international mission strings and the vehicle racing system.

— THE OPEN WORLD Dev Team