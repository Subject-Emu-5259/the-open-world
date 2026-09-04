# THE OPEN WORLD — Bug Tracker

*Last Updated: September 4, 2026*

**September 4, 2026 (v0.108.0)**: No new code bugs. `npm run type-check` and `npm run build` passed. Added 5 new international NPCs and 5 new city-life random events. Version numbers synced to v0.108.0. `devvit playtest` could not complete because the default playtest subreddit already has an installation of this app (`EADDRINUSE` on playtest connection server and duplicate-install warning). `devvit publish --public --bump minor` succeeded and submitted v0.108.0 for Reddit review.

---

**August 28, 2026 (v0.104.0)**: No new code bugs. `npm run type-check` and `npm run build` passed. `devvit playtest` and `devvit publish` could not run because the Devvit CLI is not authenticated in this environment (`devvit whoami` returns "Not currently logged in"). Content update added 10 new international NPCs and 5 new random events. Version numbers synced to v0.104.0.

---

*Last Updated: August 24, 2026*

**August 21, 2026 (v0.98.0)**: No new code bugs. `npm run type-check` and `npm run build` passed. `devvit playtest` and `devvit publish` could not run because the Devvit CLI is not authenticated in this environment (`devvit whoami` returns "Not currently logged in"). This blocks local playtest verification and public deployment until Reddit OAuth is completed. Version numbers synced to v0.98.0.

---

## August 24, 2026 — v0.99.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` and `devvit publish` could not run because the Devvit CLI is not authenticated in this environment.
- **Changes**: Added 10 new international NPCs and 5 new city-life random events. Version synced to 0.99.0.
- **Notes**: None currently confirmed.

---

## August 17, 2026 — v0.97.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` and `devvit publish` could not run because the Devvit CLI is not authenticated in this environment.
- **Changes**: Added 10 new international NPCs and 5 new city-life random events. Version synced to 0.97.0.
- **Notes**: None currently confirmed.

---

## August 14, 2026 — v0.96.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` and `devvit publish` could not run because the Devvit CLI is not authenticated in this environment.
- **Changes**: Added 10 new international NPCs and 5 new city-life random events. Version synced to 0.96.0.
- **Notes**: None currently confirmed.

## August 10, 2026 — v0.92.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched a local playtest build. `devvit publish --public --bump minor` submitted v0.92.0 for review.
- **Changes**: Expanded real-estate listings to Atlanta, Nashville, Chicago, New York, Los Angeles, Miami, Houston, Dallas, and Phoenix. Improved travel arrival descriptions with time-of-day atmospheric details. Added vehicle racing system (`race`, `race [track]` commands) with 8 city tracks, entry fees, performance-based payouts, vehicle wear, and underground heat risk. Version synced to 0.92.0.
- **Notes**: None currently confirmed.

## August 8, 2026 — v0.91.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched local `v0.91.0.1` build. `devvit publish --public --version=0.91.0` submitted v0.91.0 for review.
- **Changes**: Added 3 new achievements (Peak Fitness, Renaissance Person, Trophy Hunter), 5 new random events (Impromptu Block Party, Unexpected Rainstorm, Street Chess Match, Hidden Bookstore Sale, Rooftop Movie Night), and removed a duplicate police checkpoint encounter in `travelTo`. Version synced to 0.91.0.
- **Notes**: None currently confirmed.

## August 7, 2026 — v0.90.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched local `0.90.0.1` build. `devvit publish --public --bump minor` submitted v0.90.0 for review.
- **Changes**: Added 10 new international NPCs across Berlin, Paris, Tokyo, Dubai, Mexico City, Toronto, and Sydney. Added 5 new random events (Sunrise Yoga, Bookstore Reading, Vintage Car Parade, Community Cleanup, Late-Night Food Truck). Version synced to 0.90.0.
- **Notes**: None currently confirmed.

## August 6, 2026 — v0.89.1
- **Status**: Resolved Devvit review feedback (inline scroll trap + menu post-create stability).
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit publish --public --bump patch` submitted `v0.89.1` for review.
- **Changes**: Both `default` and `game` post entrypoints now open in Expanded Mode (`"inline": false`) to comply with Reddit’s no-scroll inline policy. Added Redis-backed idempotency key on `/internal/menu/post-create` so repeated moderator clicks navigate to the existing post instead of creating duplicates, plus a more informative fallback toast.
- **Notes**: None currently confirmed.

## August 6, 2026 — v0.89.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched local `v0.89.0.1` build. `devvit publish --public --bump minor` submitted v0.89.0 for review (pending approval).
- **Changes**: Added 10 new international NPCs, expanded travel arrival descriptions for all domestic cities, added 5 new city-life random events, and introduced Global Citizen and Passport Collector travel achievements.
- **Notes**: None currently confirmed.
## August 5, 2026 — v0.88.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched successfully.
- **Changes**: Expanded crime consequences and added 5 new random events. Version synced to 0.88.0.
- **Notes**: None currently confirmed.
## August 4, 2026 — v0.87.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched successfully.
- **Changes**: Added 10 new international NPCs and 6 new random events. Version synced to 0.87.0.
- **Notes**: None currently confirmed.
## August 3, 2026 — v0.86.0
- **Status**: No blocking bugs identified.
- **Validation**: `npm run type-check` passed. `npm run build` passed. `devvit playtest` launched successfully.
- **Changes**: Added expanded vehicle maintenance commands and 8 new random events.
- **Notes**: None currently confirmed.
## July 27, 2026 — v0.83.0
- **Status**: Submitted for Devvit review.
- **Build**: `npm run type-check` and `npm run build` both pass.
- **Playtest**: `devvit playtest` successfully launched a local `v0.83.0.x` build.
- **Expansion**: v0.83.0 - Added 8 domestic NPCs across Seattle, Las Vegas, Phoenix, Detroit, Philadelphia, Charlotte, Dallas, and Houston.
- **Feature**: v0.83.0 - Added first-meeting social achievements (First Introduction, Socialite, City Hopper).
- **Feature**: v0.83.0 - Added city-specific domestic greetings to social and conversation engines.
- **Fix**: v0.83.0 - Cleaned duplicate city-greeting branches in `src/server/social-engine.ts`.
- **Validation**: v0.82.0 - Type-check and build passed; playtest launched v0.82.0.7. Devvit review pending for public release.
## ✅ Fixed Bugs (June 2, 2026)
- **Expansion**: v0.71.0 - Added new city-specific greetings for Toronto, Mexico City, Sydney, and Dubai.
- **Mid-South**: New random events for Memphis and West Memphis.
- **Type Safety**: Fixed implicit 'any' type error in `src/server/game-engine.ts`.
- **Sync**: Synchronized version numbers to v0.71.0 project-wide.
---
## ✅ Fixed Bugs (June 1, 2026)
- **Feature**: v0.70.0 - Implemented Faction Wars & Political Influence system.
- **Stability**: Removed unused imports in `src/server/game-engine.ts`.
- **Sync**: Synchronized version numbers to v0.70.0 project-wide.
---
## ✅ Fixed Bugs (May 30, 2026)
- **Expansion**: v0.68.0 - Added new international random events for London, Tokyo, and Dubai.
- **Real Estate**: Added 5 new luxury properties to international hubs.
- **Stability**: Verified v0.68.0 via full build and type-check.
---
## ✅ Fixed Bugs (May 26, 2026)
- **Expansion**: v0.65.0 - Expanded crime system with Scam and Grand Theft Auto options.
- **Feature**: Added criminal record tracking to player status.
- **Stability**: Verified v0.65.0 via full build and type-check.
---
## ✅ Fixed Bugs (May 25, 2026)
- **System**: Verified v0.61.0 stability via `npm run type-check` and `npm run build`.
- **Content**: Added 5 new international NPCs to expand the social engine.
- **Sync**: Synchronized version numbers across package.json, engine, client, and documentation.
---
## ✅ Fixed Bugs (May 24, 2026)
- **Critical**: Fixed missing `bank()`, `deposit()`, and `withdraw()` methods in `GameEngine` that caused TypeScript compilation errors.
- **Bug**: Fixed unused variables in `work()` method.
- **Type Safety**: Improved type safety for player skill data.
---
## ✅ Fixed Bugs (April 12-15, 2026)
All previously reported bugs have been fixed. TypeScript compilation passes without errors.
---
## 🧪 Testing Checklist
### Core Systems - ✅ PASSING
- [x] TypeScript compilation - PASSING (April 15, 2026)
### Gameplay Commands - ✅ ALL PASSING (April 15, 2026)
- [x] Character creation flow - PASSING
- [x] Work command - PASSING (earned $127.55, weather effects working)
- [x] Study command - PASSING (intelligence +2, skill tips showing)
- [x] Explore command - PASSING (atmospheric descriptions, weather effects)
- [x] Talk to NPC - PASSING (NPC system integrated)
- [x] Apply for job - PASSING (got hired at Amazon DSP)
- [x] Status display - PASSING (HUD updating correctly)
- [x] Sleep/rest - PASSING (energy restored, morning messages)
- [x] Weather system - PASSING (affects work, exploration)
- [x] Time progression - PASSING (8hr work shifts advance time)
- [x] Email/communication system - PASSING (2 emails received after hiring)
- [x] District navigation - PASSING
- [x] Vehicle purchase - PASSING (showing vehicle options)
- [x] Vehicle sale - PASSING
- [x] Property purchase - PASSING (real-estate listings showing)
- [x] Property sale - PASSING
- [x] Investment system - PASSING (investment options showing)
- [x] Event system - PASSING
### Devvit Deployment
- [ ] Reddit sandbox testing
- [ ] Subreddit setup (r/theopenworld)
- [ ] Production deployment
---
## Notes
- Run `npm run type-check` to verify TypeScript
- Run `npm run dev` to start local development server
- Run `npm run deploy` to upload to Devvit
- Run `npm run launch` to publish after verification
**August 31, 2026 (v0.107.0)**: No new code bugs. `npm run type-check` and `npm run build` passed. `devvit playtest` launched successfully and `devvit publish --public --bump minor` submitted v0.107.0 for review. 8 new random events added and vehicle maintenance system expanded.
