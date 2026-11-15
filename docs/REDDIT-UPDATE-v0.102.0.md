# THE OPEN WORLD — v0.102.0 Update Post

**Title:** THE OPEN WORLD v0.102.0 — NPCs got a brain, saves got a backbone

**Body:**

Hey everyone,

We just shipped **v0.102.0** and it directly tackles the two biggest pieces of feedback we've been getting:

- NPCs felt like bots and kept repeating themselves.
- Progress sometimes vanished on refresh.

## What's changed

### 🧠 NPCs now use a serverless LLM brain
NPCs can now be powered by free-tier serverless APIs using Hugging Face as the first choice, with OpenRouter, Groq, and Google Gemini as fallbacks. They get context about who they are, where you are, what time it is, your relationship, and the last few lines of conversation. If no API key is set, the local reply generator still handles greetings, names, small talk, and farewells so the game never breaks.

### 💾 Save flow is now server-authoritative
- Auto-save after every command, before the response returns.
- Stable save key tied to your Reddit account.
- Beacon flush on tab close/refresh as a backup.
- 30-day Redis expiration so saves don't silently evaporate.

### 🗣️ Conversation fixes
- NPCs greet first when you `talk` or `greet` them.
- They remember your name once you say "I'm…", "call me…", etc.
- `bye`, `exit`, `leave`, etc. cleanly end the conversation.
- New `relationships` command shows your standing with NPCs.

## How to get it
If you already have the app installed, refresh the game post or reinstall. New players can start from the subreddit menu.

As always, bug reports and ideas go in the comments.

— THE OPEN WORLD team
