# THE OPEN WORLD — v0.99.1 Release Notes

**Release Date:** August 25, 2026  
**Version:** v0.99.1  
**Status:** Built, type-checked, packaged, and ready for Devvit publish  
**Branch:** `main`  
**Commit:** `b458d0f`

---

## Developer Update

We heard the community loud and clear. Two pain points kept showing up in feedback and support tickets:

1. **Saves disappeared every time the browser refreshed.** Especially inside Reddit’s iframe, players had to start a brand-new life after every reload.
2. **NPCs felt like bots.** They didn’t talk first, conversations felt disconnected, and sometimes the game would lock up after talking to someone.

This patch rebuilds the save flow from the ground up and overhauls the NPC conversation system so the world finally feels responsive and alive.

---

## What Changed

### 1. Save System Rebuild

**Problem:**  
- `GET /api/init` always returned `hasPlayer: false`, so the client created a new character on every launch.  
- localStorage was being used as a fallback, which Reddit’s iframe clears across sessions.  
- Auto-save only ran on menu actions, not normal gameplay commands.  
- A dead duplicate `src/server/server.ts` was shipping conflicting legacy logic.

**Fix:**  
- `GET /api/init` now checks **Redis slot 1** and returns the existing player if one is found.  
- The client now auto-loads slot 1 at startup. If a save exists, the main menu shows **Continue** instead of forcing a new game.  
- Auto-save is now a **fire-and-forget** call after every successful command: `clientSave(1, state.player)`.  
- Save failures are logged and surfaced, instead of being silently ignored.  
- The dead duplicate server file has been removed.  
- A secondary localStorage fallback still exists, but it only activates if the server-side save is unavailable.

### 2. NPC Conversation Overhaul

**Problem:**  
- `greet [name]` didn’t actually run the conversation engine.  
- `talk [name]` either returned hard-coded keyword responses or trapped the player in conversation.  
- NPCs never started the conversation; they only echoed back neutral, robotic lines.  
- `farewell` / `bye` / `goodbye` didn’t clear `currentConversation`, so later commands were swallowed.  
- `text [npc] [message]` was calling `.get()` on `commHub`, which doesn’t exist.

**Fix:**  
- `greet [name]` now calls `conversationEngine.generateGreeting(npc, player)` and returns a contextual first line based on the NPC’s relationship, location, and time of day.  
- `talk [name]` is fully wired to `conversationEngine.generateResponse()` and passes the updated `player` object back to the client.  
- Farewell commands now properly end the conversation and restore normal command processing.  
- `text [npc] [message]` now uses the correct `commHub.getContacts()` API.  
- NPCs reference the live `relationships` object, so reputation and affinity actually affect dialogue.

### 3. Cohesion & Cleanup

- `README.md` command reference synced with the real dispatcher.  
- `AGENTS.md` updated with v0.99.1 scope and known-issues refresh.  
- `docs/roadmap.md` updated with the August 25, 2026 milestone.  
- `docs/UPDATE-LOGS.md` updated with patch details.  
- PROJECT_ID and `version` tokens refreshed to `0.99.1`.

---

## Build Verification

- `npm run type-check`: ✅ passed
- `npm run build`: ✅ passed
- Output: `dist/server/index.mjs`, `public/game.html`, `public/game.js` (8.6 MB)

---

## Files Touched

- `src/client/game.ts`
- `src/server/index.ts`
- `src/server/game-engine.ts`
- `src/server/conversation-engine.ts`
- `src/server/comm-hub.ts`
- `devvit.json`
- `README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/UPDATE-LOGS.md`

---

## How to Publish

From the project root run:

```bash
devvit login
npm run type-check
npm run build
devvit publish --public --bump minor
```

If the CLI prompts for Reddit OAuth, complete the login flow before publishing.

---

## Copy-and-Paste Reddit Update Post

```markdown
🌍 **THE OPEN WORLD v0.99.1 is live!**

Thanks to everyone who reported issues. This update fixes the two biggest complaints we’ve seen:

✅ **Saves now survive browser refreshes** — Your character is stored server-side and will be there when you come back, even inside Reddit’s mobile app and iframe.

✅ **NPCs actually talk now** — Greet someone and they’ll respond with a real first line. End a conversation with farewell / bye / goodbye and you’ll be free to keep playing. Texting NPCs is fixed too.

🔧 Also cleaned up dead server code, synced all documentation, and verified the full build.

Start or continue your life in r/theopenworld. Drop feedback in the comments — we’re reading everything.
```

---

## What’s Next

- Monitor Reddit feedback for any remaining save or conversation edge cases.
- Continue international NPC expansion in v0.100.x.
- Expand the vehicle racing system.

---

*Built by the THE OPEN WORLD team.*
