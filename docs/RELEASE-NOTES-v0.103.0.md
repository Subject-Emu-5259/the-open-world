# THE OPEN WORLD — v0.103.0 Release Notes

**Release Date:** August 28, 2026

## What's New

- 🌍 **10 New International NPCs** — Added characters across Dubai, Tokyo, Paris, London, Berlin, Mexico City, Toronto, and Sydney:
  - Khalid Al-Rashid — Deira perfume merchant
  - Suki Watanabe — Asakusa vintage kimono dealer
  - Marcel Durand — Saint-Germain jazz club owner
  - Adeyemi Okonkwo — Shoreditch coding instructor
  - Lena Hoffmann — Tempelhofer Feld urban farmer
  - Camila Espinoza — Coyoacán mural tour guide
  - Zara Chen — The Rocks ice-cream vendor
  - Raj Malhotra — Distillery District comedy booker
  - Noah Fisher — South Bank riverside fisherman
  - Yuna Park — Asakusa lantern shop owner

- 🎲 **5 New City-Life Random Events** — Added to the storyline engine:
  - **Lost Tourist** — Help or translate for a confused traveler
  - **Pop-Up Job Fair** — Network with recruiters or observe quietly
  - **Celebrity Sighting** — Snap a photo or avoid the crowd
  - **Street Chess Match** — Play against a speed-chess hustler
  - **Sudden Summer Storm** — Help a vendor or shelter in a shop

- 🔁 **Version Sync** — Bumped all source files, documentation, and client update logs to v0.103.0.

## Files Changed

- `src/server/social-engine.ts` — Added `npc_324` through `npc_333`
- `src/server/storyline-engine.ts` — Added 5 new random life events
- `src/shared/version.ts` — `GAME_VERSION` now `0.103.0`
- `package.json` — version `0.103.0`
- `src/server/index.ts` — startup log version updated
- `src/client/game.ts` — added v0.103.0 update entry
- `docs/RELEASE-NOTES-v0.103.0.md`
- `docs/REDDIT-UPDATE-v0.103.0.md`

## Validation

- ✅ `npm run type-check` passed
- ✅ `npm run build` passed
- ⚠️ `devvit playtest` and `devvit publish --public --bump minor` require a fresh Reddit OAuth login in this environment (not currently authenticated)

