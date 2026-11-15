// THE OPEN WORLD — Postgres adapters for the PC hosted backend
// (TOW PC phase 2).
//
// PostgresSaveStore (SaveStore) + PostgresCommunityStore
// (CommunityStore) over ONE database and ONE shared key namespace —
// both adapters sit on one PostgresKvStore over one Pool, because
// trading reads save keys through the community store (community.ts:
// createTradeOffer / acceptTradeOffer load both players' saves via
// store.get(saveKey)). Splitting them would break trades; phase 1
// proved this is load-bearing (memory-store.ts).
//
// Schema: backend/migrations/001_init.sql (tow_kv, tow_zset,
// tow_zset_expiry, tow_accounts, tow_sessions). The production entry
// applies it on boot (runMigrations, idempotent).
//
// Expiry semantics — the one place the adapters deliberately differ
// from Redis, because PC saves never expire (scope §3):
//   * SaveStore.set IGNORES its expiration argument: the handler
//     passes a 90-day expiry (the Reddit rule) and PC drops it.
//   * SaveStore.expire is HONORED: the handler uses it for the
//     username index (tow:username:<name>, 365 days), which is
//     meant to fade — it is not a save.
//   * CommunityStore.expire is honored for community keys
//     (challenge totals, trade offers, weekly/monthly boards) but
//     is a NO-OP for save keys: acceptTradeOffer calls
//     store.expire(saveKey, 90d) to preserve the Reddit TTL, and on
//     PC that TTL must not exist. Save keys match SAVE_KEY_RE.
//   * Everything else mirrors Redis: get returns null for an absent
//     OR expired key (expired rows are invisible to reads and the
//     hourly sweep deletes them); del of an absent key is a no-op;
//     expire of an absent key is a no-op; zTop orders score DESC,
//     member ASC (same tie-break as MemoryCommunityStore).
//
// Errors: a backend failure THROWS from get (the handler turns a
// thrown load into a 500, never a "no save" — a transient outage
// plus an innocent "Begin Life" must never overwrite a real save).
// Nothing here swallows a Postgres error into null.
//
// TESTED AGAINST pg-mem, NOT real Postgres (no Postgres runs on the
// dev VM — see backend/README.md). The SQL avoids two constructs
// pg-mem cannot parse (regex `~`, COLLATE) so the adapter tests
// exercise the real statements; the live Render Postgres is the
// final proof.

import { Pool } from "pg";
import type { CommunityStore } from "./community.js";
import type { SaveStore } from "./handler.js";
import { promises as fs } from "node:fs";
import path from "node:path";

/** A pool (real `pg` Pool, or pg-mem's compatible Pool in tests). */
export type PgPoolLike = Pick<Pool, "query" | "end">;

/** Save keys are `tow:<identity>:save:<slot>` (+ `:backup`). The
 *  identity may itself contain ':' (PC ids are `pc:<uuid>`), so the
 *  middle is `.+`, not `[^:]+`. */
const SAVE_KEY_RE = /^tow:.+:save:\d+(:backup)?$/;

/** Create the production pool. Render Postgres requires TLS, so SSL
 *  is ON by default (`rejectUnauthorized: false` — Render's cert is
 *  not in Node's default trust store; this is Render's own documented
 *  Node pattern). A local Postgres without TLS sets
 *  TOW_PG_SSL=false. Pool size 10: Render's free Postgres allows 100
 *  connections and this server is one small process. */
export function createPostgresPool(connectionString: string): Pool {
  const sslOff = process.env.TOW_PG_SSL === "false";
  return new Pool({
    connectionString,
    max: 10,
    ssl: sslOff ? false : { rejectUnauthorized: false },
  });
}

// --- Migration loading ---

/** Load backend/migrations/001_init.sql. Tries, in order: the
 *  TOW_MIGRATIONS_DIR env override, <cwd>/backend/migrations (the
 *  Docker image runs from the tree root), and a path relative to
 *  this file's bundle location (__dirname is dist/pc/server in the
 *  .cjs bundle, src/server unbundled — both are two levels below
 *  the tree root). Throws a loud error when the file cannot be
 *  found — a server that boots without its schema is worse than
 *  one that refuses. */
export async function loadMigrationSql(): Promise<string> {
  const candidates: string[] = [];
  if (process.env.TOW_MIGRATIONS_DIR) {
    candidates.push(path.join(process.env.TOW_MIGRATIONS_DIR, "001_init.sql"));
  }
  candidates.push(path.resolve(process.cwd(), "backend", "migrations", "001_init.sql"));
  // __dirname exists in the .cjs bundle; in an ESM bundle (harness)
  // it does not, so guard the reference — the cwd candidate above
  // covers that case.
  if (typeof __dirname !== "undefined") {
    candidates.push(path.resolve(__dirname, "..", "..", "backend", "migrations", "001_init.sql"));
  }
  let lastErr: unknown = null;
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `[tow-backend] Could not find backend/migrations/001_init.sql (tried ${candidates.join(", ")}). ` +
    `Set TOW_MIGRATIONS_DIR or run from the tree root. Last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

/** Apply the schema migration. Idempotent (every statement is
 *  IF NOT EXISTS), so it is safe on every boot and safe to run by
 *  hand. The whole file runs as one multi-statement query — `pg`
 *  sends it as a single simple query, which Postgres executes
 *  statement by statement. */
export async function runMigrations(pool: PgPoolLike): Promise<void> {
  const sql = await loadMigrationSql();
  await pool.query(sql);
}

// --- Shared key/value + sorted-set core ---

/** One Pool, both namespaces. PostgresSaveStore and
 *  PostgresCommunityStore each hold a reference to the SAME
 *  PostgresKvStore instance — that shared instance IS the shared
 *  key namespace. */
export class PostgresKvStore {
  readonly pool: PgPoolLike;

  constructor(pool: PgPoolLike) {
    this.pool = pool;
  }

  /** Read a key. Null when absent or expired. THROWS on a backend
   *  failure (never null-on-error — see the module note). */
  async kvGet(key: string): Promise<string | null> {
    const r = await this.pool.query(
      `SELECT value FROM tow_kv WHERE key = $1 AND (expires_at IS NULL OR expires_at > now())`,
      [key],
    );
    const row = r.rows[0] as { value: string } | undefined;
    return row ? row.value : null;
  }

  /** Write a key. `expiresAt` null (the default) means never
   *  expires; a Date sets an absolute expiry. An upsert always
   *  REPLACES the previous expiry — a fresh write revives an
   *  expired key, exactly like Redis SET. */
  async kvSet(key: string, value: string, expiresAt: Date | null = null): Promise<void> {
    await this.pool.query(
      `INSERT INTO tow_kv (key, value, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
      [key, value, expiresAt ? expiresAt.toISOString() : null],
    );
  }

  /** Delete a key. Deleting an absent key is a no-op, never an
   *  error. Also drops any zset expiry row for the key, so a
   *  deleted key carries no stale TTL. */
  async kvDel(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM tow_kv WHERE key = $1`, [key]);
    await this.pool.query(`DELETE FROM tow_zset_expiry WHERE key = $1`, [key]);
  }

  /** Set a TTL in seconds from now. A no-op when the key does not
   *  exist (Redis EXPIRE semantics). Only touches tow_kv — see
   *  zsetExpire for sorted-set keys. */
  async kvExpire(key: string, seconds: number): Promise<void> {
    await this.pool.query(
      `UPDATE tow_kv SET expires_at = now() + ($2 || ' seconds')::interval WHERE key = $1`,
      [key, String(seconds)],
    );
  }

  /** Drop an expired sorted set (all members + its expiry row).
   *  Called at the top of every zset operation, so an expired set
   *  reads as empty from the first access after expiry. */
  async purgeExpiredZset(key: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM tow_zset WHERE key = $1 AND EXISTS (
         SELECT 1 FROM tow_zset_expiry e WHERE e.key = $1 AND e.expires_at <= now()
       )`,
      [key],
    );
    await this.pool.query(
      `DELETE FROM tow_zset_expiry WHERE key = $1 AND expires_at <= now()`,
      [key],
    );
  }

  /** Set a TTL on a sorted-set key. A no-op when the set does not
   *  exist (Redis EXPIRE semantics) — checked first, so an expiry
   *  row is never planted for a set that a later write would
   *  inherit. */
  async zsetExpire(key: string, seconds: number): Promise<void> {
    await this.purgeExpiredZset(key);
    const exists = await this.pool.query(
      `SELECT 1 AS one FROM tow_zset WHERE key = $1 LIMIT 1`,
      [key],
    );
    if (exists.rows.length === 0) return;
    await this.pool.query(
      `INSERT INTO tow_zset_expiry (key, expires_at) VALUES ($1, now() + ($2 || ' seconds')::interval)
       ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [key, String(seconds)],
    );
  }

  async zAdd(key: string, member: string, score: number): Promise<void> {
    await this.purgeExpiredZset(key);
    await this.pool.query(
      `INSERT INTO tow_zset (key, member, score) VALUES ($1, $2, $3)
       ON CONFLICT (key, member) DO UPDATE SET score = EXCLUDED.score`,
      [key, member, score],
    );
  }

  async zTop(key: string, n: number): Promise<{ member: string; score: number }[]> {
    await this.purgeExpiredZset(key);
    const r = await this.pool.query(
      `SELECT member, score FROM tow_zset WHERE key = $1 ORDER BY score DESC, member ASC LIMIT $2`,
      [key, n],
    );
    return (r.rows as { member: string; score: number }[]).map((row) => ({
      member: row.member,
      score: Number(row.score),
    }));
  }

  /** 0-based rank, highest first; null when the member is absent.
   *  The count predicate mirrors zTop's ORDER BY exactly (score
   *  DESC, member ASC), so rank and top-N always agree. */
  async zRank(key: string, member: string): Promise<number | null> {
    await this.purgeExpiredZset(key);
    const score = await this.zScore(key, member);
    if (score === null) return null;
    const r = await this.pool.query(
      `SELECT COUNT(*)::int AS n FROM tow_zset
       WHERE key = $1 AND (score > $2 OR (score = $2 AND member < $3))`,
      [key, score, member],
    );
    const row = r.rows[0] as { n: number } | undefined;
    return row ? Number(row.n) : 0;
  }

  async zScore(key: string, member: string): Promise<number | null> {
    await this.purgeExpiredZset(key);
    const r = await this.pool.query(
      `SELECT score FROM tow_zset WHERE key = $1 AND member = $2`,
      [key, member],
    );
    const row = r.rows[0] as { score: number } | undefined;
    return row ? Number(row.score) : null;
  }

  /** Atomic increment (single upsert statement). Returns the new
   *  score. */
  async zIncrBy(key: string, member: string, amount: number): Promise<number> {
    await this.purgeExpiredZset(key);
    const r = await this.pool.query(
      `INSERT INTO tow_zset (key, member, score) VALUES ($1, $2, $3)
       ON CONFLICT (key, member) DO UPDATE SET score = tow_zset.score + EXCLUDED.score
       RETURNING score`,
      [key, member, amount],
    );
    const row = r.rows[0] as { score: number } | undefined;
    if (!row) throw new Error(`[tow-backend] zIncrBy returned no row for ${key}`);
    return Number(row.score);
  }

  /** Atomic numeric increment on a KV key (challenge totals). One
   *  upsert statement, so two concurrent increments serialize
   *  inside Postgres instead of losing one (a SELECT ... FOR UPDATE
   *  transaction would also work on real Postgres, but pg-mem does
   *  not implement row locking, so the single-statement form is the
   *  one both engines prove). A missing key starts from 0; an
   *  expired row is deleted first, so an expired counter restarts
   *  fresh like Redis INCRBY. The write clears any expiry.
   *
   *  Deliberate deviation from MemoryCommunityStore: a NON-NUMERIC
   *  stored value makes this THROW (the ::double precision cast)
   *  instead of parsing as 0. Counters are only ever written by
   *  this method and by recordChallengeContribution's numeric set,
   *  so a non-numeric counter means a hand-corrupted database —
   *  failing the channel loudly (the caller logs it and the game
   *  plays on) beats silently resetting a counter. */
  async incrBy(key: string, amount: number): Promise<number> {
    await this.pool.query(
      `DELETE FROM tow_kv WHERE key = $1 AND expires_at IS NOT NULL AND expires_at <= now()`,
      [key],
    );
    const r = await this.pool.query(
      `INSERT INTO tow_kv (key, value, expires_at) VALUES ($1, $2, NULL)
       ON CONFLICT (key) DO UPDATE SET
         value = ((tow_kv.value::double precision + EXCLUDED.value::double precision)::text),
         expires_at = NULL
       RETURNING value`,
      [key, String(amount)],
    );
    const row = r.rows[0] as { value: string } | undefined;
    if (!row) throw new Error(`[tow-backend] incrBy returned no row for ${key}`);
    return parseFloat(row.value);
  }

  /** Delete every expired row (KV + zsets + expiry rows). The
   *  production entry runs this hourly and on boot; reads never
   *  depend on it (they filter on expires_at), so it is purely
   *  hygiene. Returns the number of KV rows removed. */
  async sweepExpired(): Promise<number> {
    const kv = await this.pool.query(
      `DELETE FROM tow_kv WHERE expires_at IS NOT NULL AND expires_at <= now()`,
    );
    await this.pool.query(
      `DELETE FROM tow_zset WHERE EXISTS (
         SELECT 1 FROM tow_zset_expiry e WHERE e.key = tow_zset.key AND e.expires_at <= now()
       )`,
    );
    await this.pool.query(
      `DELETE FROM tow_zset_expiry WHERE expires_at <= now()`,
    );
    return kv.rowCount ?? 0;
  }
}

// --- SaveStore (handler.ts contract) ---

export class PostgresSaveStore implements SaveStore {
  private readonly kv: PostgresKvStore;

  constructor(kv: PostgresKvStore) {
    this.kv = kv;
  }

  async get(key: string): Promise<string | null> {
    return this.kv.kvGet(key);
  }

  /** PC saves never expire (scope §3): the handler's 90-day
   *  expiration argument is deliberately IGNORED here. */
  async set(key: string, value: string, _opts?: { expiration?: Date }): Promise<void> {
    await this.kv.kvSet(key, value, null);
  }

  async del(key: string): Promise<void> {
    await this.kv.kvDel(key);
  }

  /** Honored: the handler expires the username index through this
   *  method (365 days), and the index is not a save. */
  async expire(key: string, seconds: number): Promise<void> {
    await this.kv.kvExpire(key, seconds);
  }
}

// --- CommunityStore (community.ts contract) ---

export class PostgresCommunityStore implements CommunityStore {
  private readonly kv: PostgresKvStore;

  constructor(kv: PostgresKvStore) {
    this.kv = kv;
  }

  async get(key: string): Promise<string | null> {
    return this.kv.kvGet(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.kv.kvSet(key, value, null);
  }

  async del(key: string): Promise<void> {
    await this.kv.kvDel(key);
  }

  async zAdd(key: string, member: string, score: number): Promise<void> {
    await this.kv.zAdd(key, member, score);
  }

  async zTop(key: string, n: number): Promise<{ member: string; score: number }[]> {
    return this.kv.zTop(key, n);
  }

  async zRank(key: string, member: string): Promise<number | null> {
    return this.kv.zRank(key, member);
  }

  async zScore(key: string, member: string): Promise<number | null> {
    return this.kv.zScore(key, member);
  }

  async zIncrBy(key: string, member: string, amount: number): Promise<number> {
    return this.kv.zIncrBy(key, member, amount);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.kv.incrBy(key, amount);
  }

  /** TTL for a community key — KV keys and zset keys both. EXCEPT
   *  save keys: acceptTradeOffer calls store.expire(saveKey, 90d)
   *  to preserve the Reddit TTL, and PC saves never expire, so a
   *  save key here is a silent no-op (documented, not hidden). */
  async expire(key: string, seconds: number): Promise<void> {
    if (SAVE_KEY_RE.test(key)) return;
    await this.kv.kvExpire(key, seconds);
    await this.kv.zsetExpire(key, seconds);
  }
}
