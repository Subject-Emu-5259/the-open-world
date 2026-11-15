# THE OPEN WORLD — NPC & Social Systems Audit

**Date:** August 24, 2026  
**Version audited:** v0.99.0  
**Scope:** NPC conversation, social engine, command routing, phone/text, and anything that causes the "NPCs don't talk/respond" / "act like bots" complaint.  
**Status:** Audit only — no code changes made.

---

## Executive Summary

The "NPCs don't talk or respond" complaint is **real and well-founded** even though `npm run type-check` and `npm run build` both pass. The NPC system has working scaffolding (schedules, relationships, memory arrays, factions, contacts), but the **conversation loop is broken by design and by a handful of confusing bugs**. NPCs feel robotic because they don't initiate dialogue, can't semantically understand the player, are not constrained by location, and several social commands are wired incorrectly.

Two broader project problems amplify this:

1. **Dead/duplicate server code** — `src/server/server.ts` is a stub that ignores the entire `GameEngine`.
2. **The natural-language parser (`src/server/nlp.ts`) is not connected** — the actual command dispatcher uses simple whitespace splitting.

The fix is not just "more lines of dialogue." The NPC layer needs clearer state management, location awareness, and an actual response-generation strategy.

---

## 1. Positive Observations

- The social engine holds **~300+ NPC definitions** with roles, personalities, cities, and schedules.
- Relationship tracking exists (`relationships`, `memory`, `flags`).
- Factions, contacts, SMS, email, and group chat plumbing exist in the comm hub.
- The game engine’s command dispatcher is explicit and easy to trace.
- Build and type-check pass.

---

## 2. Critical Issues Causing the "Bot" Feel

### 2.1 NPCs Never Start a Conversation

**File:** `src/server/game-engine.ts` lines 594–636

The `talk [name]` command creates a `currentConversation` state and returns:

```
You start talking to ${npc.name}. What do you say?
```

The NPC does **not** say anything back. The player must type first. Because `greet [name]` just calls `talk(...)`, greeting behaves the same way. The first interaction feels like talking to a wall/script rather than a person.

**Recommended behavior:** `talk`/`greet` should immediately call `ConversationEngine.generateResponse` with a greeting context (or a game-time-aware introduction) and clear the input prompt so the player sees the NPC respond.

### 2.2 Conversation Is Stuck in a Broken State Machine

**File:** `src/server/game-engine.ts` lines 2193–2206

While a conversation is active, every non-meta input is routed to `continueConversation`. The only allowed meta commands are:

```ts
const metaCommands = ['status', 'help', 'sleep', 'people'];
```

Problems:

- There is **no explicit exit command**. Typing `goodbye`, `bye`, `end conversation`, or `stop talking` is routed into the conversation engine. The engine classifies `bye` as a `farewell` intent and returns a goodbye line, but **it does not clear `currentConversation`**.
- `clear_conv` exists as a dispatcher command but is **not** in the meta-commands list, so it is swallowed by the conversation engine if typed while talking.
- Players cannot use other legitimate commands (`text`, `travel`, `explore`, etc.) while a conversation is “open,” with no explanation.

**Result:** Once the player says `talk [name]`, half the game becomes unresponsive unless they happen to know about `clear_conv` and use it before talking. This directly maps to the “NPCs don’t respond” complaint.

### 2.3 Conversation Engine Does Not Actually Respond to the Player

**File:** `src/server/conversation-engine.ts`

`detectIntent` is purely keyword-driven and then `generateResponse` picks from a **small hard-coded pool** of strings per intent. Examples of failure cases:

- If the player says *“I heard Marcus is selling the store, is that true?”* the engine sees `hear`/`true` and classifies it as `rumor` or `question`, then returns a generic non-answer like `"I keep my business to myself."` It never addresses the specific claim.
- If the player asks *“Do you know Lena Stax?”* the engine matches `question` → returns `"Good question. You new around here?"`
- If the player says *“Can you help me find a job?”* the engine matches `quest` and returns one of the quest-offer/denial templates, even if the NPC has no job-related role.

Because the pools are tiny (often 3–5 strings), NPCs repeat themselves within a few exchanges.

This is a **content-generation strategy problem**, not a routing problem. The current engine is keyword classification + template substitution; players perceive that as a bot because it is one.

### 2.4 Talk Is Not Bound by Location or Schedule

**File:** `src/server/game-engine.ts` lines 594–636; `src/server/social-engine.ts`

- `people()` filters by the player’s `district`.
- `talk()` uses `this.social.getAllNPCs()` and finds any NPC whose name matches, **anywhere in the world**.

So while `people` might show only a few locals, `talk Marcus` can start a conversation with Marcus Williams in Memphis while the player is in Tokyo. The NPC also does not check its schedule/availability; they are always awake and always present.

### 2.5 Many NPC Definitions Reference Invalid Districts

**File:** `src/server/social-engine.ts`

A partial list of NPCs whose `district` is **not** in the `District` union in `src/shared/types.ts`:

| NPC ID | District in data | City listed |
|--------|------------------|-------------|
| npc_048 | `sweet_asia` | atlanta |
| npc_050 | `college_park` | atlanta |
| npc_052 | `treme` | new_orleans |
| npc_054 | `treme` | new_orleans |
| npc_059 | `little_italy` | new_york |
| npc_060 | `hollywood` | los_angeles |
| npc_063 | `echo_park` | los_angeles |
| npc_062 | `santa_monica` | los_angeles |
| npc_061 | `beverly_hills` | los_angeles |
| npc_064 | `chicago_loop` | chicago |
| npc_068 | `south_beach` | miami |
| npc_069 | `little_havana` | miami |
| npc_070 | `south_beach` | miami |
| npc_071 | `downtown_houston` | houston |
| npc_076 | `soho` | new_york |
| npc_078 | `silicon_alley` | new_york |
| npc_079 | `harlem` | new_york (harlem exists, but still worth validating all) |
| npc_081 | `santa_monica` | los_angeles |
| npc_086 | `hyde_park` | chicago (valid) |

This means:

1. TypeScript allows it only because the social engine creates NPCs with `as any` or unsafe casts; the source data violates the schema.
2. Those NPCs will **never appear** in `people()` because the player can never be in `sweet_asia`, `treme`, `south_beach`, etc.
3. Yet they **can still be talked to** via `talk`, creating inconsistent UX.

### 2.6 SMS/Texting Is Broken

**File:** `src/server/game-engine.ts` lines 1781–1815

```ts
const rel = this.player.relationships?.get(npc.id) || 0;
```

`relationships` is declared as `Record<string, Relationship>` (a plain object), not a `Map`, so `.get()` is `undefined`. The expression always coerces to `0`, meaning NPCs always reply with the neutral `Ok... / Sure. / Alright.` pool. Close friendships and hostilities are ignored.

Additionally, the `text` command is documented in README/commands but the parser only accepts the first token as the name, so players trying `text Marcus Williams hello` will text “Marcus” and send the message “Williams hello.” The same bug exists in several multi-arg commands.

### 2.7 Group Chat / messages Command Is Not Very Reactive

**File:** `src/server/comm-hub.ts`

The comm hub stores messages and notifications, but NPC-driven activity is mostly limited to random pro-active texts. There is no reactive system where an NPC texts the player *because of something that just happened* (e.g., after a quest completes, after a rival faction attack, after the player is arrested).

---

## 3. Project-Level Issues Discovered

### 3.1 Duplicate / Dead Server File: `src/server/server.ts`

- `devvit.json` points the server entry to `dist/server/index.js`, built from `src/server/index.ts`.
- `src/server/server.ts` contains a separate, much simpler request handler with a fake `processCommand` that returns hard-coded strings like:
  - `You spend a few hours hustling on Beale Street...`
  - `Commands: work, study, explore, sleep, help, status, money`
- This file will confuse future work and can be accidentally wired back in. It should be removed or renamed to `server.stub.ts` if kept for reference.

### 3.2 Natural-Language Parser Is Not Wired Up

**File:** `src/server/nlp.ts`

`parseNaturalInput(...)` is exported and fairly complete, but a project-wide grep shows it is **never imported** by `game-engine.ts`, `index.ts`, or the client. The live dispatcher only supports strict commands such as `talk Marcus`, not natural phrasing like `say hello to Marcus`, `ask Marcus about the diner`, etc. The README implies a conversational interface, but under the hood it is a command parser.

### 3.3 `getNPCByLocation` Schedule Logic Is Unused for Conversations

**File:** `src/server/social-engine.ts`

`getNPCByLocation(district, hour, dayOfWeek)` considers schedule and availability. No conversation command uses it. NPC scheduling exists but is only surfaced through `currentActivityFor()` inside dialogue lines.

### 3.4 Conversation Memory Is Shallow

`ConversationEngine` stores the last 12 messages, but it does not:

- Remember named entities (people, places, items) the player mentioned.
- Build a persistent relationship summary.
- Use vector/semantic search.
- Track quest progress in dialogue except for the initial quest offer.

The `topic:` flag is overwritten every turn, so multi-topic conversation is impossible.

---

## 4. Rebuild Recommendations (Design, Not Implementation)

These are the strategic changes needed so NPCs feel alive.

### 4.1 Separate NPC Interaction Modes

| Mode | Entry | Behavior |
|------|-------|----------|
| **Gesture / greet** | `greet [name]` | One-off social bump; NPC replies with a city-aware greeting and the interaction ends. |
| **Quick chat** | `talk [name]` | NPC initiates with a contextual opening line. Player is now in conversation mode. |
| **Phone text** | `text [name] [msg]` | Asynchronous; NPC replies after a simulated delay based on relationship/time. |
| **Conversation turn** | free-form input while in conversation | Routed to a real responder, not keyword/intent matching. |

### 4.2 Conversation State Machine Fix

- Allow a defined exit: `bye`, `goodbye`, `end`, `leave`, `exit` (and a UI/menu option) should clear `currentConversation`.
- Allow a larger set of "meta" commands during conversation, or provide a clear prompt: *"Type `bye` to end conversation or `status` for stats."*
- If an unknown command is typed during conversation, ask the player whether they meant to talk to the NPC or leave conversation mode.

### 4.3 Location & Schedule Gatekeeping

- `people()` should be the canonical source of who is available to talk to in the current district/time.
- `talk()` should reject NPCs who are not present (wrong city/district) or unavailable (asleep / in a closed location).
- `travel` should clear `currentConversation` with a message like *"You left the conversation behind."*

### 4.4 Response Generation Strategy (Pick One Path)

The current engine cannot be patched into feeling human. Choose an architecture:

1. **Hybrid rule + lightweight LLM**
   - Use intent detection to pick a "context bundle" (role, mood, relationship, current events).
   - Feed that bundle + last few messages to a small local LLM (or OpenAI/Anthropic if allowed) with a strict prompt that forbids out-of-world knowledge.
   - Cache common responses per NPC identity to keep latency low.

2. **Robust template engine with dynamic variables**
   - Expand each intent from 3–5 templates to 30+ per NPC role.
   - Inject real variables: player’s name, job, last city visited, active quest, reputation.
   - Add non-sequiturs, follow-up questions, and memory callbacks: *“Last time you mentioned your sister. How’s she doing?”*

3. **Stopgap: intent + LLM only for “unknown / open-ended”**
   - Keep keyword intents for common actions (goodbye, insult, flirt, quest).
   - Anything else goes to a constrained LLM call.

Any chosen path needs:

- Guardrails against OOC knowledge.
- Latency budget (players on Reddit won’t wait 10s for a reply).
- A fallback template if the LLM fails.

### 4.5 Fix or Remove Broken Commands

| Command | Problem | Suggested Action |
|---------|---------|------------------|
| `text [name] [msg]` | Relationship lookup broken; multi-word names broken | Parse quoted name or first quoted message; read `relationships[npc.id]?.value`; fix replies. |
| `talk [name]` | NPC silent on entry, no location check | Make NPC greet first; gate by location/schedule. |
| `greet [name]` | Same as talk | Differentiate as one-off social action. |
| `messages` | Passive | Add NPC-initiated reactive events. |

### 4.6 Clean Up Source-of-Truth Problems

- Delete or isolate `src/server/server.ts`.
- Either:
  - Wire `src/server/nlp.ts` into `game-engine.ts`, or
  - Remove it and update README to match the strict command format.
- Make `District` the single source of truth and validate all NPC `district` values at build/load time.

### 4.7 Add Minimal Regression Tests

- At minimum, test the conversation state machine:
  - `talk Marcus` starts conversation.
  - Generic input returns an NPC response.
  - `bye` ends conversation.
  - Non-meta commands still work outside conversation.
  - NPC cannot be talked to from another city.

---

## 5. Severity Matrix

| Issue | Severity | User-Facing? | Notes |
|-------|----------|--------------|-------|
| NPCs silent on `talk`/`greet` | **Critical** | Yes | Direct cause of complaint. |
| Conversation cannot be cleanly exited | **Critical** | Yes | Locks up command input. |
| Template-only responses | **Critical** | Yes | Feels robotic/repetitive. |
| `text` relationship lookup broken | **High** | Yes | All texts feel identical. |
| Talk not gated by location/schedule | **High** | Yes | Breaks world immersion. |
| Invalid NPC districts | **High** | Yes | NPCs invisible in `people`. |
| `server.ts` dead code | **Medium** | No | Maintenance/confusion risk. |
| `nlp.ts` unused | **Medium** | No / doc mismatch | README implies NLU. |
| Conversation memory is shallow | **Medium** | Yes | Long-term feel suffers. |
| Group chat lacks reactive hooks | **Low** | Yes | Less urgent than direct talk. |

---

## 6. Files of Concern

| File | Lines | Primary Problems |
|------|-------|------------------|
| `src/server/game-engine.ts` | ~2,410 | Conversation routing, `talk`, `text`, command dispatch |
| `src/server/conversation-engine.ts` | ~1,028 | Template responses, intent keyword matching, no location gate |
| `src/server/social-engine.ts` | ~637 | Invalid district values, schedule logic unused |
| `src/server/nlp.ts` | ~464 | Not connected to anything |
| `src/server/server.ts` | ~N/A | Dead duplicate server handler |
| `src/server/comm-hub.ts` | ~447 | Lacks reactive NPC-initiated events |
| `src/shared/types.ts` | — | District type incomplete for all referenced data |
| `src/client/game.ts` | ~1,426 | No UI hint for conversation mode |
| `README.md` | — | Commands list out of sync with dispatcher |

---

## 7. Conclusion

THE OPEN WORLD has an ambitious NPC layer, but the **conversation loop is currently a command parser in front of a template engine**. The biggest user-facing wins will come from:

1. Making NPCs speak **first** when greeted/talked to.
2. Letting players **leave conversations** cleanly.
3. Restricting NPC interactions by **location and schedule**.
4. Replacing keyword + template responses with a richer generation strategy (more templates + memory hooks, or a guarded LLM).
5. Fixing the broken `text` relationship lookup.
6. Removing the dead `server.ts` file and unused NLP module or wiring them in properly.

These are **design and bug fixes**, not content-volume fixes. Adding another 100 NPCs without fixing the above will make the bot problem worse, not better.
