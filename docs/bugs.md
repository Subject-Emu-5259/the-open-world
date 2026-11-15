# THE OPEN WORLD — Bug Tracker

*Last Updated: November 13, 2026 (v0.108.29 live in both subs)*

## Current Status — v0.108.29 (November 13, 2026)

- **Live version:** v0.108.29 in r/The_Open_World + r/the_open_world_dev since Nov 12 ~14:15 CT. No error-like lines and zero PERMISSION_DENIED in the latest TOW log pulls (Nov 12–13 briefs).
- **Per-version log:** `docs/UPDATE-LOGS.md` covers v0.108.1–v0.108.29. The historical entries below (v0.108.0 and earlier) are kept as-is.

## ✅ Fixed in v0.108.1–v0.108.29 (cite the version)

- **Enroll dead-end** — `study hours [n]` just re-printed the school list instead of advancing a course. Fixed v0.108.1.
- **Investments frozen** — portfolio sat at purchase price forever. Fixed v0.108.1 (one market tick per sleep); tick gating hardened v0.108.9 (at most once per game-day).
- **Prison soft-lock** — getting busted locked you in prison forever. Fixed v0.108.2 (3-day sentences, work shortens, `lawyer appeal` while incarcerated, old saves healed).
- **Save-slot overwrite** — playing on slot 2 silently overwrote slot 1. Fixed v0.108.2.
- **`vehicles` dead command** — fell through to unknown command. Fixed v0.108.2.
- **Study-hours validation** — `study hours 0`/negative silently studied 1 hour or rewound time. Fixed v0.108.2.
- **Double enroll / double graduation** — enrolling while enrolled double-charged; graduating could award the same certification twice. Fixed v0.108.2.
- **Money display** — balances showed long fractional tails ($677.8846153846154). Fixed v0.108.3 (2 decimals, cent rounding, old saves heal on load).
- **Game clock reset** — time snapped back to 6:00 AM Jan 1, 2024 on every load. Fixed v0.108.3 (game-time saves/restores).
- **Dashboard clock frozen** — header time/date/weather painted once and never repainted. Fixed v0.108.8.
- **Simulation batch** — hiring skipped requirement checks, health never moved, saves expired after 30 days, ambiguous names picked the first match, property re-buy allowed, unvalidated districts, no fuel/wear on moves, weather changed mid-day, heat never decayed on idle, storyline losses could push cash below $0. Fixed v0.108.9.
- **Achievements un-unlockable** — progress achievements could never unlock (hardcoded 30-id check list), unlocks were silent, World Traveler asked for 28 cities when 27 exist. Fixed v0.108.12 (full list iterated, unlocks announced, World Traveler 27).
- **Silent save failure** — Redis errors swallowed; a failed save pretended it worked. Fixed v0.108.12 (failed saves warn; server slot listing + delete). Named failure classes + retry added v0.108.21; stale-banner honesty + serialized sends + outage protection added v0.108.22.
- **Progress vanishing on return** — bought businesses and other progress could vanish after leaving and coming back (stale writes overwrote newer saves; Continue resumed slot 1 only). Fixed v0.108.20 (newest copy wins on every slot, stale writes rejected, Continue resumes newest slot).
- **West Memphis unbuyable** — starting-city listings visible but unbuyable. Fixed v0.108.20.
- **West Memphis empty** — starting city had no residents and no homes. Fixed v0.108.18 (homes) and v0.108.20 (8 residents).
- **Theme toggle dead** — dark/light toggle did nothing (change only applied on footer Apply; Back discarded it; hardcoded dark surfaces). Fixed v0.108.13.
- **Settings full-screen row broken** — wrapped into a narrow stacked column in expanded view. Fixed v0.108.13.
- **Mail unreadable** — `mail` showed only counts by kind; `emails` printed usage instead of listing. Fixed v0.108.18 (`emails` lists the inbox) and v0.108.28 (`mail` lists real items; `mail read [id]` opens one).
- **Mail ids unfindable** — mail ids are long machine strings with no way to discover one. Fixed v0.108.29 (`mail read [n]` by display position).
- **`invest all` errored** — died with a bare "Invalid amount" because the amount had to be a number. Fixed v0.108.29 (`invest all into [name]` invests all available cash).
- **Investment lines duplicated** — buying more of an asset you owned made a second line. Fixed v0.108.21 (positions fold; old doubled lines fold on load).
- **Leaderboard/challenges never recorded** — ranks computed as -1 forever (wrong store-call shapes); one failed write killed the other channel. Fixed v0.108.21–v0.108.22.
- **Entry jobs invisible** — `apply` sorted highest-rank-first and cut off at 15, hiding entry jobs like Police Cadet. Fixed v0.108.26.
- **Menus too large for the Reddit frame** — main/pause menus cut off in compact view. Fixed v0.108.25.
- **Quick bar cut off** — shortcuts past the right edge unreachable. Fixed v0.108.16 (horizontal scroll).
- **Shortcuts/commands dead mid-conversation** — tapping a shortcut (or typing a command) while talking to an NPC sent it as chat text. Fixed v0.108.17 (shortcuts) and v0.108.18 (typed commands).
- **`travel to [city]` failed** — the parser choked on "to". Fixed v0.108.18.
- **City codes leaked** — player-facing strings showed internal ids (`west_memphis`, `littlerock`). Fixed v0.108.18.
- **Texts/voicemails lost on reload** — SMS and voicemails didn't survive save → quit → reload. Fixed v0.108.21.
- **Fake splash / settings not persisting / dead audio toggles** — loading was a fixed 2.4s timer, settings reset every session, audio toggles did nothing. Fixed v0.108.12 (real probe-tied splash, persisted settings, dead toggles removed).
- **Update Logs unreachable / wall of text** — the Updates screen had no menu entry and read as one continuous wall. Fixed v0.108.12 (What's New button) and v0.108.13 (redesigned sections); index organized v0.108.27.

## 🔴 Open Bugs / Blockers (November 13, 2026)

- **TOW-001 — outcome logging unverified live (OPEN).** v0.108.29 logs `[server] Outcome` lines for enroll/study/invest/exam/graduate/sleep, live since Nov 12 ~14:15 CT — but the first live Outcome line was still unconfirmed as of the Nov 13 brief (zero Outcome lines in a 1,114-line pull despite post-.29 invest commands in the window). Either no qualifying outcome fired, or the logging isn't reaching the log stream. Needs the dev-sub playtest (script: `~/workspace/your_files/tow-001-playtest-2026-11-13.md`, ~10 min) or a wider log pull. Enroll/investment progression remains unverified live.
- **Optra / LLM dialogue — domain exception REJECTED (OPEN, platform-gated).** `api.optracloud.com` (and api-inference.huggingface.co, api.groq.com, openrouter.ai) are Rejected in the Devvit portal, so dialogue is template-only as a platform fact until Reddit approves an exception — even with a key set. Follow-up: re-request/appeal the Optra exception, or accept template-only.
- **v0.108.10 What's New line stale (OPEN, docs).** The .10 entry promises Optra replies "once the developer adds the key" — doubly stale now that the domain exception is rejected. A future What's New entry should correct it; history entries are not rewritten.
- **Journeys gates pending (OPEN, dependency — not a game bug).** Journeys instrumentation shipped in v0.108.12, but the server-side allowlist and journey-map review are still pending, so no metrics are live. Do not claim metrics live.
- **TOW log pulls partial (OPEN, observability — not a game bug).** `devvit logs` for TOW times out at 150s but still delivers lines (807 on Nov 12, 1,114 on Nov 13); error visibility is partial, not nil. HQ's pulls are a separate, worse outage (8 straight days, 0 lines) — see Dispatch HQ, not this game.

---

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
- [x] TypeScript compilation - PASSING (v0.108.29, November 12, 2026: type-check + build green, harness 66/66)
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
- [x] Reddit sandbox testing
- [x] Subreddit setup (r/theopenworld) — live in r/The_Open_World + r/the_open_world_dev
- [x] Production deployment — v0.108.29 live in both subs since Nov 12, 2026
---
## Notes
- Run `npm run type-check` to verify TypeScript
- Run `npm run dev` to start local development server
- Run `npm run deploy` to upload to Devvit
- Run `npm run launch` to publish after verification
**August 31, 2026 (v0.107.0)**: No new code bugs. `npm run type-check` and `npm run build` passed. `devvit playtest` launched successfully and `devvit publish --public --bump minor` submitted v0.107.0 for review. 8 new random events added and vehicle maintenance system expanded.
