# THE OPEN WORLD — Roadmap

## Current Status — v0.108.29 (November 13, 2026)

- **Live:** v0.108.29 in both subs (r/The_Open_World + r/the_open_world_dev) since November 12, 2026 ~14:15 CT. v0.108.28 was live Nov 3–12; v0.108.27 live Nov 2.
- **Since v0.108.0 (Sep 4):** 29 versions shipped — the Oct 24–25 fix run (.1–.10: enroll, investments, prison soft-lock, money/clock display, sim batch, dialogue engine), the Nov 1 fix-all + feature batches (.11–.21: full-screen view, achievements/saves/economy fixes, Journeys instrumentation, UI rebuild, story journal, businesses, the v0.108.20 mega-update, dividends, companies), and the Nov 2 run (.22–.28: save hardening, travel/home depth, IDs/transit/weather/careers, five leaderboards, deeper work, mail fix), plus v0.108.29 (invest all, mail read by number, outcome logging). Full per-version log: `docs/UPDATE-LOGS.md`.
- **Standing rule (Dre, Nov 1):** the in-game What's New / Latest Updates screen is updated with EVERY version bump (changelog entry at the top, newest first).

## Open Items (November 13, 2026)

- **TOW-001 — live outcome verification (OPEN).** v0.108.29's outcome logging is live, but the first live `[server] Outcome` line was still unconfirmed as of the Nov 13 brief (zero Outcome lines in a 1,114-line log pull despite post-.29 invest commands). A dev-sub playtest script exists (`~/workspace/your_files/tow-001-playtest-2026-11-13.md`); the playtest itself is still owed. Enroll/investment progression remains unverified live.
- **Journeys analytics — gates pending, metrics NOT live (OPEN).** Journeys instrumentation shipped in v0.108.12, but the server-side allowlist and journey-map review are still pending — do not claim metrics live. The path to allowlist/review confirmation is unconfirmed in the docs (no portal toggle described).
- **"Google" as an investment option — Dre's call (OPEN).** The game's 8 investment options are S&P 500, Tech Growth, Treasuries, Munis, Bitcoin, Ethereum, Local Restaurant, Startup — Google is NOT one. A player's literal `invest all into google` now fails with a clear "not found" instead of "Invalid amount". Adding Google is new content, not a bug fix; flagged to Dre Nov 12, still his call.
- **Optra / LLM dialogue — domain exception REJECTED (OPEN, platform-gated).** `api.optracloud.com` (and the Hugging Face, Groq, OpenRouter domains) are Rejected in the Devvit portal, so dialogue is template-only as a platform fact until Reddit approves an exception. The v0.108.10 What's New line promising Optra "once the developer adds the key" is stale; a future What's New entry should correct it (history entries are not rewritten).
- **Community icon & banner upload — status unconfirmed.** Listed below as a remaining step; no source confirms whether it was done. Emoji + flair PNGs are ready in `~/workspace/catalog-assets/the-open-world/` (needs Dre's mod session).

---

- **September 4, 2026 (v0.108.0)**: Added 5 new international NPCs across Dubai, Tokyo, Paris, London, and Sydney (npc_334–npc_338 in `src/server/social-engine.ts`). Added 5 new city-life random events to `src/server/storyline-engine.ts`: Beach Bonfire Invitation, Street Poet Dedication, Vintage Camera Find, Community Fridge Restock, and Open Air Jazz Quartet. `npm run type-check` and `npm run build` passed. `devvit publish --public --bump minor` submitted v0.108.0 for Reddit review.

- **August 31, 2026 (v0.105.0)**: Expanded vehicle maintenance with a fuel system, registration/renewal, visual/performance customization, impound risk, and emergency towing commands. Added 8 new city-life random events — Parking Ticket, Charity Fundraiser, Protest March, Food Truck Discovery, Tech Demo Booth, Lost Pet Poster, Rooftop Party Invite, and Free Sample Day. `npm run type-check` and `npm run build` passed. `devvit publish --public --bump minor` submitted v0.105.0 for Reddit review.


- **August 28, 2026 (v0.104.2)**: Fixed property purchases so players can pay cash. "buy property [name]" now defaults to cash when the full price is available; add "cash" or "mortgage" to force a payment method. Updated in-game help text and real-estate listings.
- **August 28, 2026 (v0.104.2)**: Added 10 new international NPCs across Dubai, Tokyo, Paris, London, Berlin, Mexico City, Toronto, and Sydney (npc_324–npc_333 in `src/server/social-engine.ts`). Added 5 new city-life random events — Lost Tourist, Pop-Up Job Fair, Celebrity Sighting, Street Chess Match, and Sudden Summer Storm — to `src/server/storyline-engine.ts`. `npm run type-check` and `npm run build` passed. `devvit publish --public --bump minor` is pending fresh Reddit OAuth login in this environment.


- **August 25, 2026 (v0.102.0)**: Added a serverless LLM NPC reply bridge (`src/server/llm-provider.ts`, `src/server/ai-npc-provider.ts`) with Hugging Face as the preferred provider and OpenRouter, Groq, and Gemini free-tier fallbacks. Added `POST /api/npc-reply` to `src/server/index.ts` so NPCs can be queried directly for natural, in-character replies. API keys are managed via Devvit global settings. If no key is configured or all providers fail, the local template generator still runs. `npm run type-check` and `npm run build` passed. Devvit publish pending fresh Reddit OAuth login in this environment.

- **August 25, 2026 (v0.101.0)**: Fixed the NPC conversation amnesia bug. Converted player relationships from a JavaScript `Map` to a JSON-safe plain record so relationship value, flags, and memory survive between commands and refresh. This fixes the loop where NPCs repeated greetings and forgot player intros. Type-check and build passed. Submitted v0.100.0 to Devvit for review.

- **August 24, 2026 (v0.99.0)**: Added 10 new international NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. `npm run type-check` and `npm run build` passed. Devvit publish pending because the Devvit CLI requires a fresh Reddit OAuth login in this environment.

- **August 21, 2026 (v0.98.0)**: Added 10 new international NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. `npm run type-check` and `npm run build` passed. Devvit publish pending because the Devvit CLI requires a fresh Reddit OAuth login in this environment.

- **August 17, 2026 (v0.97.0)**: Added 10 new international NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. `npm run type-check` and `npm run build` passed. Devvit publish pending because the Devvit CLI requires a fresh Reddit OAuth login in this environment.

- **August 14, 2026 (v0.96.0)**: Added 10 new international NPCs across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. `npm run type-check` and `npm run build` passed. Devvit publish pending because the Devvit CLI requires a fresh Reddit OAuth login in this environment.

- **August 13, 2026 (v0.95.0)**: Added 10 new international NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. `npm run type-check` and `npm run build` passed. Devvit publish was not executed because the Devvit CLI is not authenticated in this environment and requires a fresh Reddit OAuth login.
- **August 12, 2026 (v0.94.0)**: Expanded property system with luxury penthouses, vacation rentals, warehouses, farmland, and offshore villas across 10 cities. Added property renovation command (`renovate property [name]`) with value/rent boosts and condition restore. Type-check, build, and publish passed. Submitted v0.94.0 for review.
- **August 11, 2026 (v0.93.0)**: Added 10 new international NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new global random events. Type-check, build, and publish passed. Submitted v0.93.0 for review.
- **August 9, 2026 (v0.92.0)**: Expanded real-estate listings across 9 major domestic cities, improved travel arrival descriptions with time-of-day flavor, and added the vehicle racing system. Type-check, build, and publish passed. Submitted v0.92.0 for review.
- **August 8, 2026 (v0.91.0)**: Added 3 new achievements, 5 fresh city-life random events, and fixed a duplicate police checkpoint on high-heat travel. Type-check, build, and publish passed. Submitted v0.91.0 for review.
- **August 7, 2026 (v0.90.0)**: Added 10 new international NPCs and 5 new random events. Type-check, build, and publish passed. Submitted v0.90.0 for review.

## Project Status

- **August 31, 2026**: v0.105.0 — Vehicle Maintenance Expansion + 8 New Random Events. Added fuel, registration, customization, impound/towing, and new city encounters. Type-check/build passed; `devvit publish --public --bump minor` submitted for review.
- **September 4, 2026**: v0.108.0 — Global NPC & Random Event Expansion. Added 5 new international NPCs (npc_334–npc_338) across Dubai, Tokyo, Paris, London, and Sydney, and 5 new city-life random events. Type-check/build passed; `devvit publish --public --bump minor` submitted v0.108.0 for Reddit review.
- **August 28, 2026**: v0.104.2 — Cash Property Purchases + Help Clarification. Fixed the real-estate buy command to support outright cash buys and explained cash vs. mortgage in help.
- **August 28, 2026**: v0.104.2 — International NPC Expansion + City-Life Encounters. Added 10 new international NPCs and 5 new random events. `npm run type-check` passed, `npm run build` passed. `devvit publish --public --bump minor` pending fresh Reddit OAuth login in this environment.
- **Current Focus (November 13, 2026):** live verification of v0.108.29's outcome logging (TOW-001) + the open items listed at the top of this file
- **Next Milestone:** close TOW-001 with a dev-sub playtest; Journeys allowlist/review; Dre's call on the Google investment option

## Validation Notes
- **August 31, 2026**: `npm run type-check` passed, `npm run build` passed. Expanded `src/server/vehicle-service.ts` with fuel, registration, customization, immobilization, and towing. Added 8 new random events to `src/server/storyline-engine.ts`. `devvit publish --public --bump minor` submitted v0.105.0 for Reddit review.
- **September 4, 2026**: `npm run type-check` passed, `npm run build` passed. Added 5 new international NPCs to `social-engine.ts` (npc_334–npc_338) across Dubai, Tokyo, Paris, London, and Sydney. Added 5 new city-life random events to `storyline-engine.ts`. Bumped version files to `v0.108.0`. `devvit publish --public --bump minor` submitted v0.108.0 for Reddit review.
- **August 24, 2026**: `npm run type-check` passed, `npm run build` passed. Added 10 new international NPCs to `social-engine.ts` (npc_314–npc_323) covering Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events to `storyline-engine.ts`. Bumped version files to `v0.99.0`. `devvit playtest` and `devvit publish --public --bump minor` were not executed because the Devvit CLI is not authenticated to Reddit in this environment; a fresh Reddit OAuth login is required.
- **August 21, 2026**: `npm run type-check` passed, `npm run build` passed. Added 10 new international NPCs to `social-engine.ts` (npc_304–npc_313) covering London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events to `storyline-engine.ts`. Bumped version files to `v0.98.0`. `devvit playtest` and `devvit publish --public --bump minor` were not executed because the Devvit CLI is not authenticated to Reddit in this environment; a fresh Reddit OAuth login is required.
- **August 17, 2026**: `npm run type-check` passed, `npm run build` passed. Added 10 new international NPCs to `social-engine.ts` (npc_294–npc_303) covering London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events to `storyline-engine.ts`. Bumped version files to `v0.97.0`. `devvit playtest` and `devvit publish --public --bump minor` were not executed because the Devvit CLI is not authenticated to Reddit in this environment; a fresh Reddit OAuth login is required.
- **August 14, 2026**: `npm run type-check` passed, `npm run build` passed. Added 10 new international NPCs to `social-engine.ts` (npc_284–npc_293) covering London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events to `storyline-engine.ts`. Bumped version files to `v0.96.0`. `devvit playtest` and `devvit publish --public --bump minor` were not executed because the Devvit CLI is not authenticated to Reddit in this environment; a fresh Reddit OAuth login is required.
- **August 13, 2026**: `npm run type-check` passed, `npm run build` passed. Added 10 new international NPCs across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Added 5 new city-life random events. Bumped version files to `v0.95.0`. `devvit publish` was not executed because the Devvit CLI is not authenticated in this environment.
- **August 12, 2026**: `npm run type-check` passed, `npm run build` passed. Expanded property system with luxury penthouses, vacation rentals, warehouses, farmland, and offshore villas across 10 cities. Bumped version files to `v0.94.0`. `devvit publish --public --bump minor` submitted v0.94.0 for review.

## 🗺️ Phase 5: Global Expansion (Current)
- [x] **v0.105.0**: Vehicle Maintenance Expansion — fuel, registration, customization, impound/towing system
- [x] **v0.105.0**: Random Events Expansion — 8 new city-life encounters
- [x] **v0.104.2**: Cash Property Purchases — support cash and mortgage options in real-estate; default to cash when affordable\n- [x] **v0.104.2**: International NPC & Random Event Expansion — 10 new global NPCs + 5 new city encounters
- [x] **v0.105.0**: Vehicle Maintenance Expansion — fuel, registration, customization, towing, impound risk; 8 new city-life events
- [x] **v0.99.0**: Global NPC & Random Event Expansion — 10 new NPCs across global cities + 5 new random events
- [x] **v0.98.0**: Global NPC & Random Event Expansion — 10 new NPCs across global cities + 5 new random events
- [x] **v0.97.0**: Global NPC & Random Event Expansion
- [x] **v0.96.0**: More International NPCs & City-Life Events
- [x] **v0.95.0**: International NPCs & City-Life Events — 10 new NPCs across global cities + 5 new random events
- [x] **v0.94.0**: Expanded Property Types & Renovation — Luxury penthouses, vacation rentals, warehouses, farmland, offshore villas + renovation system
- [x] **v0.93.0**: International NPC & Global Events Expansion — 10 new NPCs, 5 new city events
- [x] **v0.92.0**: Vehicle Racing System — Enter tracks, earn payouts, build driving skill
- [x] **v0.92.0**: Domestic Real Estate Expansion — Properties in 9 major US cities
- [x] **v0.85.0**: Development Infrastructure — Single source-of-truth version sync
- [x] **v0.86.0**: Vehicle Maintenance & Random Events Expansion
- [x] **v0.80.0**: International NPC & Crime Expansion (Added 10 NPCs to London/Tokyo, Enhanced Crime System)
- [x] **v0.80.0**: Global Immersion Update (High-Profile NPCs, Dynamic Travel Descriptions)
- [x] **v0.76.0**: Crime & Crisis Update (Heat system, Lawyer interventions, Life Crisis events)
- [x] **v0.76.0**: Career & Specialization Overhaul
- [x] **v0.73.0**: Global Immersion & Atmospheric Travel
- [x] **v0.72.0**: Real Estate Tycoon & Faction Achievements
- [x] **v0.71.0**: NPC & Event Expansion (Memphis, West Memphis)
- [x] **v0.70.0**: Faction Wars & Political Influence
- [x] **v0.69.0**: Global Content Expansion (Toronto, Berlin, Mexico City, Sydney)
- [x] **v0.68.0**: Expanded International Events & Luxury Real Estate
- [x] **v0.67.0**: Global Mission Expansion & Social Depth
- [x] **v0.66.0**: International NPC Expansion & New Factions (Berlin/Dubai)
- [x] **v0.65.0**: Crime Expansion (Scam, GTA) & Criminal Records
- [x] **v0.64.0**: Professional Schools & Faction Group Chats
- [x] **v0.49.0**: Reddit API Post Creation & Social Sync
- [x] **v0.50.0**: Added 16 International NPCs to global cities
- [x] **v0.51.0**: Expand international district data with unique locations
- [x] **v0.52.0**: Global Crime & Consequence System
- [x] **v0.53.0**: Achievement System & Global NPC Expansion
- [x] **v0.54.0**: Phone & Email System Overhaul
- [x] **v0.55.0**: Vehicle Maintenance & Parts
- [x] **v0.56.0**: Bank System (Deposit/Withdraw)
- [x] **v0.57.2**: Critical Stability Patch
- [x] **v0.57.1**: Chat & Stability Patch
- [x] **v0.57.0**: Skill Progression Overhaul
- [x] **v0.58.1**: Critical Stability Patch
- [x] **v0.58.3**: Critical Stability Patch
- [x] **v0.58.4**: Critical Stability Patch
- [x] **v0.58.6**: Critical Stability Patch
- [x] **v0.58.8**: Critical Stability Patch
- [x] **v0.58.10**: Critical Stability Patch
- [x] **v0.58.12**: Critical Stability Patch
- [x] **v0.58.14**: Critical Stability Patch
- [x] **v0.58.16**: Previous Stability Fixes
- [x] **v0.60.0**: Critical Stability Patch
- [x] **v0.61.0**: International NPC Expansion
- [x] **v0.62.0**: Phone/Email Overhaul & Dynamic Events
- [x] **v0.66.0**: International NPC Expansion
- [x] **v0.67.0**: Global Mission Expansion & Social Depth
- [x] **v0.68.0**: Expanded International Events & Luxury Real Estate
- [x] **v0.76.0**: Career & Specialization Overhaul
- [x] Implement Faction Wars & Political Influence (shipped v0.70.0; also listed above)
- [x] **v0.81.0**: Added 8 new international NPCs across Toronto, Sydney, Mexico City, Berlin, Dubai, and Paris
- [x] **v0.82.0**: Deeper NPC dialogue engine + new achievements
- [x] **v0.83.0**: Domestic NPC expansion (Seattle, Vegas, Phoenix, Detroit, Philly, Charlotte, Dallas, Houston)
- [x] **v0.83.0**: City-specific domestic greetings
- [x] **v0.83.0**: First-meeting social achievements

---

## 🗺️ Phase 6: Fix Run + Living World (v0.108.1–v0.108.29, Oct 24–Nov 12, 2026)
- [x] **v0.108.1**: Enroll fix (study hours advance courses) + investments tick on sleep
- [x] **v0.108.2**: Monthly property tick + prison soft-lock fixed + save-slot overwrite fix + `vehicles` works + study-hours validation + re-enroll guard
- [x] **v0.108.3**: Money display (2 decimals, cent rounding) + game clock saves/restores
- [x] **v0.108.4–v0.108.7**: Identical re-submissions of v0.108.3 (publish-loop bug; v0.108.5 briefly installed Oct 25) — no distinct content
- [x] **v0.108.8**: Dashboard clock/date/weather repaint fix
- [x] **v0.108.9**: Simulation fix batch (~20 fixes: hiring checks, health as a live stat, save TTL 30→90 days, investment tick gating, property re-buy blocked)
- [x] **v0.108.10**: Dialogue engine (per-NPC voices, episodic + fact memory, mood-driven replies; AI replies gated on the Optra key — see Open Items: domain exception rejected, template-only)
- [x] **v0.108.11**: Optional full-screen view
- [x] **v0.108.12**: Fix-all batch — achievements unlockable + announced, save integrity, real travel fares, bank interest, occupancy rent, real splash, persisted settings, Journeys instrumentation (allowlist/review pending — metrics NOT live)
- [x] **v0.108.13**: Update Logs redesigned (true-black-flat) + theme toggle fixed + Settings full-screen row fixed
- [x] **v0.108.14**: Full-screen Game Menu widened + 10 more quick selections
- [x] **v0.108.15**: Property upgrades, business ownership, daily goals, vehicle upgrades, NPC depth (gifts/hangouts/perks), story journal, government & law, job system rebuilt, new UI
- [x] **v0.108.16**: Quick bar scrolls + quick selections reordered
- [x] **v0.108.17**: Quick selections mid-conversation + pause menu simplified + `go home` + help rewrite
- [x] **v0.108.18**: Commands mid-conversation, travel-to fix, West Memphis homes, city display names, navigation (districts/where/goto/explore), nearby, menu rebuild, schools catalog, emails list, full help audit
- [x] **v0.108.19**: Life & World expansion — bonds/milestones, home life, cooking, events calendar, road trips, passport
- [x] **v0.108.20**: The mega-update — save P0 fixes, taxes, court/police, college life, family, government tiers, calendar/years, gigs/overtime, money/bank, hard mode, living expenses, character starts, leaderboard, legacy, challenges, newspaper, seasons, trading, deeper work, citizen, fame, companies, world stock, staff, dialogue topics, greetings, West Memphis residents, mail/delivery, citizen services, routines, housing depth, will/estate, insurance, offices (Mayor/Governor/President), careers linkage, more colleges, GPA/exams, citizen names, news ticker, `view` fix
- [x] **v0.108.21**: Named save failures + retry, investment folding, texts/voicemails persist, stock dividends, found companies, market-index repricing, 24 thin-city NPCs, fair fee escalation, scrolling ticker, help/What's New reorg
- [x] **v0.108.22**: Save-system hardening (stale-banner honesty, serialized sends, leaderboard/challenge recording, outage protection, newest-slot Continue)
- [x] **v0.108.23**: Travel journal/journey previews/souvenirs, tenants/leases/open house, myhome + routines, help bodies as cards
- [x] **v0.108.24**: IDs, criminal records, transit, weather depth, emergency career ladders, time/24h life, news categories, social media, phone messages fix, pro sports & college careers
- [x] **v0.108.25**: Leaderboard revamp (five boards) + menus fit compact frame + Avok Interactive branding
- [x] **v0.108.26**: Deeper working activities + emergency-track activities (police/fire/EMS) + deeper shifts + entry jobs visible + Home/Sleep quick bar
- [x] **v0.108.27**: Update Logs index organized (latest 10 + grouped families)
- [x] **v0.108.28**: Mail lists real items + `mail read [id]` + Mail quick bar
- [x] **v0.108.29**: `invest all` + `mail read [n]` + outcome logging (live verification open — see Open Items)

## ✅ Completed Features

### Core Systems
- **Stateless Architecture** — Client-side state persistence
- **Work System** — Get hired, work shifts, earn money with weather effects
- **Time System** — Linear progression, time advances with actions
- **Economy** — Job listings, hourly wages, market conditions

### World
- **28 Cities** across 7 regions (Mid-South, Southeast, Northeast, Midwest, Southwest, West, International)
- **55+ Districts** with unique descriptions
- **Travel System** — Move between cities

### Social
- **304 NPCs** with schedules, personalities, backgrounds (304 definitions in `src/server/social-engine.ts`, ids through npc_370 — includes the 8 West Memphis residents from v0.108.20 and the 24 thin-city residents from v0.108.21)
- **Relationship System** — Greet, talk, assist NPCs
- **Factions** — Community groups with reputation
- **Faction Group Chats** — Real-time social circles for joined factions
- **Phone OS v2.0** — Contacts, search, drafts, group chats

### Career & Education
- **Professional Schools** — Enroll in universities to earn degrees (e.g., Maestro College)
- **Specializations** — Become a specialist (AI Engineer, Surgeon, etc.)
- **Certification Requirements** — High-tier jobs now require specific degrees or licenses

### Property & Wealth
- **Real Estate** — Buy/sell properties with mortgages
- **Investments** — Stocks, bonds, crypto, business
- **Vehicles** — Buy, sell, garage system

### Events
- **Storyline Engine** — Dynamic events triggered by time, location, stats
- **Random Events** — Street encounters, life moments
- **Seasonal Events** — Memphis in May, State Fair, holidays

---

## 🔲 Remaining Steps

### Launch
1. ~~**Create r/theopenworld Subreddit**~~ ✅ DONE
   - URL: https://www.reddit.com/r/THE_OPEN_WORLD/
2. ~~**Install Game on Subreddit**~~ ✅ DONE
   - Game installed and live
3. ~~**Post Launch Announcement**~~ ✅ DONE
   - Post: https://www.reddit.com/r/The_Open_World/comments/1snp1ct/the_open_world_life_simulation_game_now_live/

### Future Features
- [x] Phone/Email system ✅
- [x] Achievement tracking with notifications ✅
- [x] Crime system with consequences ✅
- [x] More NPC dialogue variety ✅
- [x] Bank system (deposit/withdraw) ✅
- [x] Skill progression system ✅
- [x] Faction Wars & Political Influence ✅

---

## Commands Quick Reference

| Category | Commands |
|----------|----------|
| **Core** | work, apply, apply [job], status, help, sleep, study, gym |
| **Travel** | travel [city], explore, goto [district] |
| **Social** | talk [name], greet [name], people, assist [name], factions, influence, support [id], sabotage [id] |
| **Property** | real-estate, buy property [name], sell property [name], properties |
| **Invest** | invest, invest [name] [amount], investments |
| **Vehicles** | vehicles, buy vehicle [type], sell vehicle [name] |
| **Events** | event, event choice [id] |

---

## Development Notes

- **Project**: `/home/workspace/Projects/the-open-world/`
- **Platform**: Devvit (Reddit)
- **TypeScript**: ✅ Passing
- **Architecture**: Stateless (client-side state)
- **Market positioning**: Living world simulation with Mid-South flavor

## Next Steps

- [x] Create r/theopenworld Subreddit ✅
- [x] Install Game on Subreddit ✅
- [x] Post Launch Announcement ✅
- [x] Implement Faction Wars & Political Influence ✅
- [ ] Upload Community Icon & Banner (status unconfirmed — see Open Items at the top of this file)
- [ ] Add more NPC interactions
- [x] Implement phone/email system ✅ (shipped; mail/email systems expanded in v0.108.18, v0.108.20, v0.108.24, v0.108.28)
- [x] Add achievement tracking ✅ (shipped; achievements fixed and announced in v0.108.12)

## 🛠️ Roadmap

- [x] **v0.56.0**: Bank System (Deposit/Withdraw)
- [x] **v0.57.2**: Critical Stability Patch
- [x] **v0.57.1**: Chat & Stability Patch
- [x] **v0.57.0**: Skill Progression Overhaul
- [x] **v0.58.0**: Social Interaction Depth & Dynamic NPCs
- [x] **v0.58.1**: Critical Stability Patch
- [x] **v0.58.3**: Critical Stability Patch
- [x] **v0.58.4**: Critical Stability Patch
- [x] **v0.58.6**: Critical Stability Patch
- [x] **v0.58.8**: Critical Stability Patch
- [x] **v0.58.10**: Critical Stability Patch
- [x] **v0.58.12**: Critical Stability Patch
- [x] **v0.58.14**: Critical Stability Patch
- [x] **v0.58.16**: Previous Stability Fixes
- [x] **v0.60.0**: Critical Stability Patch