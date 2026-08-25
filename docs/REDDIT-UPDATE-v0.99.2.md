# THE OPEN WORLD — Developer Update v0.99.2
*Copy + paste this into Reddit*

---

**THE OPEN WORLD — v0.99.2 is now live!**

We heard you. Two big pain points have been fixed in this patch:

🗣️ **NPCs actually talk now**
- When you `talk` or `greet` someone, the NPC speaks first with a contextual line based on who they are, where you are, what time it is, and how they feel about you.
- Conversations no longer trap you — just say `bye`, `exit`, `leave`, `later`, `im out`, etc. to end the chat.
- `text [name] [message]` is fixed and reads your relationship with that NPC.
- `people` now shows NPCs across the whole city when district data is missing so no one is invisible.

💾 **Saves survive refresh and browser reloads**
- Your progress is now stored server-side on Redis as the source of truth.
- The game auto-saves after every command and also flushes your save when you close or refresh the tab.
- When you come back, the splash screen shows a **Continue** button if you have a save.
- `New Game` only wipes progress when you explicitly choose it.
- `localStorage` is still there as a backup but is no longer the main save.

Also cleaned up:
- Dead duplicate server file removed.
- Single source of truth for saves and game state.
- Version bumped to v0.99.2 across the project.

Type-check and build passed. Devvit publish is processing now.

Thanks for the reports — keep the feedback coming.

Play: r/theopenworld

#TheOpenWorld #Devvit #IndieGame #TextSim
