# THE OPEN WORLD — Release Notes v0.107.0

## Overview
Patch release to clean up the in-game help/command list and keep the codebase version in sync with the latest Devvit submission.

## Fixes
- `src/server/game-engine.ts`
  - Replaced broken `\\u2022` / `2022` escape sequences in the `help()` output with proper Unicode bullet (`•`) and emoji characters.
  - Reordered vehicle/racing commands so all race commands appear together under **Vehicles & Racing**.
  - Fixed typo in `assist` description (`NPCs` plural).
- Version synced to `0.107.0` across `package.json`, `src/shared/version.ts`, server, client, docs, and `AGENTS.md`.

## Validation
- `npm run type-check` passed.
- `npm run build` passed.
- Published to Devvit as `v0.107.0` for review.

## Notes
- Reddit/Devvit publishing is now authenticated as `u/Subject-Emu-5259`.
- The default playtest subreddit already has the app installed; the installer warnings are expected.
