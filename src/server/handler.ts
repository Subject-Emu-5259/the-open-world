// THE OPEN WORLD — Devvit-agnostic game request handler (TOW PC phase 1).
//
// This file is the whole game server minus its platform wiring: every
// /api/* route, the per-request engine, the staleness-guarded save
// flow, and the handler-owned leaderboard/trade commands. It imports
// NO Devvit code and reads NO platform globals — everything it needs
// arrives through TowHandlerDeps:
//
//   saves            SaveStore — get/set/del/expire over save keys.
//                    Reddit: Devvit Redis (see index.ts). PC: the
//                    hosted store (phase 2) or MemorySaveStore
//                    (phase-1 smoke testing). The save store and the
//                    community store MUST share one key namespace —
//                    trading reads save keys through the community
//                    store — so both adapters sit on the same backend.
//   community        CommunityStore — the existing interface from
//                    community.ts (leaderboards, challenge, trading).
//                    Reddit: RedisCommunityStore. PC: Postgres (phase 2)
//                    or MemoryCommunityStore (phase-1 smoke testing).
//   resolveIdentity  request -> TowIdentity. Reddit: Devvit context
//                    (user id / username / LOID / subreddit). PC:
//                    the account session (phase 2) or the local-dev
//                    identity (pc-server.ts, phase 1).
//   settings         (optional) LLM settings getter, applied to the
//                    LLM layer when the handler is created. Reddit:
//                    omitted — llm-provider's default reads Devvit
//                    app settings. PC: an env-only getter, so keys
//                    come from environment variables and never from
//                    Devvit settings. With no keys set anywhere, NPC
//                    dialogue falls back to local templates.
//   onOutcome        (optional) outcome-log sink. The engine reports
//                    what a command actually did on result.outcomeLog;
//                    the handler calls this AFTER save resolution, so
//                    a stale rejection (whose first attempt never
//                    persisted) never logs an outcome that didn't
//                    happen. The Devvit bootstrap logs the
//                    "[server] Outcome user=" line (harness-0.108.29
//                    §E asserts that string lives in index.ts).
//   identityErrorText (optional) the identity-required error text,
//                    per action. Default is the Reddit wording; the
//                    PC bootstrap passes PC wording.
//
// The two bootstraps — src/server/index.ts (Devvit: context identity,
// Redis store, menu post-create, telemetry express wrapper) and
// src/server/pc-server.ts (plain Node HTTP, account/dev identity,
// injected stores) — both call createTowHandler and serve the
// returned function. The handler, the engine, and every feature
// module are shared: one command path, both editions.
//
// v0.108.12: NO module-level engine. A singleton GameEngine served
// every request, and each request called loadState then awaited an
// LLM dialogue call — a second concurrent request's loadState could
// overwrite this.player (and dialogueScope) mid-await, so the first
// request could return or persist the WRONG player's state. The
// engine is now created per request inside the /api/init POST
// handler; all request state comes from the requesting player's own
// save object, never from shared fields. (The engine constructor is
// cheap object construction over module-level constant data; nothing
// in it needs to persist across requests.)

import type { IncomingMessage, ServerResponse } from "node:http";
import { GameEngine } from "./game-engine.js";
import type { CommunityStore } from "./community.js";
import {
  getLeaderboard, getBoard, BOARD_DEFS,
  getChallenge, recordCommandOutcome,
  createTradeOffer, listTradeOffers, acceptTradeOffer,
  declineTradeOffer, cancelTradeOffer, usernameIndexKey,
} from "./community.js";
import type { BoardId } from "./community.js";
import {
  isStaleWrite, isSequenceStale, nextSaveSeq, staleCauseFor,
  validSlot, normalizeSlot, hasIdentity, canCreate,
  pickNewestSlot, SAVE_MAX_BODY_BYTES,
} from "../shared/save-resolution.js";
import { staleRejectionText, saveFailureText, noPlayerResponse } from "./save-responses.js";
import { weekKeyFromDate } from "./features-0.108.19.js";
import { challengeGoalForWeek } from "./features-0.108.20.js";
import { setLlmSettingsGetter } from "./llm-provider.js";
import type { LlmSettingsGetter } from "./llm-provider.js";

// --- Injected dependencies (the phase-2 contract) ---

/**
 * Key/value save storage. Keys are opaque strings the handler builds
 * (tow:<identity>:save:<slot>, tow:<identity>:save:<slot>:backup,
 * tow:username:<name>); the adapter stores them verbatim.
 *
 *   get(key)            -> the stored string, or null when absent.
 *                         A backend failure must THROW (the handler
 *                         turns a thrown load into a 500, never a
 *                         "no save" — a transient outage plus an
 *                         innocent "Begin Life" must never overwrite
 *                         a real save).
 *   set(key, value, {expiration?})
 *                         -> store the string. `expiration` is an
 *                         absolute Date after which the key may
 *                         disappear (Reddit: 90 days). An adapter
 *                         that never expires (PC saves don't expire)
 *                         may ignore it.
 *   del(key)            -> remove the key; deleting an absent key is
 *                         a no-op, never an error.
 *   expire(key, seconds)-> set a TTL in seconds from now. Best-effort
 *                         callers tolerate a no-op implementation.
 */
export interface SaveStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { expiration?: Date }): Promise<void>;
  del(key: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
}

/**
 * Who is making this request. At least one of userId / username /
 * loid must be non-null for the request to write (see hasIdentity in
 * save-resolution.ts — identity-less traffic must NEVER write under
 * the shared "player" fallback key). installTag names the install
 * the write came from (Reddit: subreddit name; PC: "pc") and is
 * stamped on saves so a stale rejection can name a cross-install
 * cause instead of saying "try it again".
 */
export interface TowIdentity {
  userId: string | null;
  username: string | null;
  loid: string | null;
  installTag: string;
}

/**
 * Resolve the identity for one request. May be sync or async. On
 * Reddit this reads Devvit's per-request context; on PC (phase 2)
 * it validates the account session token and returns the account's
 * id + display name, or all-nulls when the request is unauthenticated
 * (the handler then rejects writes with identityErrorText).
 */
export type IdentityResolver = (req: IncomingMessage) => TowIdentity | Promise<TowIdentity>;

/** One command outcome, ready to log (see the onOutcome note above). */
export interface OutcomeEvent {
  username: string;
  input: string;
  outcomeLog: string;
}

export interface TowHandlerDeps {
  saves: SaveStore;
  community: CommunityStore;
  resolveIdentity: IdentityResolver;
  settings?: LlmSettingsGetter;
  onOutcome?: (event: OutcomeEvent) => void;
  identityErrorText?: (action: 'save' | 'play') => string;
}

const defaultIdentityErrorText = (action: 'save' | 'play'): string =>
  `A Reddit identity is required to ${action}`;

function resolveSaveKeyFor(store: CommunityStore) {
  return async (u: string): Promise<string | null> => {
    try {
      const k = await store.get(usernameIndexKey(u));
      return k;
    } catch { return null; }
  };
}

function renderLeaderboardText(board: { top: { username: string; xp: number; rank: number }[]; me: { rank: number; xp: number } | null }, identified: boolean): string {
  const lines = board.top.length === 0
    ? "No ranked players yet — be the first."
    : board.top.map((e) => `#${e.rank} ${e.username} — ${e.xp.toLocaleString()} XP`).join("\n");
  // v0.108.21 (§59): the not-ranked nudge appears ONLY for an
  // identified player whose loaded board genuinely has no rank. An
  // unidentifiable viewer gets no me-line at all — an unverifiable
  // rank is not "genuinely no rank", and must never blame the player.
  const meLine = board.me
    ? `\n\nYour rank: #${board.me.rank} (${board.me.xp.toLocaleString()} lifetime XP)`
    : identified
      ? "\n\nYou're not ranked yet — play a command and you'll appear."
      : "";
  return `🏆 **Community Leaderboard** (lifetime XP)\n${lines}${meLine}`;
}

// v0.108.25 (§74): one board's text. Same honesty rules as lifetime:
// an empty (loaded) board says so, never fabricated entries; the
// not-ranked nudge appears ONLY for an identified player on a loaded
// board with genuinely no rank. An unavailable fetch never reaches
// here — the caller renders the unavailable line instead.
function renderBoardText(boardId: BoardId, board: { top: { username: string; score: number; rank: number }[]; me: { rank: number; score: number } | null }, identified: boolean): string {
  const def = BOARD_DEFS[boardId];
  const fmt = (s: number) => def.money ? `$${s.toLocaleString()}` : `${s.toLocaleString()} ${def.scoreLabel}`;
  const lines = board.top.length === 0
    ? `No ranked players yet on the ${def.label} board.`
    : board.top.map((e) => `#${e.rank} ${e.username} — ${fmt(e.score)}`).join("\n");
  const meLine = board.me
    ? `\n\nYour rank: #${board.me.rank} (${fmt(board.me.score)})`
    : identified
      ? `\n\nYou're not ranked yet on this board — play a command and you'll appear.`
      : "";
  return `🏆 **Community Leaderboard** (${def.label})\n${lines}${meLine}`;
}

function buildHUD(player: any): string {
  const job = player.job ? `${player.job.title}` : 'Unemployed';
  return `${player.name} | ${job} | $${player.money.toFixed(0)} | ⚡${player.energy}`;
}

async function readBody(req: IncomingMessage, maxBytes?: number): Promise<{ body: string; oversize: boolean }> {
  return new Promise((resolve) => {
    let body = "";
    let oversize = false;
    req.on("data", (chunk) => {
      // v0.108.22 (F14): bounded accumulation — an unbounded body
      // used to pile up without limit on the command path.
      if (oversize) return;
      body += chunk;
      if (maxBytes !== undefined && body.length > maxBytes) oversize = true;
    });
    req.on("end", () => resolve({ body, oversize }));
  });
}

export function createTowHandler(deps: TowHandlerDeps): (req: IncomingMessage, rsp: ServerResponse) => Promise<void> {
  // Apply the injected LLM settings getter, if any. Reddit omits it
  // (llm-provider's default reads Devvit app settings); PC passes an
  // env-only getter so keys come from environment variables alone.
  if (deps.settings) setLlmSettingsGetter(deps.settings);
  const communityStore = (): CommunityStore => deps.community;
  const identityErrorText = deps.identityErrorText ?? defaultIdentityErrorText;

  return async function towRequestHandler(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
    const identity = await deps.resolveIdentity(req);
    const requestUrl = req.url ?? "";
    const url = new URL(requestUrl, `http://localhost`);
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    const username = identity.username ?? "player";

    console.log(`[server] ${method} ${requestUrl} user=${username}`);

    // CORS
    rsp.setHeader("Access-Control-Allow-Origin", "*");
    rsp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    rsp.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      rsp.writeHead(200);
      rsp.end();
      return;
    }

    // --- Per-request save helpers (identity-bound closures) ---

    function saveKey(slot = "1"): string {
      // Prefer the immutable user id, then username, then LOID
      // (logged-out), then fall back to a shared placeholder. This
      // keeps saves stable even if usernames change and avoids
      // collisions with logged-out traffic.
      // v0.108.22 (F17): identity-less traffic must NEVER write under
      // the fallback — the /api/save and /api/init POST handlers
      // reject it before any save function runs (see hasIdentityRaw).
      const user = identity.userId ?? identity.username ?? identity.loid ?? "player";
      return `tow:${user}:save:${slot}`;
    }

    // v0.108.22 (F17): true only when at least one identity signal
    // exists. The "player" fallback in saveKey is a key-shape default,
    // not an identity — writes require a real one.
    function hasIdentityRaw(): boolean {
      return hasIdentity(identity.userId, identity.username, identity.loid);
    }

    // v0.108.22 (F3): the install tag recorded on every save. The save
    // key itself stays shared across installs BY DECISION (per-install
    // scoping would split dev-sub and main-sub progress into separate
    // games — a product call for Dre, not a bugfix). The tag lets
    // stale rejections NAME the cross-install cause instead of saying
    // "try it again".
    function installTag(): string {
      return identity.installTag;
    }

    async function serverSavePlayer(player: any, slot = "1", prevSeq?: number): Promise<{ lastSaved: number; saveSeq: number }> {
      // v0.108.12 fix: this used to swallow Redis errors internally, so every
      // caller reported success even when nothing was persisted. It now throws
      // and lets each endpoint decide how to report the failure — /api/save
      // returns 500, /api/init POST returns the command result WITH a
      // saveFailed flag and a warning line, never a bare success.
      // v0.108.21 (§56): returns the server stamp it wrote, so callers can
      // hand it back to the client (stamp adoption — no one-save lag).
      // v0.108.22 (F2/F3): also stamps the write sequence (one past the
      // greater of the stored and incoming sequences) and the install tag,
      // and returns both so callers hand them back to the client.
      const stamp = Date.now();
      const saveSeq = nextSaveSeq(prevSeq, player?.saveSeq);
      const payload = JSON.stringify({ ...player, lastSaved: stamp, saveSeq, lastInstall: installTag() });
      await deps.saves.set(saveKey(slot), payload, {
        expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // v0.108.9: 90 days (was 30)
      });
      console.log(`[server] Authoritative save: ${saveKey(slot).replace(/^tow:([^:]+):save:.*/, '$1')}`);
      return { lastSaved: stamp, saveSeq };
    }

    async function serverDeletePlayer(slot = "1"): Promise<void> {
      // v0.108.12: server-side delete. Deletes used to be local-only, so a
      // "deleted" save came back via Continue's server scan.
      await deps.saves.del(saveKey(slot));
    }

    // v0.108.22 (F6): tri-state load. The old serverLoadPlayer swallowed
    // EVERY error (Redis failure AND JSON parse failure) into null, which
    // every caller read as "no save" — a transient outage plus an innocent
    // "Begin Life" could then overwrite a real save. Callers that decide
    // between "absent" and "error" must use this; the null wrapper below
    // remains only for read paths where absence and error degrade the
    // same way (ticker/challenge best-effort reads).
    async function serverLoadPlayerResult(slot = "1"): Promise<{ status: 'found' | 'absent' | 'error'; player?: any }> {
      try {
        const data = await deps.saves.get(saveKey(slot));
        if (data && typeof data === "string") {
          try {
            const player = JSON.parse(data);
            console.log(`[server] Loaded save: ${player.name}`);
            return { status: 'found', player };
          } catch (parseErr) {
            console.error("[server] Authoritative load failed (corrupt JSON):", parseErr);
            return { status: 'error' };
          }
        }
        return { status: 'absent' };
      } catch (e) {
        console.error("[server] Authoritative load failed:", e);
        return { status: 'error' };
      }
    }

    async function serverLoadPlayer(slot = "1"): Promise<any | null> {
      const r = await serverLoadPlayerResult(slot);
      return r.status === 'found' ? r.player : null;
    }

    // v0.108.20 (item 28c): server-side staleness guard. A stored copy
    // newer than the incoming write by >5s means the incoming write is
    // stale (e.g. a delayed leave-beacon) — reject it and hand back the
    // stored player so the client re-syncs, never silently overwriting.
    // v0.108.22: (a) a guard-read ERROR throws instead of proceeding to
    // save blindly (F6 — an unreadable stored copy must never be
    // overwritten by a write that could not see it); (b) sequence-stale
    // (F2) rejects even within the 5s window; (c) cross-install stale
    // names its cause (F3); (d) the username index expires (F16).
    async function serverSavePlayerChecked(
      player: any, slot = "1",
    ): Promise<{ saved: boolean; stale?: boolean; stored?: any; lastSaved?: number; saveSeq?: number; staleCause?: 'time' | 'sequence' | 'cross-install' }> {
      const loaded = await serverLoadPlayerResult(slot);
      if (loaded.status === 'error') {
        throw new Error('Guard read failed — refusing to save over an unreadable stored copy.');
      }
      const stored = loaded.status === 'found' ? loaded.player : null;
      if (stored && isStaleWrite(player, stored)) {
        return { saved: false, stale: true, stored, staleCause: staleCauseFor(stored, installTag()) };
      }
      if (stored && isSequenceStale(player, stored)) {
        return { saved: false, stale: true, stored, staleCause: 'sequence' };
      }
      const stamped = await serverSavePlayer(player, slot, stored?.saveSeq);
      // Username -> save-key index for trading (best-effort, never blocks).
      try {
        const u = identity.username;
        if (u) {
          await deps.saves.set(usernameIndexKey(u), saveKey(slot));
          await deps.saves.expire(usernameIndexKey(u), 365 * 24 * 60 * 60);
        }
      } catch { /* index is best-effort */ }
      return { saved: true, lastSaved: stamped.lastSaved, saveSeq: stamped.saveSeq };
    }

    try {
      // === MAIN GAME API ===
      if (pathname === "/api/init" && method === "GET") {
        // v0.108.22 (F20): scan ALL slots and return the NEWEST by
        // stamp — the old first-hit loop ([requested, 1, 2, 3]) could
        // return an older slot-1 save over a newer slot-2/3 game.
        // A load ERROR is a 500, never a "no save" (F6).
        const requestedSlot = url.searchParams.get("slot") || "1";
        const slotsToScan = Array.from(new Set([requestedSlot, "1", "2", "3"]));
        const found: { slot: number; player: any }[] = [];
        let loadError = false;
        for (const slot of slotsToScan) {
          const r = await serverLoadPlayerResult(slot);
          if (r.status === 'error') loadError = true;
          else if (r.status === 'found' && r.player) found.push({ slot: Number(slot), player: r.player });
        }
        if (loadError && found.length === 0) {
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Load failed", failure: "redis" }));
          return;
        }
        const newest = pickNewestSlot(found);
        if (newest) {
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            type: "init",
            username,
            hasPlayer: true,
            player: newest.player,
            dashboard: buildHUD(newest.player),
          }));
          return;
        }

        // No save found - client should show character creation
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({
          type: "init",
          username,
          hasPlayer: false,
          player: null,
          dashboard: "",
        }));
        return;
      }

      if (pathname === "/api/save-slots" && method === "GET") {
        const slots: Array<{ slot: string; hasSave: boolean; player?: any }> = [];
        try {
          for (let i = 1; i <= 3; i++) {
            // v0.108.22 (F6): a load error is a 500, never a slot
            // silently reported as empty.
            const r = await serverLoadPlayerResult(String(i));
            if (r.status === 'error') throw new Error(`Load failed for slot ${i}`);
            if (r.status === 'found' && r.player) {
              slots.push({ slot: String(i), hasSave: true, player: r.player });
            } else {
              slots.push({ slot: String(i), hasSave: false });
            }
          }
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ slots }));
        } catch (err) {
          console.error("[server] Redis save-slots error:", err);
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Persistence failure" }));
        }
        return;
      }

      if (pathname === "/api/leaderboard" && method === "GET") {
        try {
          // v0.108.25 (§74): `board` selects a board; unknown values fall
          // back to lifetime. Entries carry BOTH `xp` (the pre-.25 shape)
          // and `score` so older clients keep working.
          const requested = (url.searchParams.get("board") ?? "lifetime").toLowerCase();
          const boardId: BoardId = (Object.keys(BOARD_DEFS) as BoardId[]).includes(requested as BoardId)
            ? requested as BoardId : "lifetime";
          const board = await getBoard(communityStore(), boardId, username === "player" ? null : username);
          const def = BOARD_DEFS[boardId];
          rsp.writeHead(200, { "Content-Type": "application/json" });
          // v0.108.21 (§59): `identified` tells the client whether a
          // missing rank is genuinely "no rank" (identified player, board
          // loaded) or unverifiable (fallback identity) — the nudge must
          // only appear in the first case.
          rsp.end(JSON.stringify({
            board: boardId, label: def.label, scoreLabel: def.scoreLabel, money: !!def.money,
            top: board.top.map((e) => ({ ...e, xp: e.score })),
            me: board.me ? { ...board.me, xp: board.me.score } : null,
            identified: username !== "player",
          }));
        } catch (err) {
          console.error("[server] Leaderboard error:", err);
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ top: [], me: null, unavailable: true, identified: username !== "player" }));
        }
        return;
      }

      // v0.108.20 §46: ticker payload — same §16 source (worldEventsThisWeek
      // via the engine), mode from the player's saved tickerMode.
      if (pathname === "/api/ticker" && method === "GET") {
        try {
          const slot = url.searchParams.get("slot") || "1";
          const own = await serverLoadPlayer(slot);
          if (!own) {
            rsp.writeHead(200, { "Content-Type": "application/json" });
            rsp.end(JSON.stringify({ mode: "local", headlines: [], unavailable: true }));
            return;
          }
          const game = new GameEngine();
          game.loadState(own);
          const payload = game.tickerPayload();
          // v0.108.21 (§55): leaderboard headlines are appended here —
          // only this handler can see the Redis community store.
          // World mode only, top 3, best-effort: a failed board read
          // appends nothing, never invented names.
          if (payload.mode === 'world' && payload.headlines.length > 0) {
            try {
              const board = await getLeaderboard(communityStore(), null);
              for (const entry of (board.top ?? []).slice(0, 3)) {
                payload.headlines.push(`${entry.username} leads the community with ${Number(entry.xp ?? 0).toLocaleString()} lifetime XP`);
              }
            } catch { /* board unavailable — headlines stand without it */ }
          }
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify(payload));
        } catch (err) {
          console.error("[server] Ticker error:", err);
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ mode: "local", headlines: [], unavailable: true }));
        }
        return;
      }

      if (pathname === "/api/challenge" && method === "GET") {
        try {
          const slot = url.searchParams.get("slot") || "1";
          const own = await serverLoadPlayer(slot);
          const gameDate = own?.gameDate ?? "Monday, January 1, 2024";
          const wk = weekKeyFromDate(gameDate);
          const ch = await getChallenge(communityStore(), wk);
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ weekKey: wk, goal: ch.goal, total: ch.total, top: ch.top }));
        } catch (err) {
          console.error("[server] Challenge error:", err);
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ weekKey: 0, goal: challengeGoalForWeek(0), total: 0, top: [], unavailable: true }));
        }
        return;
      }

      if (pathname === "/api/save" && method === "POST") {
        const { body, oversize } = await readBody(req, SAVE_MAX_BODY_BYTES);
        // v0.108.21 (§56): payload class — an oversize body is rejected
        // with 413 BEFORE parsing/saving, so the client can name the
        // failure instead of showing a generic line.
        // v0.108.22 (F14/F17): malformed JSON is a 400 payload-class
        // rejection (never an outer 500 misread as redis); slot and
        // identity are validated before any write.
        if (oversize) {
          rsp.writeHead(413, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Save too large", failure: "payload" }));
          return;
        }
        let data: any;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Malformed save body", failure: "payload" }));
          return;
        }
        if (!validSlot(data.slot ?? "1")) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Invalid save slot", failure: "payload" }));
          return;
        }
        if (!hasIdentityRaw()) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: identityErrorText('save'), failure: "payload" }));
          return;
        }
        const slot = normalizeSlot(data.slot ?? "1");
        const player = data.player;

        if (!player) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "No player data provided" }));
          return;
        }

        try {
          const checked = await serverSavePlayerChecked(player, slot);
          if (checked.stale) {
            rsp.writeHead(200, { "Content-Type": "application/json" });
            rsp.end(JSON.stringify({
              success: false, stale: true, failure: "stale", slot,
              player: checked.stored,
              staleCause: checked.staleCause ?? 'time',
              warning: "Stale save rejected — the server holds a newer copy. Re-synced to the newer save.",
            }));
            return;
          }
          // v0.108.21 (§56): return the server stamp so the client can
          // adopt it (no one-save lag on the next write).
          // v0.108.22: the write sequence rides along (F1/F2 adoption).
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ success: true, slot, lastSaved: checked.lastSaved, saveSeq: checked.saveSeq }));
        } catch (err) {
          console.error("[server] Redis save error:", err);
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Persistence failure", failure: "redis" }));
        }
        return;
      }

      if (pathname === "/api/load" && method === "GET") {
        const rawSlot = url.searchParams.get("slot") || "1";
        // v0.108.22 (F17): validate before reading.
        if (!validSlot(rawSlot)) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Invalid save slot", failure: "payload" }));
          return;
        }
        const slot = normalizeSlot(rawSlot);
        // v0.108.22 (F6): error is a 500 loadError, never a 404
        // "Save not found" that the client could mistake for absence.
        const r = await serverLoadPlayerResult(slot);
        if (r.status === 'found' && r.player) {
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ player: r.player }));
        } else if (r.status === 'error') {
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Load failed", failure: "redis" }));
        } else {
          rsp.writeHead(404, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Save not found" }));
        }
        return;
      }

      if (pathname === "/api/init" && method === "POST") {
        const { body, oversize } = await readBody(req, SAVE_MAX_BODY_BYTES);
        // v0.108.22 (F14/F17): same body discipline as /api/save —
        // oversize is 413, malformed JSON is 400 payload-class, slot
        // and identity are validated before any processing.
        if (oversize) {
          rsp.writeHead(413, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Request too large", failure: "payload" }));
          return;
        }
        let data: any;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Malformed request body", failure: "payload" }));
          return;
        }
        // v0.108.2 fix (B2): forward the requested slot instead of always
        // saving to slot "1" — otherwise a slot-2 session silently overwrote
        // the slot-1 save on every command.
        if (!validSlot(data.slot ?? "1")) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Invalid save slot", failure: "payload" }));
          return;
        }
        const slot = normalizeSlot(data.slot ?? "1");
        if (!hasIdentityRaw()) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: identityErrorText('play'), failure: "payload" }));
          return;
        }
        // v0.108.12: per-request engine (see the module note above) — never
        // a shared singleton across concurrent requests.
        const game = new GameEngine();

        // Load player state from request (stateless)
        if (data.player) {
          game.loadState(data.player);
          console.log(`[server] Loaded player state, job: ${JSON.stringify(data.player.job)}`);
        }

        // Player creation
        if (data.firstName || data.action === "create") {
          game.setPlayerName(String(data.firstName || "Traveler"));
          if (data.background) {
            game.applyBackground(data.background);
          }
          // v0.108.20 (§12): start city + trait, applied after the
          // background so trait cash adds to background money.
          if (data.startCity) {
            game.setStartCity(String(data.startCity));
          }
          if (data.trait) {
            game.applyTrait(String(data.trait));
          }
          console.log(`[server] Created player, job: ${JSON.stringify(game.getPlayer().job)}`);
        }

        // Command processing
        const input = String(data.input || data.text || "").trim();
        if (input) {
          // v0.108.20 (§13/§18): handler-owned commands — the engine
          // never sees Redis, so these are served here, before the
          // engine, and return WITHOUT the generic command-path save
          // (trade functions persist their own state atomically).
          const inputLower = input.toLowerCase();
          if (inputLower === "leaderboard" || inputLower.startsWith("leaderboard ")) {
            try {
              const player = game.getPlayer();
              const sub = input.trim().split(/\s+/).slice(1).join(" ").toLowerCase();
              if (sub && !(Object.keys(BOARD_DEFS) as BoardId[]).includes(sub as BoardId)) {
                rsp.writeHead(200, { "Content-Type": "application/json" });
                rsp.end(JSON.stringify({ text: "🏆 **Community Leaderboard**\n\nBoards: leaderboard [lifetime|weekly|monthly|wealth|fame]. Bare \"leaderboard\" shows lifetime XP.", dashboard: buildHUD(player), player, success: true }));
                return;
              }
              const boardId: BoardId = (sub as BoardId) || "lifetime";
              if (boardId === "lifetime") {
                const board = await getLeaderboard(communityStore(), username === "player" ? null : username);
                rsp.writeHead(200, { "Content-Type": "application/json" });
                rsp.end(JSON.stringify({ text: renderLeaderboardText(board, username !== "player"), dashboard: buildHUD(player), player, success: true }));
              } else {
                const board = await getBoard(communityStore(), boardId, username === "player" ? null : username);
                rsp.writeHead(200, { "Content-Type": "application/json" });
                rsp.end(JSON.stringify({ text: renderBoardText(boardId, board, username !== "player"), dashboard: buildHUD(player), player, success: true }));
              }
            } catch (err) {
              console.error("[server] Leaderboard command error:", err);
              const player = game.getPlayer();
              rsp.writeHead(200, { "Content-Type": "application/json" });
              rsp.end(JSON.stringify({ text: "🏆 The leaderboard is unavailable right now — try again shortly.", dashboard: buildHUD(player), player, success: false }));
            }
            return;
          }
          if (inputLower === "trade" || inputLower.startsWith("trade ")) {
            const store = communityStore();
            const tradeArgs = input.trim().split(/\s+/).slice(1);
            const sub = (tradeArgs[0] ?? "").toLowerCase();
            const rest = tradeArgs.slice(1).join(" ");
            let tradeText = "";
            let tradeOk = false;
            let acceptedOffer: { from: string } | null = null;
            try {
              if (sub === "offer") {
                const offerParts = rest.split(/\s+/);
                const lastTok = offerParts[offerParts.length - 1] ?? "";
                const price = /^\d+(\.\d+)?$/.test(lastTok) ? Number(lastTok) : 0;
                const itemParts = price > 0 || /^\d+(\.\d+)?$/.test(lastTok) ? offerParts.slice(0, -1) : offerParts;
                const toUser = itemParts[0] ?? "";
                const itemName = itemParts.slice(1).join(" ");
                if (!toUser || !itemName) {
                  tradeText = "Usage: trade offer [username] [item name] [price] (price 0 = gift).";
                } else {
                  const r = await createTradeOffer(store, {
                    fromUsername: username, fromSaveKey: saveKey(slot), toUsername: toUser,
                    itemName, price, now: Date.now(), resolveSaveKey: resolveSaveKeyFor(store),
                  });
                  tradeText = r.message; tradeOk = r.success;
                }
              } else if (sub === "list") {
                const lists = await listTradeOffers(store, username, Date.now());
                const inLines = lists.incoming.length === 0 ? "None." : lists.incoming.map((o) => `• ${o.id}: ${o.itemName} from ${o.from} for $${o.price.toLocaleString()}`).join("\n");
                const outLines = lists.outgoing.length === 0 ? "None." : lists.outgoing.map((o) => `• ${o.id}: ${o.itemName} to ${o.to} for $${o.price.toLocaleString()}`).join("\n");
                tradeText = `🤝 **Trade Offers**\n\nIncoming:\n${inLines}\n\nYour open offers:\n${outLines}`;
                tradeOk = true;
              } else if (sub === "accept") {
                const r = await acceptTradeOffer(store, {
                  acceptorUsername: username, acceptorSaveKey: saveKey(slot),
                  offerId: rest.trim(), now: Date.now(), resolveSaveKey: resolveSaveKeyFor(store),
                });
                tradeText = r.message; tradeOk = r.success;
                if (r.success && r.offer) acceptedOffer = r.offer;
              } else if (sub === "decline") {
                const r = await declineTradeOffer(store, username, rest.trim(), Date.now());
                tradeText = r.message; tradeOk = r.success;
              } else if (sub === "cancel") {
                const r = await cancelTradeOffer(store, username, rest.trim(), Date.now());
                tradeText = r.message; tradeOk = r.success;
              } else {
                tradeText = "Usage: trade offer [username] [item name] [price] | trade list | trade accept [offer id] | trade decline [offer id] | trade cancel [offer id].";
              }
            } catch (err) {
              console.error("[server] Trade command error:", err);
              tradeText = "Trading is unavailable right now — try again shortly.";
            }
            // After an accept, the acceptor's save on Redis is the fresh
            // truth — return it so the client re-syncs to the traded state.
            let tradePlayer = game.getPlayer();
            if (sub === "accept" && tradeOk) {
              try {
                const fresh = await serverLoadPlayer(slot);
                if (fresh) tradePlayer = fresh;
              } catch { /* fall back to engine player */ }
              // v0.108.22 (F9): a completed trade records both players on
              // the leaderboard (best-effort, never blocks the response).
              try {
                const store = communityStore();
                await recordCommandOutcome(store, username, tradePlayer, null);
                if (acceptedOffer) {
                  const senderKey = await resolveSaveKeyFor(store)(acceptedOffer.from);
                  if (senderKey) {
                    const senderRaw = await store.get(senderKey);
                    if (senderRaw) {
                      try {
                        await recordCommandOutcome(store, acceptedOffer.from, JSON.parse(senderRaw), null);
                      } catch { /* best-effort */ }
                    }
                  }
                }
              } catch { /* best-effort */ }
            }
            rsp.writeHead(200, { "Content-Type": "application/json" });
            rsp.end(JSON.stringify({ text: tradeText, dashboard: buildHUD(tradePlayer), player: tradePlayer, success: tradeOk }));
            return;
          }
          console.log(`[server] Processing command: "${input}", current job: ${JSON.stringify(game.getPlayer().job)}`);
          // v0.108.10: dialogue scope for this request. Install scope uses
          // the install tag (Reddit: subredditName — one install per
          // subreddit — because Devvit's web-server context exposes no
          // stable installId field; PC: the install tag the identity
          // resolver returns). This is routing metadata only — dialogue
          // memory payloads come from the requesting player's own save
          // object, never from shared state.
          const commandOpts = {
            asCommand: data.asCommand === true,
            dialogueScope: {
              userId: identity.userId ?? identity.username ?? identity.loid ?? "player",
              installId: identity.installTag,
              npcId: "",
            },
          };
          let result = await game.processCommand(input, commandOpts);
          console.log(`[server] After command, job: ${JSON.stringify(game.getPlayer().job)}`);

          let player = game.getPlayer();

          // v0.108.22 (F9): a trade notice left in the saved player by a
          // completed trade surfaces ONCE in the next command response
          // and is cleared from the saved copy here, so the sender
          // learns a trade changed their game.
          let tradeNotice: string | null = null;
          if (typeof (player as any).tradeNotice === 'string' && (player as any).tradeNotice) {
            tradeNotice = (player as any).tradeNotice;
            delete (player as any).tradeNotice;
          }

          // v0.108.12: a failed server save must never masquerade as success.
          // The command itself succeeded, so the result is still returned —
          // but flagged, with a warning line the client also surfaces.
          // v0.108.20 (item 28c): the command-path save is staleness-guarded —
          // a rejected write returns the stored (newer) player + a stale
          // flag so the client re-syncs instead of displaying stale state.
          // v0.108.21 (§56): SINGLE RETRY on stale — the first attempt
          // never persisted, so re-running the command once on the fresh
          // stored state applies it exactly once, never twice. A second
          // stale result falls back to reject + resync as before.
          // v0.108.22 (F1): the response carries the server stamp AND the
          // write sequence, so the client adopts them BEFORE autosaving
          // — the dropped-stamp autosave-stale loop is closed here.
          // v0.108.22 (F11): recording is decoupled from save success —
          // it runs whenever the command was applied (save success OR
          // save failure), never on a stale rejection (provably
          // unapplied), and each channel retries independently.
          let saveFailed = false;
          let saveFailure: string | null = null;
          let staleRejected = false;
          let staleCause: 'time' | 'sequence' | 'cross-install' = 'time';
          let responsePlayer = player;
          let responseLastSaved: number | undefined = undefined;
          let responseSaveSeq: number | undefined = undefined;
          try {
            let checked = await serverSavePlayerChecked(player, slot);
            if (checked.stale && checked.stored) {
              try {
                const retryGame = new GameEngine();
                retryGame.loadState(checked.stored);
                const retryResult = await retryGame.processCommand(input, commandOpts);
                const retryPlayer = retryGame.getPlayer();
                if (typeof (retryPlayer as any).tradeNotice === 'string' && (retryPlayer as any).tradeNotice) {
                  tradeNotice = (retryPlayer as any).tradeNotice;
                  delete (retryPlayer as any).tradeNotice;
                }
                const checked2 = await serverSavePlayerChecked(retryPlayer, slot);
                if (!checked2.stale) {
                  result = retryResult;
                  player = retryPlayer;
                  checked = checked2;
                } else {
                  staleRejected = true;
                  staleCause = checked2.staleCause ?? 'time';
                  responsePlayer = checked2.stored ?? checked.stored;
                }
              } catch (retryErr) {
                console.error("[server] Command-path stale retry failed:", retryErr);
                staleRejected = true;
                staleCause = checked.staleCause ?? 'time';
                responsePlayer = checked.stored;
              }
            }
            if (!staleRejected) {
              responseLastSaved = checked.lastSaved;
              responseSaveSeq = checked.saveSeq;
              responsePlayer = { ...player, lastSaved: checked.lastSaved, saveSeq: checked.saveSeq };
              // Community recording, best-effort, never blocks gameplay.
              // v0.108.21 (§59): failures are LOGGED, not swallowed — a
              // silent catch hid the whole missing-writes failure mode.
              // v0.108.22 (F11): decoupled — runs on save success AND on
              // save failure (the command was applied either way); the
              // autosave has no result to record from, so command time
              // is the only recording moment and it must not depend on
              // the save.
              try {
                const store = communityStore();
                const contribs: any = (result as any).challengeContributions;
                let challenge: { weekKey: number; amount: number } | null = null;
                if (contribs) {
                  const wk = weekKeyFromDate(player.gameDate ?? "Monday, January 1, 2024");
                  const goal = challengeGoalForWeek(wk);
                  const amt = contribs[goal.type] ?? 0;
                  if (amt > 0) challenge = { weekKey: wk, amount: amt };
                }
                const rec = await recordCommandOutcome(store, username, player, challenge);
                if (!rec.leaderboardOk || !rec.challengeOk) {
                  console.error(`[server] Community recording partial (gameplay unaffected): leaderboardOk=${rec.leaderboardOk} challengeOk=${rec.challengeOk}`);
                }
              } catch (communityErr) {
                console.error("[server] Community recording failed (gameplay unaffected):", communityErr);
              }
            }
          } catch (err) {
            console.error("[server] Command-path save failed:", err);
            saveFailed = true;
            saveFailure = "redis";
            // The command WAS applied in memory; record it anyway (F11)
            // — a save exception must not also erase the leaderboard /
            // challenge contribution for a command the player played.
            try {
              const store = communityStore();
              const contribs: any = (result as any).challengeContributions;
              let challenge: { weekKey: number; amount: number } | null = null;
              if (contribs) {
                const wk = weekKeyFromDate(player.gameDate ?? "Monday, January 1, 2024");
                const goal = challengeGoalForWeek(wk);
                const amt = contribs[goal.type] ?? 0;
                if (amt > 0) challenge = { weekKey: wk, amount: amt };
              }
              const rec = await recordCommandOutcome(store, username, player, challenge);
              if (!rec.leaderboardOk || !rec.challengeOk) {
                console.error(`[server] Community recording partial after save failure: leaderboardOk=${rec.leaderboardOk} challengeOk=${rec.challengeOk}`);
              }
            } catch (communityErr) {
              console.error("[server] Community recording failed after save failure:", communityErr);
            }
          }
          // v0.108.29: outcome logging — the engine reports what the
          // command actually did (enroll/study/invest/exam/graduate/
          // sleep-tick) on result.outcomeLog. Reported here, after the
          // save resolution, so a stale rejection (whose first attempt
          // never persisted) never logs an outcome that didn't happen —
          // and a retry's outcome is the one logged, not the discarded
          // first attempt's. A save failure still logs: the command WAS
          // applied in memory (F11), only the persist failed. The
          // bootstrap owns the emission (deps.onOutcome) so each
          // edition logs in its own sink; the Devvit bootstrap keeps
          // the "[server] Outcome user=" line harness-0.108.29 §E
          // asserts. Log pulls can finally verify progression
          // outcomes, not just receipts (TOW-001).
          if (!staleRejected && result.outcomeLog) {
            deps.onOutcome?.({ username, input, outcomeLog: result.outcomeLog });
          }
          // v0.108.22 (F10/F13): genuine stale shows ONLY the warning
          // (never the unapplied result text); save failure LEADS with
          // the failure (never trails it as an afterthought).
          const noticeSuffix = tradeNotice ? `\n\n📬 ${tradeNotice}` : '';
          const text = saveFailed
            ? saveFailureText(result.message) + noticeSuffix
            : staleRejected
              ? staleRejectionText(staleCause === 'cross-install', (responsePlayer as any)?.lastInstall ?? null)
              : result.message + noticeSuffix;

          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            text,
            npcName: result.npcName,
            dashboard: buildHUD(responsePlayer),
            player: responsePlayer,
            success: result.success,
            saveFailed,
            saveFailure,
            stale: staleRejected,
            staleCause: staleRejected ? staleCause : undefined,
            lastSaved: responseLastSaved,
            saveSeq: responseSaveSeq,
          }));
          return;
        }

        // No command - return current state.
        // v0.108.20 (item 28d): a POST with no input AND no player AND no
        // create action must NEVER persist — it must not save a fresh
        // blank player over a real save.
        // v0.108.22 (F19): it must not even RETURN a blank player —
        // any caller that adopted it and autosaved would blank-overwrite
        // a real save (a blank player has no stamp, and .21 never
        // rejects unstamped writes). Explicit no-player shape instead.
        const isCreate = !!(data.firstName || data.action === "create");
        if (!data.player && !isCreate) {
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify(noPlayerResponse()));
          return;
        }
        const player = game.getPlayer();
        let saveFailed = false;
        let saveFailure: string | null = null;
        let staleRejected = false;
        let responsePlayer = player;
        try {
          if (isCreate) {
            // v0.108.22 (F6): creation is guarded, not blind. A load
            // error blocks creation entirely (the stored save may exist
            // but be unreadable right now); an occupied slot requires
            // an explicit overwrite confirmation; a confirmed overwrite
            // first backs the old save up to a backup key.
            const existing = await serverLoadPlayerResult(slot);
            const guard = canCreate({
              loadOutcome: existing.status,
              occupied: existing.status === 'found',
              confirmOverwrite: data.confirmOverwrite === true,
            });
            if (!guard.allowed) {
              if (guard.reason === 'loadError') {
                rsp.writeHead(500, { "Content-Type": "application/json" });
                rsp.end(JSON.stringify({ error: "Load failed — cannot create while the existing save is unreadable", failure: "redis" }));
                return;
              }
              rsp.writeHead(409, { "Content-Type": "application/json" });
              rsp.end(JSON.stringify({ error: "Slot occupied", needsConfirm: true, failure: "payload" }));
              return;
            }
            if (existing.status === 'found' && existing.player) {
              try {
                await deps.saves.set(`${saveKey(slot)}:backup`, JSON.stringify(existing.player), {
                  expiration: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                });
              } catch { /* backup is best-effort; the confirmed overwrite still proceeds */ }
            }
            // Creation is an explicit new-character action: overwrite.
            await serverSavePlayer(player, slot);
          } else {
            const checked = await serverSavePlayerChecked(player, slot);
            if (checked.stale) {
              staleRejected = true;
              responsePlayer = checked.stored;
            }
          }
        } catch (err) {
          console.error("[server] Create-path save failed:", err);
          saveFailed = true;
          saveFailure = "redis";
        }
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({
          type: "created",
          player: responsePlayer,
          dashboard: buildHUD(responsePlayer),
          text: saveFailed
            ? `⚠️ Server storage failed — your progress was NOT saved to the server. It is stored on this device only and may not survive a refresh.\n\n🌍 Welcome to THE OPEN WORLD, ${responsePlayer.name}!`
            : staleRejected
              ? `🌍 Welcome to THE OPEN WORLD, ${responsePlayer.name}!\n\n⚠️ Stale save rejected — the server holds a newer copy. Re-synced to the newer save.`
              : `🌍 Welcome to THE OPEN WORLD, ${responsePlayer.name}!`,
          saveFailed,
          saveFailure,
          stale: staleRejected,
        }));
        return;
      }

      // v0.108.12: /api/npc-reply REMOVED. It was a dead, open LLM proxy —
      // no client code ever called it, and it accepted caller-supplied
      // npc/player JSON straight into the multi-provider LLM path, so
      // anyone able to reach the endpoint could burn provider calls with
      // arbitrary prompts. NPC replies go through the game's own command
      // flow (dialogue engine) only.

      // v0.108.12: server-side save delete (see serverDeletePlayer). The
      // client Load screen calls this so a deleted save stays deleted
      // instead of resurrecting via Continue's server scan.
      if (pathname === "/api/delete-save" && method === "POST") {
        const { body, oversize } = await readBody(req, SAVE_MAX_BODY_BYTES);
        if (oversize) {
          rsp.writeHead(413, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Request too large", failure: "payload" }));
          return;
        }
        let data: any;
        try {
          data = JSON.parse(body || "{}");
        } catch {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Malformed request body", failure: "payload" }));
          return;
        }
        if (!validSlot(data.slot ?? "1")) {
          rsp.writeHead(400, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Invalid save slot", failure: "payload" }));
          return;
        }
        const slot = normalizeSlot(data.slot ?? "1");
        try {
          await serverDeletePlayer(String(slot));
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ success: true, slot }));
        } catch (err) {
          console.error("[server] Delete-save error:", err);
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Persistence failure" }));
        }
        return;
      }

      // NOTE: the Devvit-internal endpoints (/internal/on-app-install,
      // /internal/on-app-uninstall, /internal/menu/post-create) live in
      // the Devvit bootstrap (src/server/index.ts) — they need the
      // Reddit API and have no PC meaning. They 404 here by design.

      rsp.writeHead(404, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({ error: "Not found" }));

    } catch (err) {
      console.error("[server] Error:", err);
      rsp.writeHead(500, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({ error: "Server error" }));
    }
  };
}
