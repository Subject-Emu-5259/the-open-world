import { requestExpandedMode, exitExpandedMode, getWebViewMode, addWebViewModeListener } from "@devvit/web/client";
import { GAME_VERSION } from '../shared/version.js';
import { telemetry } from '@devvit/analytics/client/reddit';
import { BACKGROUNDS, formatBonuses } from '../shared/backgrounds.js';
import { WORLD_CITIES } from '../shared/world-data.js';
import { TRAIT_DATA } from '../shared/types.js';
import { pickNewerSave, pickNewestSlot, saveWarningText, failureClassForSaveResponse, adoptServerStamp, autosaveStaleIsSafe, migrationOutcome, loadOutcomeFromFetch, deviceClockBehind, type SaveFailureClass } from '../shared/save-resolution.js';
import { formatHelpMessage } from '../shared/help-format.js';
import { UPDATE_INDEX_VERSIONS, updateTargetId, groupIndexVersions, collapsedIndexVersions } from '../shared/updates-index.js';

// ============================================
// PLATFORM — build-time defines + runtime override (TOW PC phase 1)
// ============================================
// __TOW_API_BASE__ and __TOW_PLATFORM__ are esbuild defines
// (tools/build.ts). Reddit: api base '' (relative URLs) and platform
// 'reddit'. PC: api base is the hosted backend URL (from
// TOW_PC_API_BASE at build time) and platform 'pc'. The PC shell can
// also override the api base at runtime by setting
// window.__TOW_PC_CONFIG__ = { apiBase: 'https://…' } before the
// game loads — the runtime value wins over the build-time one.
// The footer string for Reddit stays in this file verbatim; the PC
// build selects its variant through the platform define.
declare const __TOW_API_BASE__: string;
declare const __TOW_PLATFORM__: string;

const PLATFORM_FOOTER: string = __TOW_PLATFORM__ === 'pc' ? 'Built for PC' : 'Built on Reddit Devvit';

// True only in the PC build (tools/build.ts --pc). Every account /
// live-sync path in this file is gated on it — on Reddit all of it
// is dead code that never runs.
const IS_PC: boolean = __TOW_PLATFORM__ === 'pc';

function towApiBase(): string {
  try {
    const cfg = (window as unknown as { __TOW_PC_CONFIG__?: { apiBase?: unknown } }).__TOW_PC_CONFIG__;
    if (cfg && typeof cfg.apiBase === 'string' && cfg.apiBase) return cfg.apiBase.replace(/\/+$/, '');
  } catch { /* no runtime override — fall through to the build-time base */ }
  return __TOW_API_BASE__;
}

// Prefix an API path with the configured base. '' on Reddit returns
// the path unchanged (relative URLs, exactly as before).
function apiUrl(path: string): string {
  const base = towApiBase();
  return base ? `${base}${path}` : path;
}

// ============================================
// PC ACCOUNTS + LIVE SYNC (TOW PC phase 2)
// ============================================
// PC-only, gated on IS_PC throughout. On Reddit towFetch is plain
// fetch (the short-circuit below) and none of this runs.
//   * Session: a bearer token in localStorage (tow_pc_token) +
//     the account (tow_pc_account). The token goes out as
//     `Authorization: Bearer <token>` on every PC API call.
//   * Auth gate: the PC boot (pcBoot, at the bottom of this file)
//     validates the stored token against /api/account/me before
//     the landing screen. A 404 there means the local-dev server
//     (pc-server.ts), which has no accounts — the client proceeds
//     without auth. A 401 means the hosted backend and no session
//     — the login form shows. "Play offline" skips auth entirely
//     (local saves only, exactly like a server outage on Reddit).
//   * Live sync: a WebSocket to /ws (same host as the API base)
//     carries presence + community refresh hints. Polling stays
//     the fallback — every view re-fetches on push, and works with
//     no socket at all.
const PC_TOKEN_KEY = 'tow_pc_token';
const PC_ACCOUNT_KEY = 'tow_pc_account';

interface PcAccount {
  id: string;
  username: string;
}

let pcToken: string | null = null;
let pcAccount: PcAccount | null = null;
let pcAuthMessage: string | null = null;
let pcAuthChecking = false;
let pcAuthBusy = false;

function pcLoadStoredSession(): void {
  try {
    const token = window.localStorage.getItem(PC_TOKEN_KEY);
    const raw = window.localStorage.getItem(PC_ACCOUNT_KEY);
    const account = raw ? JSON.parse(raw) as PcAccount : null;
    if (token && account && typeof account.username === 'string') {
      pcToken = token;
      pcAccount = account;
    } else {
      pcToken = null;
      pcAccount = null;
    }
  } catch {
    pcToken = null;
    pcAccount = null;
  }
}

function pcStoreSession(token: string, account: PcAccount): void {
  pcToken = token;
  pcAccount = account;
  try {
    window.localStorage.setItem(PC_TOKEN_KEY, token);
    window.localStorage.setItem(PC_ACCOUNT_KEY, JSON.stringify(account));
  } catch { /* private mode — the session lasts until reload */ }
}

function pcClearSession(): void {
  pcToken = null;
  pcAccount = null;
  pcWsDisconnect();
  try {
    window.localStorage.removeItem(PC_TOKEN_KEY);
    window.localStorage.removeItem(PC_ACCOUNT_KEY);
  } catch { /* ignore */ }
}

// The one fetch wrapper for all API calls. On Reddit (or with no
// session) it is exactly fetch(apiUrl(path), init) — zero behavior
// change. On PC with a session it adds the bearer token, and a 401
// means the session died mid-game: drop the dead token and send
// the player back to the login screen (local saves are safe).
async function towFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!IS_PC || !pcToken) return fetch(apiUrl(path), init);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${pcToken}`);
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401 && state.currentScreen !== 'auth') {
    pcClearSession();
    pcGoAuth('Your session expired — please log in again.');
  }
  return res;
}

function pcGoAuth(message?: string): void {
  pcAuthMessage = message ?? null;
  pcAuthChecking = false;
  state.currentScreen = 'auth';
  render();
}

// PC boot: validate the stored session, then land. See the section
// note above for the 404 (local-dev server) vs 401 (hosted, logged
// out) split.
async function pcBoot(): Promise<void> {
  pcLoadStoredSession();
  pcAuthChecking = true;
  state.currentScreen = 'auth';
  render();
  let probe: Response | null = null;
  try {
    probe = await towFetch('/api/account/me');
  } catch {
    probe = null;
  }
  if (probe && probe.status === 404) {
    // Local-dev server (pc-server.ts): no accounts exist here.
    // Proceed without auth — the server's dev identity applies.
    pcAuthChecking = false;
    state.currentScreen = 'landing';
    render();
    return;
  }
  if (probe && probe.ok) {
    const data: any = await probe.json().catch(() => null);
    if (data?.account && pcToken) {
      pcStoreSession(pcToken, { id: String(data.account.id), username: String(data.account.username) });
      pcWsConnect();
      pcAuthChecking = false;
      state.currentScreen = 'landing';
      render();
      return;
    }
  }
  if (probe && probe.status === 401 && pcToken) {
    pcClearSession();
    pcAuthMessage = 'Your session expired — please log in again.';
  } else if (!probe) {
    pcAuthMessage = 'Could not reach the server — check your connection, or play offline with local saves only.';
  }
  pcAuthChecking = false;
  render();
}

async function pcSubmitAuth(mode: 'login' | 'register'): Promise<void> {
  if (pcAuthBusy) return;
  const userEl = document.getElementById('pc-auth-username') as HTMLInputElement | null;
  const passEl = document.getElementById('pc-auth-password') as HTMLInputElement | null;
  const username = userEl?.value.trim() ?? '';
  const password = passEl?.value ?? '';
  if (!username || !password) {
    pcAuthMessage = 'Enter a username and password.';
    render();
    return;
  }
  pcAuthBusy = true;
  pcAuthMessage = null;
  render();
  let res: Response | null = null;
  try {
    res = await towFetch(`/api/account/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    res = null;
  }
  pcAuthBusy = false;
  if (!res) {
    pcAuthMessage = 'Could not reach the server — check your connection, or play offline with local saves only.';
    render();
    return;
  }
  const data: any = await res.json().catch(() => null);
  if ((mode === 'login' && res.ok) || (mode === 'register' && res.status === 201)) {
    if (data?.token && data?.account) {
      pcStoreSession(String(data.token), { id: String(data.account.id), username: String(data.account.username) });
      pcWsConnect();
      state.currentScreen = 'landing';
      render();
      return;
    }
  }
  pcAuthMessage = typeof data?.error === 'string' && data.error
    ? data.error
    : mode === 'login' ? 'Login failed — try again.' : 'Registration failed — try again.';
  render();
}

async function pcLogout(): Promise<void> {
  try {
    await towFetch('/api/account/logout', { method: 'POST' });
  } catch { /* the local session clears regardless */ }
  pcClearSession();
  pcGoAuth('Logged out. See you next life.');
}

// --- PC live sync (WebSocket) ---

let pcWs: WebSocket | null = null;
let pcWsWantOpen = false;
let pcWsRetryMs = 5000;
let pcWsRetryTimer: ReturnType<typeof setTimeout> | null = null;
let pcWsPingTimer: ReturnType<typeof setInterval> | null = null;
let pcPresence: { online: number; players: { username: string; activity: string; city: string | null }[] } | null = null;

function towWsUrl(): string | null {
  if (!pcToken) return null;
  const base = towApiBase();
  // http -> ws, https -> wss (the 's' survives the prefix swap).
  const origin = base ? base.replace(/^http/, 'ws') : window.location.origin.replace(/^http/, 'ws');
  return `${origin}/ws?token=${encodeURIComponent(pcToken)}`;
}

function pcWsConnect(): void {
  if (!IS_PC || !pcToken) return;
  pcWsWantOpen = true;
  pcWsRetryMs = 5000;
  pcWsOpen();
}

function pcWsOpen(): void {
  const url = towWsUrl();
  if (!url || !pcWsWantOpen) return;
  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch {
    pcWsScheduleReconnect();
    return;
  }
  pcWs = ws;
  ws.onopen = () => {
    pcWsRetryMs = 5000;
    pcWsSendPresence();
    if (pcWsPingTimer) clearInterval(pcWsPingTimer);
    pcWsPingTimer = setInterval(() => {
      if (pcWs?.readyState === WebSocket.OPEN) {
        pcWs.send(JSON.stringify({ type: 'ping', clientTime: Date.now() }));
        pcWsSendPresence();
      }
    }, 30000);
  };
  ws.onmessage = (ev: MessageEvent) => {
    pcWsOnMessage(String(ev.data));
  };
  ws.onclose = () => {
    if (pcWsPingTimer) {
      clearInterval(pcWsPingTimer);
      pcWsPingTimer = null;
    }
    if (pcWs === ws) pcWs = null;
    if (pcWsWantOpen && pcToken) pcWsScheduleReconnect();
  };
  ws.onerror = () => {
    try { ws.close(); } catch { /* already closing */ }
  };
}

function pcWsScheduleReconnect(): void {
  if (pcWsRetryTimer) return;
  pcWsRetryTimer = setTimeout(() => {
    pcWsRetryTimer = null;
    pcWsRetryMs = Math.min(pcWsRetryMs * 2, 60000);
    if (pcWsWantOpen && pcToken) pcWsOpen();
  }, pcWsRetryMs);
}

function pcWsDisconnect(): void {
  pcWsWantOpen = false;
  if (pcWsRetryTimer) {
    clearTimeout(pcWsRetryTimer);
    pcWsRetryTimer = null;
  }
  if (pcWsPingTimer) {
    clearInterval(pcWsPingTimer);
    pcWsPingTimer = null;
  }
  if (pcWs) {
    try { pcWs.close(); } catch { /* ignore */ }
    pcWs = null;
  }
}

function pcWsSendPresence(): void {
  if (!pcWs || pcWs.readyState !== WebSocket.OPEN) return;
  pcWs.send(JSON.stringify({
    type: 'presence_update',
    activity: state.player ? 'playing' : 'idle',
    city: state.player?.city ?? null,
  }));
}

function pcOnlineLine(): string {
  if (!pcPresence) return 'Connecting to live players…';
  const n = pcPresence.online;
  return n === 1 ? '1 PC player online' : `${n} PC players online`;
}

function pcWsOnMessage(text: string): void {
  let msg: any;
  try {
    msg = JSON.parse(text);
  } catch {
    return;
  }
  if (msg?.type === 'presence') {
    pcPresence = {
      online: typeof msg.online === 'number' ? msg.online : 0,
      players: Array.isArray(msg.players) ? msg.players : [],
    };
    // Live online count on the leaderboard screen, updated in place
    // (no full re-render — that would reset the board tab).
    const el = document.getElementById('lb-online-count');
    if (el) el.textContent = pcOnlineLine();
    return;
  }
  if (msg?.type === 'community') {
    // Refresh hint — re-fetch the view the player is looking at.
    // Polling stays the fallback: these fetches work with no socket.
    if (state.currentScreen === 'leaderboard') {
      void renderLeaderboardScreen();
    } else if (msg.event === 'trade_offer' && state.currentScreen === 'game') {
      const convEl = document.getElementById('conversation');
      if (convEl) addMessage(convEl, 'system', '📬 A new trade offer may be waiting — type "trade list" to check.');
    }
    return;
  }
}

// ============================================
// THE OPEN WORLD - Client Application
// ============================================

interface GameData {
  hasPlayer: boolean;
  player?: PlayerState;
  dashboard?: string;
  text?: string;
  npcName?: string;
  saveFailed?: boolean;
  saveFailure?: SaveFailureClass | string;
  stale?: boolean;
  staleCause?: string;
  lastSaved?: number;
  saveSeq?: number;
  error?: string;
  needsConfirm?: boolean;
}

interface PlayerState {
  name: string;
  city: string;
  district: string;
  money: number;
  bankBalance?: number;
  energy: number;
  health: number;
  happiness: number;
  job: { title: string; employer: string } | null;
  // Time fields
  gameTime?: string;
  gameDate?: string;
  weather?: { temp: number; condition: string };
}

interface SaveSlot {
  id: string;
  playerName: string;
  city: string;
  money: number;
  lastSaved: number;
  playTime: number;
}

type GameScreen = 'landing' | 'main-menu' | 'game' | 'settings' | 'load' | 'updates' | 'leaderboard' | 'about' | 'auth';

// ============================================
// SAVE SYSTEM (Client-Side LocalStorage)
// ============================================

const SAVE_KEY = 'the_open_world_saves';

// v0.108.12: server sync is AWAITED (5s timeout) and its outcome is
// surfaced — previously the sync was fire-and-forget and clientSave
// returned true on localStorage alone, so a dead server looked like a
// successful save. The return value still reports the LOCAL save (the
// session's source of truth); server status lives in
// state.lastServerSyncOk + the #save-warning banner, so a failed sync is
// visible instead of silent.
// v0.108.21 (§56): (a) the sync attempts TWICE (initial + one retry
// after 1.5s) for transport / server-storage failures before settling
// on local-only + banner — a slow first request (cold start, slow
// mobile link) no longer holds the banner up for a whole session;
// (b) a successful sync returns the new server stamp, which is
// adopted into state.player.lastSaved AND the local slot, so the
// next write always carries the latest server stamp; (c) failures
// set a SPECIFIC banner class (stale / transport / redis / payload),
// never the old generic line. Stale is never blindly retried — it
// re-syncs to the newer server copy instead.
async function clientSave(slot: number, player: PlayerState): Promise<boolean> {
  try {
    // 1. Local Save
    const saves = clientLoadAll();
    saves[slot] = {
      ...player,
      savedAt: Date.now(),
      playTime: (saves[slot]?.playTime || 0) + 0.1
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));

    // 2. Server Save (awaited, best-effort with timeout + one retry)
    let synced = false;
    let failureClass: SaveFailureClass | null = null;
    let stalePlayer: any = null;
    // v0.108.22 (F1): the sequence this payload carries — the stale
    // decision below compares it against the stored copy's sequence.
    const carriedSeq = (player as any).saveSeq;
    for (let attempt = 0; attempt < 2 && !synced; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await towFetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot, player }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        let data: any = null;
        try { data = await res.clone().json(); } catch { /* non-JSON save responses are fine */ }
        if (data?.stale && data.player) {
          // v0.108.20 (item 28c): a stale rejection returns the newer
          // server copy — re-sync the session AND the local slot to
          // it, never keep displaying (or re-saving) the stale copy.
          // v0.108.21 (§56): stale is NOT retried — re-sync IS the
          // recovery; retrying the same stale payload would just
          // re-reject.
          // v0.108.22 (F1/F3): split the banner by what actually
          // happened. Cross-install names its cause. A same-sequence
          // stored copy IS the command-path save this autosave
          // re-posts, so the command is safe — say so. Any other
          // stale copy is a genuine newer game: cautious wording.
          stalePlayer = data.player;
          failureClass = data.staleCause === 'cross-install'
            ? 'crossInstall'
            : autosaveStaleIsSafe(carriedSeq, stalePlayer.saveSeq) ? 'autosaveStale' : 'stale';
          break;
        }
        const cls = failureClassForSaveResponse({ ok: res.ok, status: res.status, stale: false });
        if (cls === null) {
          synced = true;
          failureClass = null;
          // Adopt the server stamp AND sequence: the next write
          // carries them (F1/F2 — no one-save lag on either).
          if (typeof data?.lastSaved === 'number' || typeof data?.saveSeq === 'number') {
            if (state.player) state.player = adoptServerStamp(state.player, data.lastSaved, data.saveSeq);
            const saves2 = clientLoadAll();
            if (saves2[slot]) {
              saves2[slot] = adoptServerStamp(saves2[slot], data.lastSaved, data.saveSeq);
              localStorage.setItem(SAVE_KEY, JSON.stringify(saves2));
            }
          }
        } else {
          failureClass = cls;
          // A payload rejection will not change on retry (same body),
          // so do not burn the retry on it.
          if (cls === 'payload') break;
        }
      } catch (e) {
        failureClass = 'transport';
        console.warn("[save] Server sync failed:", e);
      }
    }
    if (stalePlayer) {
      const saves2 = clientLoadAll();
      // v0.108.22 (F7): back up the displaced local copy first.
      if (saves2[slot]) backupLocalCopy(slot, saves2[slot], 'autosave-stale-resync');
      saves2[slot] = { ...stalePlayer, savedAt: stalePlayer.lastSaved || Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saves2));
      state.player = stalePlayer;
      console.warn("[save] Stale write rejected — re-synced to the newer server copy.");
    }
    state.lastServerSyncOk = synced;
    state.lastSaveFailureClass = synced ? null : failureClass;
    if (synced) {
      setSaveWarningVisible(false);
    } else if (failureClass) {
      setSaveWarningText(failureClass);
      setSaveWarningVisible(true);
    }

    console.log(`[save] Saved to slot ${slot}: ${player.name} (server sync ${state.lastServerSyncOk ? 'ok' : 'FAILED'})`);
    return true;
  } catch (e) {
    console.error('[save] Failed to save:', e);
    return false;
  }
}

// v0.108.22 (F7/F8): back up a displaced local copy before any
// server-wins overwrite (stale re-sync, use-server-copy, load-time
// server preference). Most-recent backup only, best-effort — the
// point is that no overwrite is ever unrecoverable.
function backupLocalCopy(slot: number, player: any, reason: string): void {
  try {
    localStorage.setItem('the_open_world_saves_backup', JSON.stringify({ slot, player, reason, backedUpAt: Date.now() }));
  } catch { /* backup is best-effort */ }
}

// v0.108.22 (F21): migration, AWAITED and adopted — never
// fire-and-forget. Success adopts the stamp + sequence into the
// session player and the local slot; stale re-syncs to the server
// copy (with a backup of the displaced local copy); any other
// failure only warns, and the session keeps playing on local.
async function migrateToServer(slot: number, player: any): Promise<void> {
  try {
    const res = await towFetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, player }),
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON: failed */ }
    const outcome = migrationOutcome({ ok: res.ok, stale: !!data?.stale, player: data?.player, lastSaved: data?.lastSaved, saveSeq: data?.saveSeq });
    if (outcome.action === 'adopt') {
      if (state.player) state.player = adoptServerStamp(state.player, outcome.lastSaved, outcome.saveSeq);
      const saves = clientLoadAll();
      if (saves[slot]) {
        saves[slot] = adoptServerStamp(saves[slot], outcome.lastSaved, outcome.saveSeq);
        localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
      }
    } else if (outcome.action === 'resync') {
      backupLocalCopy(slot, player, 'migration-stale-resync');
      state.player = outcome.player;
      state.loadNote = 'Recovered a newer save from the server — your device copy was kept as a backup.';
      const saves = clientLoadAll();
      saves[slot] = outcome.player;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    } else {
      console.warn("[load] Migration failed:", res.status);
    }
  } catch (e) {
    console.warn("[load] Migration failed:", e);
  }
}

// True when the most recent clientLoad hit a transport error (as opposed
// to a clean "no save" answer) — startGame uses it to show an error
// screen instead of silently falling through to character creation.
// v0.108.22 (F6): a 5xx counts as a load error too. The old code set
// this ONLY on a fetch throw, so a Redis error answering 404 fell
// through to character creation.
let lastClientLoadFailed = false;
// v0.108.22 (F12): true when the newest-slot server scan hit a
// non-404 failure on any slot — startGame shows the error screen
// instead of creation when the scan finds nothing.
let lastServerScanError = false;

async function clientLoad(slot: number): Promise<PlayerState | null> {
  lastClientLoadFailed = false;
  try {
    // 1. Try Server Load first — but last-write-wins: a fresher local
    // copy of the SAME slot beats the server copy (item 28a).
    let serverPlayer: any = null;
    try {
      const res = await towFetch(`/api/load?slot=${slot}`);
      if (res.ok) {
        const data = await res.json();
        if (data.player) serverPlayer = data.player;
      } else if (loadOutcomeFromFetch(res.status, false) === 'error') {
        // v0.108.22 (F6): a 5xx is a load ERROR, not absence — the
        // old code only flagged fetch throws, so a Redis error
        // answering 404 fell through to character creation.
        lastClientLoadFailed = true;
      }
    } catch { /* server unreachable — local below */ }
    const localHere = clientLoadAll()[slot];
    if (serverPlayer || localHere) {
      const picked = pickNewerSave(serverPlayer, localHere);
      if (picked.source === 'local') {
        console.log(`[load] Local copy of slot ${slot} is newer — keeping it and migrating to server...`);
        state.activeSlot = slot;
        state.loadNote = 'Recovered a newer save from this device — your latest progress was kept.';
        await migrateToServer(slot, picked.player);
        return picked.player;
      }
      if (picked.player) {
        console.log(`[load] Loaded ${picked.player.name} from server`);
        const saves = clientLoadAll();
        // v0.108.22 (F8): back up a displaced local copy before the
        // server-wins mirror overwrites it.
        if (saves[slot]) backupLocalCopy(slot, saves[slot], 'load-server-wins');
        saves[slot] = picked.player;
        localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
        state.activeSlot = slot;
        return picked.player;
      }
    }

    // 2. Fallback to Local Storage
    const saves = clientLoadAll();
    const player = saves[slot];
    if (player) {
      console.log(`[load] Loaded ${player.name} from local storage. Migrating to server...`);
      state.activeSlot = slot;
      // Migrate to server (same slot — never silently to slot 1)
      await migrateToServer(slot, player);
      return player;
    }

    return null;
  } catch (e) {
    lastClientLoadFailed = true;
    console.error('[load] Failed to load:', e);
    return null;
  }
}

// v0.108.12: server FIRST, then local. The old local-only delete let a
// "deleted" save resurrect via Continue's server scan. If the server
// delete fails, nothing is deleted locally either and the caller is told.
async function clientDelete(slot: number): Promise<{ local: boolean; server: boolean }> {
  let server = false;
  try {
    const res = await towFetch("/api/delete-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot }),
    });
    server = res.ok;
    if (!server) console.warn("[save] Server delete rejected:", res.status);
  } catch (e) {
    console.warn("[save] Server delete failed:", e);
  }
  if (!server) return { local: false, server: false };
  try {
    const saves = clientLoadAll();
    delete saves[slot];
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    console.log(`[save] Deleted slot ${slot} (server + local)`);
    return { local: true, server: true };
  } catch (e) {
    console.error('[save] Failed to delete locally:', e);
    return { local: false, server: true };
  }
}

function clientLoadAll(): Record<number, any> {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function clientGetSaveSlots(): SaveSlot[] {
  const saves = clientLoadAll();
  const slots: SaveSlot[] = [];
  
  for (let i = 1; i <= 3; i++) {
    const save = saves[i];
    if (save) {
      slots.push({
        id: String(i),
        playerName: save.name || 'Unknown',
        city: save.city?.replace('_', ' ') || 'Unknown',
        money: save.money || 0,
        lastSaved: save.savedAt || 0,
        playTime: save.playTime || 0,
      });
    } else {
      slots.push({
        id: String(i),
        playerName: 'Empty Slot',
        city: '-',
        money: 0,
        lastSaved: 0,
        playTime: 0,
      });
    }
  }
  
  return slots;
}

// Check server for any available save (slot 1..3) — returns the slot too,
// so the session plays on the slot the save actually came from.
// v0.108.20 (item 28b): the resume scan reads ALL three server slots
// and picks the NEWEST by lastSaved — never the lowest number.
async function clientCheckServerSaves(): Promise<{ player: PlayerState; slot: number } | null> {
  lastServerScanError = false;
  try {
    const found: { slot: number; player: any }[] = [];
    for (let slot = 1; slot <= 3; slot++) {
      try {
        const res = await towFetch(`/api/load?slot=${slot}`);
        if (res.ok) {
          const data = await res.json();
          if (data.player) found.push({ slot, player: data.player });
        } else if (loadOutcomeFromFetch(res.status, false) === 'error') {
          // v0.108.22 (F12): a 5xx on any slot is a scan error, not
          // absence — one failing slot must not hide the others, but
          // it must not silently become "no save" either.
          lastServerScanError = true;
        }
      } catch { lastServerScanError = true; /* one slot failing must not hide the others */ }
    }
    return pickNewestSlot(found);
  } catch (e) {
    // Server unavailable - localStorage will be the fallback
    lastServerScanError = true;
  }
  return null;
}

// Detect the best available save — v0.108.20 (item 28a/b): last-write-wins
// across server and local, newest slot wins. A fresher local copy is
// NEVER clobbered by a stale server copy.
// v0.108.22 (F8): when the server copy wins, the comparison prefers
// its server stamp (see pickNewerSave) — and a displaced local copy
// is backed up first. A device clock behind the server clock by more
// than a minute surfaces a skew note on the menu.
async function clientDetectSave(): Promise<PlayerState | null> {
  const found = await clientCheckServerSaves();
  const saves = clientLoadAll();
  const localNewest = pickNewestSlot([1, 2, 3].map((slot) => ({ slot, player: saves[slot] })));
  const skewNote = found?.player && deviceClockBehind((found.player as any).lastSaved ?? null, Date.now())
    ? 'Your device clock is behind the server clock — saves now use server time, so nothing is lost, but check your clock.'
    : null;
  if (found) {
    const picked = pickNewerSave(found.player, localNewest?.player ?? null);
    if (picked.source === 'local' && localNewest) {
      // Local wins: keep it, migrate it to the server (same slot), and
      // say so plainly — this is the recovery the old code destroyed.
      state.activeSlot = localNewest.slot;
      state.loadNote = 'Recovered a newer save from this device — your latest progress was kept.';
      await migrateToServer(localNewest.slot, picked.player);
      return picked.player;
    }
    // Server wins (or ties): mirror into the SAME local slot — the old
    // code always mirrored into local slot 1, which is how a slot-2/3
    // save silently migrated itself onto slot 1 on the next autosave.
    if (saves[found.slot]) backupLocalCopy(found.slot, saves[found.slot], 'detect-server-wins');
    saves[found.slot] = found.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    state.activeSlot = found.slot;
    if (skewNote) state.loadNote = skewNote;
    return found.player;
  }

  // Fallback to localStorage (newest slot, not lowest).
  if (localNewest) {
    const localPlayer = localNewest.player;
    state.activeSlot = localNewest.slot;
    // Migrate local save to server (same slot), awaited + adopted.
    await migrateToServer(localNewest.slot, localPlayer);
    return localPlayer;
  }

  return null;
}

// ============================================
// GAME STATE
// ============================================

// v0.108.12: settings PERSIST. Previously settings lived only in volatile
// client state — every reload reset to sound/music on, medium font, dark
// theme, and the audio toggles had no audio code behind them at all.
const SETTINGS_KEY = 'tow_settings_v1';

interface PersistedSettings {
  fontSize: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light';
  // Preferred screen mode. A preference, never a force: expansion still
  // requires a real player click (see onExpandButtonClick), so with
  // "Full-screen" preferred, Continue/New Game first opens the
  // full-screen view and the player presses Continue once more there.
  viewModePreference: 'inline' | 'expanded';
}

const DEFAULT_SETTINGS: PersistedSettings = {
  fontSize: 'medium',
  theme: 'dark',
  viewModePreference: 'inline',
};

function loadPersistedSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      fontSize: ['small', 'medium', 'large'].includes(parsed.fontSize as string)
        ? (parsed.fontSize as PersistedSettings['fontSize']) : DEFAULT_SETTINGS.fontSize,
      theme: ['dark', 'light'].includes(parsed.theme as string)
        ? (parsed.theme as PersistedSettings['theme']) : DEFAULT_SETTINGS.theme,
      viewModePreference: ['inline', 'expanded'].includes(parsed.viewModePreference as string)
        ? (parsed.viewModePreference as PersistedSettings['viewModePreference']) : DEFAULT_SETTINGS.viewModePreference,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.warn('[settings] Failed to persist:', e);
  }
}

const state = {
  currentScreen: 'landing' as GameScreen,
  player: null as PlayerState | null,
  saveAvailable: false as boolean,
  conversationHistory: [] as Array<{ role: string; content: string; sender?: string; cls?: string }>,
  settings: loadPersistedSettings(),
  saveSlots: [] as SaveSlot[],
  // v0.108.12: the slot this session is playing on. Autosaves, menu saves
  // and quit saves all use it — previously everything hardcoded slot 1, so
  // a slot-2/3 session silently migrated itself onto slot 1.
  activeSlot: 1 as number,
  // Which screen Settings should return to (main menu vs in-game menu).
  settingsReturnTo: 'main-menu' as GameScreen,
  // Which screen What's New should return to (same idea).
  updatesReturnTo: 'main-menu' as GameScreen,
  // Last server-sync outcome, for the save warning banner + save messages.
  lastServerSyncOk: true as boolean,
  // v0.108.21 (§56): class of the most recent failed server sync, so
  // the banner names the failure instead of a generic line.
  lastSaveFailureClass: null as SaveFailureClass | null,
  // Splash probe outcome, shown on the main menu when the probe failed.
  loadError: null as string | null,
  // One-shot note for the Load screen (e.g. a failed server delete).
  loadNote: null as string | null,
};

// ===========================================
// DEVVIT JOURNEYS ANALYTICS (v0.108.12)
// ===========================================
// One play session = one journey. Rules, per the implementation spec:
// - Journey.Start ONLY on an explicit game begin (Continue, New Game
//   Begin Life, Load-slot click) — never on page load, splash, or the
//   save probe.
// - App.Ready once, when the game screen is first interactive.
// - Journey.Progress (0.0-1.0, monotonic) on session milestones:
//   first work, first property, first investment, first vehicle, first
//   conversation — detected from the returned player object.
// - Journey.End on quit-to-menu.
// - Intentional committed actions only; NO personally identifiable info
//   in action/actionDetails (generic milestone keys only).
// Every call is best-effort: telemetry failures are swallowed and can
// never break gameplay. Metrics additionally need a server-side allowlist
// + journey-map review/approval that code cannot grant.
let journeyMilestoneProgress = 0;
let appReadySent = false;

async function journeyStart(): Promise<void> {
  try {
    await telemetry.startJourney();
  } catch (e) {
    console.warn('[telemetry] startJourney failed (best-effort):', e);
  }
}

async function journeyAppReady(): Promise<void> {
  if (appReadySent) return;
  appReadySent = true;
  try {
    await telemetry.appReady();
  } catch (e) {
    console.warn('[telemetry] appReady failed (best-effort):', e);
  }
}

async function journeyMilestone(action: string, progress: number): Promise<void> {
  try {
    if (!telemetry.getActiveJourneyId()) return;
    if (progress <= journeyMilestoneProgress) return;
    journeyMilestoneProgress = progress;
    await telemetry.progress({ progress, action });
  } catch (e) {
    console.warn('[telemetry] progress failed (best-effort):', e);
  }
}

async function journeyEnd(): Promise<void> {
  try {
    if (!telemetry.getActiveJourneyId()) return;
    await telemetry.endJourney({ complete: false });
  } catch (e) {
    console.warn('[telemetry] endJourney failed (best-effort):', e);
  } finally {
    journeyMilestoneProgress = 0;
  }
}

// After each successful command, check the returned player object for
// first-time milestones and report the highest new one.
function checkJourneyMilestones(player: any): void {
  if (!player) return;
  if ((player.workDaysCompleted || 0) > 0) void journeyMilestone('first_work', 0.2);
  if ((player.properties || []).length > 0) void journeyMilestone('first_property', 0.4);
  if ((player.investments || []).length > 0) void journeyMilestone('first_investment', 0.6);
  if ((player.vehicles || []).length > 0) void journeyMilestone('first_vehicle', 0.75);
  if (player.relationships && Object.keys(player.relationships).length > 0) void journeyMilestone('first_conversation', 0.85);
}

function setSaveWarningVisible(visible: boolean): void {
  const el = document.getElementById('save-warning');
  if (el) el.style.display = visible ? 'block' : 'none';
}

// v0.108.21 (§56): set the banner's class-specific text (the span
// inside the banner; the two recovery buttons stay in place).
function setSaveWarningText(kind: SaveFailureClass): void {
  const el = document.getElementById('save-warning-text');
  if (el) el.textContent = saveWarningText(kind);
}

// v0.108.21 (§56): banner recovery actions, wired by document-level
// delegation so they survive game-screen re-renders (the banner div
// is rebuilt from innerHTML on every render). Guarded: bindGameEvents
// runs on every game-screen render, but the listener is added once.
let saveWarningActionsWired = false;
function wireSaveWarningActions(): void {
  if (saveWarningActionsWired) return;
  saveWarningActionsWired = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.id === 'save-retry-btn') {
      if (state.player) void clientSave(state.activeSlot, state.player);
    } else if (target.id === 'save-servercopy-btn') {
      void (async () => {
        // v0.108.22 (F7): confirm first, back up the local copy,
        // and load via the NEWEST-slot scan — the old code fetched
        // the active slot only and destroyed local-newer progress
        // with one tap.
        if (!window.confirm('Use the server copy? This replaces this device\'s copy (a backup of it is kept).')) return;
        try {
          if (state.player) backupLocalCopy(state.activeSlot, state.player, 'use-server-copy');
          const scanned = await clientCheckServerSaves();
          let serverPlayer: any = scanned?.player ?? null;
          let slot = scanned?.slot ?? state.activeSlot;
          if (!serverPlayer) {
            const res = await towFetch(`/api/load?slot=${state.activeSlot}`);
            if (!res.ok) {
              setSaveWarningText('transport');
              setSaveWarningVisible(true);
              return;
            }
            const data = await res.json();
            serverPlayer = data?.player ?? null;
          }
          if (serverPlayer) {
            state.player = serverPlayer;
            state.activeSlot = slot;
            updateStats(serverPlayer);
            await clientSave(state.activeSlot, serverPlayer);
            render();
          } else {
            setSaveWarningText('transport');
            setSaveWarningVisible(true);
          }
        } catch {
          setSaveWarningText('transport');
          setSaveWarningVisible(true);
        }
      })();
    }
  });
}

// const appEl = document.querySelector<HTMLDivElement>(".app");
const rootEl = document.getElementById("game-root");

// ============================================
// SCREEN MODE — expanded view as a PLAYER OPTION
// ============================================
// The expanded view is entered ONLY from a real player click (the game
// header button or the settings button). Nothing here auto-expands: no
// load-time call, no timer, no synthetic event. The orphaned splash
// auto-expand call was DELETED in v0.108.12 and is deliberately not
// wired up anywhere.
// Mode-aware UI: the live mode comes from the Devvit client and is kept
// in sync via a listener, so the compact layout stays compact and the
// expanded layout actually uses the full screen.

type ViewMode = 'inline' | 'expanded';

let viewMode: ViewMode = 'inline';

function readInitialViewMode(): ViewMode {
  try {
    return getWebViewMode();
  } catch {
    return 'inline';
  }
}

function applyViewMode(mode: ViewMode) {
  viewMode = mode;
  document.body.classList.toggle('tow-expanded', mode === 'expanded');
  document.querySelector('.game-screen')?.classList.toggle('fullscreen', mode === 'expanded');
  const btn = document.getElementById('expand-btn');
  if (btn) btn.textContent = mode === 'expanded' ? '⛶ Exit' : '⛶ Full screen';
}

function initViewModeListener() {
  try {
    viewMode = readInitialViewMode();
    addWebViewModeListener((mode) => applyViewMode(mode));
  } catch {
    // Outside a Reddit webview (local preview): stay in compact mode.
  }
  applyViewMode(viewMode);
}

function isFullscreen(): boolean {
  return viewMode === 'expanded';
}

// One button, two directions, always the player's choice. Expanding to
// the same entrypoint reloads the view, so progress is saved first and
// restores via Continue; the compact view always stays available.
async function onExpandButtonClick(e: MouseEvent) {
  const convEl = document.getElementById('conversation');
  try {
    if (state.player) await clientSave(state.activeSlot, state.player);
    if (viewMode === 'expanded') {
      exitExpandedMode(e);
    } else {
      requestExpandedMode(e, 'game');
    }
  } catch {
    if (convEl) {
      addMessage(convEl, 'system', viewMode === 'expanded'
        ? 'Already in full-screen view.'
        : 'Couldn\'t open full-screen view — try opening the post and expanding it.');
    }
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function render() {
  if (!rootEl) return;
  
  switch (state.currentScreen) {
    case 'auth':
      renderAuthScreen();
      break;
    case 'landing':
      renderLandingScreen();
      break;
    case 'main-menu':
      renderMainMenu();
      break;
    case 'game':
      renderGameScreen();
      break;
    case 'settings':
      renderSettingsScreen();
      break;
    case 'load':
      renderLoadScreen();
      break;
    case 'updates':
      renderUpdatesScreen();
      break;
    case 'leaderboard':
      renderLeaderboardScreen();
      break;
    case 'about':
      renderAboutScreen();
      break;
  }
}

// ============================================
// PC AUTH SCREEN (TOW PC phase 2 — PC only)
// ============================================
// The PC login / register gate, shown before the landing screen.
// A PC account is separate from Reddit: same game, separate saves,
// separate leaderboards. No email — username + password only.
// "Play offline" skips auth entirely (local saves only).
function renderAuthScreen() {
  if (!rootEl) return;

  if (pcAuthChecking) {
    rootEl.innerHTML = `
      <div class="screen landing-screen">
        <div class="landing-backdrop"></div>
        <div class="landing-content">
          <div class="landing-logo">🌍</div>
          <h1 class="landing-title">THE OPEN WORLD</h1>
          <p class="landing-tagline">A Life Simulation</p>
          <div class="loading-container">
            <p class="loading-text">Checking your login…</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  rootEl.innerHTML = `
    <div class="screen menu-screen">
      <div class="menu-backdrop"></div>
      <div class="menu-content">
        <div class="menu-header">
          <div class="menu-logo">🌍</div>
          <h1 class="menu-title">THE OPEN WORLD</h1>
        </div>
        <p class="landing-tagline">Log in to play online — shared leaderboards, challenges, and trading with other PC players.</p>
        <p class="landing-tagline">Your PC account is separate from Reddit: same game, separate saves.</p>
        ${pcAuthMessage ? `<p class="menu-warning">⚠️ ${escapeHtml(pcAuthMessage)}</p>` : ''}
        <form id="pc-auth-form" class="menu-options">
          <input type="text" id="pc-auth-username" class="create-input" placeholder="Username (3–30 characters)" maxlength="30" autocomplete="username" ${pcAuthBusy ? 'disabled' : ''}>
          <input type="password" id="pc-auth-password" class="create-input" placeholder="Password (6+ characters)" maxlength="128" autocomplete="current-password" ${pcAuthBusy ? 'disabled' : ''}>
          <button type="submit" class="menu-btn primary" data-auth="login" ${pcAuthBusy ? 'disabled' : ''}>
            <div class="btn-content">
              <span class="btn-icon">▶</span>
              <span class="btn-text">${pcAuthBusy ? 'Please wait…' : 'Log in'}</span>
            </div>
            <span class="btn-sub">Continue your PC life</span>
          </button>
          <button type="button" class="menu-btn" data-auth="register" ${pcAuthBusy ? 'disabled' : ''}>
            <div class="btn-content">
              <span class="btn-icon">✦</span>
              <span class="btn-text">Create account</span>
            </div>
            <span class="btn-sub">New here? Pick a username and start fresh</span>
          </button>
          <button type="button" class="menu-btn" data-auth="offline">
            <div class="btn-content">
              <span class="btn-icon">💾</span>
              <span class="btn-text">Play offline</span>
            </div>
            <span class="btn-sub">Local saves only — no leaderboards, no trading</span>
          </button>
        </form>
        <div class="menu-footer">
          <p class="menu-credits">v${GAME_VERSION} | ${PLATFORM_FOOTER}</p>
        </div>
      </div>
    </div>
  `;

  const form = rootEl.querySelector('#pc-auth-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    void pcSubmitAuth('login');
  });
  rootEl.querySelector('[data-auth="register"]')?.addEventListener('click', () => {
    void pcSubmitAuth('register');
  });
  rootEl.querySelector('[data-auth="offline"]')?.addEventListener('click', () => {
    pcAuthMessage = null;
    state.currentScreen = 'landing';
    render();
  });
}

// ============================================
// LANDING SCREEN (Splash)
// ============================================

function renderLandingScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen landing-screen">
      <div class="landing-backdrop"></div>
      <div class="landing-content">
        <div class="landing-logo-container">
          <div class="landing-logo">🌍</div>
        </div>
        <h1 class="landing-title">THE OPEN WORLD</h1>
        <p class="landing-tagline">A Life Simulation</p>
        <div class="landing-subtitle">
          Build your story across the globe
        </div>
        <div class="avok-splash">
          <img class="avok-splash-mark" src="avok-mark.png" alt="Avok Interactive logo" />
          <p class="avok-splash-name">Avok Interactive</p>
          <p class="avok-splash-copy">Copyright © 2026 Avok Interactive. All Rights Reserved.</p>
        </div>
        <div class="loading-container">
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
          <p class="loading-text">Loading world data...</p>
        </div>
      </div>
    </div>
  `;
  
  // v0.108.12: the splash is REAL now. The old splash was a fixed 2.4s
  // timer with cycling text while nothing actually loaded — the save
  // probe only ran at the 2400ms mark and could overrun invisibly behind
  // a frozen 100% bar. Now the probe starts immediately, the bar tracks
  // it, and failures/timeouts proceed to the menu WITH an error note
  // instead of silently pretending everything is fine.
  const loadingText = rootEl.querySelector('.loading-text');
  const loadingBar = rootEl.querySelector('.loading-progress') as HTMLElement | null;
  if (loadingBar) {
    loadingBar.style.animation = 'none';
    loadingBar.style.width = '25%';
  }
  if (loadingText) loadingText.textContent = 'Checking for your save…';
  let settled = false;
  const goMenu = () => {
    state.currentScreen = 'main-menu';
    render();
  };
  const finish = (msg: string) => {
    if (loadingText) loadingText.textContent = msg;
    if (loadingBar) loadingBar.style.width = '100%';
    setTimeout(goMenu, 450);
  };
  setTimeout(() => {
    if (settled) return;
    settled = true;
    state.loadError = 'Save check timed out — playing from this device\'s saves; Load Game may still find a server save.';
    finish('Save check timed out — continuing…');
  }, 10000);
  clientDetectSave().then((detected) => {
    if (settled) return;
    settled = true;
    if (detected) {
      state.player = detected;
      state.saveAvailable = true;
      finish(`Save found — welcome back, ${detected.name}.`);
    } else {
      finish('No save found — starting fresh.');
    }
  }).catch(() => {
    if (settled) return;
    settled = true;
    state.loadError = 'Could not reach the server — playing from this device\'s saves only.';
    finish('Server unreachable — continuing with local saves.');
  });
}

// ============================================
// MAIN MENU
// ============================================

function renderMainMenu() {
  if (!rootEl) return;
  
  const hasContinue = state.player !== null || state.saveAvailable;

  rootEl.innerHTML = `
    <div class="screen menu-screen">
      <div class="menu-backdrop"></div>
      <div class="menu-content">
        <div class="menu-header">
          <div class="menu-logo">🌍</div>
          <h1 class="menu-title">THE OPEN WORLD</h1>
        </div>
        ${state.loadError ? `<p class="menu-warning">⚠️ ${state.loadError}</p>` : ''}
        ${state.loadNote ? `<p class="menu-warning">ℹ️ ${state.loadNote}</p>` : ''}
        
        <div class="menu-options">
          ${hasContinue ? `
            <button class="menu-btn primary" data-action="continue">
              <div class="btn-content">
                <span class="btn-icon">▶</span>
                <span class="btn-text">Continue</span>
              </div>
              <span class="btn-sub">${state.player?.name ? `${state.player.name} · ${state.player.city}` : 'Resume your saved life'}</span>
            </button>
          ` : `
            <button class="menu-btn primary" data-action="new">
              <div class="btn-content">
                <span class="btn-icon">✦</span>
                <span class="btn-text">New Game</span>
              </div>
              <span class="btn-sub">Begin a new life</span>
            </button>
          `}
          
          <button class="menu-btn" data-action="load">
            <div class="btn-content">
              <span class="btn-icon">📂</span>
              <span class="btn-text">Load Game</span>
            </div>
            <span class="btn-sub">Continue from save</span>
          </button>
          
          <button class="menu-btn" data-action="settings">
            <div class="btn-content">
              <span class="btn-icon">⚙</span>
              <span class="btn-text">Settings</span>
            </div>
            <span class="btn-sub">Display, full-screen view</span>
          </button>

          <button class="menu-btn" data-action="leaderboard">
            <div class="btn-content">
              <span class="btn-icon">🏆</span>
              <span class="btn-text">Leaderboard</span>
            </div>
            <span class="btn-sub">Top players + this week's challenge</span>
          </button>

          <button class="menu-btn" data-action="updates">
            <div class="btn-content">
              <span class="btn-icon">📜</span>
              <span class="btn-text">What's New</span>
            </div>
            <span class="btn-sub">Latest updates in v${GAME_VERSION}</span>
          </button>

          <button class="menu-btn" data-action="about">
            <div class="btn-content">
              <span class="btn-icon">🎮</span>
              <span class="btn-text">About</span>
            </div>
            <span class="btn-sub">Publisher + credits</span>
          </button>
        </div>
        
        <div class="menu-footer">
          <div class="avok-footer">
            <div class="avok-footer-line"><img class="avok-mark" src="avok-mark.png" alt="Avok Interactive logo" /><span>Published by Avok Interactive</span></div>
            <p class="avok-copy">Copyright © 2026 Avok Interactive. All Rights Reserved.</p>
          </div>
          <p class="menu-credits">v${GAME_VERSION} | ${PLATFORM_FOOTER}</p>
          ${IS_PC && pcAccount ? `<p class="menu-credits">Logged in as ${escapeHtml(pcAccount.username)}</p>` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Bind menu actions (the click event is threaded through so a
  // full-screen preference can be honored with a trusted click).
  rootEl.querySelectorAll('.menu-btn, .menu-small-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = (e.currentTarget as HTMLElement).dataset.action;
      handleMenuAction(action || '', e as MouseEvent);
    });
  });
  

}

// v0.108.12: honor a persisted full-screen preference, without ever
// forcing a mode. If the player prefers full-screen and is currently in
// the compact view, their own Continue/New Game click opens the
// full-screen view; the view reloads and the menu reappears there, so the
// player presses Continue once more to start in full screen. Returns true
// when it expanded (caller must NOT proceed — the reload resets state).
function maybeExpandForPreference(e: MouseEvent | undefined): boolean {
  if (!e) return false;
  if (state.settings.viewModePreference !== 'expanded') return false;
  if (viewMode === 'expanded') return false;
  try {
    if (state.player) void clientSave(state.activeSlot, state.player);
    requestExpandedMode(e, 'game');
    return true;
  } catch {
    return false;
  }
}

function handleMenuAction(action: string, e?: MouseEvent) {
  switch (action) {
    case 'continue':
      if (maybeExpandForPreference(e)) return;
      startGame();
      break;
    case 'new':
      if (maybeExpandForPreference(e)) return;
      // Force a fresh character even if an auto-save exists
      state.player = null;
      state.saveAvailable = false;
      startGame(true);
      break;
    case 'load':
      state.currentScreen = 'load';
      render();
      break;
    case 'settings':
      state.settingsReturnTo = 'main-menu';
      state.currentScreen = 'settings';
      render();
      break;
    case 'updates':
      state.updatesReturnTo = 'main-menu';
      state.currentScreen = 'updates';
      render();
      break;
    case 'leaderboard':
      state.currentScreen = 'leaderboard';
      render();
      break;
    case 'about':
      state.currentScreen = 'about';
      render();
      break;
  }
}

// ============================================
// LOAD GAME SCREEN
// ============================================

async function renderLoadScreen() {
  if (!rootEl) return;

  // v0.108.12: the SERVER is the source of truth for the slot list
  // (previously local slots only, so a server-only save was invisible
  // here). Local slots are the fallback when the server can't be reached.
  let slots = clientGetSaveSlots();
  try {
    const res = await towFetch('/api/save-slots');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.slots)) {
        slots = data.slots.map((s: any) => s.hasSave && s.player ? {
          id: String(s.slot),
          playerName: s.player.name || 'Unknown',
          city: (s.player.city || 'Unknown').replace('_', ' '),
          money: s.player.money || 0,
          lastSaved: s.player.lastSaved || 0,
          playTime: 0,
        } : {
          id: String(s.slot),
          playerName: 'Empty Slot',
          city: '-',
          money: 0,
          lastSaved: 0,
          playTime: 0,
        });
      }
    }
  } catch {
    // Server unreachable — local slots stand in.
  }
  state.saveSlots = slots;
  const loadNote = state.loadNote;
  state.loadNote = null;
  
  rootEl.innerHTML = `
    <div class="screen load-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Load Game</h2>
        <div style="width: 60px"></div>
      </div>
      ${loadNote ? `<p class="menu-warning">⚠️ ${loadNote}</p>` : ''}
      
      <div class="save-slots">
        ${slots.map(slot => slot.playerName === 'Empty Slot' ? `
          <button class="save-slot empty" data-action="new">
            <div class="slot-empty-icon">+</div>
            <div class="slot-empty-text">Empty Slot</div>
          </button>
        ` : `
          <button class="save-slot" data-slot-id="${slot.id}">
            <div class="slot-header">
              <span class="slot-name">${slot.playerName}</span>
              <span class="slot-time">${formatPlayTime(slot.playTime)}</span>
            </div>
            <div class="slot-details">
              <span>📍 ${slot.city}</span>
              <span>💰 ${fmtMoney(slot.money)}</span>
            </div>
            <div class="slot-footer">
              <span>Last played: ${formatTimeAgo(slot.lastSaved)}</span>
              <button class="delete-btn" data-delete="${slot.id}">✕</button>
            </div>
          </button>
        `).join('')}
        
        <button class="save-slot new-game-btn" data-action="new">
          <div class="slot-empty-icon">+</div>
          <div class="slot-empty-text">Start New Game</div>
        </button>
      </div>
    </div>
  `;
  
  // Bind actions
  rootEl.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      if (action === 'back') {
        state.currentScreen = 'main-menu';
        render();
      } else if (action === 'new') {
        startGame();
      }
    });
  });
  
  // Save slot clicks - load from server first, then local
  rootEl.querySelectorAll('.save-slot[data-slot-id]').forEach(el => {
    el.addEventListener('click', async (e) => {
      // Don't load if clicking delete button
      if ((e.target as HTMLElement).classList.contains('delete-btn')) return;

      const slotId = parseInt(el.getAttribute('data-slot-id') || '0', 10);
      const loadedPlayer = await clientLoad(slotId);

      if (loadedPlayer) {
        state.player = loadedPlayer;
        state.currentScreen = 'game';
        // Explicit game begin (load) — a journey starts here, never on
        // page load or on the splash probe.
        await journeyStart();
        render();
      }
    });
  });

  // Delete button handler — server delete first, so a deleted save
  // cannot resurrect via the server scan.
  rootEl.querySelectorAll('.delete-btn[data-delete]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const slotId = parseInt(el.getAttribute('data-delete') || '0', 10);
      if (confirm('Delete this save? This cannot be undone.')) {
        const result = await clientDelete(slotId);
        if (result.server && result.local) {
          renderLoadScreen();
        } else if (!result.server) {
          state.loadNote = 'Server delete failed — nothing was deleted. Check your connection and try again.';
          renderLoadScreen();
        } else {
          renderLoadScreen();
        }
      }
    });
  });
}

// ============================================
// SETTINGS SCREEN
// ============================================

function renderSettingsScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen settings-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Settings</h2>
        <div style="width: 60px"></div>
      </div>
      
      <div class="settings-list">
        <div class="settings-section-label">Display</div>
        <!-- v0.108.12: the Sound Effects / Background Music toggles are
             GONE. They had no audio code behind them anywhere — fake
             controls that reset every reload. No audio settings ship
             until real audio exists. -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Font Size</span>
            <span class="setting-desc">Text readability</span>
          </div>
          <select class="setting-select" data-setting="fontSize">
            <option value="small" ${state.settings.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${state.settings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${state.settings.fontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Theme</span>
            <span class="setting-desc">Color scheme</span>
          </div>
          <select class="setting-select" data-setting="theme">
            <option value="dark" ${state.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${state.settings.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Preferred view</span>
            <span class="setting-desc">Compact is the default. With Full-screen preferred, Continue first opens the full-screen view, then Continue again starts your game there. Never forced — you can always exit back.</span>
          </div>
          <select class="setting-select" data-setting="viewModePreference">
            <option value="inline" ${state.settings.viewModePreference === 'inline' ? 'selected' : ''}>Compact</option>
            <option value="expanded" ${state.settings.viewModePreference === 'expanded' ? 'selected' : ''}>Full-screen</option>
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Full-screen view</span>
            <span class="setting-desc">Opens the game in a larger view right now. Optional — the compact view always stays available.</span>
          </div>
          <button class="menu-btn" id="fullscreen-setting-btn">${viewMode === 'expanded' ? 'Exit full-screen' : 'Open full-screen'}</button>
        </div>
        ${IS_PC ? `
        <div class="settings-section-label">PC Account</div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">${pcAccount ? escapeHtml(pcAccount.username) : 'Not logged in'}</span>
            <span class="setting-desc">${pcAccount ? 'Your PC progress is saved to this account.' : 'Playing without an account — progress is on this device only.'}</span>
          </div>
          ${pcAccount ? '<button class="menu-btn" id="pc-logout-btn">Log out</button>' : ''}
        </div>` : ''}
      </div>
      
      <div class="settings-footer">
        <button class="menu-btn" data-action="apply">
          Apply Settings
        </button>
      </div>
    </div>
  `;
  
  // Bind actions — Back and Apply both return to the screen Settings
  // was opened from (v0.108.12 fix: they used to always land on the main
  // menu, trapping an in-game player out of their session).
  rootEl.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.getAttribute('data-action');
      if (action === 'back') {
        state.currentScreen = state.settingsReturnTo;
        render();
      } else if (action === 'apply') {
        applySettings();
        state.currentScreen = state.settingsReturnTo;
        render();
      }
    });
  });

  // PC only: log out returns to the login screen.
  rootEl.querySelector('#pc-logout-btn')?.addEventListener('click', () => {
    void pcLogout();
  });
  
  // Settings changes
  rootEl.querySelectorAll('[data-setting]').forEach(el => {
    el.addEventListener('change', (e) => {
      const setting = el.getAttribute('data-setting') as keyof typeof state.settings;
      const value = (e.target as HTMLInputElement).type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : (e.target as HTMLSelectElement).value;
      if (setting) {
        (state.settings as any)[setting] = value;
        // v0.108.13: apply + persist IMMEDIATELY. Previously a change sat
        // in memory until the footer Apply button, and Back discarded it
        // without applying or persisting — so toggling theme and tapping
        // Back visibly did nothing at all. The footer Apply button stays
        // as a harmless confirm-and-return.
        applySettings();
      }
    });
  });

  // Full-screen open/exit — same opt-in control as the game header.
  // Deliberately a button, not a persisted toggle: expansion requires a
  // live trusted click and the expanded reload resets in-memory state,
  // so a toggle could never take effect and would be a fake control.
  document.getElementById('fullscreen-setting-btn')?.addEventListener('click', (e) => {
    void onExpandButtonClick(e);
  });
}

function applySettings() {
  // Apply font size class
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${state.settings.fontSize}`);

  // Apply theme
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${state.settings.theme}`);

  // v0.108.12: settings persist (localStorage) instead of resetting on
  // every reload. The font-medium / theme-dark classes are real now too
  // (game.css rules added) instead of no-op defaults.
  persistSettings();
}

// ============================================
// UPDATE LOGS SCREEN
// ============================================


// v0.108.20 (§13): leaderboard screen — top 10 + own rank + this
// week's challenge section. Best-effort fetches: a failed fetch shows
// "unavailable", never invented names.
async function renderLeaderboardScreen() {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div class="screen updates-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Leaderboard</h2>
        <div style="width: 60px"></div>
      </div>
      <div class="updates-container">
        <div class="update-item"><p>Loading the board…</p></div>
      </div>
    </div>
  `;
  rootEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
    state.currentScreen = 'main-menu';
    render();
  });
  let challenge: any = null;
  try {
    const res2 = await towFetch(`/api/challenge?slot=${state.activeSlot}`);
    if (res2.ok) challenge = await res2.json();
  } catch { /* unavailable below */ }
  const container = rootEl.querySelector('.updates-container');
  if (!container) return;
  // v0.108.25 (§74): board tabs. Same honesty rules as before (.21
  // §59): a failed fetch shows ONLY the unavailable line — never the
  // "not ranked yet — play a command" nudge beside it. The nudge
  // appears ONLY when the board loaded, the viewer is identified, and
  // the rank is genuinely absent. An empty (loaded) board says so; it
  // is not a failed fetch. Rapid tab switches cannot show a stale
  // board (request sequence guard).
  const BOARD_TABS = [
    { id: 'lifetime', label: 'Lifetime' },
    { id: 'weekly', label: 'This week' },
    { id: 'monthly', label: 'This month' },
    { id: 'wealth', label: 'Wealth' },
    { id: 'fame', label: 'Fame' },
  ];
  let currentBoard = 'lifetime';
  let loadSeq = 0;
  const loadBoard = async (boardId: string) => {
    currentBoard = boardId;
    const section = rootEl?.querySelector('#lb-board-section');
    if (!section) return;
    const seq = ++loadSeq;
    section.innerHTML = `<div class="update-item"><p>Loading the board…</p></div>`;
    let b: any = null;
    try {
      const res = await towFetch(`/api/leaderboard?board=${boardId}`);
      if (res.ok) b = await res.json();
    } catch { /* unavailable below */ }
    if (seq !== loadSeq) return;
    const unavailable = !b || b.unavailable;
    const title = b?.label ?? BOARD_TABS.find((t) => t.id === boardId)?.label ?? 'Leaderboard';
    const fmt = (s: number) => b?.money
      ? `$${Number(s ?? 0).toLocaleString()}`
      : `${Number(s ?? 0).toLocaleString()} ${b?.scoreLabel ?? 'XP'}`;
    const topLines = unavailable
      ? '<li>The board is unavailable right now — try again shortly.</li>'
      : b.top?.length
        ? b.top.map((e: any) => `<li>#${e.rank} ${escapeHtml(e.username)} — ${fmt(e.score ?? e.xp)}</li>`).join('')
        : boardId === 'lifetime'
          ? '<li>No ranked players yet — be the first.</li>'
          : `<li>No ranked players yet on the ${escapeHtml(title)} board.</li>`;
    const meLine = unavailable || !b.identified
      ? ''
      : b.me
        ? `<p>Your rank: <strong>#${b.me.rank}</strong> (${fmt(b.me.score ?? b.me.xp)})</p>`
        : '<p>You are not ranked yet — play a command and you will appear.</p>';
    section.innerHTML = `
      <div class="update-item">
        <span class="update-version">Top 10 — ${escapeHtml(title)}</span>
        <ul>${topLines}</ul>
        ${meLine}
      </div>`;
    rootEl?.querySelectorAll('[data-lb-board]').forEach((btn) => {
      (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.lbBoard === currentBoard);
    });
  };
  const chSection = challenge && !challenge.unavailable
    ? `<div class="update-item">
        <span class="update-version">Community Challenge</span>
        <p>${escapeHtml(challenge.goal?.label ?? 'This week')} — community total: ${(challenge.total ?? 0).toLocaleString()}</p>
        <ul>${(challenge.top ?? []).map((t: any) => `<li>${escapeHtml(t.username)} — ${t.contribution.toLocaleString()}</li>`).join('') || '<li>No contributions yet this week.</li>'}</ul>
      </div>`
    : `<div class="update-item">
        <span class="update-version">Community Challenge</span>
        <p>Challenge data is unavailable right now — try again shortly.</p>
      </div>`;
  container.innerHTML = `
    ${IS_PC ? `<div class="update-item"><p id="lb-online-count">${escapeHtml(pcOnlineLine())}</p></div>` : ''}
    <div class="lb-tabs">${BOARD_TABS.map((t) => `<button class="lb-tab" data-lb-board="${t.id}">${t.label}</button>`).join('')}</div>
    <div id="lb-board-section"><div class="update-item"><p>Loading the board…</p></div></div>
    ${chSection}
  `;
  container.querySelectorAll('[data-lb-board]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.lbBoard;
      if (id) void loadBoard(id);
    });
  });
  void loadBoard('lifetime');
}

// v0.108.25 (§76): About/credits screen — studio surface only. Same
// mark + credit + notice as the main menu footer and the `about`
// command. Never replaces the game's own art anywhere.
function renderAboutScreen() {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div class="screen updates-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>About</h2>
        <div style="width: 60px"></div>
      </div>
      <div class="updates-container">
        <div class="update-item">
          <div class="avok-footer">
            <img class="avok-about-mark" src="avok-mark.png" alt="Avok Interactive logo" />
            <p><strong>THE OPEN WORLD</strong></p>
            <p>Published by Avok Interactive</p>
            <p class="avok-copy">Copyright © 2026 Avok Interactive. All Rights Reserved.</p>
          </div>
          <p>A text life simulation game on Reddit — build a life, city by city, choice by choice.</p>
          <p>Version v${GAME_VERSION}</p>
        </div>
      </div>
    </div>
  `;
  rootEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
    state.currentScreen = 'main-menu';
    render();
  });
}

// v0.108.27: Update Logs version index — collapsed latest-10 + grouped
// Show-all. The index is generated from UPDATE_INDEX_VERSIONS (shared
// module, single source of truth) instead of a hardcoded flat wall, so
// order is numeric (no v0.101.0-after-v0.99.3 jumble) and every button
// maps to a real entry card. Toggle re-renders ONLY the index container,
// so entry open states and scroll position survive the toggle.
let updatesIndexExpanded = false;

function renderUpdatesIndexHTML(): string {
  const btn = (v: string): string =>
    `<button class="update-index-btn" data-action="goto-update" data-version="${updateTargetId(v)}">${v}</button>`;
  if (!updatesIndexExpanded) {
    const latest = collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10);
    return `<span class="updates-index-label">Jump to a version:</span> ${latest.map(btn).join(' ')} <button class="update-index-btn updates-index-toggle" data-action="toggle-updates-index">Show all versions</button>`;
  }
  const groups = groupIndexVersions(UPDATE_INDEX_VERSIONS);
  const groupsHtml = groups
    .map(
      (g) =>
        `<div class="updates-index-group"><div class="updates-index-group-header">${g.family}</div><div class="updates-index-group-row">${g.versions.map(btn).join(' ')}</div></div>`,
    )
    .join('');
  return `<span class="updates-index-label">Jump to a version:</span> <button class="update-index-btn updates-index-toggle" data-action="toggle-updates-index">Show fewer</button>${groupsHtml}<button class="update-index-btn updates-index-toggle" data-action="toggle-updates-index">Show fewer</button>`;
}

function bindUpdatesIndex(container: Element): void {
  container.querySelectorAll('[data-action="goto-update"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-version');
      const card = id && rootEl ? rootEl.querySelector(`#${id}`) : null;
      if (card) {
        (card as HTMLDetailsElement).open = true;
        card.scrollIntoView({ block: 'start' });
      }
    });
  });
  container.querySelectorAll('[data-action="toggle-updates-index"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updatesIndexExpanded = !updatesIndexExpanded;
      const idx = (btn as Element).closest('.updates-index');
      if (idx) {
        idx.innerHTML = renderUpdatesIndexHTML();
        bindUpdatesIndex(idx);
      }
    });
  });
}

function renderUpdatesScreen() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen updates-screen">
      <div class="screen-header">
        <button class="back-btn" data-action="back">← Back</button>
        <h2>Update Logs</h2>
        <div style="width: 60px"></div>
      </div>
      
              <div class="updates-container">
        <div class="updates-index" id="updates-index">${renderUpdatesIndexHTML()}</div>
        <details class="update-details" id="update-v0-108-29" open>
          <summary class="update-summary"><span>v0.108.29</span><span>November 12, 2026</span> <span class="update-latest">Latest</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.29</span>
          <span class="update-date">November 12, 2026</span>
          <ul>
            <li>📈 <strong>"invest all" works now.</strong> "invest all into google" used to die with a bare "Invalid amount" because the amount had to be a number. Now "all" invests all your available cash: "invest all into [name]", "invest all [name]", or "invest [name] all". The minimums still apply, so "all" into something you can't afford refuses plainly instead of investing nothing.</li>
            <li>📬 <strong>Read mail by number.</strong> Mail ids are long machine strings, and a player asked how to find one at all. Now "mail read [n]" opens the nth item in the order "mail" lists them (1 = the first item), and "read mail [n]" works the same way. Reading by id still works exactly as before.</li>
            <li>📋 <strong>Behind the scenes: your progress is now verifiable.</strong> The server records what enroll, study, invest, exam, graduate, and sleep actually did — enrolled course, hours advanced, positions opened and their values — so progression can be confirmed from the server logs instead of only from command receipts. Nothing changes in how you play.</li>
          </ul>
</div>
        <details class="update-details" id="update-v0-108-28">
          <summary class="update-summary"><span>v0.108.28</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.28</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>📬 <strong>FIX: "mail" finally lists your mail.</strong> It used to show only counts by kind, with no way to actually check your mail from the mail side. Now "mail" lists every item — id, kind, sender, subject, and read/unread state — grouped by kind (letters, bills, notices, packages) with accurate unread counts, and "mail [letters|bills|notices|packages]" filters to one kind. An empty mailbox says so plainly. "mail read [id]" (or "read mail [id]") opens one item in full and marks it read; an unknown id refuses with usage and a pointer back to "mail". Your email inbox ("emails", "read [id]", compose, delete) is unchanged — mail and email read the same items, from either side.</li>
            <li>📬 <strong>Quick bar: Mail joins the bar.</strong> The order is now Status, Home, Work, Sleep, Explore, Talk, Goals, Journal, Quests, Skills, Achievements, Bank, Property, Businesses, Investments, Vehicles, People, Phone, Mail, Factions, Help (21 buttons). It works mid-conversation like the other buttons, and the bar still scrolls.</li>
          </ul>
</div>
        <details class="update-details" id="update-v0-108-27">
          <summary class="update-summary"><span>v0.108.27</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.27</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>🗂️ <strong>Update Logs index, organized.</strong> "Jump to a version" no longer renders every version as one flat wall of buttons: it now shows the latest 10 versions plus a "Show all versions" toggle. The expanded view groups versions by family (v0.108.x, v0.107.x, v0.104.x, and so on) with a header per family, newest family first and newest version first inside each family — so the old jumble (v0.101.0 after v0.99.3) is gone. "Show fewer" collapses back to the latest 10. Jumping to any version still opens its entry, the latest entry is still open by default, and no changelog content changed.</li>
          </ul>
</div>
        
<details class="update-details" id="update-v0-108-26">
          <summary class="update-summary"><span>v0.108.26</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.26</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>💼 <strong>Deeper working activities.</strong> Your workday has more to do than just "work": "task" shows today's assigned shift task and "task complete" finishes it (1h, −5 energy, +$25, +10 job-skill XP); "mentor [name]" coaches a coworker; "meeting" is the team meeting; "breakroom" recovers energy; "report" files a shift report; "cover [name]" covers a coworker's shift (4h base pay). Each activity runs once per game-day and refuses cleanly without a job, while incarcerated, or short on energy.</li>
            <li>🚓 <strong>Emergency-track activities — police, fire, and EMS finally have things to do.</strong> Police get "patrol", fire gets "drill", EMS gets "respond" (2h, −10 energy, +$30, +10 skill XP each, once per game-day); all three tracks get "training" (+15 skill XP) and "ridealong" (+5 XP, +2 happiness). On emergency tracks, "report" files an incident report. Cadet and every rung above it qualify — no more plain shifts.</li>
            <li>🌙 <strong>Deeper shifts.</strong> Three new one-shot shifts: "weekend" (+15% pay, Sat/Sun only), "split" (normal pay, less energy, +3 happiness), and "on-call" (+10% pay, stress instead of energy as the cost). "shift prefer [shift|none]" sets a persistent preference used whenever no one-shot shift is set. Three night shifts in a row now bring night-shift fatigue (extra energy and stress) — the existing exhaustion rule is still the only health cost.</li>
            <li>📋 <strong>FIX: entry jobs are visible in "apply" again.</strong> The listing used to sort highest-rank-first and cut off at 15, so entry jobs like Police Cadet never displayed even in Memphis. Listings now show entry jobs first. Hiring rules, job data, and pay are unchanged, and hiring by name ("apply police cadet") still works.</li>
            <li>🏡😴 <strong>Quick bar: Home and Sleep join the bar.</strong> The order is now Status, Home, Work, Sleep, Explore, Talk, then the rest unchanged (20 buttons). Both work mid-conversation like the other buttons, in compact and expanded modes, and the bar still scrolls.</li>
          </ul>
</div>
        <details class="update-details" id="update-v0-108-25">
          <summary class="update-summary"><span>v0.108.25</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.25</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>🏆 <strong>Leaderboard revamp — five boards, not one.</strong> "leaderboard [lifetime|weekly|monthly|wealth|fame]" shows that board's top 10 + your rank on it (bare "leaderboard" is still lifetime XP). Weekly and monthly rank XP gained in that real week/month; wealth ranks net worth; fame ranks your fame score. The Leaderboard screen has tabs for all five. Every entry is a real recorded player — empty boards say so, never invented names.</li>
            <li>📐 <strong>FIX: menus too large for the Reddit frame.</strong> The main menu and the pause (game) menu now fit the compact/inline frame — viewport-constrained height with internal scrolling and tighter padding — so nothing is cut off and nothing forces the frame to grow. Expanded/full-screen menus are unchanged.</li>
            <li>🎮 <strong>Avok Interactive branding — publisher credit + copyright.</strong> The Avok Interactive mark, publisher credit, and "Copyright © 2026 Avok Interactive. All Rights Reserved." now appear on the loading screen, the main menu footer, and a new About screen (main menu → About; also the "about" command). Studio surfaces only — the game's own art, icon, and banners are untouched.</li>
          </ul>
</div>
        <details class="update-details" id="update-v0-108-24">
          <summary class="update-summary"><span>v0.108.24</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.24</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>📖 <strong>Help wording cleanup — same commands, tighter words.</strong> Every help entry across all 12 sections was reworded for uniform formatting, tight descriptions, and no stale lines — same meaning, zero bullets cut (289 kept, plus new bullets for the commands below).</li>
            <li>🪪 <strong>Identification — carry your papers.</strong> "id" shows what you hold; "id [card|license|passport]" buys one (card $35, license $75, passport $150; renewals $25/$50/$110). IDs are perks only — never gates: card 10% off municipal fees, license 20% off road-trip fuel ($12 when no §31 permit), passport 15% off routed international fares.</li>
            <li>📋 <strong>Criminal records — your record, computed.</strong> "record" now shows tier (clean/minor/serious), numbered entries, fines, open cases, and what it means for NEW applications. "lawyer expunge [n]" removes a minor entry for $500 after 12 clean game-months with no newer offense — serious offenses and dateless legacy entries stay.</li>
            <li>🚉 <strong>Transit — bus, train, and flights as real choices.</strong> "transit [city]" compares fares, times, and stations (bus cheapest/slowest, train middle, airport fastest/priciest, flights only between the 15 airport cities). Book with "travel [city] by [bus|train|airport]". "stations" lists your city's stations; "transit pass" ($30/week) takes 20% off routed bus/drive fares.</li>
            <li>🌤️ <strong>Weather — deeper days.</strong> Four new conditions (foggy, snowy, windy, humid) now actually occur by season. "weather" shows current conditions plus work/travel/mood/event effects; "forecast" gives a 3-day outlook (today exact, next days as chance bands). Severe weather (stormy/snowy) adds +1h to routed travel and, once per severe day, −2 happiness and −1 property condition where you travel from.</li>
            <li>🚓 <strong>Emergency careers — full ladders.</strong> "careers [police|fire|ems]" shows the whole ladder (Police Cadet→Chief, Fire Probationary→Fire Chief, EMT→Director) with requirements and pay; "advance" moves you up when you meet the next rung's cert, skill, shift, and GPA gates.</li>
            <li>🕐 <strong>Time &amp; 24-hour life — days that feel different.</strong> "time" and "day" show the clock, period, and what's open or active now; "wait [hours]" passes 1–8 hours with no stat change. Night-band sleep (starting 9 PM–5 AM) recovers better (+5 happiness).</li>
            <li>📰 <strong>News categories — the paper, by section.</strong> "news [celebrity|crime|stocks|sports|politics|city|world]" filters the paper from real state only — celebrity is the game's own notable/elite roster, politics is the game's own offices, city is each city's happenings. Empty categories say so; nothing is invented.</li>
            <li>📱 <strong>Social media — your own feed.</strong> "post [visit|work|milestone|home]" posts a template update (no free text, honest 0 likes); "follow [name]" / "unfollow [name]" / "following" manage roster follows; "social" now leads with your posts and followed posts.</li>
            <li>💬 <strong>Phone messages — the read-state bug, fixed.</strong> Viewing "messages" now marks shown texts read, like mail. "read message [id]" (or "message [id]") opens one text and marks only it read; "threads" groups conversations by contact; "thread [name]" opens one conversation; "delete message [id]" deletes one.</li>
            <li>🏆 <strong>Pro sports &amp; college careers — new ladders.</strong> "sports" lists four fictional leagues (Mid-South Basketball, Delta Gridiron, River Valley Soccer, Delta Diamond); "tryout [sport]" signs the rookie deal on a pass (salaries $42k–$120k/yr by rank). "tryout college [sport]" joins a college team (enrollment + GPA ≥ 2.0, no salary). "contract" and "season" track your deal and year; "college" lists academic + campus tracks (tutoring, research, activities, wellness) gated on real enrollment, certs, and GPA.</li>
          </ul>
</div>
        <details class="update-details" id="update-v0-108-23">
          <summary class="update-summary"><span>v0.108.23</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.23</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>🧳 <strong>Travel expansion — your trips now have a memory.</strong> "trips" is a journal of every trip (total trips, fares paid, visits per city, your most-visited city). "journey [city]" previews a trip before you pay — fare, time, method, districts, this week's events there, listings on the market — without booking anything. And "souvenir [city]" buys a $25 keepsake where you stand, once per city, tracked in "souvenirs" (27 to collect).</li>
            <li>🏠 <strong>Properties expansion — run your rentals like a landlord.</strong> "tenants" shows occupancy, a tenant name, rent, and lease status for every property (tenant names are display-only, never NPCs). "open house [property]" ($50, 2h) guarantees next month occupied at full rent. "lease [property]" signs a 3-month lease at 90% rent, guaranteed occupied. "break lease [property]" ends one early for $100.</li>
            <li>🌅 <strong>Living your home expansion — home feels lived-in now.</strong> "myhome" is your home screen: primary residence, comfort tier, household, your last sleep's recovery, and today's home routines. "morning" (1h, energy +5, happiness +2) and "evening" (2h, happiness +4, energy −5) are daily routines at home — they need a property in the city you're in, once each per game-day. "household" lists who lives with you and the effects that already follow from household size.</li>
            <li>📖 <strong>Help bodies, presented properly.</strong> Help sections keep every command, but each entry is now its own card — command token distinct from its description, clear separation, readable spacing — in both dark and light themes, compact and expanded. No help text was cut and no command was dropped.</li>
          </ul>
</div>
        </details>
        <details class="update-details" id="update-v0-108-22">
          <summary class="update-summary"><span>v0.108.22</span><span>November 2, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.22</span>
          <span class="update-date">November 2, 2026</span>
          <ul>
            <li>💾 <strong>FIX: the "not applied" banner could lie — and getting you to retry could double-apply.</strong> The command path now returns its server stamp and write sequence, and the client adopts them BEFORE autosaving, closing the loop that made ordinary pauses look stale. An autosave re-sync now says "your last command is safe" when the server copy IS that command's save; a genuinely newer server copy keeps the cautious "not applied" wording; and a stale hit from another session names it ("Another session has a newer copy") instead of just "try it again".</li>
            <li>💾 <strong>FIX: commands can no longer silently overwrite each other.</strong> Sends now serialize — the input locks while a command and its autosave settle — and every save carries a write sequence, so the server rejects an older write even inside the old 5-second tolerance window instead of last-writer-winning your progress away.</li>
            <li>🏆 <strong>FIX: leaderboard and challenges actually record now.</strong> The store calls used the wrong shapes for the real adapter (an array where a single object belongs, strings where objects come back) — so ranks computed as -1 forever and one failed write killed the other channel. Both are fixed, outside-top-10 ranks come from a single score lookup instead of a full scan, contributions increment atomically, and recording no longer depends on the save succeeding: it runs whenever your command was applied, with each channel retrying on its own.</li>
            <li>💾 <strong>FIX: a server outage can no longer eat your whole save.</strong> A storage error is now distinct from "no save" at every step — the load screen, Continue, and the slot scan all show an error screen instead of falling through to character creation, and creating into an occupied slot now asks you to confirm first (the old save is backed up on the server before any confirmed overwrite).</li>
            <li>💾 <strong>FIX: Continue resumes your newest slot even when the menu probe times out</strong> (it used to fall back to slot 1 alone and orphan a newer slot-2/3 game), and "Use server copy" now confirms first, backs up your device copy, and loads the newest server slot instead of the active slot only.</li>
            <li>💾 <strong>FIX: switching apps no longer manufactures a stale rejection.</strong> Hiding the tab now flushes locally only (the old hidden-tab server beacon advanced the server stamp without ever adopting it); coming back re-fetches the server stamp so your next command is not stale.</li>
            <li>🤝 <strong>FIX: trades keep their 90-day save lifetime</strong> (direct writes used to drop it), bump the write sequence, leave the sender a one-shot notice on their next command, and record both players on the leaderboard.</li>
            <li>📈 <strong>FIX: folded stock lines reprice from the live market price</strong> instead of summing values computed at different ticks, so a merged line's profit no longer drifts until the next tick.</li>
            <li>💾 <strong>FIX: saves prefer server stamps at load time</strong> — a device clock running ahead can no longer let stale local content win and migrate over newer server progress. A device clock behind the server clock shows a skew note on the menu, and any local copy set aside by a server-wins load is backed up first, never destroyed.</li>
            <li>🛡️ <strong>Hardening across the save system:</strong> request bodies share the 512KB limit on every route and malformed bodies report as payload problems (never misread as storage failure); challenge, username-index, and trade keys now expire instead of accumulating forever; save slots are validated and identity-less saves are rejected; a no-command request returns an explicit no-player shape instead of a blank character a caller could autosave over a real save; and the slot scan returns the newest save, not the first one found. Playing in two subs still shares one game by design — but a stale hit from the other session now says so.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-21">
          <summary class="update-summary"><span>v0.108.21</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.21</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>💾 <strong>FIX: "Server save failed" no longer hides behind one generic warning.</strong> Saves now fail by name — stale copy, unreachable server, server storage, or oversize save — each with its own message, an automatic retry on transient failures, and two buttons on the warning itself: "Retry save" and "Use server copy". A device clock that drifts from server time can no longer block your saves, and a stale command is re-run once on the fresh copy instead of being lost. A rejected write still never overwrites a newer save.</li>
            <li>📈 <strong>FIX: investment positions fold, they don't duplicate.</strong> Buying more of an asset you already own adds to that one line (invested, shares, and value summed; totals unchanged by the merge itself). Old doubled screens — two Bitcoin lines, two Ethereum lines — fold into one line automatically on load, with totals preserved exactly. Partial sells ("sell investment [name] [amount]") now work on the merged position; selling all removes the single line. World-stock positions fold the same way.</li>
            <li>📬 <strong>Texts &amp; voicemails persist now.</strong> SMS and voicemails survive save → quit → reload exactly like mail — same ids, no duplicates on reload. New: "voicemails" lists them (sender, transcript, listened state); listing them marks them listened — the list IS the listen action.</li>
            <li>📈 <strong>Stock dividends</strong> — every stock holding pays 0.25% per game-month on its computed price × shares, itemized in the monthly tick and paid into cash as taxable income. See "dividends" for each holding's monthly amount, last payout, and next-payout note; "investments" and "stock [name]" show the terms too. Mid-month buys qualify at the next tick; sold shares stop paying the month after sale. No margin, no shorting, no options — that exclusion stands.</li>
            <li>🏢 <strong>Found &amp; run your own company</strong> — the arc completes: own a small business, climb inside a company, now found one. "found [name]" ($5,000 cash-only; "found [name] in [industry]" for a specific industry) sets HQ in your current city. "mycompanies" shows your companies; "company hire/fire/close [company] [npc]" runs them (max 5 employees, $100/mo wage each). Monthly revenue scales with headcount and performance (Thriving/Steady/Struggling), expenses are wages + $100 overhead, losses first drain cash then become company debt — and two consecutive months over $2,000 in debt closes the company (employees released, debt dies with it, founding cost lost). Voluntary close costs nothing and pays nothing.</li>
            <li>🏠 <strong>The market index reprices what you own now, transparently.</strong> In-flight listings on "real-estate" show index-adjusted prices (catalog × today's index) and buys charge exactly the price shown. Owned properties reprice each monthly tick by their city's index move — and EVERY move gets its own tick line (old price, new price, index move, city) plus a "repricing" screen listing each property's last move. Flat-index months produce no line. Mortgages, rent, and condition never move with a repricing; selling realizes the repriced value.</li>
            <li>👥 <strong>Six thin cities filled in</strong> — Las Vegas, Seattle, Phoenix, Philadelphia, Detroit, and Charlotte each gain 4 new residents (24 total), so "people" there returns a real group instead of one person. All are ordinary fictional people in real districts, and every city in the all-27 sweep stays non-empty.</li>
            <li>⚖️ <strong>Unpaid fees escalate fairly — warnings first, always announced.</strong> Annual fees ($40/registered vehicle, $25/property) still gain the $10 late fee past 2 months; then a warning at +3 months and a FINAL warning at +4 (each a notice + tick line naming the exact amount, the deadline, and the ways out), and only at +5 months does the city act: exactly ONE asset seized (cheapest vehicle first, else cheapest property that is not your primary residence; its value is applied to the debt, never more than owed; the next seizure waits 2 months) — or, only when you hold no seizable asset, a short bounded 3-day arrest with no criminal record, no arrests count, and no parole tail. Your job, primary residence, businesses, and bank balance are never seized. At every stage: "pay fees all" clears it, "pay fees [amount]" (ANY partial payment restarts the warning clock from that month), or "fees plan" (3 monthly installments, ladder frozen while active, a missed installment breaks it with NO penalty fee). While serving a fee arrest, "fees", "pay fees", and "withdraw" stay open so you can pay your way out immediately. See "fees" for your stage, next deadline, what would be seized first, and the ways out.</li>
            <li>📰 <strong>News ticker redesign: it scrolls now.</strong> The strip between the stats HUD and the chat area is a continuous scrolling marquee (hover to pause) cycling the FULL pool of 100+ generated headlines — world events, per-city economy + patrol, stock moves, market indices, your businesses, properties, holdings, job, office, and court activity, milestones, season + next holiday, the weekly challenge goal, current-city weather, and the community top 3 — every headline traced to a real game-state fact, never invented. "ticker local / world / off" still toggles it, and the mode still persists through save/load. (The scrolling itself is a visual: judge it in play.)</li>
            <li>📰 <strong>Ticker label fix:</strong> the strip label now reads "Local news" / "World news" (capitalized, full phrase) instead of bare LOCAL / WORLD, and the switch confirmation and status output use the same wording. The underlying local/world behavior is unchanged.</li>
            <li>📖 <strong>PRESENTATION FIX: Help and What's New reorganized.</strong> Help is now 12 sections by system (Getting Started, Money &amp; Bank, Work &amp; Careers, Home &amp; Property, Life &amp; Family, World &amp; Travel, Government &amp; Law, Business &amp; Companies, Education &amp; Self, Community &amp; Social, Info &amp; Time, Dialogue) with a section index at the top — "help [section]" jumps straight to one section, "help [word]" filters to matching commands, and bare "help" still shows everything. No command was dropped and no help text was cut. What's New now opens with a version index that jumps to any version; the latest entry is fully shown and older entries are collapsed cards. Every older entry's content is preserved exactly as written — only the structure changed.</li>
            <li>🏆 <strong>FIX: leaderboard and challenge writes, plus honest messages.</strong> Leaderboard and challenge recording runs after every successfully saved command — and because saves themselves failed, those writes were silently skipped too; the save fix restores them, and a recording failure now shows up in the server log instead of vanishing silently. The Leaderboard screen no longer pairs "board unavailable" with "you are not ranked yet — play a command": the not-ranked nudge appears ONLY when the board loaded and you genuinely have no rank, an empty board says "No ranked players yet", and an unavailable challenge says so explicitly instead of showing a zero total.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-20">
          <summary class="update-summary"><span>v0.108.20</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.20</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>🛠️ <strong>FIX (P0): bought businesses (and all other progress) could vanish after leaving and coming back — saves now keep the newest copy, on every slot, and a stale save can no longer overwrite a newer one.</strong> If your device holds a fresher save than the server, the game recovers it and tells you so; Continue resumes your newest slot, not slot 1; and a delayed or stale write is rejected instead of clobbering your progress.</li>
            <li>🏠 <strong>FIX (P0): property buying works in the starting city now — West Memphis listings were visible but unbuyable because the buy list never included them.</strong> Display and buy now use the same listings everywhere; "buy property" also accepts any casing ("Mortgage"/"CASH"), bracket-wrapped names copied from help, and prefers your current city's listing on ties. Down payments stay cash-only — and every affordability error now says so, shows your bank balance, and points at "withdraw" to move bank money to cash.</li>
            <li>🧾 <strong>IRS Taxes</strong> — "tax" shows your standing, "file taxes" pays in full, "tax plan" splits it into 3 monthly installments (no interest; a missed installment breaks the plan with a 5% penalty). Standard deduction $12,000; 10%/15%/25% brackets; late penalties past the deadline.</li>
            <li>⚖️ <strong>Court &amp; Police</strong> — every citation opens a case ("cases", "case [id]"); "lawyer defend [id]" contests one for $250 (dismissed, reduced, or upheld). "police" shows heat, investigations, and patrol level; investigations open at heat 50/80 and close below 30.</li>
            <li>🎓 <strong>College Life</strong> — one new course per school, plus "degrees" (credentials + next-credential hint) and "campus" life: study groups and club socials.</li>
            <li>💍 <strong>Family</strong> — "propose [name]" at Partner tier, "family", "welcome child [name]", and "family activity [movie|picnic|dinner]". Anniversaries and birthdays land every year crossing.</li>
            <li>🏛️ <strong>Government Tiers</strong> — "government state" and "government federal" surface real state and federal openings; "civic" shows your civic title from community reputation.</li>
            <li>📅 <strong>Calendar &amp; Years</strong> — one clock from 2024: "calendar" (season, age + life stage, next holiday, tax deadline) and "years" (year-by-year earned/spent/cities/shifts/achievements). You start at 18 and age each year crossing.</li>
            <li>🛵 <strong>Gigs &amp; Overtime</strong> — "gigs" and "gig [delivery|rideshare|freelance]" side work, plus "overtime" (1.5× pay, counts for tenure) and "overtime [hours]" (1–4 hrs per call, caps 4/day and 12/week, taxed like work pay). Work-milestone titles appear in "career".</li>
            <li>💰 <strong>Money &amp; Bank</strong> — "savings" goals (trackers in your bank balance, 0.5%/month), "savings deposit", "loans" (credit 50–100 sets your cap up to $6,000, 2%/month), "loan pay". Credit moves only with loan/tax-plan payment behavior.</li>
            <li>🧱 <strong>Life Hard Mode (opt-in, off by default)</strong> — "hardmode on/off", "bills", "bills pay". Living costs at 1.5× plus asset lines; shortfalls become hard debt (never arrest, never seizure).</li>
            <li>🏠 <strong>Living Expenses</strong> — "living" (alias "expenses") breaks down housing, food, utilities, and transport every month, scaled by your city's economy, with a 2-tick grace period, shortfall forgiveness in normal mode, and warnings before you run dry.</li>
            <li>🎭 <strong>Character &amp; Starts</strong> — four new backgrounds, an optional trait at creation (Hustle pays +20% gig pay), a start-city select covering all 27 cities, and "name [first name]" renames. "go home" now heads to your primary residence first, then your first property's city, then your start city.</li>
            <li>🏆 <strong>Leaderboard</strong> — a new main-menu Leaderboard row (top 10 by lifetime XP + your rank + this week's challenge), plus your rank line on "status".</li>
            <li>🕊️ <strong>Legacy</strong> — "retire" previews, "retire confirm" archives a life and starts fresh (keeping only your legacy), "legacy" shows past lives and the next bonus (up to +$500).</li>
            <li>🏆 <strong>Community Challenges</strong> — one shared goal per game-week per community ("challenge"); hit the participation threshold and collect +$75 at the rollover.</li>
            <li>📰 <strong>Newspaper</strong> — "news" is a dated daily feed built only from real state: world events, your investments, milestones, and the week's challenge.</li>
            <li>🎄 <strong>Seasons &amp; Holidays</strong> — real-calendar holidays and season starts; holiday weeks label events and pay +5 happiness and +$25 on attendance. Summer prefers beach/outdoor events, winter prefers markets/fairs.</li>
            <li>🤝 <strong>Player Trading</strong> — "trade offer/list/accept/decline/cancel" for inventory items (price 0 = gift). Offers expire in 7 days, max 3 open, 1 completed trade per hour, item value cap $5,000 — and accepts re-validate the live save so nothing duplicates.</li>
            <li>🏢 <strong>Deeper Working</strong> — "workplace" (today's deterministic event: team lunch, deadline week, review day, quiet day), "shift [morning|evening|night]" (evening +10%, night +20% with stress), "coworkers", and "lunch [name]" with a coworker.</li>
            <li>🏙️ <strong>Deeper Citizen</strong> — "citizens" shows who's actually scheduled in your district right now, plus crowd activity and district needs as words; "volunteer" gives back (+5 community reputation).</li>
            <li>⭐ <strong>Fame &amp; Wealth</strong> — "fame" scores you from live progress (achievements, wealth tiers, executive tier, passport milestones, challenge payouts). At 50+ galas appear in "events" ($10 entry, +$100 appearance pay, once a week); at 75+ elite circles notice you.</li>
            <li>🏢 <strong>Companies</strong> — "companies" and "company [name]" turn real jobs-database employers into observable world entities (industry, HQ, size, deterministic monthly performance, revenue figure). Reach executive tier there for a $0–$200/month profit-share.</li>
            <li>📈 <strong>World Stock</strong> — "stocks", "stock [name]", "buy stock [name] [amount]", "sell stock [name] [amount|all]", "index". Prices recompute deterministically per month (clamped ±5%/month); no margin, no shorting, no dividends yet. Losses are real.</li>
            <li>👥 <strong>Business Staff</strong> — "hire/fire/staff/raise": hire roster NPCs at your businesses (slots by type), pay proportional wages in the tick, manage morale (paid on time +5, short −15, quit at 0). Staffed income = base × (1 + 0.3 × staff) × morale multiplier − wages.</li>
            <li>💬 <strong>Dialogue Topics (template-only)</strong> — mid-conversation "topics" and "ask [topic]" (tier-gated from real NPC data, mood/trait variants, memory callbacks from your own history only, +2 relationship per topic capped at +10 per conversation). No AI replies are promised anywhere — the dialogue path stays template-only.</li>
            <li>👋 <strong>Greetings</strong> — "greet [name] [warm|respectful|playful|cool]" with deterministic lines keyed by time, tier, mood, district activity, and shared memory. Effects apply at most once per NPC per game-day (repeats show "already greeted today").</li>
            <li>🏙️ <strong>FIX: West Memphis has people now — the starting city finally has residents to meet, talk to, and befriend.</strong> Eight new residents across Broadway, Mississippi Park, and Meadowlake.</li>
            <li>📬 <strong>FIX: Mail reads work the natural way now — "read [id]" opens a message, and your inbox survives leaving and coming back.</strong> Mail kinds (letter, bill, notice, package) show as icons in "emails".</li>
            <li>📦 <strong>Mail &amp; Delivery</strong> — "mail", "packages", "track [id]", "send package [npc] [item]" ($5 postage, 1 game-day delivery, +5 relationship on arrival), "claim package [id]" (gifts at relationship tiers 50/75/90), courier jobs ("deliver [id]", $40/$60 by district), and "pay bill [id]" (hard-mode shortfall bills only).</li>
            <li>🏛️ <strong>Citizen Services</strong> — "services" is the citizen counter: "permits" (business license +5% business income, driver's license $10 roadtrip fuel, food handler +2 cook energy), "fees" ($40/registered vehicle, $25/property per year, "pay fees"), "benefits" ($200/month, means-tested), "register voter" (+5 reputation), "records", "utilities".</li>
            <li>🛍️ <strong>Routines</strong> — "stores" (shopping districts derived from real district data — no stores, no invention), "shop [good]" (groceries, clothing, household goods as effects; package goods into inventory), "commercial", "stroll [district]", and once-a-day "errands", "chores" (needs a property), and "selfcare" — each with real time, energy, and stat effects.</li>
            <li>🏠 <strong>Housing Depth</strong> — "housing" (tenure per property: outright, mortgaged with payment/term/arrears, or renting), "mortgage [property]", "pay mortgage [property] [amount]" ($100+ extra cuts balance and term; full payoff clears the loan), "set home [property]" (primary residence — go home heads here first), "move [property]", and "housing market [city?]" (deterministic per-city index). Missed mortgage payments count consecutively: warnings at 3 and 5, foreclosure at 6. No new monthly housing charge — the §32 living line stands; household comfort moves happiness/stress on the tick instead.</li>
            <li>📜 <strong>Will &amp; Estate</strong> — "will", "will heir [npc|community]", "will bequeath [cash|properties|businesses|vehicles] [heir]". There is NO death mechanic: the will executes only when you retire, distributing the estate (bank + property values + business values + vehicle values) and recording the distribution in your legacy record, with a bonus inside the §14 $500 cap (+$50 per asset class bequeathed, +$50 for a family heir).</li>
            <li>🛡️ <strong>Insurance</strong> — "insurance", "insure [type] [target?]", "uninsure", "claim [type] [target?]" (health $30/mo, property $25/mo, vehicle $20/mo, business $40/mo; missed premiums lapse + notice). Claims need a verified loss and pay 80% capped (property $500, vehicle $300, business $400); health is a flat $150 benefit + health +10 below 50 health, honestly a benefit, not a reimbursement.</li>
            <li>💼 <strong>Hourly Overtime</strong> — see Gigs &amp; Overtime above: "overtime [hours]" at 1.5× your hourly rate with hard daily/weekly caps.</li>
            <li>🏛️ <strong>Offices: Mayor, Governor, President</strong> — the REAL institutions with the REAL process, each office earned through its own full cycle: eligibility gates, "file [office]" (Mayor $250, Governor $1,000, President $5,000), "campaign [rally|canvass|ad]" minimums, deterministic "election" (strictly beat both rivals), 48-month terms with taxed salaries, one "decide [option]" per month, "resign" (no credit), and reelection as a full new cycle. Offices are filled by the game's own roster people — no real politicians' names anywhere. "gov jobs" lists entity jobs (City Hall, State Capitol, Federal Agency, Courts, Legislature) holdable via "apply".</li>
            <li>💼 <strong>Careers &amp; College Linkage</strong> — "careers" shows six ladders (Retail, Trades, Healthcare support, Tech, Services/hospitality, Finance) from real jobs-database jobs plus seven ladder-gap jobs added in real cities/districts. Mapped rungs refuse without their cert, naming the course and school; elite rungs need GPA ≥ 3.0. "schools" now shows tier, transfer lines, and "leads to" careers per course.</li>
            <li>🎓 <strong>More Colleges</strong> — Toronto City University and Dubai City University (cities with no school before), plus three community colleges: West Memphis (Broadway), Southaven (Goodman Road), and Little Rock (River Market). Community programs run 60–80 hrs at $600–$3,000 and grant associate credentials; holding a mapped associate enrolls its university program at −25% hours and cost.</li>
            <li>📝 <strong>Academics: GPA, Exams, Graduations</strong> — GPA starts at 3.0 on enroll and moves with study energy (50+ → +0.05, 20–49 → +0.02, below 20 → −0.05); "gpa" shows GPA + attendance; "exam" scores 40 + GPA×10 + skill×5 (minus 10 below 50% attendance, pass 60, fail → −0.1 GPA + 10 remediation hours); "graduate" pays a held $100 fee. Coursework completion no longer auto-graduates — the exam gates graduation. GPA below 2.0 blocks new enrollments until library study recovers it; GPA ≥ 3.8 graduates with honors.</li>
            <li>👥 <strong>Better Citizen Names</strong> — newly generated citizens now draw from per-country pools (USA, UK, Japan, France, Germany, UAE, Mexico, Canada, Australia — 30+ first and 30+ last names each), seeded per city so a name never re-rolls, with Japan shown family-first. Existing roster NPCs are byte-identical; no new command.</li>
            <li>📰 <strong>News Ticker</strong> — a fixed one-line strip between the chat area and the stats HUD, rotating one headline at a time (~8s) from the same newspaper source as "news" — never invented. "ticker local" (default), "ticker world", "ticker off". Empty states are literal, and the mode persists through save/load.</li>
            <li>👁️ <strong>FIX: "view" works now</strong> — "view inbox", "view properties", "view vehicles", "view investments", "view status", "view schools", "view real-estate", "view bank", and "view government" open their existing screens by name (including mid-conversation). Bare "view" or an unknown thing lists what can be viewed instead of an unknown-command dead end.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-19">
          <summary class="update-summary"><span>v0.108.19</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.19</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>🌍 <strong>Life and World expansion</strong> — the one big update: everything from v0.108.18 (conversation fixes, navigation, menus, help audit) plus six new pillars below. One update, one post, one bigger world.</li>
            <li>💞 <strong>Bonds &amp; Milestones</strong> — relationships now climb to Partner at 90, "milestones" shows every bond's tier and distance to the next, and "celebrate [name]" spends an evening with someone you know ($50, +8 relationship).</li>
            <li>🏠 <strong>Home Life</strong> — "furnish [property] [item]" fills your homes with furniture (chair $150 to art $1,500). Higher comfort tiers make sleep at home recover better — more happiness, less stress.</li>
            <li>🍳 <strong>Home Cooking</strong> — "cook [meal]" turns cash into energy, happiness, and cooking XP: soup, pasta, Sunday roast, and City Feast for higher-level cooks.</li>
            <li>🎪 <strong>World Events Calendar</strong> — "events" shows this game-week's events across all 27 cities, drawn from each city's own character. "attend [event]" joins one where you are ($10 entry, appearance pay).</li>
            <li>🚗 <strong>Road Trips</strong> — "roadtrip [city]" drives your own car instead of a ticket: $15 fuel, needs condition 30%+, grants driving XP, and counts toward your journey.</li>
            <li>🛂 <strong>Passport &amp; World Journey</strong> — "passport" stamps every city you've visited and pays one-time milestone rewards at 5, 10, 15, 20, and all 27 cities, with a next-stop idea.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-18">
          <summary class="update-summary"><span>v0.108.18</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.18</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>💬 <strong>Commands work mid-conversation, even typed</strong> — typing a real command (businesses, journal, investments, achievements, skills, bank…) while talking to an NPC now runs the command instead of sending it as chat. Only non-command text still chats with the NPC, and typed chat is untouched.</li>
            <li>🗣️ <strong>Conversation replies cleaned up</strong> — NPC replies always show the speaker's name header, including after the game screen re-renders, and the broken nested-quote reply line is fixed to one clean quoted line.</li>
            <li>🗺️ <strong>"travel to [city]" works</strong> — the travel parser no longer chokes on the word "to": "travel to Memphis" and "travel to West Memphis" work exactly like the bare forms. Same tolerance for "goto".</li>
            <li>🏠 <strong>West Memphis has homes now</strong> — the starting city finally has property listings (a starter home, a duplex, and a lot, priced below Memphis levels), so you can buy at home without traveling elsewhere first.</li>
            <li>🔤 <strong>City names, not city codes</strong> — swept every player-facing string that leaked internal city ids (west_memphis, littlerock…) — status, laws, government, crime, jobs, schools, real estate, travel errors, and more now all show proper display names like "West Memphis, AR".</li>
            <li>📖 <strong>Help catches up</strong> — "leave" (exit a conversation) and the "travel to [city]" form are now documented in help.</li>
            <li>🧭 <strong>Proper city navigation</strong> — "districts" lists your city's neighborhoods, "where" shows where you are, "goto" accepts district names, and "explore [district]" explores a named district. The full loop: travel → districts → goto → explore → go home.</li>
            <li>👀 <strong>Nearby people and places</strong> — "people" entries now carry role, relationship, quests on offer, and district, and the new "nearby" view shows people AND places (schools, homes for sale, race tracks) with what you can do at each. "talk" already matches partial names and refuses with a list when ambiguous.</li>
            <li>✨ <strong>Smoother moment-to-moment play</strong> — unknown commands suggest the nearest real command ("Did you mean 'travel'?"), natural phrasing like "check bank" or "go to Memphis" reaches the right command, and travel, explore, and conversation-end outputs point at the sensible next step.</li>
            <li>🖼️ <strong>Menus rebuilt to a presented standard</strong> — Game Menu, Settings, What's New, main menu, and landing now share the true-black-flat look: every item has a label and a description line, real hierarchy instead of uniform rows, and panels that own their space in fullscreen. No items added, removed, or reordered.</li>
            <li>🎯 <strong>Menu text centered</strong> — Game Menu titles and item texts (label + description) are centered in both compact and expanded modes, and main-menu items match. Settings rows and What's New body copy stay left-aligned by design.</li>
            <li>🎓 <strong>Schools catalog</strong> — new "schools" command lists every school with its id and every course with hours and cost, so "enroll" no longer demands ids you can't discover. Bare "enroll" usage now points at it.</li>
            <li>📧 <strong>Mail you can actually open</strong> — bare "emails" finally lists the inbox (id, sender, subject, unread state) instead of printing usage; the email usage block now lists real syntax only; help documents read, compose, and delete; and "inbox" works as an alias.</li>
            <li>🔍 <strong>Help audited against every command</strong> — help now documents everything the game actually accepts (schools, mail actions, prison, crime, lawyer, services, messages, search, and more), and every documented command was proven working with real output. Nothing documented is broken; nothing working is undocumented.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-17">
          <summary class="update-summary"><span>v0.108.17</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.17</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>💬 <strong>Quick selections work mid-conversation</strong> — tapping a shortcut while talking to an NPC now runs the game command (Bank shows the bank, Journal shows the journal) instead of sending its label as chat text. The conversation ends when you jump to a command; typed chat still talks to the NPC as before.</li>
            <li>📱 <strong>Pause menu simplified</strong> — the Quick selections section is gone from the Game Menu; shortcuts live in the quick bar only. The menu is back to its five core items, keeping the wider full-screen panel.</li>
            <li>🏠 <strong>"Go home" command</strong> — typing "go home" (or "home") returns you to your home city: your first property's city if you own one, else West Memphis. Same-city home costs nothing; other cities use normal travel fares.</li>
            <li>📖 <strong>Help rewritten to match the game</strong> — help now documents the quick bar (all 18 shortcuts, in order, scrollable in full-screen view), the five-item pause menu, "go home", and every newer system. Every command help lists was checked against the parser — nothing listed is fake.</li>
            <li>✅ <strong>All 18 shortcuts verified, twice each</strong> — every quick-bar button was proven in both normal play and mid-conversation, with real command output (not just a parser check).</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-16">
          <summary class="update-summary"><span>v0.108.16</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.16</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>↔️ <strong>Quick bar scrolls now</strong> — the quick-selections row no longer cuts off at the right edge: it scrolls horizontally with a visible scrollbar, touch swipe, and mouse-wheel support in full-screen view, so every shortcut (including People, Phone, and Factions) is reachable.</li>
            <li>🔀 <strong>Quick selections reordered</strong> — the shortcuts now read in a sensible order in both the quick bar and the full-screen menu: character first, then daily verbs, goals and progress, money and assets, the social world, with Help last. Same buttons, same commands — order only.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-15">
          <summary class="update-summary"><span>v0.108.15</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.15</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>🏠 <strong>Property upgrades</strong> — renovate (or upgrade) any owned property through 5 named levels, from Refreshed to Fully Renovated. Each level costs money and raises rent, and rent still only pays on occupied units. Your portfolio now shows each property's level and next upgrade cost.</li>
            <li>🏪 <strong>Business ownership</strong> — buy a food truck, barbershop, corner store, laundromat, coffee cart, or auto shop ($2,500–$12,000) for modest monthly income ($180–$750/mo net) paid in the monthly tick. Sell at 70% if you need out.</li>
            <li>🎯 <strong>Daily goals</strong> — three fresh objectives every game-day with $20–$50 rewards that pay out automatically when you complete them. Type "goals" to see today's.</li>
            <li>🔧 <strong>Vehicle upgrades</strong> — engine, transmission, and aero performance tiers (3 levels each, priced off your vehicle's value). Each tier cuts breakdown risk and adds value, separate from cosmetic mods.</li>
            <li>👥 <strong>NPC depth + revamp</strong> — gifts (coffee to a thoughtful gift) and 2-hour hangouts raise relationships and unlock perks at 25, 50, and 75. People lists now show relationship levels, greetings show your standing, and "profile [name]" gives a full dossier: schedule, mood, quests, and perks.</li>
            <li>📖 <strong>Story journal</strong> — "journal" shows your active quests, six story arcs computed from what you've actually done (job, properties, cities, vehicles, businesses, friends), and a dated log of quests started and achievements unlocked. No invented lore — everything shown comes from your save.</li>
            <li>⚖️ <strong>Government &amp; law</strong> — "laws" shows your city's law book and fine schedule, "court" shows your standing and outstanding fines, "pay fine" settles them (each settled fine cools your heat), and "government" gathers local officials, government openings, and civic standing. Getting cited no longer vanishes without a trace.</li>
            <li>📈 <strong>Job system rebuilt</strong> — listings are grouped by tier with per-shift pay, "career" tracks your tenure, skill, and exactly what your next promotion needs, and "promote" grants +15% pay (15 shifts + skill level 3, max 3 per job). Existing jobs and progress carry over untouched.</li>
            <li>🎨 <strong>New in-game UI</strong> — the true-black-flat direction from the Update Logs now runs across the game screen, header, stats, conversation, and menus, in both dark and light themes, with compact and full-screen modes kept distinct. The HUD now shows your bank balance next to cash, and the quick bar adds Goals, Journal, and Businesses.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-14">
          <summary class="update-summary"><span>v0.108.14</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.14</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>⛶ <strong>Full-screen menu, widened</strong> — the Game Menu in full-screen view is now a proper wide panel instead of a narrow column, so expanded mode actually uses the full screen.</li>
            <li>⚡ <strong>More quick selections</strong> — ten one-tap shortcuts in the expanded menu and the expanded quick bar: Bank, Property, Investments, Vehicles, Quests, Achievements, Skills, People, Phone, and Factions. They open screens the game already has — nothing new to learn, no balance changes.</li>
            <li>📱 <strong>Compact view unchanged</strong> — the narrow menu and quick bar stay exactly as they are in the compact view; the wider layout only appears in full-screen mode, which stays optional and never auto-expands.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-13">
          <summary class="update-summary"><span>v0.108.13</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.13</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>🎨 <strong>Update Logs redesigned</strong> — each version now reads as its own separated section with a clear header and breathing room, instead of one continuous wall of text.</li>
            <li>🌓 <strong>Theme toggle fixed</strong> — dark and light mode now apply the instant you change them, and light mode restyles the whole game instead of only parts of it.</li>
            <li>🧩 <strong>Settings row fixed</strong> — the Full-screen view row in Settings now lays out like its neighbors in both compact and full-screen views.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-12">
          <summary class="update-summary"><span>v0.108.12</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.12</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>🏆 <strong>Achievements fixed</strong> — progress achievements (travel, networking, and more) can actually unlock now, unlocks announce in-game the moment they happen, and World Traveler correctly asks for all 27 cities.</li>
            <li>💾 <strong>Save integrity</strong> — a failed server save now warns you instead of silently pretending it worked; Load Game shows your server saves, and deleting a save actually deletes it.</li>
            <li>🚀 <strong>Travel + economy</strong> — travel now costs real fares from route data (bus, drive, flight), bank balances earn 0.5% interest per game-month, and rent follows occupancy instead of paying out on empty units.</li>
            <li>🌍 <strong>Loading, menus, settings</strong> — the loading screen now follows the real save check (with error states instead of a fake timer), settings actually persist (including your full-screen preference), the dead audio toggles are gone, and this What's New screen is one tap away from the main menu.</li>
            <li>📊 <strong>Play-session measurement</strong> — the game now reports anonymous session milestones (first work, first property, first investment…) so updates can follow what players actually do. No names or personal details are ever sent.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-11">
          <summary class="update-summary"><span>v0.108.11</span><span>November 1, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.11</span>
          <span class="update-date">November 1, 2026</span>
          <ul>
            <li>⛶ <strong>Full-screen view (optional)</strong> — a new full-screen button in the game header (and in Settings) opens the game in a larger view. It's always your choice: the compact view stays the default, nothing auto-expands, and you can exit back any time. The expanded layout actually uses the full screen instead of stretching the compact one.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-10">
          <summary class="update-summary"><span>v0.108.10</span><span>October 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.10</span>
          <span class="update-date">October 25, 2026</span>
          <ul>
            <li>💬 <strong>Dialogue engine</strong> — NPCs now have distinct voices drawn from their job, traits, and neighborhood, remember what you told them (jobs, likes, promises, favors), follow up on open questions when you meet again, and react by mood, not just a relationship number. Your conversations and memories belong to your game only and never carry into another player's game. AI-powered replies switch on once the developer adds the Optra key in the app settings; until then the game keeps its existing local replies.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-9">
          <summary class="update-summary"><span>v0.108.9</span><span>October 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.9</span>
          <span class="update-date">October 25, 2026</span>
          <ul>
            <li>🛠️ <strong>Simulation fixes</strong> — job hiring now checks requirements on every path (including fallback jobs) and unknown credentials fail closed instead of being silently skipped; new Paramedic and Nurse Practitioner courses at Memphis Medical Academy; health now moves (rest restores it, exhaustion and prison labor wear it down, with a low-health warning — no death mechanic); investments tick at most once per game-day; old saves warn at 20 days idle and now last 90 days; ambiguous names ask you to clarify instead of picking the first match; you can't buy a property you already own; districts are validated; moving across town uses fuel and wear; weather stays consistent within a game-day; heat decays on real idle time; storyline losses can't push cash below $0; and small stress/happiness movement in work and workouts.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-8">
          <summary class="update-summary"><span>v0.108.8</span><span>October 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.8</span>
          <span class="update-date">October 25, 2026</span>
          <ul>
            <li>🕐 <strong>Dashboard clock fixed</strong> — the header time, date, and weather now actually update after every command. They were painted once when the game screen loaded and never repainted, because the updater looked for element names the screen doesn't use — so the clock looked frozen even while the game clock advanced underneath.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-3">
          <summary class="update-summary"><span>v0.108.3</span><span>October 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.3</span>
          <span class="update-date">October 25, 2026</span>
          <ul>
            <li>💰 <strong>Money display fixed</strong> — your cash now always shows exactly 2 decimals, and balances are rounded to whole cents on every command and on load, so old saves with long fractional tails (like $677.8846153846154) heal to $677.88. No prices, pay rates, or return rates changed.</li>
            <li>🕐 <strong>Game clock fixed</strong> — game-time now saves with your progress and restores on load, so working and sleeping actually move the day forward instead of snapping back to 6:00 AM on January 1, 2024. Sleeping while already fully rested now passes 8 hours instead of doing nothing.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-2">
          <summary class="update-summary"><span>v0.108.2</span><span>October 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.2</span>
          <span class="update-date">October 25, 2026</span>
          <ul>
            <li>🏠 <strong>Monthly property tick</strong> — when game-time crosses into a new month, property values and condition move, rent lands in your cash, and mortgage payments are deducted. If cash is short, a missed payment accrues as arrears instead of driving your cash negative. One tick per game-month, so reloading can't double-apply it.</li>
            <li>⛓️ <strong>Prison soft-lock fixed</strong> — getting busted by police now gives a 3-day sentence instead of locking you in prison forever, prison work shortens your sentence by a day per shift, and "lawyer appeal" works while incarcerated. Old soft-locked saves are healed with a 3-day sentence on next login.</li>
            <li>💾 <strong>Save slot fix</strong> — playing on slot 2 no longer silently overwrites your slot 1 save.</li>
            <li>🚗 <strong>"vehicles" command works</strong> — the garage list now actually opens instead of falling through to unknown command.</li>
            <li>📖 <strong>Study-hours validation</strong> — "study hours 0" and negative hours are rejected instead of silently studying 1 hour or rewinding time.</li>
            <li>🎓 <strong>Re-enroll guard</strong> — enrolling while already enrolled is blocked (no double-charge, no lost progress), and graduating can't award the same certification twice.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-1">
          <summary class="update-summary"><span>v0.108.1</span><span>October 24, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.1</span>
          <span class="update-date">October 24, 2026</span>
          <ul>
            <li>🎓 <strong>Enroll fix</strong> — "study hours [n]" now actually advances an enrolled course toward graduation; before, it just re-printed the school list.</li>
            <li>📈 <strong>Investments move now</strong> — your portfolio gets one market tick each time you sleep, so values can rise or fall instead of sitting at the purchase price.</li>
            <li>📖 <strong>Help fix</strong> — the study example now uses a real school and course: enroll maestro_college ai_foundation.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-108-0">
          <summary class="update-summary"><span>v0.108.0</span><span>September 4, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.108.0</span>
          <span class="update-date">September 4, 2026</span>
          <ul>
            <li>🌍 <strong>5 New International NPCs</strong> — Added npc_334–npc_338 across Dubai, Tokyo, Paris, London, and Sydney.</li>
            <li>🎲 <strong>6 New City-Life Random Events</strong> — Fresh encounters: Rooftop Silent Disco, Community Tool Library, Street Piano Serenade, Free Fitness Class, Night Market Fortune Teller, and Lost Drone Rescue.</li>
            <li>🔁 <strong>Version Sync</strong> — All project files bumped to v0.108.0 and verified type-check/build.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-107-0">
          <summary class="update-summary"><span>v0.107.0</span><span>August 31, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.107.0</span>
          <span class="update-date">August 31, 2026</span>
          <ul>
            <li>🚗 <strong>Deeper Vehicle Ownership</strong> — Vehicles now have fuel, registration, inspections, and visual modifications. Commands: fuel [name], register, inspect [name], customize [name] [mod], emergency/tow.</li>
            <li>🎲 <strong>New City Encounters</strong> — Eight more random events: Parking Ticket, Charity Fundraiser, Protest March, Food Truck, Tech Demo, Lost Pet Poster, Rooftop Party, and Free Sample Day.</li>
            <li>🔧 <strong>Vehicle Consequences</strong> — Unregistered or dangerous vehicles can be impounded. Breakdowns scale with condition and maintenance history.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-104-2">
          <summary class="update-summary"><span>v0.104.2</span><span>August 28, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.104.2</span>
          <span class="update-date">August 28, 2026</span>
          <ul>
            <li>🏠 <strong>Cash Property Purchases</strong> — You can now buy real estate outright. "buy property [name]" defaults to cash when you can afford the full price, and you can add "cash" or "mortgage" to force a payment method.</li>
            <li>❓ <strong>Help Updated</strong> — The in-game help now explains cash vs. mortgage purchasing.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-104-0">
          <summary class="update-summary"><span>v0.104.0</span><span>August 28, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.104.0</span>
          <span class="update-date">August 28, 2026</span>
          <ul>
            <li>🌍 <strong>International Mission Expansion</strong> — 10 new quests tied to the v0.103.0 global NPCs. Ask NPCs for "quests" or "work" in Dubai, Tokyo, Paris, London, Berlin, Mexico City, Toronto, and Sydney.</li>
            <li>🏁 <strong>World Street Series Racing</strong> — New 'race season' and 'race standings' commands, plus 5 new international tracks. Compete across a 5-race championship with points and earnings.</li>
            <li>📜 <strong>Quest Log</strong> — New 'quests' command shows active objectives, progress, and rewards.</li>
            <li>🔁 <strong>Version Sync</strong> — Bumped all project files to v0.104.0 and verified type-check/build.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-103-0">
          <summary class="update-summary"><span>v0.103.0</span><span>August 28, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.103.0</span>
          <span class="update-date">August 28, 2026</span>
          <ul>
            <li>🌍 <strong>International NPC Expansion</strong> — Added 10 new global characters across Dubai, Tokyo, Paris, London, Berlin, Mexico City, Toronto, and Sydney.</li>
            <li>🎲 <strong>New City Encounters</strong> — Five fresh random events: Lost Tourist, Pop-Up Job Fair, Celebrity Sighting, Street Chess Match, and Sudden Summer Storm.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-102-0">
          <summary class="update-summary"><span>v0.102.0</span><span>August 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.102.0</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>🤖 <strong>Serverless LLM NPC Brain</strong> — NPCs can now be powered by Hugging Face, OpenRouter, Groq, or Google Gemini free tiers for natural, in-character replies that remember your name and recent conversation.</li>
            <li>💾 <strong>Save Flow Hardened</strong> — Redis saves use a stable user key, 30-day expiration, and a synchronous server beacon flush on refresh/close so progress is far less likely to vanish.</li>
            <li>🧠 <strong>NPC Memory Sync</strong> — Singleton social engine now syncs standing from the player's saved relationships; no more "I'm Marcus, who are you?" loops after reload.</li>
            <li>🐛 <strong>Type-Safe Fixes</strong> — Cleaned up implicit any casts and relationship-record typing caught by the TypeScript build.</li>
            <li>🛠️ <strong>Fallback Always Works</strong> — If no API key is configured or the LLM call fails, the local reply generator still handles greetings, names, small talk, questions, and farewells.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-99-3">
          <summary class="update-summary"><span>v0.99.3</span><span>August 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.99.3</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>🧠 <strong>NPC Memory Fixed</strong> — Relationships now save correctly as JSON, so NPCs remember your name, conversation history, and how they feel about you across commands and reloads.</li>
            <li>💾 <strong>Save Serialization Hardened</strong> — Server-side Redis save now preserves the full relationship record; no more lost NPC context on refresh.</li>
            <li>🛠️ <strong>Code Cleanup</strong> — Removed stale version header and unified relationship record usage across game engine and storyline engine.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-101-0">
          <summary class="update-summary"><span>v0.101.0</span><span>August 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.101.0</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>💾 <strong>Server-Authoritative Auto-Save</strong> - Every command is saved to Redis before the response returns; a synchronous beacon flush also fires on tab close/refresh.</li>
            <li>🧠 <strong>NPC Memory Fixed</strong> - Relationships now save as plain records so NPCs remember your name, chat history, and mood between messages and across reloads.</li>
            <li>🗣️ <strong>No More "What's yours?" Loop</strong> - NPCs recognize "I'm...", "I am...", "call me...", and "my name is..." and stop asking once they know you.</li>
            <li>🤖 <strong>Local NPC Reply Generator</strong> - New AI-style bridge produces natural greetings, answers, small talk, and farewells from memory and relationship context.</li>
            <li>🤝 <strong>Assist & Quests</strong> - Relationship changes from helping NPCs and completing quests now persist correctly.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-99-2">
          <summary class="update-summary"><span>v0.99.2</span><span>August 25, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.99.2</span>
          <span class="update-date">August 25, 2026</span>
          <ul>
            <li>💾 <strong>Save System Rebuilt</strong> - Slot 1 auto-saves to server (Redis) every command and on refresh; localStorage is an offline fallback; splash screen auto-detects and resumes your game.</li>
            <li>💬 <strong>NPC Conversation Rebuilt</strong> - NPCs now greet first when you talk to them, and conversations can be exited with "bye", "end", "leave", or "exit".</li>
            <li>🛠️ <strong>Social Polish</strong> - "people" shows city-wide NPCs when no-one is in your exact district; "text" reads relationships correctly.</li>
            <li>📋 <strong>Developer Update</strong> - Patch focuses on save persistence and NPC conversation quality.</li>
          <li>🛠️ <strong>Save System Rebuilt</strong> - Redis-first persistence; Continue button appears only when a save exists; auto-save after every command; background save on tab close/minimize; server fallback keyed by username + install ID.</li>
          <li>✅ <strong>/api/init GET now checks Redis</strong> - returns the saved player instead of forcing a fresh start.</li>
          <li>🗣️ <strong>NPCs now respond</strong> - talk/greet triggers a contextual greeting; NPCs react to relationship, mood, district, time and role.</li>
          <li>👋 <strong>Conversations can end</strong> - say bye/goodbye/exit/leave/later/im out/ima head out to exit conversation mode.</li>
          <li>🔧 <strong>text [name] SMS fixed</strong> - relationship object lookup works and gives relationship-aware replies.</li>
          <li>🧹 <strong>Dead duplicate server.ts removed</strong> - single source of truth in src/server/index.ts.</li>
          <li>🔁 <strong>Version Sync</strong> - Bumped to v0.99.2 with server-first save flow and NPC greeting polish.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-99-0">
          <summary class="update-summary"><span>v0.99.0</span><span>August 24, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.99.0</span>
          <span class="update-date">August 24, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet a Harajuku designer, a Notting Hill bookshop owner, a Seine boat captain, and more.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Pop-Up Street Gallery, Language Exchange Picnic, Vintage Record Fair, Rooftop Herb Garden, and Impromptu Dance Parade.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.99.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-98-0">
          <summary class="update-summary"><span>v0.98.0</span><span>August 21, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.98.0</span>
          <span class="update-date">August 21, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet sushi apprentices, jazz archivists, macaron bakers, and more.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Sandstorm Shortcut, Rooftop Yoga Class, Underground Comedy Night, Book Club on the Train, and Midnight Dog Walker Meetup.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.98.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-97-0">
          <summary class="update-summary"><span>v0.97.0</span><span>August 17, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.97.0</span>
          <span class="update-date">August 17, 2026</span>
          <ul>
            <li>🌍 <strong>Global NPC Expansion</strong> - Added 10 new international characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet spice merchants, bonsai masters, perfume blenders, and opera house ushers.</li>
            <li>🎲 <strong>New City Encounters</strong> - Five fresh random events: Riverboat Jazz Invitation, Neighborhood Power Outage, Foreign Film Pop-Up, Street Cart Free Sample, and Lost Tourist Needs Directions.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.97.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-96-0">
          <summary class="update-summary"><span>v0.96.0</span><span>August 14, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.96.0</span>
          <span class="update-date">August 14, 2026</span>
          <ul>
            <li>🌍 <strong>More International NPCs</strong> - Added 10 new characters across London, Tokyo, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet street poets, retro game shop owners, art collectors, and harbour tour guides.</li>
            <li>🎲 <strong>More Random Events</strong> - Five fresh city-life moments: Rooftop Garden Invitation, City-Wide Scavenger Hunt, Street Magician Disappearing Act, Vintage Polaroid Swap, and Midnight Ramen Queue.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.96.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-95-0">
          <summary class="update-summary"><span>v0.95.0</span><span>August 13, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.95.0</span>
          <span class="update-date">August 13, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - Added 10 new characters in Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet jazz club managers, pub landlords, fragrance designers, yacht brokers, surf instructors, and more.</li>
            <li>🎲 <strong>New City-Life Events</strong> - Five fresh random events: Airport Upgrade Offer, Train Seat Swap, Local Sports Rivalry, Famous Food Queue, and Street Photographer.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.95.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-93-0">
          <summary class="update-summary"><span>v0.93.0</span><span>August 11, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.93.0</span>
          <span class="update-date">August 11, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - Added 10 new characters across Tokyo, London, Paris, Berlin, Dubai, Mexico City, Toronto, and Sydney. Meet bonsai artists, opera singers, parfumeurs, street-fashion designers, and more.</li>
            <li>🎲 <strong>Global City Events</strong> - Five fresh random events: night markets, transit serenades, lost tourists, historic building tours, and free street haircuts.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.93.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-92-0">
          <summary class="update-summary"><span>v0.92.0</span><span>August 10, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.92.0</span>
          <span class="update-date">August 10, 2026</span>
          <ul>
            <li>🏎️ <strong>Vehicle Racing</strong> - New "race" and "race [track]" commands let you enter street, drag, and circuit competitions. Vehicle type, condition, driving skill, and a little luck decide the podium.</li>
            <li>🏁 <strong>City Tracks</strong> - Race locations in Los Angeles, Miami, Memphis, Atlanta, Detroit, and Tokyo with licensed and underground events.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.92.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-92-0">
          <summary class="update-summary"><span>v0.92.0</span><span>August 9, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.92.0</span>
          <span class="update-date">August 9, 2026</span>
          <ul>
            <li>🏘️ <strong>Expanded Property Market</strong> - Real estate listings now span Nashville, Atlanta, Chicago, New York, Los Angeles, Miami, Houston, Dallas, and Phoenix. Build a cross-country empire.</li>
            <li>🌅 <strong>Dynamic Arrivals</strong> - Travel descriptions now reflect the time of day for more immersive city entries.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.92.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-91-0">
          <summary class="update-summary"><span>v0.91.0</span><span>August 8, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.91.0</span>
          <span class="update-date">August 8, 2026</span>
          <ul>
            <li>🎯 <strong>New Achievements</strong> - Peak Fitness, Renaissance Person, and Trophy Hunter medals now reward stat mastery and completionists.</li>
            <li>🎲 <strong>New Random Events</strong> - Impromptu block parties, sudden rainstorms, street chess, hidden bookstore sales, and rooftop movie nights add fresh city flavor.</li>
            <li>🐛 <strong>Travel Fix</strong> - Removed duplicate police checkpoint encounter when arriving in a city with high heat.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.91.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-90-0">
          <summary class="update-summary"><span>v0.90.0</span><span>August 7, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.90.0</span>
          <span class="update-date">August 7, 2026</span>
          <ul>
            <li>🌍 <strong>International NPC Expansion</strong> - 10 new global NPCs in Berlin, Paris, Tokyo, Dubai, Mexico City, Toronto, and Sydney, including ballet instructors, yacht brokers, and comedy bookers.</li>
            <li>🎲 <strong>New Random Events</strong> - Sunrise yoga, bookstore readings, vintage car parades, community cleanups, and late-night food trucks add more everyday city flavor.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.90.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-89-1">
          <summary class="update-summary"><span>v0.89.1</span><span>August 6, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.89.1</span>
          <span class="update-date">August 6, 2026</span>
          <ul>
            <li>🛠️ <strong>Devvit Review Fix</strong> - Inline webview now opens in Expanded Mode, eliminating the inline scroll trap. Menu post creation uses idempotency keys to prevent duplicate game posts.</li>
            <li>🔁 <strong>Version Sync</strong> - Bumped all project files to v0.89.1.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-89-0">
          <summary class="update-summary"><span>v0.89.0</span><span>August 6, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.89.0</span>
          <span class="update-date">August 6, 2026</span>
          <ul>
            <li>🌍 <strong>International NPCs</strong> - 10 new global NPCs in Dubai, Tokyo, Paris, Berlin, Mexico City, London, Toronto, and Sydney, from spice merchants to grime DJs.</li>
            <li>🚗 <strong>Travel Atmosphere</strong> - First-time arrival descriptions now cover 13 missing domestic cities, giving every destination a unique welcome.</li>
            <li>🎲 <strong>New Random Events</strong> - Street buskers, lost tourists, community gardens, free samples, and rooftop invites bring more city-life moments.</li>
            <li>🏆 <strong>New Travel Achievements</strong> - Global Citizen and Passport Collector medals now track your international city visits automatically.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.89.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-82-0">
          <summary class="update-summary"><span>v0.82.0</span><span>July 27, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.82.0</span>
          <span class="update-date">July 27, 2026</span>
          <ul>
            <li>💬 <strong>Dialogue Depth</strong> - Added apology & rumor intents, NPC awareness of player job/certs/health/stress/record, and conversation continuity.</li>
            <li>🏆 <strong>New Achievements</strong> - Scholar, Master Worker, Veteran, and Continental medals added.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.82.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-81-0">
          <summary class="update-summary"><span>v0.81.0</span><span>July 26, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.81.0</span>
          <span class="update-date">July 26, 2026</span>
          <ul>
            <li>🌍 <strong>International NPC Expansion</strong> - Added 8 new characters across Toronto, Sydney, Mexico City, Berlin, Dubai, and Paris.</li>
            <li>🎬 <strong>City Event Expansion</strong> - Added new random events in New York, Atlanta, and Nashville.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.81.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-80-0">
          <summary class="update-summary"><span>v0.80.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.80.0</span>
          <ul>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.80.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-76-0">
          <summary class="update-summary"><span>v0.76.0</span><span>June 5, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.76.0</span>
          <span class="update-date">June 5, 2026</span>
          <ul>
            <li>🎓 <strong>Career & Specialization Overhaul</strong> - Added new international schools (London, Tokyo, Paris, Sydney) and high-tier career paths requiring specialized certifications.</li>
            <li>🌍 <strong>Global Expansion</strong> - Expanded the job market with elite international positions in tech, finance, and culinary arts.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.76.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-73-0">
          <summary class="update-summary"><span>v0.73.0</span><span>May 27, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.73.0</span>
          <span class="update-date">May 27, 2026</span>
          <ul>
            <li>🌍 <strong>Global Expansion</strong> - Added 6 new NPCs across Berlin, Mexico City, and Dubai.</li>
            <li>🛡️ <strong>New Factions</strong> - Introduced <strong>Berlin Underground</strong> and <strong>Dubai Elite</strong>.</li>
            <li>💬 <strong>Dialogue Depth</strong> - NPCs now have city-specific greetings and relationship-based responses.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.67.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-65-0">
          <summary class="update-summary"><span>v0.65.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.65.0</span>
          <ul class="update-list">
            <li>🔫 <strong>Crime Expansion</strong> - Added new crime types: <em>Scam</em> (Cybercrime) and <em>Grand Theft Auto</em>.</li>
            <li>🚨 <strong>Criminal Records</strong> - Arrests are now tracked and displayed in your status profile.</li>
            <li>📈 <strong>Dynamic Odds</strong> - Crime success rates now scale with Intelligence and Driving skills.</li>
            <li>🛠️ <strong>Stability</strong> - Version synchronization across all systems.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-64-0">
          <summary class="update-summary"><span>v0.64.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.64.0</span>
          <ul class="update-list">
            <li>📱 <strong>Phone OS v2.0</strong> - Comprehensive communication overhaul with contact lists, search, and drafts.</li>
            <li>👥 <strong>Auto-Contacts</strong> - Talking to NPCs now automatically saves them to your phone.</li>
            <li>🎬 <strong>Life Moments</strong> - Expanded dynamic event system with 8+ new location-specific random events.</li>
            <li>🌍 <strong>Global Flavor</strong> - Unique events added for Manhattan, Shibuya, London, Berlin, Dubai, and more.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-61-0">
          <summary class="update-summary"><span>v0.61.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.61.0</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added 5 new international NPCs in London, Tokyo, Paris, Toronto, and Sydney.</li>
            <li>👥 <strong>Social Depth</strong> - Expanded NPC roster to 125 unique characters.</li>
            <li>🛠️ <strong>Maintenance</strong> - Routine stability checks and version synchronization.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-60-0">
          <summary class="update-summary"><span>v0.60.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.60.0</span>
          <ul class="update-list">
            <li>🛡️ <strong>Critical Stability</strong> - Fixed server-side crashes in Achievement Engine.</li>
            <li>📊 <strong>Data Integrity</strong> - Defensive type-casting for player stats.</li>
            <li>💬 <strong>Chat Sync</strong> - Fixed NPC identity and formatting issues.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-58-16">
          <summary class="update-summary"><span>v0.58.16</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.58.16</span>
          <ul class="update-list">
            <li>📊 <strong>Data Integrity</strong> - Defensive type-casting for player stats.</li>
            <li>💬 <strong>Chat Sync</strong> - Fixed NPC identity and formatting issues.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-57-1">
          <summary class="update-summary"><span>v0.57.1</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.57.1</span>
          <ul class="update-list">
            <li>💬 <strong>Chat Stability</strong> - Resolved "blank bubble" bug in conversations.</li>
            <li>🏷️ <strong>Sender Identity</strong> - NPCs now correctly display their names in chat.</li>
            <li>📈 <strong>Skill Logic</strong> - Fixed job-to-skill mapping for accurate progression.</li>
            <li>📝 <strong>Formatting</strong> - Fixed broken newline escapes in system messages.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-57-0">
          <summary class="update-summary"><span>v0.57.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.57.0</span>
          <ul class="update-list">
            <li>📈 <strong>Skill Overhaul</strong> - New granular skill progression system.</li>
            <li>📊 <strong>Skill Tracking</strong> - Track levels and XP for specialized abilities.</li>
            <li>🏦 <strong>Bank Fixes</strong> - Resolved critical issues with the new banking system.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-56-0">
          <summary class="update-summary"><span>v0.56.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.56.0</span>
          <div class="update-card">
            <h3>🏦 BANKING SYSTEM</h3>
            <ul>
              <li>💰 <strong>Cash & Savings</strong> - Keep your money safe in the bank.</li>
              <li>📥 <strong>Deposit & Withdraw</strong> - New commands to manage your liquid assets.</li>
              <li>🏦 <strong>Bank Command</strong> - Check your balances and net worth at any time.</li>
            </ul>
          </div>
        </div>
        </details>
        <details class="update-details" id="update-v0-55-0">
          <summary class="update-summary"><span>v0.55.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.55.0</span>
          <div class="update-card">
            <h3>🛠️ VEHICLE MAINTENANCE & PARTS</h3>
            <ul>
              <li>🔧 <strong>Condition & Mileage</strong> - Vehicles now track wear and tear.</li>
              <li>🛢️ <strong>Maintenance</strong> - New "maintain" and "repair vehicle" commands.</li>
              <li>🚗 <strong>Wear & Tear</strong> - Long distance travel affects vehicle performance.</li>
            </ul>
          </div>
        </div>
        </details>
        <details class="update-details" id="update-v0-54-0">
          <summary class="update-summary"><span>v0.54.0</span><span></span></summary>
<div class="update-item">
          <span class="update-version">v0.54.0</span>
          <div class="update-card">
            <h3>📱 PHONE & EMAIL OVERHAUL</h3>
            <ul>
              <li>📧 <strong>New Email System</strong> - Fully functional inbox and compose features.</li>
              <li>💬 <strong>Dynamic Messaging</strong> - NPCs now send more relevant texts and job offers.</li>
              <li>📢 <strong>Notifications</strong> - Improved phone notification system.</li>
            </ul>
          </div>
        </div>
        </details>
        <details class="update-details" id="update-v0-53-0">
          <summary class="update-summary"><span>v0.53.0</span><span>May 21, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.53.0</span>
          <span class="update-date">May 21, 2026</span>
          <ul class="update-list">
            <li>🏆 <strong>Achievements</strong> - Full achievement system with 36 milestones.</li>
            <li>👥 <strong>New NPCs</strong> - Added 5 new international characters to meet.</li>
            <li>🛠️ <strong>Optimization</strong> - Improved engine performance and bug fixes.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-52-0">
          <summary class="update-summary"><span>v0.52.0</span><span>April 15, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.52.0</span>
          <span class="update-date">April 15, 2026</span>
          <ul class="update-list">
            <li>🔫 <strong>Crime System</strong> - New crimes: pickpocket, shoplift, robbery, and heist.</li>
            <li>🚨 <strong>Consequences</strong> - Risk of arrest and prison time based on crime type and location.</li>
            <li>👮 <strong>Reputation</strong> - Criminal activities now affect your social and criminal standing.</li>
            <li>🔄 <strong>Version Sync</strong> - Project-wide update to v0.52.0.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-51-0">
          <summary class="update-summary"><span>v0.51.0</span><span>April 15, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.51.0</span>
          <span class="update-date">April 15, 2026</span>
        </div>
        </details>
        <details class="update-details" id="update-v0-50-0">
          <summary class="update-summary"><span>v0.50.0</span><span>April 15, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.50.0</span>
          <span class="update-date">April 15, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>16 New International NPCs</strong> across London, Tokyo, Paris, Berlin, Dubai, and more.</li>
            <li>👔 <strong>Finance Moguls & Tech Founders</strong> in global business hubs.</li>
            <li>🎨 <strong>Cultural Icons</strong> - Artists, chefs, and DJs added to international cities.</li>
            <li>📈 <strong>Stable Version</strong> - Critical bug fixes and type stability.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-15-0">
          <summary class="update-summary"><span>v0.15.0</span><span>April 15, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.15.0</span>
          <span class="update-date">April 15, 2026</span>
          <h3 class="update-title">World Expansion & Natural Language</h3>
          <ul class="update-list">
            <li>🌍 <strong>28 Cities</strong> across 7 regions worldwide</li>
            <li>🗣️ <strong>Natural Language</strong> - Speak naturally, game understands</li>
            <li>📱 <strong>Phone System</strong> - Check emails, messages, voicemails</li>
            <li>🎭 <strong>Crime System</strong> - Risk and consequences</li>
            <li>🏆 <strong>Achievements</strong> - 30+ milestones to unlock</li>
            <li>🧭 <strong>Travel System</strong> - Bus, flight, train, drive</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-2-0">
          <summary class="update-summary"><span>v0.2.0</span><span>April 14, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.2.0</span>
          <span class="update-date">April 14, 2026</span>
          <h3 class="update-title">Property & Storyline Systems</h3>
          <ul class="update-list">
            <li>🏠 <strong>Real Estate</strong> - Buy properties with mortgages</li>
            <li>📈 <strong>Investments</strong> - Stocks, bonds, crypto, business</li>
            <li>📖 <strong>Storyline Events</strong> - Job interviews, life events</li>
            <li>🌤️ <strong>Weather Effects</strong> - Impacts work and exploration</li>
            <li>🚗 <strong>Vehicles</strong> - Buy, sell, garage system</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-1-0">
          <summary class="update-summary"><span>v0.1.0</span><span>April 12, 2026</span></summary>
<div class="update-item">
          <span class="update-version">v0.1.0</span>
          <span class="update-date">April 12, 2026</span>
          <h3 class="update-title">Initial Release</h3>
          <ul class="update-list">
            <li>🎮 <strong>Core Engine</strong> - Time, economy, social systems</li>
            <li>👥 <strong>42 NPCs</strong> - Schedules, personalities, relationships</li>
            <li>💼 <strong>Jobs</strong> - Work, get paid, build career</li>
            <li>📚 <strong>Skills</strong> - Study to improve abilities</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-68-0">
          <summary class="update-summary"><span>v0.68.0</span><span>May 30, 2026</span></summary>
<div class="update-card">
          <span class="update-version">v0.68.0</span>
          <span class="update-date">May 30, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added new random events for London, Tokyo, and Dubai.</li>
            <li>🏡 <strong>Luxury Real Estate</strong> - Added premium property listings in international hubs.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.68.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-70-0">
          <summary class="update-summary"><span>v0.70.0</span><span>June 1, 2026</span></summary>
<div class="update-card">
          <span class="update-version">v0.70.0</span>
          <span class="update-date">June 1, 2026</span>
          <ul class="update-list">
            <li>⚔️ <strong>Faction Wars</strong> - Added Influence, Support, and Sabotage mechanics.</li>
            <li>📊 <strong>Political Influence</strong> - Factions now compete for dominance in their HQ cities.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.70.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-69-0">
          <summary class="update-summary"><span>v0.69.0</span><span>May 31, 2026</span></summary>
<div class="update-card">
          <span class="update-version">v0.69.0</span>
          <span class="update-date">May 31, 2026</span>
          <ul class="update-list">
            <li>🌍 <strong>Global Expansion</strong> - Added new random events for Toronto, Berlin, Mexico City, and Sydney.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.69.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-71-0">
          <summary class="update-summary"><span>v0.71.0</span><span>June 2, 2026</span></summary>
<div class="update-card">
          <span class="update-version">v0.71.0</span>
          <span class="update-date">June 2, 2026</span>
          <ul class="update-list">
            <li>🎭 <strong>NPC Expansion</strong> - Added new city-specific greetings and dialogue variety.</li>
            <li>🌍 <strong>Mid-South Events</strong> - New random life moments for Memphis and West Memphis.</li>
            <li>🔄 <strong>Version Sync</strong> - Unified version to v0.71.0 project-wide.</li>
          </ul>
        </div>
        </details>
        <details class="update-details" id="update-v0-72-0">
          <summary class="update-summary"><span>v0.72.0</span><span>June 3, 2026</span></summary>
<div class="update-card">
          <span class="update-version">v0.72.0</span>
          <span class="update-date">June 3, 2026</span>
          <ul class="update-list">
            <li>👑 <strong>Faction Achievements</strong> - Added new milestones for faction leadership and sabotage.</li>
            <li>🏰 <strong>Real Estate Tycoon</strong> - New achievement for owning properties in 5+ cities.</li>
            <li>🎭 <strong>Dynamic Faction Events</strong> - Rival confrontations and mysterious bribes added to the world.</li>
            <li>🔄 <strong>Version Sync</strong> - Project-wide update to v0.72.0.</li>
          </ul>
        </div>
        </details>
      
      </div>
    </div>
  `;
  
  // Bind back button — returns to wherever What's New was opened from
  // (main menu or the in-game menu), so opening it mid-game doesn't dump
  // you out of your session.
  rootEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
    state.currentScreen = state.updatesReturnTo;
    render();
  });

  // v0.108.27: index jumps + Show-all/Show-fewer toggle (bound via helper).
  bindUpdatesIndex(rootEl);
}

// ============================================
// GAME SCREEN
// ============================================

function renderGameScreen() {
  if (!rootEl || !state.player) return;
  
  const player = state.player;
  const time = player.gameTime || '6:00 AM';
  const date = player.gameDate || 'Monday, January 1, 2024';
  const weather = player.weather || { temp: 65, condition: 'clear' };
  const cityDisplay = formatCityName(player.city);
  const districtDisplay = formatDistrictName(player.district);
  
  rootEl.innerHTML = `
    <div class="screen game-screen ${isFullscreen() ? 'fullscreen' : ''}">
      <header class="game-header">
        <div class="header-left">
          <button class="menu-toggle" id="menu-toggle">☰</button>
          <span class="logo-mini">🌍</span>
        </div>
        <div class="header-center">
          <div class="location-time">
            <span class="location">📍 ${districtDisplay} · ${cityDisplay}</span>
            <span class="time-display">🕐 ${time}</span>
            <span class="date-display">📅 ${date}</span>
            <span class="weather-display">🌡️ ${weather.temp}°F ${weather.condition}</span>
          </div>
        </div>
        <div class="header-right">
          <button class="expand-btn" id="expand-btn" title="Full-screen view (optional)">⛶ Full screen</button>
          <span class="header-status-indicator"></span>
        </div>
      </header>
      
      <div class="stats-hud">
        <div class="stat-item money">
          <span class="stat-icon">💰</span>
          <span class="stat-value" id="stat-money">${fmtMoney(player.money)}</span>
          <span class="stat-label">Cash</span>
          <!-- v0.108.15: bank balance rides on the money tile, so the
               second number players check (bank, earning 0.5%/mo) is
               always visible without opening the Bank screen. -->
          <span class="stat-sub" id="stat-bank">Bank ${fmtMoney(player.bankBalance ?? 0)}</span>
        </div>
        <div class="stat-item energy">
          <span class="stat-icon">⚡</span>
          <span class="stat-value" id="stat-energy">${player.energy}</span>
          <span class="stat-label">Energy</span>
        </div>
        <div class="stat-item health">
          <span class="stat-icon">❤️</span>
          <span class="stat-value" id="stat-health">${player.health}</span>
          <span class="stat-label">Health</span>
        </div>
        <div class="stat-item happiness">
          <span class="stat-icon">😊</span>
          <span class="stat-value" id="stat-happy">${player.happiness}</span>
          <span class="stat-label">Happy</span>
        </div>
      </div>

      <!-- v0.108.20 §46: news ticker strip — source order BETWEEN the stats
           HUD above and the chat/conversation area below. Fixed height in
           both modes (compact text scale vs full scale); true-black-flat
           styling (no gradients, no shadows). Data comes from /api/ticker,
           which shares the §16 newspaper source — never invented. -->
      <div class="news-ticker" id="news-ticker" style="display: none; background: #000; color: #fff; height: 28px; line-height: 28px; overflow: hidden; white-space: nowrap; flex-shrink: 0; padding: 0 8px; font-size: 12px; align-items: center;">
        <span class="ticker-label" id="ticker-label" style="font-weight: bold; margin-right: 8px; flex-shrink: 0;"></span><span class="ticker-marquee" style="display: inline-block; overflow: hidden; flex: 1; vertical-align: middle;"><span class="ticker-track" id="ticker-track" style="display: inline-block; white-space: nowrap; will-change: transform;"></span></span>
      </div>

      <!-- v0.108.16 order: character first, then core daily verbs, then
           goals/progress tracking, then money and assets, then the social
           world, with Help last as reference. Same buttons, same commands
           — order only. Buttons marked quick-btn-expanded show only in
           full-screen mode (CSS-gated); the rest show in both modes. -->
      <div class="quick-actions">
        <button class="quick-btn" data-cmd="status">📊 Status</button>
        <button class="quick-btn" data-cmd="home">🏡 Home</button>
        <button class="quick-btn" data-cmd="work">💼 Work</button>
        <button class="quick-btn" data-cmd="sleep">😴 Sleep</button>
        <button class="quick-btn" data-cmd="explore">👀 Explore</button>
        <button class="quick-btn" data-cmd="talk">💬 Talk</button>
        <button class="quick-btn" data-cmd="goals">🎯 Goals</button>
        <button class="quick-btn" data-cmd="journal">📖 Journal</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="quests">🗺️ Quests</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="skills">🧠 Skills</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="achievements">🏆 Achievements</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="bank">🏦 Bank</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="properties">🏠 Property</button>
        <button class="quick-btn" data-cmd="businesses">🏪 Businesses</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="investments">📈 Investments</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="vehicles">🚗 Vehicles</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="people">👥 People</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="phone">📱 Phone</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="mail">📬 Mail</button>
        <button class="quick-btn quick-btn-expanded" data-cmd="factions">🏴 Factions</button>
        <button class="quick-btn" data-cmd="help">❓ Help</button>
      </div>

      <div id="save-warning" class="save-warning" style="display: none;"><span id="save-warning-text">⚠️ Server save failed — progress is stored on this device only and may not survive a refresh.</span> <button id="save-retry-btn" class="save-warning-btn">Retry save</button> <button id="save-servercopy-btn" class="save-warning-btn">Use server copy (replaces this device's copy)</button></div>
      
      <div class="conversation" id="conversation">
        <div class="msg system">Welcome back, ${player.name}. What would you like to do?</div>
      </div>
      
      <div class="input-area">
        <div class="input-wrapper">
          <input type="text" class="cmd-input" id="cmd-input" placeholder="What do you want to do?" autocomplete="off" autofocus>
          <button class="send-btn" id="send-btn">➤</button>
        </div>
      </div>
      
      <!-- Game Menu Overlay -->
      <div class="game-menu-overlay" id="game-menu" style="display: none;">
        <div class="game-menu-content">
          <h3>Game Menu</h3>
          <p class="game-menu-caption">Paused</p>
          <div class="game-menu-list">
            <div class="game-menu-section-label">Play</div>
            <button class="menu-item" data-action="resume"><span class="menu-item-label">▶ Resume</span><span class="menu-item-desc">Jump back into your life</span></button>
            <button class="menu-item" data-action="save"><span class="menu-item-label">💾 Save Game</span><span class="menu-item-desc">Save your progress right now</span></button>
            <div class="game-menu-section-label">Options</div>
            <button class="menu-item" data-action="settings"><span class="menu-item-label">⚙ Settings</span><span class="menu-item-desc">Display, theme, and full-screen view</span></button>
            <button class="menu-item" data-action="updates"><span class="menu-item-label">📜 What's New</span><span class="menu-item-desc">See what's new in this version</span></button>
            <button class="menu-item danger" data-action="quit"><span class="menu-item-label">🚪 Quit to Menu</span><span class="menu-item-desc">Leave your life and return to the main menu</span></button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  bindGameEvents();
  // Sync the expand button label and mode classes with the live mode.
  applyViewMode(viewMode);
  // v0.108.12: restore the visible conversation history. Re-rendering the
  // game screen used to wipe it (Settings → Back was the worst path: it
  // also dumped the player on the main menu). History lives in state and
  // is replayed here without re-pushing it.
  const convEl = document.getElementById('conversation');
  if (convEl) {
    for (const m of state.conversationHistory.slice(-50)) {
      const msgEl = document.createElement('div');
      // v0.108.18: replayed messages keep their sender header and bubble
      // class — previously every replay rendered as a headerless "game"
      // message, so NPC replies lost their name headers on re-render.
      msgEl.className = `msg ${m.cls ?? (m.role === 'user' ? 'player' : 'game')}`;
      msgEl.innerHTML = m.sender
        ? `<div class="msg-sender">${escapeHtml(m.sender)}</div><div class="msg-text">${formatText(m.content)}</div>`
        : formatText(m.content);
      convEl.appendChild(msgEl);
    }
    convEl.scrollTop = convEl.scrollHeight;
  }
  // Reflect the last server-sync outcome in the banner, and mark the app
  // ready for Journeys (once per session load).
  // v0.108.21 (§56): re-rendering rebuilds the banner div, so restore
  // the class-specific text (never the default generic line) when the
  // banner is shown for a known failure.
  if (!state.lastServerSyncOk && state.lastSaveFailureClass) setSaveWarningText(state.lastSaveFailureClass);
  setSaveWarningVisible(!state.lastServerSyncOk);
  void journeyAppReady();
}

// v0.108.22 (F2): one command in flight at a time — see handleCommand.
let commandInFlight = false;

function bindGameEvents() {
  wireSaveWarningActions();
  const convEl = document.getElementById('conversation');
  const cmdInput = document.getElementById('cmd-input') as HTMLInputElement;
  const sendBtn = document.getElementById('send-btn');
  const menuToggle = document.getElementById('menu-toggle');
  const gameMenu = document.getElementById('game-menu');

  // Send command
  const sendCommand = () => {
    const input = cmdInput?.value.trim();
    if (!input || commandInFlight) return;
    handleCommand(input, convEl!);
    cmdInput.value = '';
  };

  sendBtn?.addEventListener('click', sendCommand);
  cmdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCommand();
  });

  // Quick actions — v0.108.17: a quick press is an explicit game command,
  // never NPC chat. It goes through the command path with asCommand, so it
  // works mid-conversation (the server exits the conversation first, then
  // dispatches). Typed input above keeps the old behavior: text typed
  // mid-conversation still goes to the NPC. The typed draft is left
  // untouched — a quick press no longer clobbers it.
  const sendQuickCommand = (cmd: string) => {
    if (commandInFlight) return;
    void handleCommand(cmd, convEl!, { asCommand: true });
  };
  document.querySelectorAll('.quick-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) sendQuickCommand(cmd);
    });
  });

  // v0.108.16: the quick bar scrolls horizontally, but a plain mouse wheel
  // emits vertical deltas that do nothing for horizontal overflow — so in
  // full-screen view (where the bar is long enough to overflow), translate
  // a mostly-vertical wheel into horizontal scrolling. Compact mode keeps
  // default wheel behavior so the page can still scroll. Touch swipe and
  // trackpad horizontal swipes work natively via overflow-x.
  const quickBar = document.querySelector('.quick-actions');
  quickBar?.addEventListener('wheel', (e) => {
    const gameScreen = document.querySelector('.game-screen');
    if (!gameScreen?.classList.contains('fullscreen')) return;
    const wheelEvent = e as WheelEvent;
    if (Math.abs(wheelEvent.deltaX) >= Math.abs(wheelEvent.deltaY)) return;
    if (quickBar.scrollWidth <= quickBar.clientWidth) return;
    e.preventDefault();
    quickBar.scrollLeft += wheelEvent.deltaY;
  }, { passive: false });

  // Menu toggle
  menuToggle?.addEventListener('click', () => {
    if (gameMenu) {
      gameMenu.style.display = gameMenu.style.display === 'none' ? 'flex' : 'none';
    }
  });
  
  // Menu actions
  document.querySelectorAll('.game-menu-content .menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      handleGameMenuAction(action || '');
    });
  });

  // Full-screen expand/exit — the native click event is required: the
  // Devvit client rejects anything that is not a trusted click.
  document.getElementById('expand-btn')?.addEventListener('click', (e) => {
    void onExpandButtonClick(e);
  });

  // v0.108.20 §46: start (or restart) the ticker rotation.
  void startTicker();

}

// v0.108.20 §46: ticker rotation — one headline at a time, ~8s, from
// v0.108.21 (§55): SCROLLING marquee — the old 8-second rotation
// timer is gone. The strip renders the FULL headline pool joined
// with separators, duplicated once for a seamless loop, animated
// by CSS keyframes (translateX 0 → −50%, linear, infinite,
// duration scaled to content length with a 40s floor). Hover
// pauses the scroll; releasing resumes. Off / empty / failed
// fetch hides the strip; nothing is ever invented for it.
async function startTicker(): Promise<void> {
  // Keyframes injected once (the client bundle carries no stylesheet
  // of its own — the strip's styling is inline, so the animation
  // rule rides along the same way).
  if (!document.getElementById('ticker-keyframes')) {
    const style = document.createElement('style');
    style.id = 'ticker-keyframes';
    style.textContent = `@keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } } .news-ticker:hover .ticker-track { animation-play-state: paused; }`;
    document.head.appendChild(style);
  }
  const strip = document.getElementById('news-ticker');
  const labelEl = document.getElementById('ticker-label');
  const trackEl = document.getElementById('ticker-track');
  if (!strip || !labelEl || !trackEl) return;
  // Compact text scale vs full scale; same 28px height in both modes.
  strip.style.fontSize = isFullscreen() ? '14px' : '12px';
  try {
    const res = await towFetch(`/api/ticker?slot=${state.activeSlot}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) { strip.style.display = 'none'; return; }
    const data = await res.json();
    if (data.mode === 'off' || !data.headlines?.length) { strip.style.display = 'none'; return; }
    labelEl.textContent = data.mode === 'world' ? 'World news' : 'Local news';
    const joined = data.headlines.join(' • ') + ' • ';
    trackEl.textContent = joined + joined;
    (trackEl as HTMLElement).style.animation = `ticker-scroll ${Math.max(40, joined.length / 8)}s linear infinite`;
    strip.style.display = 'flex';
  } catch {
    strip.style.display = 'none';
  }
}

async function handleGameMenuAction(action: string) {
  const gameMenu = document.getElementById('game-menu');
  const convEl = document.getElementById('conversation');
  
  switch (action) {
    case 'resume':
      if (gameMenu) gameMenu.style.display = 'none';
      break;
    case 'save':
      // Save to the session's slot (v0.108.12: was hardcoded slot 1)
      if (state.player) {
        const success = await clientSave(state.activeSlot, state.player);
        if (success && convEl) {
          addMessage(convEl, 'system', state.lastServerSyncOk
            ? `💾 Game saved to slot ${state.activeSlot}!`
            : `💾 Saved on this device, but the server sync failed — see the warning above.`);
        } else if (convEl) {
          addMessage(convEl, 'system', '❌ Failed to save game.');
        }
      }
      if (gameMenu) gameMenu.style.display = 'none';
      break;
    case 'settings':
      state.settingsReturnTo = 'game';
      state.currentScreen = 'settings';
      render();
      break;
    case 'updates':
      state.updatesReturnTo = 'game';
      state.currentScreen = 'updates';
      render();
      break;
    case 'quit':
      // Auto-save before quitting, then close the play-session journey.
      if (state.player) {
        await clientSave(state.activeSlot, state.player);
      }
      await journeyEnd();
      state.currentScreen = 'main-menu';
      render();
      break;
  }
}

async function handleCommand(input: string, convEl: HTMLElement, opts?: { asCommand?: boolean }) {
  // v0.108.22 (F2): serialize sends — no overlapping commands, no
  // autosave racing the next command's save. While a command is in
  // flight (response + autosave), further sends are ignored; the
  // input is disabled so the player can see why.
  if (commandInFlight) return;
  commandInFlight = true;
  const cmdInputEl = document.getElementById('cmd-input') as HTMLInputElement | null;
  const sendBtnEl = document.getElementById('send-btn') as HTMLButtonElement | null;
  if (cmdInputEl) cmdInputEl.disabled = true;
  if (sendBtnEl) sendBtnEl.disabled = true;
  // Add player message
  addMessage(convEl, 'player', input);

  // Show thinking
  const thinkingEl = addThinking(convEl);

  try {
    // Send player state with request (stateless server)
    const res = await towFetch("/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        player: state.player,  // Send current state
        slot: state.activeSlot,  // v0.108.12: was server-default slot 1
        // v0.108.17: quick presses set asCommand so the server runs the
        // game command even mid-conversation; typed input omits it (false)
        // so chat mid-conversation still goes to the NPC.
        asCommand: !!opts?.asCommand,
      }),
    });
    const data: GameData = await res.json().catch(() => null);

    thinkingEl?.remove();

    // v0.108.22 (F14): a server body/validation rejection arrives as
    // a JSON error, not a player — show it and stop, never render
    // "..." or adopt anything from it.
    if (data?.error) {
      addMessage(convEl, 'system', `⚠️ ${data.error}`);
    } else if (data) {
      const sender = data.npcName || "The World";
      let displayText = data.text || "...";
      // v0.108.20 (§13/§16): best-effort community appends — failed
      // fetches omit the section, never an error, never invented names.
      const firstWord = input.trim().toLowerCase().split(/\s+/)[0];
      if (firstWord === 'status' || firstWord === 'news') {
        try {
          const lb = await towFetch('/api/leaderboard', { signal: AbortSignal.timeout(3000) });
          if (lb.ok) {
            const board = await lb.json();
            if (firstWord === 'status' && board.me) {
              displayText += `\n\n🏆 Community rank: #${board.me.rank}`;
            } else if (firstWord === 'news' && board.top?.length) {
              const top3 = board.top.slice(0, 3).map((e: any) => `#${e.rank} ${e.username} — ${e.xp.toLocaleString()} XP`).join('\n');
              displayText += `\n\n**Community top 3:**\n${top3}`;
            }
          }
        } catch { /* section omitted */ }
      }
      // v0.108.23 §63: help responses render through the structured
      // help formatter (section titles + one card per entry); every
      // other message keeps the plain formatText path.
      if (firstWord === 'help' && !data.npcName) addHelpMessage(convEl, displayText, sender);
      else addMessage(convEl, data.npcName ? 'npc' : 'game', displayText, sender);

      // v0.108.12: the server flags a failed server save instead of
      // reporting success — surface it in the banner immediately (the
      // autosave below will re-evaluate it on its own result).
      // v0.108.21 (§56): the banner names the failure class.
      if (data.saveFailed) {
        state.lastServerSyncOk = false;
        state.lastSaveFailureClass = (data.saveFailure === 'stale' || data.saveFailure === 'transport' || data.saveFailure === 'redis' || data.saveFailure === 'payload')
          ? (data.saveFailure as SaveFailureClass) : 'redis';
        setSaveWarningText(state.lastSaveFailureClass);
        setSaveWarningVisible(true);
      }
      // v0.108.20 (item 28c): a stale rejection already re-synced
      // state.player to the newer copy above — keep the banner up.
      // v0.108.22 (F3): a cross-install stale names its cause.
      if (data.stale) {
        state.lastServerSyncOk = false;
        state.lastSaveFailureClass = data.staleCause === 'cross-install' ? 'crossInstall' : 'stale';
        setSaveWarningText(state.lastSaveFailureClass);
        setSaveWarningVisible(true);
      }

      // v0.108.20 §46: a ticker toggle takes effect on the strip now,
      // not on the next screen render.
      if (firstWord === 'ticker') void startTicker();

      // Update stats from server response
      if (data.player) {
        // v0.108.22 (F1): adopt the command-path stamp + sequence
        // BEFORE autosaving — the dropped stamp was the routine
        // spurious-stale producer. The autosave below is AWAITED
        // (F2): the next command cannot start until this one and
        // its autosave have settled.
        state.player = adoptServerStamp(data.player, data.lastSaved, data.saveSeq) as PlayerState;
        updateStats(state.player);
        // Persist progress automatically after each successful command
        await clientSave(state.activeSlot, state.player);
        // Journeys milestone check (best-effort, never blocks play).
        checkJourneyMilestones(state.player);
      }
    } else {
      addMessage(convEl, 'system', "Connection lost. Try again.");
    }
  } catch (e) {
    thinkingEl?.remove();
    addMessage(convEl, 'system', "Error processing command.");
  }
  // v0.108.22 (F2): release the send lock on every exit path.
  commandInFlight = false;
  if (cmdInputEl) cmdInputEl.disabled = false;
  if (sendBtnEl) sendBtnEl.disabled = false;
}

// v0.108.23 §63: help messages render as structured cards (section
// titles + one entry card per bullet). formatHelpMessage escapes
// first, so this innerHTML is safe; history replay keeps the plain
// formatText path.
function addHelpMessage(container: HTMLElement, content: string, sender: string) {
  const msgEl = document.createElement('div');
  msgEl.className = 'msg game help-msg';
  msgEl.innerHTML = `<div class="msg-sender">${escapeHtml(sender)}</div>${formatHelpMessage(content)}`;
  container.appendChild(msgEl);
}

function addMessage(container: HTMLElement, type: string, content: string, sender?: string) {  const msgEl = document.createElement('div');
  msgEl.className = `msg ${type}`;

  if (sender) {
    msgEl.innerHTML = `
      <div class="msg-sender">${escapeHtml(sender)}</div>
      <div class="msg-text">${formatText(content)}</div>
    `;
  } else {
    msgEl.innerHTML = formatText(content);
  }
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  
  state.conversationHistory.push({ role: type === 'player' ? 'user' : 'assistant', content, sender, cls: type });
}

function addThinking(container: HTMLElement): HTMLElement {
  const msgEl = document.createElement('div');
  msgEl.className = 'msg game thinking';
  msgEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  return msgEl;
}

// v0.108.12 fix: escape HTML BEFORE markdown conversion. The old code
// converted **bold**/newlines to HTML and injected the result via
// innerHTML without ever escaping input, so a player name or echoed
// command containing markup rendered as live HTML (self-XSS path).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatText(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function updateStats(player: PlayerState) {
  // Update HUD stats
  const moneyEl = document.getElementById('stat-money');
  const bankEl = document.getElementById('stat-bank');
  const energyEl = document.getElementById('stat-energy');
  const healthEl = document.getElementById('stat-health');
  const happyEl = document.getElementById('stat-happy');

  if (moneyEl) moneyEl.textContent = fmtMoney(player.money);
  if (bankEl) bankEl.textContent = `Bank ${fmtMoney(player.bankBalance ?? 0)}`;
  if (energyEl) energyEl.textContent = String(player.energy);
  if (healthEl) healthEl.textContent = String(player.health);
  if (happyEl) happyEl.textContent = String(player.happiness);
  
  // Update header location/time/date/weather
  // v0.108.8 fix: renderGameScreen() paints these spans as .time-display /
  // .date-display / .weather-display, but this function queried .time /
  // .date / .weather — which match nothing — so the header clock, date and
  // weather NEVER updated after a command (money/energy/health/happy update
  // by id and worked fine). The engine clock was advancing server-side all
  // along; only the dashboard repaint was dead. Query the real classes
  // first, with the old names as fallback.
  const locationEl = document.querySelector('.header-center .location');
  const timeEl = document.querySelector('.header-center .time-display') || document.querySelector('.header-center .time');
  const dateEl = document.querySelector('.header-center .date-display') || document.querySelector('.header-center .date');
  const weatherEl = document.querySelector('.header-center .weather-display') || document.querySelector('.header-center .weather');
  
  if (locationEl) {
    const districtDisplay = formatDistrictName(player.district);
    const cityDisplay = formatCityName(player.city);
    locationEl.innerHTML = `📍 ${districtDisplay} · ${cityDisplay}`;
  }
  
  if (timeEl && player.gameTime) {
    timeEl.innerHTML = `🕐 ${player.gameTime}`;
  }
  
  if (dateEl && player.gameDate) {
    dateEl.innerHTML = `📅 ${player.gameDate}`;
  }
  
  if (weatherEl && player.weather) {
    const conditionEmoji = player.weather.condition === 'rainy' ? '🌧️' 
      : player.weather.condition === 'stormy' ? '⛈️'
      : player.weather.condition === 'hot' ? '🔥'
      : player.weather.condition === 'cold' ? '❄️'
      : player.weather.condition === 'cloudy' ? '☁️'
      : '☀️';
    weatherEl.innerHTML = `🌡️ ${player.weather.temp}°F ${conditionEmoji}`;
  }
}

// ============================================
// GAME START
// ============================================

async function startGame(forceNew = false) {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen loading-screen">
      <div class="loading-content">
        <div class="loading-logo">🌍</div>
        <p>Loading world...</p>
      </div>
    </div>
  `;
  
  try {
    // New Game bypasses any autosave
    if (forceNew) {
      showCharacterCreation();
      return;
    }

    // If we already have a player (from auto-load), go straight in
    if (state.player) {
      state.saveAvailable = true;
      state.currentScreen = 'game';
      // Explicit game begin (Continue) — a journey starts here.
      await journeyStart();
      render();
      return;
    }

    // Try loading the primary server/local save
    // v0.108.22 (F12): Continue runs the NEWEST-slot scan itself —
    // the old clientLoad(1) fell back to slot 1 alone when the probe
    // timed out, orphaning a newer slot-2/3 game.
    const loaded = await clientDetectSave();
    if (loaded) {
      state.player = loaded;
      state.saveAvailable = true;
      state.currentScreen = 'game';
      // Explicit game begin (Continue) — a journey starts here.
      await journeyStart();
      render();
      return;
    }

    // v0.108.12: a load FAILURE is not "no save". The old code fell
    // through to character creation with only a console error, so a
    // player with a real save could overwrite it with a fresh character
    // during a server outage. Show an error screen with Retry instead.
    // v0.108.22 (F6/F12): a scan error counts too — a 5xx anywhere in
    // the scan is an error screen, never creation.
    if (lastClientLoadFailed || lastServerScanError) {
      rootEl.innerHTML = `
        <div class="screen loading-screen">
          <div class="loading-content">
            <div class="loading-logo">🌍</div>
            <p>Couldn't load your save — the server didn't respond.</p>
            <p>Your progress is safe. Check your connection and try again.</p>
            <button class="menu-btn" id="load-retry">Retry</button>
            <button class="menu-btn" id="load-menu">Back to Menu</button>
          </div>
        </div>
      `;
      document.getElementById('load-retry')?.addEventListener('click', () => startGame(forceNew));
      document.getElementById('load-menu')?.addEventListener('click', () => {
        state.currentScreen = 'main-menu';
        render();
      });
      return;
    }

    // No save found - create a character
    showCharacterCreation();
  } catch (e) {
    console.error("Failed to start game:", e);
    state.currentScreen = 'main-menu';
    render();
  }
}

function showCharacterCreation() {
  if (!rootEl) return;
  
  rootEl.innerHTML = `
    <div class="screen create-screen">
      <div class="create-content">
        <h2>Create Your Character</h2>
        <div class="create-form">
          <input type="text" id="char-name" class="create-input" placeholder="Your name" maxlength="20" autofocus>
          
          <div class="create-section">
            <label>Background</label>
            <select id="char-bg" class="create-select">
              <!-- v0.108.12: labels generated from BACKGROUNDS (shared
                   with the server) — the old hardcoded labels promised
                   the wrong bonuses. -->
              ${BACKGROUNDS.map((bg) => `<option value="${bg.id}">${bg.name} - $${bg.startingMoney}, ${formatBonuses(bg)}</option>`).join('')}
            </select>
          </div>

          <div class="create-section">
            <label>Start City</label>
            <select id="char-city" class="create-select">
              ${Object.entries(WORLD_CITIES).map(([id, c]: [string, any]) => `<option value="${id}"${id === 'west_memphis' ? ' selected' : ''}>${c.displayName}</option>`).join('')}
            </select>
          </div>

          <div class="create-section">
            <label>Trait (optional)</label>
            <select id="char-trait" class="create-select">
              <option value="">No trait</option>
              ${Object.entries(TRAIT_DATA).map(([id, t]: [string, any]) => `<option value="${id}">${id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} — ${t.description}</option>`).join('')}
            </select>
          </div>
          
          <button class="create-btn" id="create-submit">Begin Life</button>
          <p id="create-error" class="create-error"></p>
        </div>
      </div>
    </div>
  `;
  
  const submitBtn = document.getElementById('create-submit');
  const nameInput = document.getElementById('char-name') as HTMLInputElement;
  const bgSelect = document.getElementById('char-bg') as HTMLSelectElement;
  const citySelect = document.getElementById('char-city') as HTMLSelectElement;
  const traitSelect = document.getElementById('char-trait') as HTMLSelectElement;
  
  submitBtn?.addEventListener('click', async () => {
    const name = nameInput?.value.trim() || 'Traveler';
    const background = bgSelect?.value || 'working_class';
    const startCity = citySelect?.value || 'west_memphis';
    const trait = traitSelect?.value || undefined;
    const errEl = document.getElementById('create-error');
    if (errEl) errEl.textContent = '';

    // v0.108.22 (F6): creation is guarded server-side — an occupied
    // slot answers 409 needsConfirm, a load error answers 500. The
    // confirm path resubmits with confirmOverwrite; a load error
    // never proceeds (the existing save may exist but be unreadable).
    const doCreate = async (confirmOverwrite: boolean): Promise<{ res: Response; data: any }> => {
      const res = await towFetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // v0.108.20 (item 28d): creation sends the active slot — today
        // it sends none, so creation always wrote slot 1.
        body: JSON.stringify({ action: "create", firstName: name, background, startCity, trait, slot: state.activeSlot, confirmOverwrite }),
      });
      const data: any = await res.json().catch(() => null);
      return { res, data };
    };

    try {
      let { res, data } = await doCreate(false);
      if (data?.needsConfirm) {
        if (window.confirm('This slot already has a character. Replace it? The old save is backed up on the server first.')) {
          ({ res, data } = await doCreate(true));
        } else {
          return;
        }
      }
      if (data?.player) {
        state.player = data.player;
        state.currentScreen = 'game';
        // Explicit game begin (Begin Life) — a journey starts here.
        await journeyStart();
        render();
      } else if (errEl) {
        errEl.textContent = !res.ok
          ? 'Could not create right now — the server did not respond. Your existing save was NOT touched. Try again.'
          : 'Could not create a character. Try again.';
      }
    } catch (e) {
      console.error("Failed to create character:", e);
      if (errEl) errEl.textContent = 'Could not create right now — the server did not respond. Your existing save was NOT touched. Try again.';
    }
  });
  
  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn?.click();
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCityName(cityId: string | undefined): string {
  if (!cityId) return 'Unknown';
  switch (cityId) {
    case 'west_memphis': return 'West Memphis, AR';
    case 'memphis': return 'Memphis, TN';
    case 'littlerock': return 'Little Rock, AR';
    case 'southaven': return 'Southaven, MS';
    case 'nashville': return 'Nashville, TN';
    case 'atlanta': return 'Atlanta, GA';
    case 'chicago': return 'Chicago, IL';
    case 'new_orleans': return 'New Orleans, LA';
    case 'new_york': return 'New York, NY';
    case 'los_angeles': return 'Los Angeles, CA';
    case 'miami': return 'Miami, FL';
    case 'houston': return 'Houston, TX';
    case 'dallas': return 'Dallas, TX';
    default: return cityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function formatDistrictName(districtId: string | undefined): string {
  if (!districtId) return 'Downtown';
  return districtId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatPlayTime(hours: number): string {
  return `${hours.toFixed(1)}h played`;
}

// v0.108.3 fix: money is always shown with exactly 2 decimals. The header
// stat panel used to print the raw balance, so a fractional-cent balance
// from percentage math showed up as $677.8846153846154.
function fmtMoney(n: number): string {
  return `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
  // ESC to toggle menu
  if (e.key === 'Escape' && state.currentScreen === 'game') {
    const gameMenu = document.getElementById('game-menu');
    if (gameMenu) {
      gameMenu.style.display = gameMenu.style.display === 'none' ? 'flex' : 'none';
    }
  }
  

});

// ============================================
// INITIALIZE
// ============================================


// Flush both localStorage and the authoritative server save before the player leaves.
function flushSaveToLocal(): void {
  if (!state.player) return;
  try {
    const saves = clientLoadAll();
    saves[state.activeSlot] = { ...state.player, savedAt: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  } catch (e) {
    console.warn('[flushSave] local save failed', e);
  }
}

function flushSaveToServer(): boolean {
  if (!state.player) return false;
  try {
    const payload = JSON.stringify({ slot: state.activeSlot, player: state.player });
    if (IS_PC) {
      // sendBeacon cannot set an Authorization header (and a
      // relative URL would miss the hosted backend) — use a
      // keepalive fetch with the session token instead.
      void towFetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => { /* the next load's probe picks newest */ });
      return true;
    }
    return navigator.sendBeacon('/api/save', new Blob([payload], { type: 'application/json' }));
  } catch (e) {
    console.warn('[flushSave] server beacon failed', e);
    return false;
  }
}

function flushSave(): void {
  flushSaveToLocal();
  flushSaveToServer();
}

// Save progress when the user leaves/closes the game window
window.addEventListener('beforeunload', flushSave);

// Also flush when the tab is hidden (mobile app switching, etc.)
// v0.108.22 (F4): hidden-tab flush is LOCAL ONLY. The old code also
// sent a server beacon on every hide — beacon responses are never
// read, so the stamp never got adopted, and returning after >5s
// tripped stale on the next command (or silently overwrote a newer
// command save within 5s). On return, re-fetch the server stamp
// and adopt it (stamp-only — session state is untouched) so the
// next command is not stale. beforeunload keeps its beacon: the
// session ends there, and the next load's probe picks newest.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.player) {
    flushSaveToLocal();
  } else if (!document.hidden && state.player) {
    void (async () => {
      try {
        const res = await towFetch(`/api/load?slot=${state.activeSlot}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.player && typeof data.player.lastSaved === 'number') {
            state.player = adoptServerStamp(state.player, data.player.lastSaved, data.player.saveSeq);
          }
        }
      } catch { /* the next command's guard handles it */ }
    })();
  }
});

// Read the live screen mode before the first paint so mode classes and
// button labels are correct from the start, then keep them in sync.
initViewModeListener();

// v0.108.12: apply persisted settings before the first paint so a
// returning player never flashes the defaults.
applySettings();

// Start with landing screen — on PC the account gate (pcBoot) runs
// first and lands there after login; on Reddit this is unchanged.
if (IS_PC) {
  void pcBoot();
} else {
  render();
}
