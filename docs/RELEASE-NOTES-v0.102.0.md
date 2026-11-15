# THE OPEN WORLD — v0.102.0 Release Notes

**Release Date:** August 25, 2026

## Overview
This update fixes the reported NPC conversation issue and hardens save persistence while adding an optional serverless LLM backend so NPCs feel natural and immersive instead of robotic.

## What's New

### 🧠 Serverless LLM NPC Brain
- Added `src/server/llm-provider.ts`, a zero-SDK NPC reply bridge.
- **Preferred provider:** Hugging Face Inference API.
- **Fallback providers:** OpenRouter (free `:free` models), Groq, Google Gemini.
- API keys are read from Devvit global app settings (`hfApiKey`, `openrouterApiKey`, `groqApiKey`, `geminiApiKey`) so they can be rotated without redeploying.
- Each provider falls back to the next on failure or missing keys.
- If no API key is configured, the local template fallback still runs so the game never breaks.

### 🤖 Serverless NPC Reply Endpoint
- Added `POST /api/npc-reply` route in `src/server/index.ts`, so external tools (and future minigames) can ask the NPC brain for a contextual line without going through the full game command loop.

### 💾 Rebuilt Save Flow
- Server save key is now stable: `tow:{userId|username|loid}:save:{slot}`.
- Redis saves are compressed via `@devvit/redis` `redisCompressed` and expire after 30 days.
- Write-before-response: every command persists before the server replies.
- Client now flushes the latest state with `navigator.sendBeacon` on tab close / refresh / visibility change as a backup.
- LocalStorage remains an offline fallback.

### 🗣️ NPC Conversation Polish
- NPCs now greet first and remember whether they know your name.
- Name extraction handles "I'm…", "I am…", "call me…", and "my name is…" before sending the input to the LLM.
- Memory of recent exchanges is included in every LLM prompt so conversations stay coherent.
- Added `relationships` command so players can view their standing with met NPCs.

## Configuration
Set API keys in the Devvit Developer Portal or via CLI after installing the app:

```bash
devvit settings set hfApiKey
devvit settings set openrouterApiKey
devvit settings set groqApiKey
devvit settings set geminiApiKey
```

If no key is set, the existing local NPC reply generator takes over.

## Validation
- `npm run type-check` ✅
- `npm run build` ✅

## Files Updated
- `src/server/llm-provider.ts` (new)
- `src/server/ai-npc-provider.ts`
- `src/server/conversation-engine.ts`
- `src/server/game-engine.ts`
- `src/server/index.ts` (adds `/api/npc-reply`)
- `src/client/game.ts`
- `src/shared/version.ts`
- `package.json`
- `devvit.json`
- `docs/RELEASE-NOTES-v0.102.0.md`
- `docs/REDDIT-UPDATE-v0.102.0.md`
- `docs/UPDATE-LOGS.md`
