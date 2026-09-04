# THE OPEN WORLD — Development Agent Context

**Project**: Text-based life simulation game on Reddit Devvit
**Version**: 0.108.0
**Last Updated**: August 28, 2026

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
3. **Deploy**: `devvit publish --public --bump minor`
4. **Sync versions** in:
   - `src/server/game-engine.ts` (GAME_VERSION)
   - `src/client/game.ts` (menu-version)
   - `docs/roadmap.md`

---

## Commands Reference

| Category | Commands |
|----------|----------|
| **Core** | work, apply, apply [job], status, help, sleep, study, enroll, study hours, gym |
| **Travel** | travel [city], explore, goto [district] |
| **Social** | talk [name], greet [name], people, assist [name], factions, chat [id], quests |
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