# THE OPEN WORLD — Update Logs

---

## Version 0.36.0 — May 4, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.36.0 submitted for review
- **Synced**: GAME_VERSION updated to v0.36.0
- **TypeScript**: All checks passing
- **Build**: Successful

---

## Version 0.35.0 — May 4, 2026

### 🎨 UI/UX Polish & Fullscreen Fix
- **Redesigned Landing/Splash Screen**: Modern look with deep animated backdrop and glassmorphism logo.
- **Redesigned Main Menu**: Polished UI with sleek buttons and subtle glowing effects.
- **Fullscreen Issue Fixed**: Removed non-functional fullscreen buttons/logic since Reddit's iframe blocks it.

---



## Version 0.34.0 — May 4, 2026

### 🔄 Version Bump After Deploy
- **Deployed**: v0.35.0 submitted for review
- **Synced**: GAME_VERSION and client menu version updated to v0.35.0
- **TypeScript**: All checks passing
- **Build**: Successful

---

## Version 0.31.4 — April 16, 2026

### 🎮 REDDIT API POST CREATION
- **CRITICAL FIX**: Menu now uses `reddit.submitCustomPost()` API
- Creates actual game post when "Start a New Life" is clicked
- Navigates user to the new post automatically

---

## Version 0.31.3 — April 16, 2026

### 🐛 BUG FIX - Menu Post Creation
- **CRITICAL FIX**: Added `/internal/menu/post-create` endpoint
- Fixed "Start a New Life" menu button not working

---

## Version 0.31.2 — April 16, 2026

### 🐛 BUG FIX - Content-Length Header
- **CRITICAL FIX**: Changed internal endpoints to return 204 No Content
- Fixed Content-Length header issue during installation
- App can now be installed on subreddits

---

## Version 0.31.1 — April 16, 2026

### 🐛 BUG FIX - Installation Endpoint
- **CRITICAL FIX**: Added `/internal/on-app-install` endpoint
- **CRITICAL FIX**: Added `/internal/on-app-uninstall` endpoint
- App can now be installed on subreddits successfully
- Fixed HTTP 404 error during installation

---

## Version 0.31.0 — April 16, 2026

### 👥 NPC WORLD EXPANSION
- **33 NEW NPCs** added across 10 cities
- **Nashville** (4): Johnny Ray, Patsy Monroe, Doc Holliday, Sweet Lou
- **Atlanta** (4): King Carter, Auntie Pearl, DJ Hurricane, Coach Brenda
- **New Orleans** (4): Big Daddy Gumbo, Voodoo Mama, Professor Longhair Jr, Nana Bee
- **New York** (5): Tony The Tie, Jade Kim, Brooklyn B, Dr. Maya Patel, Big Sal
- **Los Angeles** (4): Vinny Vibe, Sunshine Starr, Dr. Feelgood, Mama Rosa
- **Chicago** (4): Gino The Giant, Queen Latifah Jr, Old Man Winter, Coach Iron Mike
- **Miami** (3): Carlos Cruz, Abuela Lucia, DJ Heatwave
- **Houston** (3): Big Tex, Mama Tran, Dr. Freeman
- **Dallas** (2): J.R. Sterling, Cowboy Cliff
- **Total NPCs**: 75 (up from 42)

### 🎮 LAUNCH READY
- Game approved for public release
- Subreddit created: r/THE_OPEN_WORLD
- Ready for launch announcement

---

## Version 0.30.0 — April 16, 2026

### 🔄 Minor Version Bump
- **Deployed**: v0.30.0 submitted for review
- **TypeScript**: All checks passing
- **Playtest**: Verified working

---

## Version 0.29.0 — April 16, 2026

### 📋 Version Sync & Minor Polish
- **Synced versions** — GAME_VERSION and client menu version updated to v0.29.0
- **TypeScript checks** — All passing
- **Playtest verified** — Game runs successfully

---

## Version 0.28.0 — April 16, 2026

### 🏗️ STATELESS ARCHITECTURE
- **CRITICAL FIX**: Game state now persists between requests
- Client maintains `state.player` and sends it with every request
- Server processes commands and returns updated state
- No server-side session storage needed

### 🐛 Bug Fixes
- Fixed job not persisting after `apply` command
- Fixed `work` command not finding job
- Proper Map serialization for relationships

---

## Version 0.22.0 — April 16, 2026

### 🏗️ STATELESS ARCHITECTURE
- **CRITICAL FIX**: Game state now persists between requests
- Client maintains `state.player` and sends it with every request
- Server processes commands and returns updated state
- No server-side session storage needed

### 🐛 Bug Fixes
- Fixed job not persisting after `apply` command
- Fixed `work` command not finding job
- Proper Map serialization for relationships

---

## Version 0.18.0 — April 16, 2026

### 🎉 ALL SYSTEMS WIRED
- **NPC System**: Talk to 42 NPCs with `talk [name]`, see who's around with `people`
- **Property System**: Buy/sell properties with `real-estate`, `buy property`, `sell property`
- **Investment System**: Stocks, bonds, crypto with `invest`, `investments`
- **Vehicle System**: Buy/sell vehicles with `vehicles`, `buy vehicle`, `sell vehicle`
- **Storyline Events**: Random events trigger during explore/work

### 🎭 Background System
- 6 backgrounds: Working Class, Student, Corporate, Hustler, Creative, Unemployed
- Each background has unique starting money and stat bonuses
- Background selection during character creation now works

### 💾 Save System Fixed
- Delete button now functional (calls API)
- Load screen fetches actual saves from server
- Saves load player state correctly

### 🔧 Bug Fixes
- Fixed new game flow (character creation shows for new players)
- Fixed type imports for Property, Investment
- Added firstName/lastName/description to NPCState
- Removed duplicate 'help' case in command dispatcher

---

## Version 0.15.0 — April 15, 2026

### 🔧 WORK SYSTEM FIXED
- **CRITICAL FIX**: Work command now properly calculates pay
- Jobs store hourly wage correctly
- `apply Software Developer` → `work` now works!

### 📋 Job System
- Jobs show hourly pay rates
- Apply for jobs with `apply [job name]`
- Work earns money based on hourly wage × 8 hours
- Weather affects work productivity

### 💾 Save System
- Delete button added to save slots
- Save/Load infrastructure ready
- `src/server/save-system.ts` created

### 📱 UI Updates
- Delete button on Load Game screen
- Game menu overlay (Resume, Save, Settings, Quit)
- Fullscreen toggle button

---

## Version 0.14.1 — April 15, 2026

### ⏰ Time Progression System
- `nextday` / `tomorrow` - Jump to next day (6 AM)
- `wait [hours]` - Skip hours
- `morning` / `afternoon` / `evening` / `night` - Time jumps
- Actions auto-advance time (work +8hrs, explore +1hr, etc.)

### 🚗 Travel System
- Travel to any city with `travel [city]`
- City descriptions adapt to current location
- 28+ cities worldwide

---

## Version 0.13.0 — April 15, 2026

### 📱 Phone System Commands
- `phone` - Phone summary
- `phone messages` - Read SMS
- `phone email` - Check inbox
- `phone calls` - Call history
- `text [name] [message]` - Send SMS
- `call [name]` - Make calls

---

## Version 0.11.0 — April 15, 2026

### 📱 Phone System Working!
- All phone commands now functional
- SMS with NPC replies
- Voicemail system
- Social media posts

---

## Version 0.8.0 — April 15, 2026

### 📱 Immersive Phone System
- 14 phone apps (Messages, Mail, Phone, SocialHub, Browser, etc.)
- Natural conversation input
- NPC relationship system

---

## Version 0.5.0 — April 15, 2026

### 🎮 Crime System & Achievements
- Pickpocket, shoplift, burglary, robbery, heist
- 30+ achievements
- Natural Language Processing

---

## Version 0.1.0 — April 14, 2026

### 🎮 Initial Release
- 42 NPCs with schedules
- Job system, vehicles, weather
- Character creation

---

## Upcoming Features

- [ ] Multi-save slots
- [ ] Prison system for crime
- [ ] More NPCs for international cities
- [ ] Leaderboards

---

## Known Issues

1. **Fullscreen in iframe**: Reddit's sandbox prevents true fullscreen
2. **Load Game**: Coming soon

---

*Last Updated: May 4, 2026*
*Current Version: 0.34.0*
