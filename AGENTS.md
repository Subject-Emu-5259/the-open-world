# THE OPEN WORLD — Development Agent Context

**Project**: Text-based life simulation game on Reddit Devvit
**Version**: 0.31.4
**Last Updated**: April 16, 2026

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
| **Core** | work, apply, apply [job], status, help, sleep, study, gym |
| **Travel** | travel [city], explore, goto [district] |
| **Social** | talk [name], greet [name], people, assist [name] |
| **Property** | real-estate, buy property [name], sell property [name], properties |
| **Invest** | invest, invest [name] [amount], investments |
| **Vehicles** | vehicles, buy vehicle [type], sell vehicle [name] |
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
- [ ] Upload Community Icon & Banner (manual)
- [ ] Add more NPC interactions
- [ ] Implement phone/email system
- [ ] Add achievement tracking