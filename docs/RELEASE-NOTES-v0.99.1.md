# THE OPEN WORLD — v0.99.1 Developer Update & Release Notes

**Date:** August 24, 2026
**Version:** v0.99.1
**Build Status:** Type-check ✅ — Build ✅

---

## TL;DR

We rebuilt the save flow from the ground up and overhauled NPC conversations. Players should no longer lose progress on refresh, reload, or browser close, and NPCs now actually greet, respond, and end conversations naturally.

---

## Dear Players,

Thank you for the feedback over the past week. Two issues kept coming up louder than anything else:

1. **“My save is gone every time I refresh.”**
2. **“NPCs don’t talk back — they feel like bots.”**

We heard you. v0.99.1 is a focused maintenance patch that addresses both of those problems at their core. No new cities or careers this time — just a lot of behind-the-scenes rebuilding so the world actually feels alive and your time in it sticks around.

---

## 🔧 Save System Rebuilt (No More Lost Progress)

### What changed

- **/api/init GET now checks Redis first.** Before this patch, the game always returned `hasPlayer: false`, so every refresh forced a brand-new character. It now looks up the player by install ID + username and returns your saved character if one exists.
- **Auto-save is now tied to commands.** After every successful command, the client sends the updated player state to the server in the background. You no longer have to remember to open the menu to save.
- **Continue / New Game is accurate.** The main menu now displays **Continue from save** when a slot exists, and **New Game** otherwise.
- **Save on tab close / minimize.** When the page hides (`visibilitychange`), we attempt one last background sync so you don’t lose the last thing you did.
- **Stronger fallback.** The save key is built from `context.username` + `context.installId`, and the server falls back to `postId` if needed, so reinstalls or cross-tabs are handled more gracefully.
- **localStorage is no longer the source of truth.** Reddit’s iframe frequently clears localStorage, so we stopped relying on it and moved persistence to the server-side store.

### What this fixes

- “I have to start a new game every time I refresh.” ❌
- “My save disappears when I close the tab.” ❌
- “I refreshed and my character was gone.” ❌

---

## 🗣️ NPC Conversation Overhaul

### What changed

- **talk [name] now initiates a real greeting.** When you use `talk [npc]`, the NPC opens with a contextual greeting based on their role, mood, relationship with you, district, and time of day.
- **NPCs react differently when you greet them.** `greet [npc]` now advances the conversation and yields a role-aware response instead of silence.
- **Conversations can actually end.** Saying **bye, goodbye, exit, leave, later, im out, or ima head out** now clears `currentConversation` and returns you to normal command mode.
- **The conversation engine now tracks flow state.** It records the last NPC question and will occasionally ask you one back, keeping exchanges from feeling one-sided.

### What this fixes

- “NPCs don’t talk or respond.” ❌
- “NPCs act like bots.” ❌
- “I got stuck in conversation mode and couldn’t do anything.” ❌

---

## 📱 Other Fixes

- **`text [name]` SMS system fixed** — was trying to call `.get()` on a plain object, causing every NPC to return the same neutral reply. It now reads relationship correctly and gives relationship-aware responses.
- **Removed dead `src/server/server.ts` duplicate** — there were two server files with conflicting logic. The real entry point is `src/server/index.ts`.
- **README command list synchronized** with the dispatcher so in-game `/help` and the docs finally agree.
- **Version bumped to v0.99.1** across the client menu, server, and docs.

---

## ⚠️ Known Limitations

- **First-time players still start fresh** — this is intentional. Once you complete character creation and issue your first command, auto-save takes over.
- **Devvit fullscreen remains restricted** by Reddit’s iframe sandbox; this is outside our control.
- **Cross-device resume** is currently keyed to your Reddit account + install ID. Playing on a different browser or app install may not carry the same save.

---

## What’s Next

Now that saves and conversations are stable, we’re shifting focus back to:

- More dynamic storylines and world events
- Expanded faction interactions
- Improved phone/email UX
- Vehicle racing and property investments

---

## Thank You

Special thanks to everyone who reported the save-wipe and robot-NPC issues. Your screenshots and reproduction steps made this patch possible.

**— THE OPEN WORLD dev team**
