# THE OPEN WORLD — Development Agent Context

**Project**: Text-based life simulation game on Reddit Devvit
**Version**: 0.108.29
**Last Updated**: November 12, 2026

> **Standing rule (Dre, 2026-11-01): the What's New / Latest Updates
> screen stays updated with EVERY game update.** Every version bump must
> add a changelog entry at the TOP of the Updates screen
> (`renderUpdatesScreen` in `src/client/game.ts`), newest first. This
> rule holds for all future versions, not just 0.108.12.

---

## Architecture

### Stateless Design (v0.22.0+)
- **Client** maintains `state.player` and sends it with every request
- **Server** processes commands and returns updated player state
- Server-side Redis save slot persists progress across refresh/reinstall

### Key Files
- `src/server/game-engine.ts` — Main game logic, command processing
- `src/server/index.ts` — HTTP API endpoints
- `src/client/game.ts` — React-like client UI
- `src/server/social-engine.ts` — 42 NPCs + 10 international quests
- `src/server/racing-service.ts` — Racing + World Street Series championship
- `src/server/property-engine.ts` — Real estate & investments
- `src/server/storyline-engine.ts` — Dynamic events

---

## Daily Dev Tasks

1. **Type check**: `npm run type-check`
2. **Build**: `npm run build`
3. **Publish**: standard UNLISTED review via the 0.15.0 CLI from the
   Dispatch tree (`~/workspace/dispatch-hq-reddit/node_modules/.bin/devvit-cli
   publish --version <x.y.z>`, with `DEVVIT_ALLOW_SOURCE_UPLOAD=1`).
   NEVER `--public` — this game publishes UNLISTED by Dre's choice.
   NEVER a bare publish that auto-bumps — always `--version` explicitly.
   Stop on the first quoted `Submitting version "X" for review... done`.
   The project's own 0.12.18 CLI can no longer publish ("Invalid app
   config") — always use the 0.15.0 CLI. Publish approval and
   domain-exception approval are separate gates.
4. **Sync versions** in:
   - `package.json`
   - `src/shared/version.ts` (`GAME_VERSION` — the client menu footer
     and updates screen read this; do not hardcode versions elsewhere)
   - `src/server/index.ts` (boot log line)
5. **Release checklist (every version bump, no exceptions)**:
   - Add a changelog entry at the TOP of the Updates screen
     (`renderUpdatesScreen`), newest first — see the standing rule above.
   - Run type-check, build, and every harness in `tools/`; all green
     before publishing.
   - Verify installs after publishing (`devvit list installs`).

---

## Commands Reference

| Category | Commands |
|----------|----------|
| **Core** | work, apply, apply [job], status, help, sleep, study, schools, enroll, study hours, gym |
| **Travel** | travel [city], travel to [city], districts, where, goto [district], explore [district], nearby, go home |
| **Social** | talk [name], greet [name], people, assist [name], factions, chat [id], quests, emails, inbox, email read [id], email compose [name] [subject] [body], email delete [id] |
| **Property** | real-estate, buy property [name] [cash|mortgage], sell property [name], properties |
| **Invest** | invest, invest [name] [amount], investments |
| **Vehicles** | vehicles, buy vehicle [type], sell vehicle [name], inspect [name], fuel [name], service [name] [oil|tires|brakes|tuneup|wash], maintain [name], repair vehicle [name], register [name], customize [name] [mod], tow [name], race [track], race season, race standings |
| **Events** | event, event choice [id] |
| **Racing** | race [track], race season, race standings |

---

## Known Issues

1. **Fullscreen in iframe** — Reddit's sandbox prevents true fullscreen
2. **localStorage on server** — Not available; server-side Redis save system used instead

## Latest Release

- **v0.104.2** — International Mission Expansion + Racing Championship. Added 10 global quests tied to v0.103.0 NPCs, 5 new international race tracks, and a multi-race World Street Series championship system.
- **v0.103.0** — Global NPC expansion (10 new international characters) + 5 new city-life random events.
- **v0.102.0** — Serverless LLM NPC brain + rebuilt save flow. See `docs/RELEASE-NOTES-v0.102.0.md`.

---

## Next Steps

- [x] Create r/theopenworld Subreddit ✅
- [x] Install Game on Subreddit ✅
- [x] Post Launch Announcement ✅
- [x] Implement phone/email system ✅
- [x] Add achievement tracking ✅
- [x] Professional Schools & Careers ✅
- [x] Faction Group Chats ✅
- [x] Implement Faction Wars & Political Influence ✅
- [x] Rebuild server-side save system (auto-save + continue on refresh)
- [x] Overhaul NPC conversation engine (contextual greetings + replies)
- [x] Finalize server-first save authority and continue-on-refresh
- [x] Add more international mission strings
- [x] Expand vehicle racing system