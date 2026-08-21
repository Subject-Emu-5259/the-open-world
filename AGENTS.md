# THE OPEN WORLD — Development Agent Context

**Project**: Text-based life simulation game on Reddit Devvit
**Version**: 0.98.0
**Last Updated**: August 21, 2026

---

## Architecture

### Stateless Design (v0.22.0+)
- **Client** maintains `state.player` and sends it with every request
- **Server** processes commands and returns updated player state
- No server-side session storage required

### Key Files
- `src/server/game-engine.ts` — Main game logic, command processing
- `src/server/index.ts` — HTTP API endpoints
- `src/client/game.ts` — React-like client UI
- `src/server/social-engine.ts` — 42 NPCs with schedules
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
| **Social** | talk [name], greet [name], people, assist [name], factions, chat [id] |
| **Property** | real-estate, buy property [name], sell property [name], properties |
| **Invest** | invest, invest [name] [amount], investments |
| **Vehicles** | vehicles, buy vehicle [type], sell vehicle [name], inspect [name], service [name] [oil|tires|brakes|tuneup|wash], maintain [name], repair vehicle [name] |
| **Events** | event, event choice [id] |

---

## Known Issues

1. **Fullscreen in iframe** — Reddit's sandbox prevents true fullscreen
2. **localStorage on server** — Not available, using stateless design instead

---

## Next Steps

- [x] Create r/theopenworld Subreddit ✅
- [x] Install Game on Subreddit ✅
- [x] Post Launch Announcement ✅
- [x] Implement phone/email system ✅
- [x] Add achievement tracking ✅
- [x] Professional Schools & Careers ✅
- [x] Faction Group Chats ✅
- [ ] Implement Faction Wars & Political Influence
- [ ] Add more international mission strings
- [ ] Expand vehicle racing system