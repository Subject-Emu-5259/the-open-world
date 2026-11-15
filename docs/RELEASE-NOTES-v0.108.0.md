# THE OPEN WORLD — Release Notes v0.108.0

**Release Date:** September 4, 2026
**Status:** Submitted to Devvit for public review

## 🌍 What’s New

### New International NPCs (5)
Added five new characters to `src/server/social-engine.ts` to expand global city life:

| ID | Name | City | District | Role |
|---|---|---|---|---|
| npc_334 | Noura El-Sayed | Dubai | downtown_dubai | Perfume Blender |
| npc_335 | Takeshi Mori | Tokyo | ryogoku | Sumo Trainer |
| npc_336 | Isabelle Moreau | Paris | montmartre | Perfume Boutique Owner |
| npc_337 | Jamal Williams | London | shoreditch | Reggae Record Dealer |
| npc_338 | Keira O’Brien | Sydney | the_rocks | Indigenous Art Curator |

### New City-Life Random Events (5)
Added five new encounters to `src/server/storyline-engine.ts`:

- **Beach Bonfire Invitation** — Join a sunset driftwood bonfire with strangers.
- **Street Poet Dedication** — Tip a spoken-word artist who dedicates a verse to your life.
- **Vintage Camera Find** — Buy a bargain film camera and shoot a roll around the district.
- **Community Fridge Restock** — Donate groceries or help stock a public community fridge.
- **Open Air Jazz Quartet** — Drop a tip for a plaza jazz set or ask to sit in for a song.

## 🔁 Version Sync & Maintenance
- Version bumped to **0.108.0** across:
  - `package.json`
  - `src/shared/version.ts`
  - `src/server/game-engine.ts`
  - `src/server/index.ts`
  - `src/client/game.ts`
  - `docs/UPDATE-LOGS.md`
  - `docs/roadmap.md`
  - `docs/bugs.md`
  - `AGENTS.md`

## ✅ Validation
- `npm run type-check`: **PASSED**
- `npm run build`: **PASSED**
- `devvit publish --public --bump minor`: **SUBMITTED** for review as v0.108.0

## 🐛 Known Issues
- `devvit playtest` could not complete because the default playtest subreddit already has the app installed, and the local playtest connection server port (`5678`) is in use. The app was still uploaded successfully, and publishing completed without errors.

## 🔗 Links
- Subreddit: https://www.reddit.com/r/THE_OPEN_WORLD/
- Latest live version: v0.107.0
- App review status: https://developers.reddit.com/apps/the-open-world
