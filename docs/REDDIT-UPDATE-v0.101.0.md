# THE OPEN WORLD — Dev Update v0.101.0

*Copy/paste this post directly into r/theopenworld or the game’s community subreddit.*

---

**Patch v0.101.0 is live and under Reddit review.**

This update tackles the two biggest reports from players this week: **NPCs acting like bots** and **progress getting wiped on refresh**. Both came from the same root problem — the server was losing pieces of your character every time it talked to the browser.

---

### What was wrong

Your relationship with every NPC was stored as a JavaScript `Map`. That works fine in memory, but every time the server sent your updated character back to the browser, the `Map` became an empty object. That meant:

- NPCs lost your `knows_name` flag every command.
- Conversation memory was wiped after each exchange.
- The NPC had no idea you just introduced yourself.
- Relationship changes from `assist`, quests, or flirting disappeared.

On top of that, the save flow depended on a separate background `fetch`. If you refreshed before that request finished, the latest command never reached Redis.

Every reply looked like the first reply, and every refresh risked a reset — exactly the kind of thing that makes a game feel broken.

---

### What we changed in v0.101.0

- **Relationships are now plain JSON-safe records** with value, flags, memory, and timestamps. They survive every command and every refresh.
- **Server-authoritative auto-save** — every command is saved to Redis before the response returns, so there is no race with a refresh.
- **Beacon flush on tab close** — when you close or reload the page, the latest state is sent synchronously to the server via `navigator.sendBeacon`, then backed up to `localStorage`.
- **NPCs now remember your name** once you introduce yourself with `I’m…`, `I am…`, `call me…`, or `my name is…`.
- **New local NPC reply generator** — reads memory, relationship value, time of day, and NPC personality to produce natural greetings, answers, small talk, and farewells. No external AI needed.
- **`assist [name]` and quest rewards** now read/write relationship data correctly.

---

### What this means for players

- `talk Marcus Williams` → Marcus greets you.
- Say your name → Marcus recognizes the introduction and stops asking.
- Ask a question or make small talk → he responds to the topic and his mood/relationship.
- Say `bye` / `exit` / `leave` / `later` → conversation closes cleanly.
- Refresh the page → your save, NPC relationships, and current conversation state come back.
- Close the tab mid-conversation → the beacon flush tries to keep the server copy current.

---

### How you can help

If you still see an NPC repeat a greeting, forget your name, or act like a bot after this update, DM me the exact conversation and the command you typed. We’re watching the Redis logs directly and want real player transcripts.

---

### Status

- `npm run type-check` ✅
- `npm run build` ✅
- `devvit publish` ✅ version **v0.101.0** submitted for review.

Once Reddit approves, the app auto-updates in every subreddit where it is installed.

Thanks for the reports — keep them coming.

— The Open World dev team
