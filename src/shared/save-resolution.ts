// THE OPEN WORLD — save resolution (v0.108.20, item 28 P0 fix).
// Pure, shared logic used by BOTH the client (load-time choice) and
// the server (write-time guard). One module, one rule, no drift:
// last-write-wins, newest slot wins, stale writes are rejected —
// never silently overwritten. A player with NO timestamp is always
// treated as current (old objects must never break).

export const STALE_SKEW_MS = 5000;

/** The comparable timestamp of a save: server stamp first, then local. */
export function playerTimestamp(p: any): number | null {
  if (!p || typeof p !== 'object') return null;
  const t = p.lastSaved ?? p.savedAt;
  return typeof t === 'number' && Number.isFinite(t) ? t : null;
}

/** The SERVER stamp only (lastSaved). Device savedAt is never a
 *  server stamp — mixing the two clocks is what F8 fixes. */
export function serverTimestamp(p: any): number | null {
  if (!p || typeof p !== 'object') return null;
  const t = p.lastSaved;
  return typeof t === 'number' && Number.isFinite(t) ? t : null;
}

/** Pick the newer of a server copy and a local copy. Ties go to the
 *  server (the previous mirror behavior, now earned rather than
 *  assumed). Returns which side won so the caller can migrate or
 *  mirror accordingly.
 *  v0.108.22 (F8): SERVER-STAMP PREFERENCE at load time. A copy
 *  carrying a server stamp (lastSaved) always beats a copy carrying
 *  only a device timestamp (savedAt) — a device clock ahead of
 *  server time must never let stale local content win and migrate
 *  over newer server progress. Only when NEITHER copy has a server
 *  stamp do device timestamps decide. Callers MUST back up a
 *  displaced local copy before overwriting it (see the client's
 *  backupLocalCopy), because this rule can set aside genuine
 *  local-only progress in favor of an older server copy — the
 *  backup keeps that loss recoverable instead of destructive.
 *  This intentionally supersedes the v0.108.20 check
 *  "local savedAt newer beats server lastSaved" — that check
 *  encoded the mixed-clock comparison F8 removes. */
export function pickNewerSave(
  server: any | null,
  local: any | null,
): { player: any | null; source: 'server' | 'local' | 'none' } {
  if (server && local) {
    const sStamp = serverTimestamp(server);
    const lStamp = serverTimestamp(local);
    if (sStamp !== null && lStamp !== null) {
      return lStamp > sStamp ? { player: local, source: 'local' } : { player: server, source: 'server' };
    }
    if (sStamp !== null) return { player: server, source: 'server' };
    if (lStamp !== null) return { player: local, source: 'local' };
    const st = playerTimestamp(server);
    const lt = playerTimestamp(local);
    if (lt !== null && st !== null) {
      return lt > st ? { player: local, source: 'local' } : { player: server, source: 'server' };
    }
    if (lt !== null) return { player: local, source: 'local' };
    if (st !== null) return { player: server, source: 'server' };
    return { player: server, source: 'server' };
  }
  if (server) return { player: server, source: 'server' };
  if (local) return { player: local, source: 'local' };
  return { player: null, source: 'none' };
}

/** Pick the newest save across slots. Never the lowest number:
 *  a game living in slot 2/3 must not lose to an older slot-1 save.
 *  Ties keep the lowest slot (deterministic). */
export function pickNewestSlot(
  slots: { slot: number; player: any }[],
): { slot: number; player: any } | null {
  let best: { slot: number; player: any } | null = null;
  let bestTs = -1;
  for (const s of slots) {
    if (!s.player) continue;
    const t = playerTimestamp(s.player) ?? 0;
    if (best === null || t > bestTs) {
      best = s;
      bestTs = t;
    }
  }
  return best;
}

/** True when a stored copy is newer than an incoming write by more
 *  than the skew tolerance — i.e. the incoming write is stale and
 *  must be rejected, never applied. Timestamp-less incoming writes
 *  are never rejected. */
export function isStaleWrite(incoming: any, stored: any, skewMs: number = STALE_SKEW_MS): boolean {
  // v0.108.21 (§56): SERVER-STAMP-ONLY gating. A write is stale
  // ONLY when it carries a SERVER stamp (lastSaved) older than the
  // stored server stamp by more than the skew tolerance. A write
  // with NO lastSaved is never rejected — its device savedAt must
  // never gate a server write, because a device clock behind server
  // time by >5s (common drift) would otherwise reject EVERY such
  // write forever and surface only as a generic "save failed"
  // banner. Device savedAt still informs the CLIENT-side
  // last-write-wins load choice (both copies survive there); it
  // simply cannot block a server write.
  const it = typeof incoming?.lastSaved === 'number' && Number.isFinite(incoming.lastSaved)
    ? incoming.lastSaved : null;
  const st = typeof stored?.lastSaved === 'number' && Number.isFinite(stored.lastSaved)
    ? stored.lastSaved : null;
  if (it === null || st === null) return false;
  return st > it + skewMs;
}

// ---- v0.108.21 (§56): SPECIFIC SAVE-FAILURE CLASSES ----
// Server and client agree on these four classes so the next
// failure report is diagnosable. The old generic banner line is
// retired — every failure shows its own class text.
// v0.108.22 (F1/F3): two more classes. `autosaveStale` is the
// autosave-path re-sync: the command WAS applied and saved, so the
// banner must never say "not applied". `crossInstall` names the
// cross-session cause instead of "try it again".
export type SaveFailureClass = 'stale' | 'transport' | 'redis' | 'payload' | 'autosaveStale' | 'crossInstall';

export const SAVE_WARNING_TEXTS: Record<SaveFailureClass, string> = {
  stale: '⚠️ Server holds a newer copy of your game — re-synced to it. Your last command was not applied; try it again.',
  transport: '⚠️ Could not reach the server — progress is saved on this device only and may not survive a refresh. An automatic retry already ran; use Retry save below.',
  redis: '⚠️ Server storage failed — progress is saved on this device only and may not survive a refresh. An automatic retry already ran; use Retry save below.',
  payload: '⚠️ Save too large for the server — progress is saved on this device only and may not survive a refresh. (Normal saves are far below this limit.)',
  autosaveStale: '⚠️ Autosave re-synced to the newer server copy — your last command is safe.',
  crossInstall: '⚠️ Another session has a newer copy of your game — re-synced to it. Your last command was not applied; try it again.',
};

// Max /api/save body the server accepts before answering 413
// (payload class). Normal saves are tens of KB; 512KB is generous.
export const SAVE_MAX_BODY_BYTES: number = 512 * 1024;

export function saveWarningText(kind: SaveFailureClass): string {
  return SAVE_WARNING_TEXTS[kind];
}

// Classify a /api/save HTTP outcome into a failure class.
// Stale is a 200 with the stale flag (never a retry candidate —
// stale re-syncs instead). 500 = server storage; 413 = payload;
// any other non-OK = transport (the client retried already).
// v0.108.22 (F14): a 400 body rejection (oversize handled as 413,
// malformed JSON as 400) is a payload-class problem, never redis.
export function failureClassForSaveResponse(res: { ok: boolean; status: number; stale?: boolean }): SaveFailureClass | null {
  if (res.stale) return 'stale';
  if (res.ok) return null;
  if (res.status === 413 || res.status === 400) return 'payload';
  if (res.status === 500) return 'redis';
  return 'transport';
}

// ---- v0.108.22 (save-server audit fixes) ----

/** Why a write was rejected as stale. `cross-install` means the
 *  stored copy was last written from a different install (subreddit)
 *  than the incoming write — the one case where "try it again"
 *  without naming the cause misleads the player. */
export type StaleCause = 'time' | 'sequence' | 'cross-install';

/** Name the stale cause from the stored copy's install tag and the
 *  current install. A stored copy tagged with a different install
 *  is a cross-install hit even when the timestamps also skew. */
export function staleCauseFor(stored: any, currentInstall: string | null): StaleCause {
  const tag = typeof stored?.lastInstall === 'string' ? stored.lastInstall : null;
  if (tag !== null && currentInstall !== null && tag !== currentInstall) return 'cross-install';
  return 'time';
}

/** Adopt a server stamp + write sequence into a player object
 *  (F1: the command path, autosave, and migrations all adopt the
 *  same way — no path may post a write carrying an older stamp).
 *  Returns a NEW object; the input is never mutated. */
export function adoptServerStamp(player: any, lastSaved?: number, saveSeq?: number): any {
  if (!player || typeof player !== 'object') return player;
  const out = { ...player };
  if (typeof lastSaved === 'number' && Number.isFinite(lastSaved)) out.lastSaved = lastSaved;
  if (typeof saveSeq === 'number' && Number.isFinite(saveSeq)) out.saveSeq = saveSeq;
  return out;
}

/** Next write sequence for a save: one past the greater of the
 *  stored sequence and the incoming sequence (both default 0).
 *  Old saves carry no sequence and always get 1 on their first
 *  guarded write. */
export function nextSaveSeq(storedSeq?: number, incomingSeq?: number): number {
  const s = typeof storedSeq === 'number' && Number.isFinite(storedSeq) ? storedSeq : 0;
  const i = typeof incomingSeq === 'number' && Number.isFinite(incomingSeq) ? incomingSeq : 0;
  return Math.max(s, i) + 1;
}

/** True when an incoming write carries an OLDER write sequence
 *  than the stored copy — a within-5s last-writer-wins hazard
 *  (F2) that the time-skew guard cannot see. Sequence-less
 *  writes are never rejected (old saves must keep working). */
export function isSequenceStale(incoming: any, stored: any): boolean {
  const i = typeof incoming?.saveSeq === 'number' && Number.isFinite(incoming.saveSeq) ? incoming.saveSeq : null;
  const s = typeof stored?.saveSeq === 'number' && Number.isFinite(stored.saveSeq) ? stored.saveSeq : null;
  if (i === null || s === null) return false;
  return i < s;
}

/** Valid save slots (F17). Accepts the JSON number or string form;
 *  anything else — including "0", "4", "99" — is rejected, never
 *  silently stored under a stray key. */
export function validSlot(slot: unknown): slot is '1' | '2' | '3' {
  return slot === 1 || slot === 2 || slot === 3 || slot === '1' || slot === '2' || slot === '3';
}
export function normalizeSlot(slot: unknown): '1' | '2' | '3' {
  return String(slot) as '1' | '2' | '3';
}

/** True when at least one Reddit identity signal exists (F17).
 *  All three absent means the traffic is identity-less and must
 *  never write under the shared "player" fallback key. */
export function hasIdentity(userId: unknown, username: unknown, loid: unknown): boolean {
  return userId != null || username != null || loid != null;
}

/** Load-outcome classification (F6). A fetch THROW and a 5xx are
 *  ERRORS; a clean 404 is ABSENT. The old client code treated only
 *  throws as failures, so a Redis error answering 404 fell through
 *  to character creation — this is the distinction that closes it. */
export type LoadOutcome = 'found' | 'absent' | 'error';
export function loadOutcomeFromFetch(status: number | null, threw: boolean): LoadOutcome {
  if (threw) return 'error';
  if (status === null) return 'error';
  if (status === 200) return 'found';
  if (status === 404) return 'absent';
  return 'error';
}

/** Character-creation guard decision (F6). Creation into an
 *  occupied slot requires an explicit overwrite confirmation, and
 *  creation NEVER runs while a load error is outstanding (the
 *  stored save may exist but be unreadable right now). */
export function canCreate(opts: { loadOutcome: LoadOutcome; occupied: boolean; confirmOverwrite: boolean }): { allowed: boolean; reason?: string } {
  if (opts.loadOutcome === 'error') return { allowed: false, reason: 'loadError' };
  if (opts.occupied && !opts.confirmOverwrite) return { allowed: false, reason: 'needsConfirm' };
  return { allowed: true };
}

/** Clock-skew notice (F8). True when the device clock sits more
 *  than `marginMs` BEHIND the newest known server stamp — the
 *  direction that used to reject every write. (A device clock
 *  ahead is normal: time passes after the stamp.) */
export function deviceClockBehind(serverStamp: number | null, deviceNow: number, marginMs = 60000): boolean {
  if (serverStamp === null) return false;
  return serverStamp > deviceNow + marginMs;
}

/** Migration outcome (F21). Maps a /api/save response to what the
 *  caller must do with the session player: adopt the stamp on
 *  success, re-sync to the server copy on stale, do nothing (and
 *  warn) on any other failure. Never fire-and-forget. */
export type MigrationOutcome =
  | { action: 'adopt'; lastSaved?: number; saveSeq?: number }
  | { action: 'resync'; player: any }
  | { action: 'failed' };
export function migrationOutcome(res: { ok: boolean; stale?: boolean; player?: any; lastSaved?: number; saveSeq?: number }): MigrationOutcome {
  if (res.stale && res.player) return { action: 'resync', player: res.player };
  if (res.ok) return { action: 'adopt', lastSaved: res.lastSaved, saveSeq: res.saveSeq };
  return { action: 'failed' };
}

/** Autosave-stale safety (F1). The autosave re-posts the post-command
 *  player carrying the sequence the command-path save wrote. If the
 *  stored copy carries the SAME sequence, the server copy IS that
 *  command's save — the re-sync loses nothing and the banner must
 *  say so. Any other case (a later write advanced the sequence) is
 *  a genuine newer copy and gets the cautious stale wording. */
export function autosaveStaleIsSafe(carriedSeq: unknown, storedSeq: unknown): boolean {
  return typeof carriedSeq === 'number' && typeof storedSeq === 'number'
    && Number.isFinite(carriedSeq) && Number.isFinite(storedSeq)
    && carriedSeq === storedSeq;
}

/** Request-body problem class (F14). Oversize and malformed JSON
 *  are both payload-class: the body itself is the problem, never
 *  the storage layer. */
export function bodyFailureClass(opts: { oversize: boolean; malformed: boolean }): SaveFailureClass | null {
  if (opts.oversize || opts.malformed) return 'payload';
  return null;
}
