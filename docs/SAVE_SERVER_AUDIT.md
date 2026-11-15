# SAVE SERVER SYSTEM AUDIT — The Open World

**Scope:** entire save server system, tree `~/workspace/the-open-world-original/`
at v0.108.21 state (.21 submitted, pending review; .20 live).
**Method:** read the real code end to end — server routes, shared
save-resolution module, client save/load, Redis adapter contract, trade and
recording paths. No code changed, no publish, no version bump (audit only).
**Prime exhibit (Dre, live .20):** “Server holds a newer copy of your game —
re-synced to it. Your last command was not applied; try it again.”
Wording note: that sentence matches the v0.108.21 client banner class text
(`SAVE_WARNING_TEXTS.stale`, `src/shared/save-resolution.ts:89`) most
closely; live .20's server command-path text is the older variant
(“Stale save rejected — the server holds a newer copy of your game.
Re-synced to the newer save; the last command was not applied.”,
`src/server/index.ts`, command-path stale branch). The two texts describe
the same family of outcomes, and this audit covers every path that can
produce either — including one path where the message is FALSE.

**Verdict up front:** .21 does **not** fully cover Dre's exact case. It
converts one genuine mechanism (cross-session stale) into a retry, but
leaves intact the routine mechanism that manufactures the same message
spuriously (F1), plus the concurrency and adapter-shape failures below.
Details in §4.

---

## 1. System map

### 1.1 Components

| Component | File | Role |
|---|---|---|
| Server routes | `src/server/index.ts` (768 lines) | `/api/init` GET+POST, `/api/save` POST, `/api/load` GET, `/api/save-slots` GET, `/api/delete-save` POST, `/api/leaderboard`, `/api/challenge`, `/api/ticker`, trade/leaderboard command handlers |
| Save-resolution (shared) | `src/shared/save-resolution.ts` | `playerTimestamp`, `pickNewerSave`, `pickNewestSlot`, `isStaleWrite`, `STALE_SKEW_MS = 5000`, `SAVE_WARNING_TEXTS`, `SAVE_MAX_BODY_BYTES = 512KB`, `failureClassForSaveResponse` |
| Client save/load | `src/client/game.ts` | `clientSave`, `clientLoad`, `clientLoadAll`, `clientDetectSave`, `clientCheckServerSaves`, `handleCommand`, `startGame`, `flushSaveToServer` (beacon), `#save-warning` banner + Retry / Use-server-copy buttons |
| Engine state | `src/server/game-engine.ts` | `loadState` (state restore + migrations + investment fold), `getPlayer` (export incl. mail/SMS/voicemails), `processCommand` |
| Community store | `src/server/community.ts` + `RedisCommunityStore` in `index.ts` | leaderboard sorted set `tow:leaderboard`, challenge `tow:challenge:<weekKey>:total` / `:contrib`, username index `tow:username:<name>`, trade offers |
| Redis adapter | `@devvit/redis` (`redisCompressed`) | string ops + sorted sets; TTL via `expiration` option on `set` |
| Persistence hub | `src/server/comm-hub.ts` | mail / SMS / voicemail restore (wholesale replace, dedup by id) |

### 1.2 Save paths (write)

1. **Command path** — client `handleCommand` POSTs `/api/init`
   `{input, player, slot}` → per-request `GameEngine`, `loadState(player)`,
   `processCommand` → `serverSavePlayerChecked(player, slot)` →
   `serverLoadPlayer` (guard read) → `isStaleWrite` → if stale, .21
   single retry: fresh engine on stored state, re-run command, second
   guard check → on success, community recording, then response
   `{text, dashboard, player, success, saveFailed, saveFailure, stale}`.
   **The response carries NO `lastSaved` stamp** (contrast `/api/save`,
   which returns `{success, slot, lastSaved}`).
2. **Autosave / manual save** — client `clientSave(slot, player)`:
   localStorage write first (`savedAt = device Date.now()`), then
   POST `/api/save` (5s timeout, one retry after 1.5s for
   transport/redis, never for payload) → on success adopts
   `data.lastSaved` into `state.player.lastSaved` and the local slot;
   on stale, re-syncs session + local slot to the server copy.
3. **Migration saves** — `clientLoad` / `clientDetectSave` fire-and-forget
   POST `/api/save` when a local copy beats the server copy. Response
   never read, stamp never adopted.
4. **Leave-beacon saves** — `flushSaveToServer` (`navigator.sendBeacon`
   `/api/save`) on `beforeunload` and on every `visibilitychange` to
   hidden. Response never read, stamp never adopted.
5. **Trade saves** — `acceptTradeOffer` writes both players' saves
   directly via `store.set` with a fresh `lastSaved`, bypassing the
   stale guard and bypassing the 90-day TTL. Only the acceptor gets the
   fresh save back (index.ts trade path reloads acceptor save).
6. **Creation saves** — `/api/init` POST with `action: "create"` calls
   `serverSavePlayer` UNCHECKED (explicit overwrite, by design).

### 1.3 Load paths (read)

- **Probe (main menu):** `clientDetectSave` — scans all 3 server slots
  (`/api/load?slot=N`) + all 3 local slots, `pickNewestSlot` each side,
  then `pickNewerSave` across sides; local win migrates to server.
  10s timeout, then falls back to “playing from this device's saves.”
- **Continue:** `startGame` → `clientLoad(1)` — slot 1 ONLY (same-slot
  `pickNewerSave` server-vs-local). The probe above is what normally
  sets `state.player` first, so Continue usually short-circuits on the
  probe result; if the probe timed out/failed, Continue is slot-1-only.
- **Load screen:** `/api/save-slots` (server truth) with local fallback;
  slot click → `clientLoad(slotId)` (same-slot newer-wins).
- **GET `/api/init`:** iterates `[requestedSlot, "1", "2", "3"]`,
  first hit wins (NOT newest). No client caller found in the current
  client — latent only.
- **GET `/api/load?slot=N`:** single slot, 404 when absent. Used by
  probe, `clientLoad`, and the “Use server copy” button (active slot
  only, not newest-slot scan).

### 1.4 Keys, TTL, limits

- Save key: `tow:{userId ?? username ?? loid ?? "player"}:save:{slot}` —
  **no subreddit/install component** (see F3).
- TTL 90 days, sliding (reset on every `serverSavePlayer` set).
  Trade writes and community-store writes set NO expiration.
- `/api/save` body limit 512KB (413 → `payload` class), added in .21.
  The command path (`/api/init` POST) has NO body limit and no
  JSON-error classification.
- `serverLoadPlayer` swallows every error (Redis failure AND JSON
  parse failure) and returns `null`, which every caller reads as
  “no save.”

---

## 2. Findings

Severity: **P0** = progress loss or a rejected legitimate command.
**P1** = misleading message, silent drop, or destructive-but-avoidable
action. **P2** = edge / robustness / latent.

### P0

#### F1 — Command-path responses drop the server stamp, so autosaves routinely go “stale” and the banner lies — then invites double-apply. (.21 does NOT fix.)
- **Evidence.** The command path saves with a fresh stamp
  (`serverSavePlayer` stamps `Date.now()`; `serverSavePlayerChecked`
  returns it), but the command response object contains no `lastSaved`
  field (`src/server/index.ts`, command-path `rsp.end`:
  `{text, npcName, dashboard, player, success, saveFailed, saveFailure,
  stale}`). The engine never stamps either: `loadState` spreads
  `...state` and `getPlayer` spreads `...this.player`, so the response
  player carries the INCOMING (pre-command) stamp. The client then sets
  `state.player = data.player` and fire-and-forget autosaves it
  (`src/client/game.ts`, `handleCommand` → `clientSave`).
  The autosave posts the old stamp against the new stored stamp; the
  gap equals the player's idle time between commands, so **any command
  issued >5s after the previous save trips the guard**
  (`isStaleWrite`: stored > incoming + 5000). The autosave re-syncs
  to the server copy — which IS the post-command state, so nothing is
  lost — but the banner shows `SAVE_WARNING_TEXTS.stale`: “Your last
  command was not applied; try it again.” That sentence is FALSE on
  this path: the command WAS applied and saved. A player who obeys it
  and re-runs the command double-applies non-idempotent commands
  (work pay + clock, gym, rest, etc.).
- **Player symptom:** Dre's exact quoted message, appearing after
  ordinary play with normal pauses between commands, even when nothing
  was actually lost.
- **Fix:** return `lastSaved` on the command-path response and adopt it
  in `handleCommand` before autosaving (same adoption already built
  for `/api/save`); and split the banner text: autosave-stale must say
  “autosave re-synced; your last command is safe,” never “not applied.”

#### F2 — No in-flight guard: overlapping commands and autosaves silently lose updates inside the 5s tolerance.
- **Evidence.** `sendCommand` / quick buttons call `handleCommand`
  with no disable, queue, or dedup (`src/client/game.ts`,
  `bindGameEvents`); the post-command autosave is fire-and-forget
  (`clientSave(...).catch(...)`). The guard only rejects skew >5s
  (`src/shared/save-resolution.ts`), so two writes within 5s never
  conflict-detect: two concurrent commands from the same base state
  both process, both save, last-writer-wins, and the first command's
  effects vanish while BOTH success messages display. Same hazard for
  an autosave racing the next command's save (autosave posts
  pre-command-2 state after command-2 saved → command-2's progress
  overwritten silently when within 5s; when beyond 5s it goes stale
  instead — the tolerance window is exactly the silent-loss window).
- **Player symptom:** “I did X, saw the success text, and it's gone.”
  Indistinguishable from a save failure, but no warning ever fires.
- **Fix:** serialize command sends client-side (disable input until
  the response + autosave settle, or a send queue); add a
  monotonically increasing per-session sequence/version to the save
  envelope so the server can reject a write based on an older
  sequence even within 5s.

#### F3 — One Redis key serves both subreddits (and any second tab): cross-install play manufactures genuine stale rejections.
- **Evidence.** `saveKey()` (`src/server/index.ts`) is
  `tow:{user}:save:{slot}` with no subreddit/install component, while
  dialogue scope DOES use `context.subredditName` as `installId`.
  Dre plays r/The_Open_World and r/the_open_world_dev; each install's
  client holds its own `state.player`. Switching installs and
  commanding sends an older stamp against the other install's newer
  server copy → genuine stale. On .20 that is a hard reject (“command
  not applied”); on .21 the retry re-applies the single command, but
  the two installs still share ONE game — the re-sync silently swaps
  which install's game the player is in.
- **Player symptom:** Dre's exact message when switching between the
  dev sub and the main sub (or between two tabs), plus confusion about
  which game is loaded.
- **Fix (needs Dre's call on product intent):** either scope save keys
  per install (dev and main become separate games — a product
  decision, not just a bugfix) or, if one shared game is intended, make
  install-switching an explicit re-sync moment (load newest on
  entrypoint focus) and say so in-game. At minimum, the stale message
  on a cross-install hit should name the cause (“another session has
  a newer copy”) instead of “try it again.”

#### F4 — Leave-beacon saves advance the server stamp without adoption — a reliable stale trigger on return.
- **Evidence.** `flushSaveToServer` sends a beacon on `beforeunload`
  AND on every `visibilitychange` to hidden (`src/client/game.ts`);
  beacon responses are never read, so `state.player.lastSaved` never
  adopts the beacon's stamp. Hide the tab for >5s (app switch, phone
  call), return, issue a command → incoming old stamp vs beacon's
  newer stamp → stale. On .20: reject + “not applied.” On .21: the
  retry covers the reject, but the reverse hazard remains — a
  hidden-tab beacon posting pre-command state can overwrite a newer
  command save when within 5s (silent revert, F2's window).
- **Player symptom:** “I switched apps, came back, and my command was
  rejected” — on .20, exactly Dre's message.
- **Fix:** adopt stamps everywhere a save can happen (beacon can't
  return one — so instead, re-fetch `/api/load` on visibility-return
  and adopt the server stamp before the next command); or drop the
  visibilitychange beacon and keep only beforeunload + explicit saves.

#### F5 — Leaderboard/challenge Redis adapter call shapes violate the shipped client contract (zAdd array-wrap; zRange object-vs-string). Live behavior unproven; if the adapter behaves per its types, the feature cannot work.
- **Evidence.** `RedisCommunityStore` (`src/server/index.ts`) calls
  `(redis as any).zAdd(key, [{member, score}])`, but the adapter
  signature is variadic — `zAdd(key, ...members: ZMember[])`
  (`node_modules/@devvit/redis/RedisClient.d.ts:75`,
  `redisCompression.d.ts`) — so the plugin receives a nested array
  where a `ZMember` object is expected: the write fails or lands
  malformed. `zTop` treats `zRange` output as `string[]`, but the
  adapter returns `{member, score}[]` (`RedisClient.d.ts:76-78`), so
  `zScore(key, object)` fails/returns undefined and `zRank`'s
  `members.indexOf(member)` on an object array is always -1 → “not
  ranked yet” forever. The `by: "rank"` option IS valid
  (`ZRangeOptions.by: 'score'|'lex'|'rank'`). The harness only ever
  exercises the in-memory mock in `community.ts`, never the real
  adapter — which is why this survived every green run. Compounding
  it: recording sits in the same try block as the save
  (`src/server/index.ts` command path), so a `zAdd` throw also kills
  the challenge contribution for that command.
- **Player symptom:** Dre's leaderboard screen — board unavailable,
  “not ranked yet” despite playing, challenge total 0 — even when
  saves are healthy.
- **Fix:** call `zAdd(key, {member, score})` (spread, not array-wrap);
  consume `zRange` objects directly (`{member, score}` pairs, no
  per-member `zScore` round-trip); add a live-Redis smoke test (a real
  `zAdd` + `zRange` + `zRank` round-trip) to the release checklist —
  the .21 report already flags live-Redis confirmation as Dre's
  playtest, but this should be a code-level check, not a playtest.

#### F6 — A Redis error masquerades as “no save,” and character creation then overwrites the real save unchecked.
- **Evidence.** `serverLoadPlayer` catches everything (Redis throw AND
  JSON parse failure) and returns `null` (`src/server/index.ts`).
  `/api/load` therefore answers 404 “Save not found” on a Redis error.
  Client-side, `clientLoad` only sets `lastClientLoadFailed` on a fetch
  THROW — a clean 404 leaves it false — so `startGame` falls through
  to `showCharacterCreation` (`src/client/game.ts`, `startGame`).
  Creation (`isCreate`) calls `serverSavePlayer` UNCHECKED
  (`src/server/index.ts`, create branch) — overwriting the real save
  the moment the player creates a character during an outage (or over
  a corrupt-but-recoverable save).
- **Player symptom:** permanent loss of a whole character after a
  transient outage + an innocent “Begin Life.”
- **Fix:** distinguish error from absence end to end (server returns
  a distinct `loadError` on Redis/parse failure; client shows the
  error screen, never creation, on it); require an explicit
  overwrite confirmation when creating into an occupied slot, and
  never let the create branch run while a load error is outstanding.

### P1

#### F7 — “Use server copy” destroys local-newer progress with one tap, no confirm, no backup, and loads the active slot only.
- **Evidence.** `wireSaveWarningActions` (`src/client/game.ts`):
  fetches `/api/load?slot=activeSlot` (not the newest-slot scan),
  overwrites `state.player` and the local slot via `clientSave`.
  When the banner is spurious (F1), the local copy may hold
  local-only progress (commands whose server saves failed); one tap
  discards it. Label (“replaces this device's copy”) is honest but
  there is no confirmation and no backup.
- **Fix:** confirm dialog; back up the local copy (another local key
  or slot) before replacing; load via the newest-slot scan.

#### F8 — Mixed-clock last-write-wins: device `savedAt` can beat or lose to server `lastSaved` on clock skew alone.
- **Evidence.** `playerTimestamp` returns `lastSaved ?? savedAt`
  (`src/shared/save-resolution.ts`); local slots carry device-clock
  `savedAt` (`clientSave` writes `Date.now()`), server copies carry
  server-clock `lastSaved`. .21 fixed the WRITE guard
  (server-stamp-only) but the LOAD-time `pickNewerSave` still mixes
  clocks: a device clock ahead of server time makes stale local
  content “win” and migrate over newer server progress
  (`clientDetectSave` migration); a device clock behind makes the
  server always win. The .21 report's own premise (“common drift”)
  makes this live, not theoretical.
- **Fix:** at load time, prefer a server stamp over any device
  timestamp when both exist; only fall back to `savedAt` when neither
  copy has a server stamp; surface a clock-skew notice when the
  device clock disagrees with the server stamp by a large margin.

#### F9 — Trade accept bypasses the guard, stamps both saves, and drops TTL; the sender's next command can go stale.
- **Evidence.** `acceptTradeOffer` (`src/server/community.ts`) sets
  `lastSaved = now` on both saves and writes via `store.set` with no
  expiration (a Redis `SET` without expiry also clears the existing
  90-day TTL). The index.ts trade path returns the fresh save only to
  the acceptor. The sender's client still holds the pre-trade stamp;
  its next command goes stale when the gap exceeds 5s (.20: reject;
  .21: retry covers, but the sender never learns a trade changed
  their game until then). Trade also records no leaderboard update
  for either player.
- **Fix:** route trade saves through `serverSavePlayerChecked` (or
  preserve TTL via `expire`); notify the sender's next load that a
  trade landed; record leaderboard after a completed trade.

#### F10 — Genuine stale display is self-contradictory: warning + the unapplied command's result text.
- **Evidence.** Command-path stale response text is
  warning + `"\n\n"` + `result.message` (`src/server/index.ts`).
  The result text describes an outcome (e.g., earnings) that was NOT
  saved. Same shape on .21 retry-failure. Separately, the autosave
  stale banner claims “command not applied” when the command WAS
  applied (F1).
- **Fix:** on genuine stale, show ONLY the warning + re-sync note +
  “try it again” (no result text); on autosave stale, show the
  re-sync-only wording from F1's fix.

#### F11 — Recording is skipped on any save failure, and a later autosave success never backfills it.
- **Evidence.** Recording runs only inside `if (!staleRejected)` after
  a successful command-path save (`src/server/index.ts`); a save
  exception jumps to the catch block, skipping recording entirely.
  The autosave path (`/api/save`) has no recording call at all — so a
  command whose command-path save failed but whose autosave later
  succeeded is permanently unrecorded in leaderboard/challenge.
  (.21's change — logging recording failures instead of swallowing
  them — is real but does not close this gap.)
- **Fix:** decouple recording from save success: record from the
  command result regardless of save outcome (best-effort, own retry),
  or record on autosave success for the commands it persists.

#### F12 — Continue falls back to slot 1 only when the probe times out.
- **Evidence.** `startGame` calls `clientLoad(1)`
  (`src/client/game.ts`); the newest-slot resume lives in the probe
  (`clientDetectSave`, 10s timeout). On probe timeout/failure,
  Continue resumes slot 1 even when the newest save lives in slot 2/3
  — then plays on slot 1 while the newer game sits orphaned.
- **Fix:** make Continue itself run the newest-slot scan
  (`clientDetectSave`) instead of `clientLoad(1)`; keep the probe as
  a pre-warm only.

#### F13 — Save-failure result text still presents unsaved outcomes as fact.
- **Evidence.** On command-path save failure (`saveFailed`), the
  response text is `result.message` + a trailing warning
  (`src/server/index.ts`). The player reads “You earned $X” first;
  the qualifying warning trails after it and is easily missed — and
  if local state is then lost, the displayed earnings never existed.
  (The .12 design choice to return the result is defensible; the
  presentation order is what misleads.)
- **Fix:** lead with the failure (“NOT saved to the server — …”)
  and put the result after it, or hold the result text until a save
  succeeds.

### P2

#### F14 — `/api/init` POST has no body-size limit; `/api/save`'s 512KB guard is bypassable via the command path; malformed bodies misclassify.
- **Evidence.** `readBody` accumulates unbounded; `JSON.parse` throws
  land in the outer catch → 500 “Server error” with no `saveFailed`
  flag or failure class (client shows generic “Error processing
  command”). A legitimately large save (long journal, big inventory)
  saves fine via the command path but 413s via autosave — banner says
  “too large” while commands keep saving. A malformed `/api/save`
  body → outer 500 → client maps 500 → `redis` (wrong class).
- **Fix:** apply the same 512KB limit + JSON-error class on both
  paths; return `failure: "payload"` / `"transport"` distinctly.

#### F15 — Challenge contribution is a read-modify-write race with full scans.
- **Evidence.** `recordChallengeContribution` (`src/server/community.ts`)
  does get → set on the total and `zTop(..., 100000)` → `zAdd` on the
  contrib set; concurrent contributions lose increments.
  `getLeaderboard` does a full `zRange(0, -1)` for rank plus a second
  full scan for outside-top-N xp — O(N) per request.
- **Fix:** use `zIncrBy` (already on the adapter) for totals and
  contrib; use `zRank`/`zScore` instead of full scans.

#### F16 — Unbounded keys: community and index keys never expire.
- **Evidence.** `RedisCommunityStore.set` sets no expiration;
  `usernameIndexKey` entries and per-week challenge keys accumulate
  forever; trade writes also drop the save TTL (F9).
- **Fix:** expire challenge keys after the week + grace; expire
  username-index entries on a long horizon; preserve save TTL on
  trade writes.

#### F17 — Identity-less fallback key and unvalidated slot numbers.
- **Evidence.** `saveKey` falls back to `"player"` when userId,
  username, and loid are all absent — all such traffic would share
  `tow:player:save:1`. `/api/save` accepts any `slot` value with no
  ∈{1,2,3} validation (unbounded slot keys). Near-impossible to hit
  in practice (loid normally exists); self-harm only.
- **Fix:** reject identity-less saves; validate slot ∈ {1,2,3}.

#### F18 — Investment fold sums stored `currentValue`s, which may be stale across market ticks.
- **Evidence.** `foldInvestmentPositions` (`src/server/game-engine.ts`)
  sums `purchasePrice`, `shares`, and `currentValue` of duplicate
  positions. `currentValue` figures were computed at different market
  ticks, so a folded line's P/L can drift from a fresh repricing
  until the next investment tick.
- **Fix:** reprice folded positions from current market price × total
  shares at fold time (or on display), keeping the summed cost basis.

#### F19 — No-command `/api/init` POST returns a fresh blank player without persisting (latent blank-overwrite vector).
- **Evidence.** The no-command branch (`src/server/index.ts`) returns
  `game.getPlayer()` on an empty engine (fresh defaults, money 500)
  with type `"state"`. No current client caller adopts it
  (only `handleCommand` with input and creation POST to `/api/init`),
  so this is latent — but any future caller that sets `state.player`
  from it and then autosaves would blank-overwrite a real save,
  because a blank player has no `lastSaved` and .21 never rejects
  unstamped writes.
- **Fix:** never return a blank player from a state endpoint; return
  an explicit “no player” shape instead.

#### F20 — GET `/api/init` returns first-found slot, not newest (latent).
- **Evidence.** Loop `[requestedSlot, "1", "2", "3"]`, break on first
  hit (`src/server/index.ts`). No client caller found — latent only,
  but it contradicts the “newest slot wins” rule if ever wired up.
- **Fix:** scan all slots and return the newest, like
  `clientCheckServerSaves`.

#### F21 — Migration POSTs ignore their responses (also §2, F7 cross-ref).
- Covered under F7 (P1). Listed here only to keep the migration
  surface complete: `clientLoad` migration, `clientDetectSave`
  migration (both sides), and the probe-time migration all share the
  fire-and-forget shape with no stamp adoption and no failure surface.

---

## 3. What .21 already fixes vs what remains open

### Fixed by .21 (verified in code)
- Device-clock gating of WRITES: `isStaleWrite` is now
  server-stamp-only; an unstamped write is never rejected
  (`src/shared/save-resolution.ts`). This kills the .20 failure where
  a device clock behind server time rejected every write.
- Stamp adoption on `/api/save` success (client + local slot).
- Autosave retry (one retry after 1.5s for transport/redis) and four
  specific failure classes with distinct banner texts.
- Command-path single stale retry (re-run once on the fresh stored
  state; second stale still rejects + resyncs).
- Recording failures now LOGGED server-side instead of silently
  swallowed.
- Leaderboard message honesty: the “play a command” nudge appears
  only for an identified player on a loaded board with genuinely no
  rank (`identified` flag); unavailable boards/challenges render
  explicit lines instead of zero totals.
- SMS/voicemail persistence on the mail round-trip (wholesale replace,
  dedup by id — no duplication path found); investment folding on
  load (sums, never averages; totals preserved).

### NOT fixed by .21 (open findings above)
- F1 (stamp dropped on command path → spurious autosave stale +
  false “not applied” + double-apply invitation) — **the routine
  producer of Dre's exact message.**
- F2 (no serialization; silent last-writer-wins inside 5s).
- F3 (shared key across installs; retry mitigates the reject only).
- F4 (beacon stamp advancement without adoption; retry mitigates
  the reject only, not the <5s overwrite).
- F5 (adapter call shapes; logging only).
- F6 (error-masquerades-as-no-save → unchecked creation overwrite).
- F7–F13 (P1 items; none addressed by .21).
- F14–F21 (P2 items; none addressed by .21).

### .20-harness note (from the .21 build report, confirmed consistent)
The 7 failing .20-harness checks under .21 (5 catalog-price checks,
1 thin-city count, 1 old `isStaleWrite` behavior) are intended
supersessions, each with a corresponding green .21 check — not
regressions. This audit does not re-litigate them.

---

## 4. Does .21 cover Dre's exact “newer copy / command not applied” case?

**Partially — and the uncovered part is the routine one.** Dre's
message has (at least) three distinct mechanisms, and .21 covers only
one of them fully:

| Mechanism | On .20 | On .21 |
|---|---|---|
| (a) Genuine cross-session stale (another install/tab advanced the server) | Hard reject, command lost | **Covered:** single retry re-runs the command on the fresh copy and applies it |
| (b) Spurious autosave stale from the dropped command-path stamp (F1) — any command after a >5s pause | Banner (wording differs slightly) | **NOT covered:** the stamp is still dropped, the autosave still goes stale, the banner still says “not applied” for a command that WAS applied, and “try it again” still invites double-apply |
| (c) Beacon/migration stamp advancement without adoption (F4, F7) | Reject on return | **Partially covered:** retry converts the reject into an apply, but the <5s silent-overwrite window and the misleading banner remain |

So: if Dre's hit was (a), .21 fixes his next one. If it was (b) —
the mechanism that fires during ordinary single-session play with
normal pauses — .21 changes nothing about the message, and the
“try it again” instruction still risks double-applying his next
command. The single highest-value fix is F1's: return the stamp on
the command path and adopt it before autosaving, plus split the
banner text by trigger.

---

## 5. Recommended fix order (by severity)

1. **F1** — return + adopt the command-path stamp; split stale banner
   text by trigger (genuine vs autosave). Kills the routine false
   “not applied” and the double-apply invitation.
2. **F5** — fix `zAdd`/`zRange` adapter shapes + live-Redis smoke test.
   The leaderboard/challenge feature cannot be trusted until the real
   adapter round-trips.
3. **F6** — distinguish load-error from no-save end to end; block
   creation on load error; confirm overwrites. Closes a permanent-loss
   path.
4. **F2** — serialize client sends (disable/queue until response +
   autosave settle); add a per-session write sequence server-side.
   Closes silent last-writer-wins.
5. **F3** — decide the install-scope product question (separate games
   per install vs one shared game with explicit re-sync); until then,
   name the cause in the stale message.
6. **F4 + F7** — adopt stamps on every save path that can advance
   them (re-fetch on visibility-return; await + adopt migrations).
7. **F9** — route trade saves through the guard (or preserve TTL +
   notify the sender); record leaderboard after trades.
8. **F8** — server-stamp-preferring load comparison; clock-skew notice.
9. **F10 + F13** — message accuracy: no result text on genuine stale;
   failure-first wording on save failure.
10. **F11** — decouple recording from save success (record on
    autosave success or independently with retry).
11. **F12** — Continue runs the newest-slot scan, not `clientLoad(1)`.
12. **F14–F21** — P2 batch: shared body limits + error classes,
    `zIncrBy`/rank/score instead of scans, key expirations, slot +
    identity validation, fold repricing, blank-player endpoint shape,
    GET `/api/init` newest-slot scan.

---

## 6. What this audit deliberately did NOT verify live

- Real Devvit Redis behavior of `zAdd`/`zRange` (F5 rests on the
  shipped `.d.ts` contract; the VM route to Reddit is blocked, so no
  live call was made — a live-Redis round-trip is the required
  confirmation).
- Whether Devvit webview `localStorage` is shared across the two
  subreddits' posts (affects how far F3's client-side collision
  extends; the server-side shared key is certain regardless).
- Dre's live save contents, clock skew, or which of mechanisms
  (a)/(b)/(c) produced his specific hit — the server logs
  (`[server] Command-path stale retry failed`, `[server] Community
  recording failed`, authoritative save/load lines) are the place to
  confirm, per incident, which branch fired.
