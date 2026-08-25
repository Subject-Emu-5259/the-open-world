# THE OPEN WORLD — Dev Update v0.100.0

*Copy/paste this post directly into r/theopenworld or the game’s community subreddit.*

---

**Patch v0.100.0 is live and under Reddit review.**

Our biggest focus this week was the bug you were all reporting: **NPCs were acting like bots — repeating the same greeting, forgetting your name, and ignoring what you said.** We tracked the cause to a data-type mismatch in the save system.

### What was wrong

The game server stored your relationship with every NPC as a JavaScript `Map`. That works fine in memory, but every time the server sent your updated character back to the browser, the Map became an empty object. That meant:

- NPCs lost your `knows_name` flag every command.
- Conversation memory was wiped after each exchange.
- The NPC had no idea you just introduced yourself.

Every reply looked like the first reply, which is exactly what a bot would do.

### What we changed in v0.100.0

- **Relationship data is now a plain JSON-safe record** with value, flags, memory, and timestamps. It survives every command and every refresh.
- **NPCs now remember your name** once you introduce yourself.
- **Conversation memory persists** so NPCs respond to what you actually said, not just the last greeting.
- **`assist [name]` and quest rewards** now read/write relationship value correctly.
- **Save flow is untouched structurally** — it is still server-first Redis with localStorage as offline backup.

### What this means for players

- `talk Marcus Williams` → Marcus greets you.
- Say your name → Marcus recognizes the introduction.
- Ask a question or make small talk → he responds to the topic and his mood/relationship.
- Say `bye` / `exit` / `leave` / `later` → conversation closes cleanly.
- Refresh the page → your save and current conversation state (if mid-talk) come back.

### Status

- `npm run type-check` ✅
- `npm run build` ✅
- `devvit publish` ✅ version **v0.100.0** submitted for review.

We expect review to clear within a few hours to a day. Once approved, the app auto-updates in every subreddit where it is installed.

Thanks for the reports — keep them coming.

— The Open World dev team
