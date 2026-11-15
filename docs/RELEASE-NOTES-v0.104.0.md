# THE OPEN WORLD — Release Notes v0.104.0

**Release Date**: August 28, 2026

## Summary

This update turns global exploration and street racing into core gameplay loops. The ten international NPCs introduced in v0.103.0 now offer missions, and players can compete in a five-race international championship.

## What's New

### 10 International Quests
NPCs in Dubai, Tokyo, Paris, London, Berlin, Mexico City, Toronto, and Sydney now hand out missions with cash, stat, and relationship rewards.

Ask NPCs about a **quest**, **mission**, or **favor**, or type `quests` to review active objectives.

| Quest | NPC | Reward |
|-------|-----|--------|
| Signature Scent | Khalid Al-Rashid (Dubai) | $450 + relationship |
| Silk Thread Rescue | Suki Watanabe (Tokyo) | $380 + relationship |
| Midnight Set | Marcel Durand (Paris) | $520 + Charisma |
| Demo Day Prep | Adeyemi Okonkwo (London) | $400 + Intelligence |
| Harvest Festival | Lena Hoffmann (Berlin) | $350 + relationship |
| Mural Mystery | Camila Espinoza (Mexico City) | $480 + Fitness |
| Flavor Contest | Zara Chen (Sydney) | $420 + Charisma |
| Open Mic Scout | Raj Malhotra (Toronto) | $500 + relationship |
| South Bank Waters | Noah Fisher (London) | $390 + relationship |
| Lantern Procession | Yuna Park (Tokyo) | $460 + Intelligence |

### Racing Championship
- 5 new international race tracks: Cairo, Rio de Janeiro, London, Mexico City, and Mumbai.
- `race season` starts a 5-race World Street Series championship.
- `race standings` shows your points, wins, earnings, and next track.
- Championship points are awarded per finish position and persist until the season completes.

### Quality of Life
- New `quests` command lists active objectives and progress.
- Race listing now highlights local tracks.
- All version strings synced to **v0.104.0**.

## Files Changed

- `src/server/social-engine.ts` — added `INTERNATIONAL_QUESTS` and `NPC_QUEST_OFFERS`
- `src/server/racing-service.ts` — 5 new tracks + `ChampionshipService`
- `src/server/game-engine.ts` — `quests`, updated `race()`, version bump
- `src/server/index.ts` — version string bump
- `src/client/game.ts` — version bump + update log
- `src/shared/version.ts` — version bump
- `AGENTS.md`, `docs/roadmap.md`, `docs/bugs.md`, `docs/UPDATE-LOGS.md` — documentation sync
- `docs/REDDIT-UPDATE-v0.104.0.md` — ready-to-post community update (created)
- `docs/RELEASE-NOTES-v0.104.0.md` — this file (created)

## Validation

- [x] `npm run type-check` passed
- [x] `npm run build` passed
- [ ] `devvit publish --public --bump minor` blocked — requires fresh Reddit OAuth login (`devvit whoami` returns "Not currently logged in")

## Known Issues

- Devvit CLI is not authenticated in this environment, so playtest/publish must be run from an authenticated session.
