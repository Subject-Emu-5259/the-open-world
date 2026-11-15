# THE OPEN WORLD — Save System Audit

**Date:** August 24, 2026  
**Version audited:** v0.99.0  
**Scope:** Client-side persistence, server-side Redis save/load, resume flow, and auto-save behavior

---

## Executive Summary

The "save gets wiped every refresh" complaint is **not a single bug** — it is a combination of UX, architecture, and platform policy issues that guarantee data loss unless the user explicitly uses the hidden Load Game flow. The game does persist data to Redis server-side and localStorage client-side, but the boot flow and normal gameplay never read that data back automatically.

---

## 1. Critical Findings

### 1.1 `/api/init` GET always reports `hasPlayer: false`

`src/server/index.ts` (lines 35-48) hard-codes the init response:
```json
{
  "type": "init",
  "username": "...",
  "hasPlayer": false,
  "player": null,
  "dashboard": ""
}
```
The server never queries Redis for an existing save, so `clientLoad` / `startGame` cannot detect that a prior character exists.

### 1.2 Refresh discards `state.player`

The client keeps live state in a module-level variable (`state.player`). On refresh, the JavaScript heap is reset and `state.player` becomes `null` again.

In `startGame()` (`src/client/game.ts` lines 1271-1277):
```ts
if (state.player) {
  state.currentScreen = 'game';
  render();
  return;
}
```
This branch is the only auto-resume path, and it only works while the page has not been reloaded.

### 1.3 Main menu hides Continue after refresh

`renderMainMenu()` decides the primary button with:
```ts
const hasContinue = state.player !== null;
```
After refresh that is `false`, so the user sees **New Game** instead of **Continue**. Clicking New Game skips straight to character creation and, because of finding 1.1, never offers to resume the old save.

### 1.4 No auto-save during normal play

`handleCommand()` (`src/client/game.ts` lines 1143-1180) updates `state.player` from the server response after every command, but **never calls `clientSave`**. The file only calls `clientSave(1, state.player)` on three manual triggers:
- Menu → Save (line 1119)
- Menu → Quit (line 1135)
- Settings/Updates exit (lines 962/529)

If a user closes the tab or refreshes without first opening the menu and clicking Save/Quit, nothing is persisted.

### 1.5 localStorage is unreliable in a Reddit iframe

`clientSave` writes to `window.localStorage` first, then syncs to the server as a background `fetch`. In Reddit's third-party iframe environment, browser anti-tracking policy (ITP/ETP) frequently clears `localStorage` for embedded sites. That makes client-side recovery after a tab close/refresh inconsistent even if the user reaches Load Game.

### 1.6 Server Redis save is gated by `username`, but user identity is fragile

Server save keys are:
```ts
`${username}_save_${slot}`
```
`username` is derived from `context.username ?? "player"`. In local development or unauthenticated contexts, every player shares the `"player"` key, which can cause one user's save to overwrite another's and creates the appearance of lost data during testing.

### 1.7 No save feedback or conflict handling

- `clientSave` resolves `true` as soon as localStorage succeeds, even if the Redis `fetch` later fails.
- `clientLoad` silently falls back to localStorage without telling the user the server was unreachable.
- There is no timestamp comparison between local vs. server saves, so an older/cached local copy can overwrite a newer server copy.

---

## 2. How Data Loss Currently Happens

| Step | What the user does | What the code does |
|------|--------------------|---------------------|
| 1 | Plays the game, runs commands | Only updates in-memory `state.player` |
| 2 | Closes tab or refreshes | `state.player` is gone; `localStorage` may also be cleared by iframe policy |
| 3 | Re-opens game | Lands on splash → main menu |
| 4 | Sees New Game button (no Continue) | `state.player` is null |
| 5 | Clicks New Game | `/api/init` GET returns `hasPlayer: false`, so character creation appears |
| 6 | Creates new character | New save is created; old Redis/localStorage slot is still present but hidden |

---

## 3. Files of Concern

| File | Role | Issues |
|------|------|--------|
| `src/client/game.ts` | Client state + UI | No auto-resume, no auto-save after commands, depends on localStorage in iframe |
| `src/server/index.ts` | API handlers | `/api/init` GET never loads existing save; `hasPlayer` is hard-coded to `false` |
| `src/server/server.ts` | Dead duplicate server | Also hard-codes a test player (`createTestPlayer`) and has its own logic; not wired into build but creates confusion |
| `devvit.json` | Devvit entry config | Server entry is `dist/server/index.js`, sourced from `index.ts`; `server.ts` is not used |

---

## 4. Rebuild Recommendations

### Must-fix for "save wiped" complaint

1. **Server-side load on init**
   - Change `/api/init` GET to check Redis for slot 1 first.
   - Return `hasPlayer: true` and the existing player if found.
   - Surface an error if Redis is unreachable instead of silently saying there is no save.

2. **Client auto-resume**
   - On boot, call `/api/load?slot=1` before deciding what button to show.
   - If a save exists, hydrate `state.player` and show **Continue**.
   - If only localStorage exists (offline path), still hydrate from localStorage but warn that server sync failed.

3. **Auto-save after meaningful state changes**
   - Call `clientSave` after every successful command response.
   - Throttle/debounce if needed, but do not require the user to open the menu.

4. **Make New Game ask before overwriting**
   - If an existing save is detected, New Game should prompt the user to start fresh or overwrite slot 1, instead of silently creating a second in-memory character.

### Secondary improvements

5. **Drop the `server.ts` duplicate** or merge only the parts `index.ts` needs; currently it is a maintenance hazard.
6. **Add a "save indicator"** (💾 light / timestamp) so the user knows persistence is active.
7. **Store settings** in the same slot so display/font preferences also survive refresh.
8. **Use a version-stamped save schema** so older saves can be migrated when gameplay fields change.

---

## 5. Severity Matrix

| Issue | Impact | Frequency | Effort to Fix |
|-------|--------|-----------|---------------|
| `/api/init` GET never returns existing save | High | Every session | Small |
| No auto-resume on refresh | High | Every refresh | Small |
| No auto-save during play | High | Every session | Small |
| localStorage unreliable in iframe | High | Browser-dependent | Medium (use Redis as primary) |
| Shared `"player"` fallback key | Medium | Dev/test only | Small |
| Duplicate `server.ts` | Low | Maintenance only | Small |

---

## 6. Conclusion

The save infrastructure exists, but the **boot and auto-save flows are incomplete**. Users are not losing data because Redis deletes it; they are losing data because the game never loads it back and never auto-saves while they play. Fixing findings 1.1-1.4 will eliminate the majority of reports without requiring a persistence rewrite.
