## v0.102.0 — Serverless LLM NPC Brain + Save Flow Rebuild
Fetched: August 25, 2026

### Fixed
- NPC conversation loop where NPCs repeated the same greeting/name-ask lines.
- Save identity key now uses `userId ?? username ?? loid ?? player` for stability.
- Server-side save is compressed, expires after 30 days, and writes before the response returns.
- Client flush on tab close/refresh uses `navigator.sendBeacon` as a backup to the per-command auto-save.
- `relationships` command added so players can inspect their NPC standings.

### Added
- `src/server/llm-provider.ts`: Hugging Face preferred, with OpenRouter, Groq, and Gemini fallbacks.
- API keys configured through Devvit global settings (`hfApiKey`, `openrouterApiKey`, `groqApiKey`, `geminiApiKey`).
- LLM prompt includes NPC identity, city/district, time, weather, relationship, and recent memory.
- Automatic fallback to the local template generator when no LLM key is set or all providers fail.
- `POST /api/npc-reply` route added to `src/server/index.ts` for direct NPC reply queries.
- Environment model overrides: `HF_NPC_MODEL`, `OPENROUTER_NPC_MODEL`, `GROQ_NPC_MODEL`, `GEMINI_NPC_MODEL`.


### Changed
- `src/server/ai-npc-provider.ts`: calls `fetchNPCReply` first, then falls back to local templates; farewell handled locally for clean exits.
- `src/server/game-engine.ts`: stable save key helper; relationship sync from saved state into NPC objects; name flag initialization at conversation start.
- `src/server/index.ts`: uses `redisCompressed`, 30-day expiration, stable user key.
- `src/server/conversation-engine.ts`: improved memory recording and learned-name handling.
- `src/client/game.ts`: `sendBeacon` flush, version log updated.
- `src/shared/version.ts` and `package.json` bumped to `0.102.0`.
- `devvit.json`: added `permissions.http` for LLM domains and `settings.global` for API keys.
- `src/server/index.ts`: added `/api/npc-reply` route using current server time context.


### Validation
- `npm run type-check` passed.
- `npm run build` passed.

---

## Added
- `src/server/llm-provider.ts`: serverless LLM bridge (Hugging Face preferred, with OpenRouter, Groq, and Gemini fallbacks).
- `src/server/ai-npc-provider.ts`: now tries the LLM bridge first and gracefully falls back to the local template pipeline.
- Environment overrides for LLM models: `HF_NPC_MODEL`, `OPENROUTER_NPC_MODEL`, `GROQ_NPC_MODEL`, `GEMINI_NPC_MODEL`.

### Fixed
- Save identity now uses `userId → username → loid → player` priority, so progress binds to the Reddit account instead of a volatile display name.
- `navigator.sendBeacon` fires on `beforeunload` and `visibilitychange` to flush progress to the server before the tab dies.
- `loadState` now restores each NPC's relationship value from the saved player record.
- NPC name recognition runs in the LLM parser and the local fallback; name loops are eliminated.

### Changed
- `src/server/index.ts`: `redisCompressed` import, `saveKey()` helper, 30-day Redis expiration, `serverSavePlayer` / `serverLoadPlayer` helpers.
- `src/server/game-engine.ts`: added `relationships` command, patched type-strict relationship casts, and seeded `knows_name`/`known_name` on first talk when the player already has a name.
- `src/client/game.ts`: beacon flush, v0.102.0 update-log entry.
- `src/shared/version.ts`, `package.json` bumped to `0.102.0`.

### Validation
- `npm run type-check` passed.
- `npm run build` passed.

---

## v0.101.0 — NPC Memory & Save Persistence Overhaul
Fetched: August 25, 2026

### Fixed
- NPCs forgot everything between messages because `relationships` was stored as a `Map`, which does not JSON-serialize to Redis.
- Converted `relationships` to a plain `Record<string, Relationship>` so NPC memory, flags, and relationship value survive every save/load.
- `knows_name` flag and conversation memory now persist, fixing the "Name's Marcus. What's yours?" loop.
- `assist [name]` and quest reward relationship changes updated to use the plain-object record.
- Full player state (including `currentConversation`) now serializes into the server-side auto-save.
- server-side authoritative auto-save after every command in POST /api/init; synchronous navigator.sendBeacon flush on tab close.

### Added
- local memory-aware NPC reply generator in src/server/ai-npc-provider.ts; natural name extraction from 'I'm...', 'I am...', 'call me...', and 'my name is...'.

### Changed
- `src/server/game-engine.ts`: `relationships` is now `{}`; `initPlayer`, `loadState`, `getPlayer`, `talk`, `continueConversation`, and `helpNPC` all use bracket notation.
- `src/server/storyline-engine.ts`: quest reward relationship update uses `Record<string, Relationship>`.
- `src/shared/version.ts`, `package.json`, and in-file headers bumped to `0.101.0`.
- `src/client/game.ts` update-log screen updated.
- `docs/RELEASE-NOTES-v0.101.0.md` and `docs/REDDIT-UPDATE-v0.101.0.md` created.
- POST /api/init persistence; conversation-engine tryAI uses new AI bridge and records learnedName; client beforeunload beacon; shared/types.ts Player.name optional; docs and in-game log updated.

### Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit publish --public --bump minor` submitted v0.101.0 for review.

---

## v0.99.3 — NPC Relationship Memory Fix + Save Serialization Hardening
Fetched: August 25, 2026

### Fixed
- `player.relationships` are now stored as a plain JSON-safe `Record<string, Relationship>` instead of a JavaScript `Map`.
- Relationship objects (value, flags, memory, metAt, lastInteracted) are preserved through every Redis save/load loop.
- NPCs now remember their last greeting, the player's name, and recent conversation history across commands and page reloads.
- `helpNPC` and quest reward paths were updated to use the new relationship record shape.
- Removed stale `Version: 0.96.0` comment from `game-engine.ts`.
- Bumped version metadata to v0.99.3.

### Validation
- `npm run type-check` passed.
- `npm run build` passed.
- Publish pending Devvit OAuth completion.

---

## v0.99.2 — Save System & NPC Conversation Patch
Fetched: August 25, 2026

### Added / Changed
- Rebuilt save flow with server-first Redis persistence.
- `GET /api/init` returns saved player from slot 1; splash shows Continue/New Game.
- Auto-save after every command and on page unload / visibility change.
- `localStorage` kept as offline fallback only.
- Overhauled NPC conversation: NPCs greet first, contextual lines, proper exit words.
- Fixed `text [name] [message]` to use relationship-aware replies.
- Fixed `people` to show city-wide NPCs when district data is missing.
- Bumped version to v0.99.2.

### Validation
- `npm run type-check` passed.
- `npm run build` passed.
- Devvit publish pending fresh Reddit OAuth login.

---

## v0.99.2 — Server-First Save Flow + NPC Greeting & Farewell Polish
Fetched: August 25, 2026

### Summary
Finalized the save authority so progress survives browser refreshes, and removed known NPC conversation traps (silent start, no exit, wrong relationship lookup).

### Changes
- **Client boot flow (`src/client/game.ts`)** – now starts with `/api/init` and continues an existing player instead of always creating a new one.
- **Auto-save after every command** – `clientSave(slot, player)` is called after every server response.
- **Unload flush** – `beforeunload` pushes the latest player state to the server before the page closes.
- **New Game clears server slot** – explicit `/api/clear-save/1` so a restart is clean.
- **Save errors are logged** – in-game activity feed shows `Save failed` instead of silently swallowing.
- **NPC greets first** – `talk [name]` opens with `generateGreeting()` from the NPC.
- **Farewell tokens release conversation lock** – mapped `bye/goodbye/leave/exit/later/im out`.
- **text command fix** – `relationships` object handling corrected.
- **people command robust** – returns city NPCs even when district data is sparse.
- **Dead file removed** – `src/server/server.ts` duplicate.
- **Version bump** – `v0.99.2` across shared version and docs.

### Fixed Issues
- Players losing progress on refresh / reload.
- NPCs not greeting first / feeling bot-like.
- Conversation lock never clearing on goodbye.

---

## v0.99.2 — Server-Side Save Fix + NPC Conversation Polish
Fetched: August 25, 2026

### Fixed
- Save flow is now server-first: every command triggers a Redis save to slot 1, and `/api/init` returns the existing player state for a Continue option.
- `beforeunload` flushes current state to the server so reloads do not lose progress.
- New Game path explicitly clears the server-side save slot and resets in-memory state.
- NPCs greet the player first when using `talk [name]` via `conversationEngine.generateGreeting()`.
- Conversation lock is cleared by `bye`, `leave`, `exit`, `later`, `im out`, `goodbye`, preventing commands from being swallowed.
- `people` returns all city NPCs when district data is sparse.
- `text [name]` handles relationship objects correctly.
- Dead duplicate `src/server/server.ts` removed.

### Changed
- `src/shared/version.ts` bumped to v0.99.2.
- `docs/RELEASE-NOTES-v0.99.2.md` and `docs/REDDIT-UPDATE-v0.99.2.md` created.

### Files touched
- `src/client/game.ts`, `src/server/index.ts`, `src/server/game-engine.ts`, `src/server/social-engine.ts`, `src/server/conversation-engine.ts`, `src/server/comm-hub.ts`, `src/shared/version.ts`


## v0.99.1 — Save System Rebuild + NPC Conversation Overhaul
Fetched: August 25, 2026

### Fixed
- Save loss on refresh: Redis slot 1 is now checked on `GET /api/init`; existing saves return the player object.
- Auto-load at startup: client queries slot 1 and renders Continue when a save is found.
- Auto-save after every successful command via fire-and-forget `clientSave(1, state.player)` call inside `handleCommand`.
- Dead duplicate `src/server/server.ts` removed; no more conflicting legacy endpoints.
- NPCs now speak first: `greet [name]` returns a contextual greeting from `conversationEngine.generateGreeting()`.
- `talk [name]` is fully wired to the conversation engine and updates returned `player` state.
- Conversation lock cleared by `farewell`/`bye`/`goodbye`, preventing commands from being swallowed.
- `text [npc] [message]` fixed to use `commHub.getContacts()` instead of the non-existent `.get()` method.

### Changed
- Save flow now uses explicit slot `1` for the primary save.

### Files touched
- `src/client/game.ts`, `src/server/index.ts`, `src/server/game-engine.ts`, `src/server/conversation-engine.ts`, `src/server/comm-hub.ts`


## v0.99.1 - Save & Conversation Rebuild (2026-08-24)
- **Save system**: server-side Redis as authoritative store (slot 1 auto-save), localStorage as offline fallback, automatic save detection on splash screen, auto-save after every command/window unload.
- **NPC conversation**: NPCs now respond automatically when `talk` starts, greeting the player based on relationship/time/state; conversations can be exited with `bye`, `end`, `leave`, or `exit`.
- **Social fixes**: `people` command falls back to city-wide NPC list when district match is empty; `text` command reads relationship state properly (object not Map).
- **Dead code**: removed unused `src/server/server.ts` duplicate handler.
- **Build/type-check**: both pass.

## Version: v0.99.0 — August 24, 2026

### ✅ New in v0.99.0
- **Global NPC Expansion**: added 10 new international NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Roles include Harajuku designer, Notting Hill bookshop owner, Seine boat captain, Berlin museum curator, Dubai falconer, Mexico City mezcal sommelier, Toronto graffiti artist, Sydney Opera House stagehand, Akihabara arcade technician, and Paris antique map seller.
- **New City Encounters**: added 5 fresh random events — Pop-Up Street Gallery, Language Exchange Picnic, Vintage Record Fair, Rooftop Herb Garden, and Impromptu Dance Parade — that reward creativity, charisma, happiness, intelligence, money, community reputation, or stress relief depending on player choice.
- **Version sync**: all project files aligned to `v0.99.0` with `src/shared/version.ts` as the single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — Added 10 new NPC definitions (npc_314–npc_323) tied to valid international districts.
- `src/server/storyline-engine.ts` — Added the v0.99.0 random-events block.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.99.0`.
- `package.json` — version bumped to `0.99.0`.
- `src/client/game.ts` — added v0.99.0 update entry.
- `docs/roadmap.md` — status, last-updated, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.99.0 entry added.
- `AGENTS.md` — version and last-updated bumped.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` requires Devvit CLI authentication; current session is not logged in.
- `devvit publish --public --bump minor` not executed because the Devvit CLI session expired and needs a fresh Reddit OAuth login.

---

## Version: v0.98.0 — August 21, 2026

### ✅ New in v0.98.0
- **Global NPC Expansion**: added 10 new international NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Roles include sushi apprentice, jazz archivist, macaron baker, desert botanist, Kreuzberg curator, lucha mask maker, Kensington barista, Bondi surf rescuer, bonsai teacher, and Deira spice merchant.
- **New City Encounters**: added 5 fresh random events — Sandstorm Shortcut, Rooftop Yoga Class, Underground Comedy Night, Book Club on the Train, and Midnight Dog Walker Meetup — that reward fitness, charisma, happiness, intelligence, money, community reputation, or stress relief depending on player choice.
- **Version sync**: all project files aligned to `v0.98.0` with `src/shared/version.ts` as the single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — Added 10 new NPC definitions (npc_304–npc_313) tied to valid international districts.
- `src/server/storyline-engine.ts` — Added the v0.98.0 random-events block.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.98.0`.
- `package.json` — version bumped to `0.98.0`.
- `src/client/game.ts` — added v0.98.0 update entry.
- `docs/roadmap.md` — status, last-updated, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.98.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` requires Devvit CLI authentication; current session is not logged in.
- `devvit publish --public --bump minor` not executed because the Devvit CLI session expired and needs a fresh Reddit OAuth login.

---

## Version: v0.97.0 — August 17, 2026

### ✅ New in v0.97.0
- **Global NPC Expansion**: added 10 new international NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Roles include plant shop owner, chess hustler, tea ceremony teacher, capoeira instructor, Afrobeat promoter, ukiyo-e printmaker, opera house usher, pizza al taglio chef, perfume blender, and bonsai master.
- **New City Encounters**: added 5 fresh random events — Rooftop Beehive Discovery, Lost Interview Invitation, Neighbor's Moving Sale, Street Piano Duet, and Late-Night Food Truck Discovery — that reward charisma, happiness, money, intelligence, community reputation, or stress relief depending on player choice.
- **Version sync**: all project files aligned to `v0.97.0` with `src/shared/version.ts` as the single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — Added 10 new NPC definitions (npc_294–npc_303) tied to valid international districts.
- `src/server/storyline-engine.ts` — Added the v0.97.0 random-events block.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.97.0`.
- `package.json` — version bumped to `0.97.0`.
- `src/client/game.ts` — added v0.97.0 update entry.
- `docs/roadmap.md` — status, last-updated, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.97.0 entry added.
- `AGENTS.md` — version and last-updated bumped.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` requires Devvit CLI authentication; current session is not logged in.
- `devvit publish --public --bump minor` not executed because the Devvit CLI session expired and needs a fresh Reddit OAuth login.

---

## Version: v0.96.0 — August 14, 2026

### ✅ New in v0.96.0
- **More International NPCs**: added 10 new NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Roles include street poet, retro game shop owner, bookbinder, documentary filmmaker, private chef, art collector, jazz saxophonist, harbour tour guide, street artist, and cocktail bartender.
- **More City-Life Random Events**: added 5 fresh random events — Rooftop Garden Invitation, City-Wide Scavenger Hunt, Street Magician Disappearing Act, Vintage Polaroid Swap, and Midnight Ramen Queue — that reward charisma, intelligence, happiness, reputation, or money depending on player choice.
- **Version sync**: all project files aligned to `v0.96.0` with `src/shared/version.ts` as the single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — Added 10 new NPC definitions (npc_284–npc_293) tied to valid international districts.
- `src/server/storyline-engine.ts` — Added the v0.96.0 random-events block.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.96.0`.
- `package.json` — version bumped to `0.96.0`.
- `src/client/game.ts` — added v0.96.0 update entry.
- `docs/roadmap.md` — status, last-updated, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.96.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` requires Devvit CLI authentication; current session is not logged in.
- `devvit publish --public --bump minor` not executed because the Devvit CLI session expired and needs a fresh Reddit OAuth login.

---

## Version: v0.95.0 — August 13, 2026

### ✅ New in v0.95.0
- **International NPC Expansion**: added 10 new NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Roles include jazz club manager, pub landlord, pastry chef, graffiti curator, yacht broker, lucha libre trainer, tech startup founder, surf instructor, Vespa mechanic, and ramen critic.
- **New City-Life Random Events**: added 5 fresh random events — Airport Upgrade Offer, Train Seat Swap, Local Sports Rivalry, Famous Food Queue, and Street Photographer — that reward charisma, happiness, money, intelligence, or stress changes depending on player choice.
- **Version sync**: all project files aligned to `v0.95.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — Added 10 new NPC definitions (npc_274–npc_283) tied to valid international districts.
- `src/server/storyline-engine.ts` — Added the v0.95.0 random-events block.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.95.0`.
- `package.json` — version bumped to `0.95.0`.
- `src/client/game.ts` — added v0.95.0 update entry.
- `docs/roadmap.md` — status, last-updated, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.95.0 entry added.
- `docs/bugs.md` — validation note added; deployment blocked pending Devvit re-authentication.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` requires Devvit CLI authentication; current session is not logged in.
- `devvit publish --public --bump minor` not executed because the Devvit CLI session expired and needs a fresh Reddit OAuth login.

---


## Version: v0.94.0 — August 12, 2026

### ✅ New in v0.94.0
- **Expanded Property Types**: added five new property archetypes — `luxury_penthouse`, `vacation_rental`, `warehouse`, `farmland`, and `offshore_villa` — each with type-specific maintenance, rental income, appreciation, and condition decay.
- **10 New Property Listings**: added across New York, Los Angeles, Dubai, Paris, Miami, Houston, Phoenix, Memphis, Atlanta, and Sydney, including trophy penthouses, seasonal vacation rentals, logistics warehouses, desert farmland, and waterfront villas.
- **Property Renovation System**: new `renovate property [name]` command upgrades owned properties up to Level 5, restoring condition to 100%, raising current value, and increasing monthly rental income.
- **Version sync**: all project files aligned to `v0.94.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/property-engine.ts` — added new `PropertyType` variants, `PROPERTIES_EXPANSION` listings, type-specific economics helper, renovation method, and updated appreciation logic.
- `src/server/game-engine.ts` — wired `renovate property [name]` command, updated property help text.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.94.0`.
- `package.json` — version bumped to `0.94.0`.
- `src/client/game.ts` — added v0.94.0 update entry.
- `docs/roadmap.md` — status, last updated, validation notes, and phase list updated.
- `docs/UPDATE-LOGS.md` — v0.94.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched a local playtest build.
- `devvit publish --public --bump minor` submitted `v0.94.0` for review.

---

## Version: v0.93.0 — August 11, 2026

### ✅ New in v0.93.0
- **International NPC Expansion**: added 10 new NPCs across Tokyo (Asakusa, Harajuku), London (Chelsea), Paris (Le Marais), Berlin (Friedrichshain), Dubai (JBR), Mexico City (Roma), Toronto (Kensington), and Sydney (Newtown).
- **Global City Random Events**: added 5 fresh random events — Night Market Discovery, Subway Serenade, Lost Tourist, Historic Building Tour, and Free Street Haircut.
- **Version sync**: all project files aligned to `v0.93.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — added 10 new international NPCs.
- `src/server/storyline-engine.ts` — added 5 new global random events.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.93.0`.
- `src/client/game.ts` — added v0.93.0 update entry.
- `docs/roadmap.md` — status, last updated, and validation notes updated.
- `docs/UPDATE-LOGS.md` — v0.93.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched a local playtest build.
- `devvit publish --public --bump minor` submitted `v0.93.0` for review.

---

## Version: v0.92.0 — August 10, 2026

### ✅ New in v0.92.0
- **Domestic Real Estate Expansion**: property listings added for Atlanta, Nashville, Chicago, New York, Los Angeles, Miami, Houston, Dallas, and Phoenix.
- **Dynamic Travel Descriptions**: `travelTo` now includes time-of-day atmospheric details.
- **Vehicle Racing System**: added `race` and `race [track]` commands with 8 tracks across domestic and international cities, entry fees, performance-based payouts, vehicle wear, and police heat from underground street races.
- **Driving Skill Integration**: races award driving skill XP; vehicle type and condition affect performance.
- **Version sync**: all project files aligned to `v0.92.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/property-engine.ts` — expanded domestic property listings.
- `src/server/racing-service.ts` — new racing tracks, payout calculation, wear, and heat mechanics.
- `src/server/game-engine.ts` — wired `race` / `races` commands; improved `travelTo` arrival descriptions; updated help text.
- `src/server/vehicle-service.ts` — added `applyWear` helper for race mileage.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.92.0`.
- `package.json` — version bumped to `0.92.0`.
- `src/client/game.ts` — added v0.92.0 update entry.
- `docs/roadmap.md` — status and validation notes updated.
- `docs/UPDATE-LOGS.md` — v0.92.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched a local playtest build.
- `devvit publish --public --bump minor` submitted `v0.92.0` for review.

---

## Version: v0.91.0 — August 8, 2026

### ✅ New in v0.91.0
- **New Achievements**: added Peak Fitness (100 fitness), Renaissance Person (3 skills at level 50), and Trophy Hunter (10 achievements unlocked).
- **New Random Events**: added 5 fresh city-life events — Impromptu Block Party, Unexpected Rainstorm, Street Chess Match, Hidden Bookstore Sale, and Rooftop Movie Night.
- **Travel Fix**: removed the duplicate police checkpoint encounter triggered when a player with high heat arrives in a new city.
- **Version sync**: all project files aligned to `v0.91.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/achievements.ts` — added `peak_fitness`, `skill_master`, and `trophy_hunter` achievements; added helper methods for skill level and unlocked counts.
- `src/server/game-engine.ts` — removed duplicate police checkpoint block; expanded `checkAllAchievements` list to include new medals.
- `src/server/storyline-engine.ts` — added 5 new v0.91.0 random events.
- `src/client/game.ts` — added v0.91.0 update entry.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.91.0`.
- `package.json` — version bumped to `0.91.0`.
- `docs/roadmap.md` — status and validation notes updated.
- `docs/UPDATE-LOGS.md` — v0.91.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched a local playtest build (v0.90.0.2 revision due to existing installed app).
- `devvit publish --public --version=0.91.0` submitted `v0.91.0` for review.

---


## Version: v0.90.0 — August 7, 2026

### ✅ New in v0.90.0
- **International NPC Expansion**: added 10 new international NPCs across Berlin, Paris, Tokyo, Dubai, Mexico City, Toronto, and Sydney, including a ballet instructor, wine merchant, capsule hotel concierge, and superyacht broker.
- **New Random Events**: added 5 city-life events — Sunrise Yoga Class, Bookstore Reading, Vintage Car Parade, Community Cleanup, and Late-Night Food Truck.
- **Version sync**: all project files aligned to `v0.90.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — added 10 international NPCs (npc_254–npc_263).
- `src/server/storyline-engine.ts` — added 5 new random events.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.90.0`.
- `package.json` — version bumped to `0.90.0`.
- `src/client/game.ts` — added v0.90.0 update entry.
- `docs/roadmap.md` — status and validation notes updated.
- `docs/UPDATE-LOGS.md` — v0.90.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched local `0.90.0.1` build.
- `devvit publish --public --bump minor` submitted `v0.90.0` for review.

---


## Version: v0.89.1 — August 6, 2026

### ✅ New in v0.89.1
- **Inline Scroll Trap Fix**: both `default` and `game` post entrypoints now set `"inline": false` in `devvit.json`, so the game opens directly in Expanded Mode and avoids disallowed inline scrolling.
- **Menu Post-Create Stability**: `/internal/menu/post-create` now checks a Redis-backed idempotency key (`menu_post:{subreddit}:{username}`) before calling `reddit.submitCustomPost`. If the moderator already created a post recently, it navigates to the existing post instead of spawning a duplicate; the error toast wording was also softened.
- **Version sync**: bumped to `v0.89.1` across `src/shared/version.ts`, `package.json`, `docs/roadmap.md`, `docs/bugs.md`, `docs/UPDATE-LOGS.md`, `src/client/game.ts`, and `src/server/game-engine.ts`.

### 📁 Files Changed
- `devvit.json` — set `default` and `game` post entrypoints to `"inline": false`.
- `src/server/index.ts` — added Redis idempotency check on menu post-create; improved error handling.
- `src/shared/version.ts` — `GAME_VERSION` bumped to `0.89.1`.
- `package.json` — version bumped to `0.89.1`.
- `src/client/game.ts` — added v0.89.1 update entry; update-version for latest release uses `${GAME_VERSION}` and older v0.89.0 entry is now hardcoded.
- `src/server/game-engine.ts` — version comment updated to `0.89.1`.
- `docs/roadmap.md` — status and validation notes updated.
- `docs/bugs.md` — v0.89.1 bug/validation entry added.
- `docs/UPDATE-LOGS.md` — v0.89.1 entry added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit publish --public --bump patch` submitted `v0.89.1` for review.

---


## Version: v0.89.0 — August 6, 2026

### ✅ New in v0.89.0
- **International NPC Expansion**: added 10 new international NPCs across Dubai, Tokyo, Paris, Berlin, Mexico City, London, Toronto, and Sydney, including roles like spice merchant, robotics engineer, street magician, curator, luchador agent, pub owner, hockey scout, surf instructor, grime DJ, and ramen apprentice.
- **Travel Atmosphere**: added unique arrival descriptions for 13 previously missing domestic cities — West Memphis, Little Rock, Southaven, New Orleans, Miami, Charlotte, Detroit, Philadelphia, Las Vegas, Houston, Dallas, Phoenix, and Seattle.
- **New Random Events**: added 5 fresh city-life events — Street Busker, Lost Tourist, Community Garden Invite, Free Sample Frenzy, and Rooftop Party Invite.
- **New Travel Achievements**: `Global Citizen` (visit 5 international cities) and `Passport Collector` (visit all 8 international cities) now track progress and unlock automatically.
- **Achievement Logic Fix**: corrected the international city list in `achievements.ts` to include Mexico City and Toronto, replacing the non-existent Singapore reference.
- **Version sync**: all project files aligned to `v0.89.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — added 10 international NPCs (npc_244–npc_253).
- `src/server/game-engine.ts` — expanded travel arrival descriptions for all missing domestic cities and added progress updates for new travel achievements.
- `src/server/storyline-engine.ts` — added 5 new random life events.
- `src/server/achievements.ts` — added `global_citizen` and `passport_collector` achievements, updated international city list.
- `src/client/game.ts` — added v0.89.0 update entry.
- `src/shared/version.ts` — GAME_VERSION bumped to `0.89.0`.
- `package.json` — version bumped to `0.89.0`.
- `docs/roadmap.md` — status updated to v0.89.0.
- `docs/UPDATE-LOGS.md` — v0.89.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched local `v0.89.0.1` build.
- `devvit publish --public --bump minor` submitted v0.89.0 for review.

---


## Version: v0.88.0 — August 5, 2026

### ✅ New in v0.88.0
- **Expanded Crime Consequences**: criminal records now block high-tier job applications, parole prevents hiring, heat triggers police checkpoints while traveling, NPCs can witness crimes and lose trust, and the new `laylow` command lets you reduce heat.
- **New Random Events**: added 5 fresh events — Spontaneous Karaoke Contest, Shady Dealer Offer, Lost Wallet, Talent Scout, and Inspiration Strike.
- **New Achievements**: medals for City Angel, Busted, Most Wanted, and Underground Legend.
- **Version sync**: all project files aligned to `v0.88.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/game-engine.ts` — expanded `commitCrime`, `travelTo`, `applyForJob`, added `decayHeat`, `applyCrimeConsequences`, `record`, and `layLow` methods, wired new commands, updated achievement check list.
- `src/server/storyline-engine.ts` — added 5 random life events.
- `src/server/achievements.ts` — added 4 new achievements and check conditions.
- `src/client/game.ts` — added v0.88.0 update entry.
- `src/shared/version.ts` — GAME_VERSION bumped to `0.88.0`.
- `package.json` — version bumped to `0.88.0`.
- `docs/roadmap.md` — status updated to v0.88.0.
- `docs/UPDATE-LOGS.md` — v0.88.0 entry added.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched local `v0.88.0` build.
- `devvit publish --public --bump minor` submitted v0.88.0 for review.

---


## Version: v0.87.0 — August 4, 2026

### ✅ New in v0.87.0
- **International NPC Expansion**: added 10 new international NPCs across Sydney, Paris, Mexico City, Dubai, Toronto, and London, including roles like sommelier, marine activist, luchador trainer, gold merchant, and art curator.
- **More Random Events**: added 6 new global random events — Pop-Up Job Fair, Celebrity Sighting, Flash Flood Warning, Language Exchange, Influencer Giveaway, and Neighborhood Watch.
- **Version sync**: all project files aligned to `v0.87.0` with `src/shared/version.ts` as single source of truth.

### 📁 Files Changed
- `src/server/social-engine.ts` — added 10 international NPCs (npc_234–npc_243).
- `src/server/storyline-engine.ts` — added 6 random life events.
- `src/shared/version.ts` — GAME_VERSION bumped to `0.87.0`.
- `src/server/game-engine.ts` — version comment synced.
- `package.json` — version bumped to `0.87.0`.
- `docs/roadmap.md` — status updated to v0.87.0.
- `docs/bugs.md` — validation note added.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched local `v0.87.0` build.
- `devvit publish --public --bump minor` submitted v0.87.0 for review.

---


## Version: v0.86.0 — August 3, 2026

### ✅ New in v0.86.0
- **Expanded Vehicle Maintenance**: new `service`, `inspect`, `maintain`, and `repair vehicle` flows with oil, tires, brakes, tune-up, and wash services, plus breakdown risk and mileage-based depreciation.
- **New Random Events**: added 8 fresh global events including mystery deliveries, street markets, stray puppies, power blackouts, and more.
- **Version sync**: all project files now aligned to `v0.86.0` with `src/shared/version.ts` as single source of truth.

### ✅ Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched local `v0.86.0` build.

---

---

## Validation Run — July 27, 2026

## Version: v0.85.0

### ✅ New in v0.85.0
- **Single source of truth**: created `src/shared/version.ts` with `GAME_VERSION`; imported by both server and client.
- **Auto-sync menu version**: the main menu footer and update screen now read from `GAME_VERSION`, so no manual template edits are needed on version bumps.
- **Build bundle verified**: `public/game.js` contains the correct `0.85.0` string after minification.
- **Devvit review submitted**: `v0.85.0` pushed for public review.

### 📁 Files Changed
- `src/shared/version.ts` (new)
- `src/server/game-engine.ts` — now imports `GAME_VERSION` from shared.
- `src/client/game.ts` — menu footer and update screen use `${GAME_VERSION}`.
- `devvit.json` — removed explicit `version` field (Devvit derives from package).
- `docs/roadmap.md` — updated status/milestones.
- `AGENTS.md` — updated current version.

### 🧪 Validation
- `npm run type-check` passed.
- `npm run build` passed.
- `devvit playtest` launched v0.85.0 bundle successfully.

---

## Version 0.83.0 — July 27, 2026
### Added
- 💬 **Deeper NPC Dialogue**:
  - Added `apology` and `rumor` conversation intents.
  - NPCs now react to player state (job title, certifications, health, stress, criminal record).
  - Conversation continuity: NPCs reference the last topic when you greet them again.
- 🏆 **Achievement Additions**:
  - **Scholar** — earn your first certification or license.
  - **Master Worker** — complete 100 work shifts.
  - **Veteran** — survive 365 in-game days.
  - **Continental** — visit 3 international cities.
  - **First Introduction** — meet your first NPC.
  - **Socialite** — meet 10 unique NPCs.
  - **City Hopper** — meet NPCs in 5 different cities.
- 🌆 **Domestic NPC Expansion**: Added 8 new NPCs across Seattle, Las Vegas, Phoenix, Detroit, Philadelphia, Charlotte, Dallas, and Houston.
- 🗣️ **City-Specific Domestic Greetings**: Added local flavor to `talk`/`greet` flows and the conversation engine for domestic cities.
- 🤝 **First-Meet Tracking**: `talk [name]` now records unique first meetings and feeds the new social achievements.

### Fixed
- 🛠️ Escaped an apostrophe in Barbara Banker\'s NPC description that caused a TypeScript parse error.
- 🛠️ Removed duplicate `apology`/`rumor` cases in conversation response switch.
- 🛠️ Cleaned duplicate city-greeting branches in `social-engine.ts`.

### Validation
- ✅ `npm run type-check` passes.
- ✅ `npm run build` completes successfully.
- ✅ `devvit playtest` launches a local `v0.83.0.x` build.
- ✅ `devvit publish --public --bump minor` submitted `v0.83.0` for Devvit review; pending approval.

---

## Validation Run — June 30, 2026
## Version 0.81.0 — July 26, 2026
### Added
- 🌍 **International NPC Expansion**: Added 8 new NPCs across Toronto, Sydney, Mexico City, Berlin, Dubai, and Paris.
- 🎬 **City Event Expansion**: Added random events for New York, Atlanta, and Nashville.

### Fixed
- 🛠️ None — type-check and build remained clean.

### Validation
- ✅ `npm run type-check` passes.
- ✅ `npm run build` completes successfully.
- ✅ `devvit playtest` launches a local `v0.81.0.x` playtest build.

---

### Verified
- ✅ `npm run type-check` passes.
- ✅ `npm run build` completes successfully.
- ✅ `devvit playtest` launches a local `v0.80.0.3` playtest build.
- ✅ Browser automation successfully reached the main game interface and verified the `status` command output.

### Notes
- The prior `Begin Life` playtest blocker no longer reproduced during this run.

---

## Validation Run — June 29, 2026
### Verified
- ✅ `npm run type-check` passes.
- ✅ `npm run build` completes successfully.
- ✅ `devvit playtest` starts and publishes a local `v0.80.0.2` playtest build.

### Blocked
- ⚠️ Browser automation could not activate the `Begin Life` button on the character creation screen, so core command testing is still pending.

---

## Version 0.80.0 — June 28, 2026
### Fixed
- 🛠️ **Server Persistence Fix**:
  - Switched `/api/save` and `/api/load` back to the proper Devvit Redis client import.
  - Fixed TypeScript errors in `src/server/index.ts`.
- ✅ **Validation Pass**:
  - Confirmed `npm run type-check` passes.
  - Confirmed `npm run build` completes successfully.
  - Confirmed `devvit playtest` starts and publishes a local v0.80.0.1 playtest build.

---

## Version 0.79.0 — June 20, 2026
### Added
- 💾 **Save System Overhaul (Server-Side)**: 
  - Transitioned from `localStorage` to server-side Redis persistence.
  - Implemented `/api/save` and `/api/load` endpoints.
  - Fixed critical issue where updates wiped all player saves.
- 🚨 **Enhanced Crime System**:
  - **Criminal Records**: Players now have a persistent criminal record.
  - **Parole System**: Implemented parole logic; committing crimes while on parole increases arrest risk and heat.
  - **Legal Defense**: Added `lawyer` command to clean records and appeal sentences.
- 🗣️ **Dynamic Dialogue Depth**:
  - Updated `ConversationEngine` to use player state (charisma, wealth, criminal rep) for NPC reactions.
  - NPCs now comment on the player's fame, wealth, or notoriety during greetings and small talk.
- 🔄 **Playtest Release Sync**: Updated the project to the current published release version.
- 🧪 **Validation Pass**: Verified type-check, build output, and Devvit playtest installation.

---
## Version 0.78.0 — June 19, 2026
### Added
- 🌍 **International NPC Expansion**:
  - **London**: Added 5 new unique NPCs including a Savile Row tailor and a Camden pub owner.
  - **Tokyo**: Added 5 new unique NPCs including an Omakase master and a pro gamer.
- 🚨 **Enhanced Crime System**:
  - **Crime Command**: Integrated `crime [type]` command.
  - **Risk-Reward Logic**: Added specific outcomes for pickpocketing, shoplifting, and heists.
  - **Police Encounters**: Implemented `handlePoliceEncounter` to trigger arrests based on the current `heat` level.
- 🔄 **Version Sync**: Unified version to v0.78.0 project-wide.

---

## Version 0.78.0 — June 16, 2026
### Added
- 🌍 **Global Immersion Update**:
  - **High-Profile NPCs**: Added 5 new influential characters to international hubs (London, Tokyo, Paris, Dubai, Berlin) including an aristocrat, a tech CEO, and a luxury tycoon.
  - **Dynamic Travel**: Enhanced the `travel` command with randomized, atmospheric arrival descriptions for 14 global cities to increase immersion.
- 🔄 **Version Sync**: Unified version to v0.78.0 project-wide.

---

## Version 0.76.0 — June 16, 2026
### Added
- 🚨 **Crime System Overhaul**:
  - **Police Heat**: Introduced `heat` mechanic. High heat increases arrest risk and attracts more police attention.
  - **Close Calls**: Added "Close Call" outcomes where players narrowly escape capture but suffer stress or financial loss.
  - **Legal Defense**: High-wealth players can now hire lawyers to reduce prison sentences after an arrest.
- ⚡ **Random Life Crisis Events**:
  - Added high-impact global events: **Unexpected Bill**, **Family Emergency**, and **Opportunity of a Lifetime**.
  - Crisis events force players to make difficult financial or emotional choices.
- 🔄 **Version Sync**: Unified version to v0.76.0 project-wide.

---

## Version 0.75.0 — June 6, 2026
### Added
- 🌍 **Global NPC & Event Expansion**:
  - **New NPCs**: Added **Lars Fischer** (Berlin), **Yuki "Neon" Tanaka** (Tokyo), and **Isabella Costa** (Sydney).
  - **New International Events**: Introduced **The Bauhaus Workshop** (Berlin), **Akihabara Tech Expo** (Tokyo), and **Great Barrier Reef VR** (Sydney).
  - **Regional Events**: Added **Southland Racing** and **Big River Crossing Walk** for West Memphis.
- 🗣️ **Dialogue Engine Enhancement**:
  - **City-Specific Flavor**: Implemented `applyCityFlavor` to add authentic Memphis/West Memphis slang (mane, junt, on god) to local NPCs.
- 🔄 **Version Sync**: Unified version to v0.76.0 project-wide.

---

## Version 0.74.0 — June 5, 2026
### Added
- 🎓 **Career & Specialization Overhaul**:
  - **New Schools**: Added **London School of Economics**, **Tokyo Institute of Technology**, **Le Cordon Bleu** (Paris), and **University of Sydney**.
  - **Specialized Courses**: Introduced advanced certifications including Global Policy, Robotics & Automation, Master of French Cuisine, and Marine Biology.
  - **Elite Careers**: Added high-tier job listings in London, Tokyo, Paris, and Sydney requiring these new certifications.
- 🔄 **Version Sync**: Unified version to v0.74.0 project-wide.

---

## Version 0.73.0 — June 4, 2026
### Added
- **Global Event Expansion**: Added 10+ new random events for international hubs including London (Afternoon Tea), Tokyo (Karaoke Face-off), Paris (Fashion Week & Seine Boat Tour), Dubai (Gold Souk Bargain), Toronto (Hockey Night), and Sydney (Surf Lessons).
- **Atmospheric Travel**: Enhanced the `travel` command with unique, city-specific arrival messages and flavor text for all 14 major global hubs.

### Changed
- **Version Sync**: Unified all system references to v0.73.0.

---

## Version 0.72.0 — June 3, 2026
### Added
- **Faction Achievements**: Added 'Faction Leader' and 'Master Saboteur' achievements.
- **Real Estate Achievements**: Added 'Real Estate Tycoon' for owning properties in 5+ cities.
- **Faction Events**: Added new random events for faction bribes and rival confrontations.

### Changed
- **Version Sync**: Unified all system references to v0.72.0.

---

## Version 0.71.0 — June 2, 2026
### Added
- **NPC Expansion**: Added new city-specific greetings for Toronto, Mexico City, Sydney, and Dubai.
- **Mid-South Events**: New random life moments for Memphis (Beale Street, St. Jude) and West Memphis (Southland, Big River Crossing).
- **Dialogue Variety**: Improved response variety for NPC interactions.

### Changed
- **Version Sync**: Unified all system references to v0.71.0.

### Fixed
- **Type Safety**: Resolved a TypeScript 'any' type error in the faction sabotage logic.

---

## Version 0.70.0 — June 1, 2026
### Added
- **Faction Wars System**: New mechanics for influence, support, and sabotage.
- **Influence Tracking**: Factions now have power levels (0-100%) in their HQ cities.
- **Rivalries**: Factions now have explicitly defined rivals (e.g., Wall Street vs. Berlin Underground).
- **Commands**: Added `influence`, `support [id]`, and `sabotage [id]` to the game engine.

### Changed
- **Version Sync**: Unified all system references to v0.70.0.
- **UI Update**: Updated update log and credits in the client interface.

### Fixed
- **Stability**: Cleaned up unused imports in the main game engine.

---

## Version 0.69.0 — May 31, 2026
### Added
- 🌍 **Global Content Expansion**:
  - Added new random events for **Toronto** (Kensington Market Tasting, Distillery District Photo-Op).
  - Added **Mexico City** Taco Tour event.
  - Added **Berlin** Wall History event.
  - Added **Sydney** Opera House Performance event.
- 🔄 **Version Sync**: Unified version to v0.69.0 across engine, client, and documentation.

---

## Version 0.68.0 — May 30, 2026
### Added
- 🌍 **Global Expansion**:
  - Added new city-specific random events for **London**, **Tokyo**, and **Dubai**.
  - Encounter buskers in Covent Garden, discover hidden ramen shops in Shinjuku, or join a desert safari in Dubai.
- 🏡 **Luxury Real Estate**:
  - Expanded the property market with high-end international listings.
  - New properties in **London** (Kensington), **Tokyo** (Shinjuku), **Paris** (Montmartre), **Dubai** (Palm Jumeirah), and **Berlin** (Kreuzberg).
- 🔄 **Version Sync**: Unified version to v0.68.0 across engine, client, and documentation.

---

## Version 0.67.0 — May 28, 2026
### Added
- 🌍 **Global Mission Expansion**:
  - Added unique random events for all international hubs:
    - **London**: Shoreditch Mural debate.
    - **Tokyo**: Akihabara Arcade challenge.
    - **Paris**: Montmartre portrait session.
    - **Dubai**: Exclusive Marina Yacht party.
    - **Mexico City**: Zocalo Lucha Libre celebration.
    - **Sydney**: Bondi Beach rescue mission.
- 💬 **Social Depth Expansion**:
  - Added city-specific greetings for all international hubs.
  - Added 10+ new role-specific dialogue sets for international NPCs (Bankers, Tech Founders, Opera Singers, etc.).
  - Improved personality-based dialogue modifiers for better immersion.

### Fixed
- Fixed minor text alignment in the Update Log overlay.

---

## Version 0.66.0 — May 27, 2026
### Added
- 🌍 **International NPC Expansion**:
  - Added 6 new unique NPCs to international hubs:
    - **Otto "Techno" Schmidt** & **Helga Von Art** (Berlin)
    - **Carlos "Lucha" Libre** & **Maria "Agave" Santos** (Mexico City)
    - **Faisal Bin Zayed** & **Zara Hadid** (Dubai)
- 🛡️ **New Factions**:
  - **Berlin Underground**: Techno DJs, club owners, and street artists.
  - **Dubai Elite**: High-stakes movers and luxury tycoons of Dubai.
- 💬 **Enhanced Dialogue Engine**:
  - Added city-specific greetings (e.g., "Hallo" in Berlin, "Bonjour" in Paris).
  - Relationship-based responses (NPCs react differently if they like or dislike you).

### Changed
- **Version Sync**: Unified version to v0.66.0 across engine, client, and documentation.

---

## Version 0.65.0 — May 26, 2026
### Added
- 🚩 **Crime Expansion**:
  - New crime types: **Scam** (Cybercrime) and **Grand Theft Auto**.
  - Success rates for Scam now benefit from higher **Intelligence**.
  - Success rates for Grand Theft Auto now benefit from the **Driving** skill level.
- 🚨 **Criminal Records System**:
  - Arrest history is now tracked in the player's permanent record.
  - Criminal Record (total arrests) is now displayed in the `status` command output for players with a history.

### Changed
- **Version Sync**: Unified version to v0.65.0 across engine, client, and documentation.

---

## Version 0.64.0 — May 25, 2026
### Fixed
- **Commands Updated**: The in-game `help` command has been fully overhauled.
  - Added new `Social & Comms` category to expose `contacts`, `search`, `factions`, `chat`, and `email` features to players.
  - Added new `Education & Self` category featuring `enroll` and `study hours`.
- **Bug Fix**: Added `enroll`, `email`, `emails`, `factions`, and `chat` to the global command dispatcher so players can actually execute them.
- **Synced**: GAME_VERSION updated to v0.64.0.

---

## Version 0.63.0 — May 25, 2026
### Added
- 🎓 **Professional Schools & Education**:
  - **School Engine**: New system for academic institutions and certifications.
  - **Schools**: Added **Maestro College**, **Memphis Medical Academy**, and **NYU Stern School of Business**.
  - **Courses**: Enroll in certifications like AI Foundations, Full-Stack Dev, Nursing (RN), and MBA.
  - **Career Specialization**: Graduation from major degree programs unlocks specific specializations (e.g., AI Software Engineer).
- 🛡️ **Faction Group Chats**:
  - **Social Engine Factions**: Formally defined **901 Music Scene**, **Wall Street Elites**, and **West Memphis Locals**.
  - **Group Chat Integration**: Automatically added to faction group chats upon reaching reputation milestones.
  - **Chat Simulation**: Active group chats now trigger random messages from faction members in your notifications.
- 🔄 **Unified Job Engine**: Integrated `jobs-database.ts` with `GameEngine` for more consistent career requirements and pay scales.

### Changed
- **Work System**: Updated pay calculation to use hourly rates from the comprehensive job database.
- **Apply Logic**: Jobs now display specific certification requirements (Degrees/Licenses).

---

## Version 0.62.0 — May 25, 2026
### Added
- 📱 **Phone OS v2.0 Overhaul**:
  - **Contacts App**: NPCs are now automatically saved to your contacts after interaction.
  - **Search Functionality**: Search across all emails and SMS messages.
  - **Attachments Support**: Infrastructure added for sending/receiving money and items via comms.
  - **Drafts & Starred**: Save progress on messages and highlight important threads.
- 🎬 **Dynamic Event Expansion**:
  - Added 8+ new location-specific random events.
  - **Manhattan**: The Wall Street Whisper (investment tip).
  - **Shibuya**: Crossing Photo-Op (reputation gain).
  - **Kreuzberg**: Underground Techno Invite (rave event).
  - **Hollywood**: A Glimpse of Hollywood (celebrity encounter).
  - **Dubai**: High-Rise Scammer (intelligence test).
  - **Miami**: Tropical Downpour (weather event).
  - **London**: Lost Tourist (community rep).
  - **Orange Mound**: BBQ Smoke Aroma (happiness/energy boost).
- 🔄 **Smart Event Filtering**: Random events now accurately target the player's current city and district.

### Changed
- Refactored `CommHub` and `StorylineEngine` for better performance and scalability.
- Updated `GameEngine` with new `contacts` and `search` commands.

---

## Version 0.61.0 — May 25, 2026
### Added
- 🌍 **International NPC Expansion**: Added 5 new unique NPCs to major international hubs:
  - **Maple Mike** (Toronto): Busker in Kensington Market.
  - **Captain Cook** (Sydney): Harbour tour guide in Darling Harbour.
  - **Phoebe Posh** (London): Personal shopper in Mayfair.
  - **Sato San** (Tokyo): Retro arcade owner in Akihabara.
  - **Madame Leclair** (Paris): Rare bookseller in the Latin Quarter.
- 👥 Expanded total NPC roster to **125 unique characters**.

### Changed
- Updated internal version synchronization across engine, client, and documentation.

---

## Version 0.60.0 — May 24, 2026
### Critical Stability & Version Sync
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: Unified project versioning to v0.60.0 for deployment stability.

---

## Version 0.58.6 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.58.6

---

## Version 0.58.4 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.58.4

---

## Version 0.58.3 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.58.3

---

## Version 0.58.1 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.58.1

---

## Version 0.58.0 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.58.0

---

## Version 0.57.2 — May 24, 2026
### Critical Stability Hotfix
- **CRITICAL FIX**: Resolved server-side crashes in Achievement Engine causing "blank bubbles".
- **DATA FIX**: Added defensive type casting for player stats to prevent `toFixed` errors.
- **SYNC**: GAME_VERSION updated to v0.57.2

---

## Version 0.57.1 — May 24, 2026
### Chat & Stability Patch
- **CRITICAL FIX**: Resolved "blank bubble" bug in conversations.
- **SENDER FIX**: Fixed missing NPC names in chat responses.
- **SKILL FIX**: Restored job-to-skill mapping in Economy Engine.
- **UI FIX**: Repaired broken newline escapes in system messages.
- **Synced**: GAME_VERSION updated to v0.57.1
- **Synced**: docs/roadmap.md updated to v0.57.1

---

## Version 0.57.0 — May 24, 2026

### 📈 SKILL PROGRESSION OVERHAUL
- **New Skills System**: Introduced a granular skills system including `tech`, `driving`, `cooking`, `craftsmanship`, `finance`, `combat`, and `stealth`.
- **XP & Levelling**: Each skill now tracks XP and levels independently.
- **Action Integration**: `work`, `study`, and `gym` commands now award skill-specific XP.
- **Skills Command**: Added `/skills` command to view progress with visual progress bars.
- **Bug Fixes**: Resolved critical TypeScript errors in the Banking System (missing methods).
- **Synced**: GAME_VERSION updated to v0.57.0
- **Synced**: docs/roadmap.md updated to v0.57.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.56.0 — May 23, 2026

### 🏦 BANKING SYSTEM
- **Secure Savings**: Players can now keep their money in the bank to avoid losing it during crimes or events.
- **Deposit/Withdraw**: Added `deposit` and `withdraw` commands with "all" keyword support.
- **Bank Status**: Added `bank` command to view detailed financial breakdown.
- **Net Worth Tracking**: Bank balance now fully integrates into net worth calculations.
- **Synced**: GAME_VERSION updated to v0.56.0
- **Synced**: docs/roadmap.md updated to v0.56.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.55.0 — May 22, 2026

### 🛠️ VEHICLE MAINTENANCE & PARTS
- **Condition System**: Vehicles now have condition and mileage tracking.
- **Wear & Tear**: Travel now reduces vehicle condition based on distance.
- **Maintenance Command**: Added `maintain` command for affordable tune-ups (+15% condition).
- **Repair Command**: Expanded `repair vehicle` command for full condition restoration.
- **Dynamic Pricing**: Resell value now scales with vehicle condition.
- **Synced**: GAME_VERSION updated to v0.55.0
- **Synced**: docs/roadmap.md version updated to v0.55.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.54.0 — May 21, 2026

### 📱 PHONE & EMAIL SYSTEM OVERHAUL
- **Email System**: Implemented fully functional `email` command for sending and receiving messages.
- **Dynamic Content**: Added more variety to NPC text messages based on relationships and current player status.
- **Notifications**: Refined the notification system for incoming communications.
- **Synced**: GAME_VERSION updated to v0.55.0
- **Synced**: docs/roadmap.md version updated to v0.55.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.53.0 — May 21, 2026

### 🏆 ACHIEVEMENT SYSTEM INTEGRATION
- **Achievement Engine**: Integrated a full achievement tracking system with 36 unique milestones.
- **Progress Persistence**: Achievement progress and unlocks are now persisted in the stateless player data.
- **Milestone Checks**: Real-time checking for wealth, travel, social, and life milestones.
- **Achievement Menu**: New `achievements` command to view progress and unlocked rewards.

### 👥 GLOBAL SOCIAL EXPANSION
- **New International NPCs**: Added 5 new NPCs in London, Tokyo, Paris, Berlin, and Dubai (Fashion Photographer, Pop Idol, Boulanger, Nightclub Owner, Concierge).
- **Social Integration**: NPCs added to specific international districts with unique personalities.

### 🛠️ ENGINE OPTIMIZATION & BUG FIXES
- **Type Safety**: Resolved several critical TypeScript errors in `game-engine.ts` and `economy-engine.ts`.
- **Command Dispatcher**: Refactored `processCommand` for better event handling and achievement synchronization.
- **Storyline Engine**: Added general `processChoice` and `status` methods for better event interactions.
- **Synced**: GAME_VERSION updated to v0.53.0
- **Synced**: docs/roadmap.md version updated to v0.53.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.52.0 — May 19, 2026

### 🌍 GLOBAL CRIME & CONSEQUENCES
- **Crime System**: Added `crime` command with options for pickpocket, shoplift, robbery, and heist.
- **Risk & Reward**: Success chances depend on city crime rate, intelligence, and fitness.
- **Consequences**: Criminal activities now affect reputation (social and criminal).
- **Prison System Integration**: Caught criminals are now sentenced to prison using the existing incarceration system.
- **Synced**: GAME_VERSION updated to v0.52.0
- **Synced**: docs/roadmap.md version updated to v0.52.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.51.0 — May 18, 2026

### 🌍 GLOBAL EXPANSION & UNIQUE LOCATIONS
- **Specific International Districts**: Added unique districts for Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney.
- **District Metadata**: Each new district includes specific descriptions, job types, and rent costs.
- **New NPCs**: Added 6 new international NPCs (Sofia Rossi, Hiroshi Yamamoto, Fatima Zahra, Sebastian Vogel, Isabella Morelo, Marcus Sterling).
- **NPC Updates**: Relocated existing international NPCs to their respective new districts.
- **Synced**: GAME_VERSION updated to v0.51.0
- **Synced**: docs/roadmap.md version updated to v0.51.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.50.0 — May 17, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.50.0 submitted for review (minor bump)
- **Synced**: GAME_VERSION updated to v0.50.0
- **Synced**: docs/roadmap.md version updated to v0.50.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅
- **Status**: Pending Review

---

## Version 0.49.0 — May 12, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.49.0 submitted for review (minor bump)
- **Synced**: GAME_VERSION updated to v0.49.0
- **Synced**: docs/roadmap.md version updated to v0.49.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅
- **Status**: Pending Review

---

## Version 0.48.0 — May 11, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.48.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.48.0
- **Synced**: AGENTS.md version updated to v0.48.0
- **Synced**: docs/roadmap.md version updated to v0.48.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅
- **Status**: Pending Review

# THE OPEN WORLD — UPDATE LOGS

---

## Version 0.47.0 — May 10, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.47.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.47.0
- **Synced**: AGENTS.md version updated to v0.47.0
- **Synced**: docs/roadmap.md version updated to v0.47.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.46.0 — May 9, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.46.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.46.0
- **Synced**: AGENTS.md version updated to v0.46.0
- **Synced**: docs/roadmap.md version updated to v0.46.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.45.0 — May 8, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.45.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.45.0
- **Synced**: AGENTS.md version updated to v0.45.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.44.0 — May 7, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.44.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.44.0
- **Synced**: docs/roadmap.md version updated to v0.44.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.43.0 — May 6, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.43.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.43.0
- **Synced**: docs/roadmap.md version updated to v0.43.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.41.0 — May 4, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.41.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.41.0
- **Synced**: AGENTS.md version updated to v0.41.0
- **Synced**: docs/roadmap.md version updated to v0.41.0
- **TypeScript**: All checks passing ✅
- **Build**: Successful ✅

---

## Version 0.36.0 — May 4, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.36.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.36.0
- **TypeScript**: All checks passing
- **Build**: Successful

---

## Version 0.35.0 — May 4, 2026

### 🎨 UI/UX Polish & Fullscreen Fix
- **Redesigned Landing/Splash Screen**: Modern look with deep animated backdrop and glassmorphism logo.
- **Redesigned Main Menu**: Polished UI with sleek buttons and subtle glowing effects.
- **Fullscreen Issue Fixed**: Removed non-functional fullscreen buttons/logic since Reddit's iframe blocks it.

---



## Version 0.34.0 — May 4, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.35.0 submitted for review
- **Synced**: GAME_VERSION and client menu version updated to v0.35.0
- **TypeScript**: All checks passing
- **Build**: Successful

---

## Version 0.31.4 — April 16, 2026

### 🎮 REDDIT API POST CREATION
- **CRITICAL FIX**: Menu now uses `reddit.submitCustomPost()` API
- Creates actual game post when "Start a New Life" is clicked
- Navigates user to the new post automatically

---

## Version 0.31.3 — April 16, 2026

### 🐛 BUG FIX - Menu Post Creation
- **CRITICAL FIX**: Added `/internal/menu/post-create` endpoint
- Fixed "Start a New Life" menu button not working

---

## Version 0.31.2 — April 16, 2026

### 🐛 BUG FIX - Content-Length Header
- **CRITICAL FIX**: Changed internal endpoints to return 204 No Content
- Fixed Content-Length header issue during installation
- App can now be installed on subreddits

---

## Version 0.31.1 — April 16, 2026

### 🐛 BUG FIX - Installation Endpoint
- **CRITICAL FIX**: Added `/internal/on-app-install` endpoint
- **CRITICAL FIX**: Added `/internal/on-app-uninstall` endpoint
- App can now be installed on subreddits successfully
- Fixed HTTP 404 error during installation

---

## Version 0.31.0 — April 16, 2026

### 👥 NPC WORLD EXPANSION
- **33 NEW NPCs** added across 10 cities
- **Nashville** (4): Johnny Ray, Patsy Monroe, Doc Holliday, Sweet Lou
- **Atlanta** (4): King Carter, Auntie Pearl, DJ Hurricane, Coach Brenda
- **New Orleans** (4): Big Daddy Gumbo, Voodoo Mama, Professor Longhair Jr, Nana Bee
- **New York** (5): Tony The Tie, Jade Kim, Brooklyn B, Dr. Maya Patel, Big Sal
- **Los Angeles** (4): Vinny Vibe, Sunshine Starr, Dr. Feelgood, Mama Rosa
- **Chicago** (4): Gino The Giant, Queen Latifah Jr, Old Man Winter, Coach Iron Mike
- **Miami** (3): Carlos Cruz, Abuela Lucia, DJ Heatwave
- **Houston** (3): Big Tex, Mama Tran, Dr. Freeman
- **Dallas** (2): J.R. Sterling, Cowboy Cliff
- **Total NPCs**: 75 (up from 42)

### 🎮 LAUNCH READY
- Game approved for public release
- Subreddit created: r/THE_OPEN_WORLD
- Ready for launch announcement

---

## Version 0.30.0 — April 16, 2026

### 🔄 Minor Version Bump
- **Deployed**: v0.30.0 submitted for review
- **TypeScript**: All checks passing
- **Playtest**: Verified working

---

## Version 0.29.0 — April 16, 2026

### 📋 Version Sync & Minor Polish
- **Synced versions** — GAME_VERSION and client menu version updated to v0.29.0
- **TypeScript checks** — All passing
- **Playtest verified** — Game runs successfully

---

## Version 0.28.0 — April 16, 2026

### 🏗️ STATELESS ARCHITECTURE
- **CRITICAL FIX**: Game state now persists between requests
- Client maintains `state.player` and sends it with every request
- Server processes commands and returns updated state
- No server-side session storage needed

### 🐛 Bug Fixes
- Fixed job not persisting after `apply` command
- Fixed `work` command not finding job
- Proper Map serialization for relationships

---

## Version 0.22.0 — April 16, 2026

### 🏗️ STATELESS ARCHITECTURE
- **CRITICAL FIX**: Game state now persists between requests
- Client maintains `state.player` and sends it with every request
- Server processes commands and returns updated state
- No server-side session storage needed

### 🐛 Bug Fixes
- Fixed job not persisting after `apply` command
- Fixed `work` command not finding job
- Proper Map serialization for relationships

---

## Version 0.18.0 — April 16, 2026

### 🎉 ALL SYSTEMS WIRED
- **NPC System**: Talk to 42 NPCs with `talk [name]`, see who's around with `people`
- **Property System**: Buy/sell properties with `real-estate`, `buy property`, `sell property`
- **Investment System**: Stocks, bonds, crypto with `invest`, `investments`
- **Vehicle System**: Buy/sell vehicles with `vehicles`, `buy vehicle`, `sell vehicle`
- **Storyline Events**: Random events trigger during explore/work

### 🎭 Background System
- 6 backgrounds: Working Class, Student, Corporate, Hustler, Creative, Unemployed
- Each background has unique starting money and stat bonuses
- Background selection during character creation now works

### 💾 Save System Fixed
- Delete button now functional (calls API)
- Load screen fetches actual saves from server
- Saves load player state correctly

### 🔧 Bug Fixes
- Fixed new game flow (character creation shows for new players)
- Fixed type imports for Property, Investment
- Added firstName/lastName/description to NPCState
- Removed duplicate 'help' case in command dispatcher

---

## Version 0.15.0 — April 15, 2026

### 🔧 WORK SYSTEM FIXED
- **CRITICAL FIX**: Work command now properly calculates pay
- Jobs store hourly wage correctly
- `apply Software Developer` → `work` now works!

### 📋 Job System
- Jobs show hourly pay rates
- Apply for jobs with `apply [job name]`
- Work earns money based on hourly wage × 8 hours
- Weather affects work productivity

### 💾 Save System
- Delete button added to save slots
- Save/Load infrastructure ready
- `src/server/save-system.ts` created

### 📱 UI Updates
- Delete button on Load Game screen
- Game menu overlay (Resume, Save, Settings, Quit)
- Fullscreen toggle button

---

## Version 0.14.1 — April 15, 2026

### ⏰ Time Progression System
- `nextday` / `tomorrow` - Jump to next day (6 AM)
- `wait [hours]` - Skip hours
- `morning` / `afternoon` / `evening` / `night` - Time jumps
- Actions auto-advance time (work +8hrs, explore +1hr, etc.)

### 🚗 Travel System
- Travel to any city with `travel [city]`
- City descriptions adapt to current location
- 28+ cities worldwide

---

## Version 0.13.0 — April 15, 2026

### 📱 Phone System Commands
- `phone` - Phone summary
- `phone messages` - Read SMS
- `phone email` - Check inbox
- `phone calls` - Call history
- `text [name] [message]` - Send SMS
- `call [name]` - Make calls

---

## Version 0.11.0 — April 15, 2026

### 📱 Phone System Working!
- All phone commands now functional
- SMS with NPC replies
- Voicemail system
- Social media posts

---

## Version 0.8.0 — April 15, 2026

### 📱 Immersive Phone System
- 14 phone apps (Messages, Mail, Phone, SocialHub, Browser, etc.)
- Natural conversation input
- NPC relationship system

---

## Version 0.5.0 — April 15, 2026

### 🎮 Crime System & Achievements
- Pickpocket, shoplift, burglary, robbery, heist
- 30+ achievements
- Natural Language Processing

---

## Version 0.1.0 — April 14, 2026

### 🎮 Initial Release
- 42 NPCs with schedules
- Job system, vehicles, weather
- Character creation

---

## Upcoming Features

- [ ] Multi-save slots
- [ ] Prison system for crime
- [ ] More NPCs for international cities
- [ ] Leaderboards

---

## Known Issues

1. **Fullscreen in iframe**: Reddit's sandbox prevents true fullscreen
2. **Load Game**: Coming soon

---

*Last Updated: May 23, 2026*
*Current Version: 0.56.0*
