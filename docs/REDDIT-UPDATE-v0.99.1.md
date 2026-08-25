# THE OPEN WORLD — v0.99.1 Update from the Devs 🔧

Hey everyone,

We heard you loud and clear. Two big pain points have been wrecking the experience:
1. **Saves disappearing** every time you refresh or reload the browser.
2. **NPCs feeling like bots** — no greetings, repetitive replies, and conversations trapping you in a loop.

We rebuilt both systems for **v0.99.1**.

---

## ✅ Save System Rebuilt

- **Continue button now appears** when an existing save is detected.
- **Auto-resume on startup** if you left a game running.
- **Auto-save after every command** so progress is always current.
- **Server-side save keys are stable** and no longer rely on flakey context fields.
- **Final save attempt before refresh/exit** so you’re not caught mid-action.

You should no longer have to start a brand-new life every time the page reloads.

---

## ✅ NPC Conversation System Overhauled

- **NPCs now greet you first** when you `talk` or `greet` them.
- **Replies use mood, location, time of day, faction, and relationship** — less robotic, more contextual.
- **Conversations close properly** when you say goodbye, bye, leave, etc., so your next command goes through.
- **Text/SMS works correctly** for all contacts.
- **NPCs respect location/schedule context** instead of being reachable from anywhere instantly.

---

## Known Limitations

- Reddit’s iframe still blocks normal browser `localStorage`, so progress lives in our server-side save system. The new flow is built specifically around that.
- If you had multiple manual save slots, the startup check looks at slot 1. Other slots remain usable.
- First load may take an extra second as the game checks for your save.

---

## For the Devs/Modders

- Build passes type-check and compile.
- Dead duplicate `server.ts` removed.
- Full technical notes: `docs/RELEASE-NOTES-v0.99.1.md`

---

Give it a try and let us know if saves stick and NPCs feel alive now. If anything still breaks, drop the exact command or action you used and we’ll chase it down.

Thanks for sticking with us.

— THE OPEN WORLD Team
