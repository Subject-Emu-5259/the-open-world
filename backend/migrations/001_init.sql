-- THE OPEN WORLD — PC hosted backend, migration 001 (TOW PC phase 2).
--
-- ONE database, ONE shared key namespace: player saves and community
-- data (leaderboards, challenge, trading) all live in tow_kv /
-- tow_zset. Trading reads save keys through the community store
-- (community.ts), so splitting them across databases would break
-- trades. The two Postgres adapters (src/server/postgres-store.ts)
-- share one Pool over these tables.
--
-- Idempotent: every statement is IF NOT EXISTS, so the migration is
-- safe to re-run on every boot (the production entry does exactly
-- that) and safe to apply by hand with psql.
--
-- Plain tables only — no extensions, no custom types, no triggers —
-- so this runs on any Postgres 13+ (Render's managed Postgres, or a
-- local install) and against the pg-mem emulator the adapter tests
-- use. Two deliberate omissions, both documented:
--   * No FOREIGN KEY from tow_sessions to tow_accounts. Sessions are
--     only ever created for an existing account, accounts are never
--     deleted in v1 (there is no account-deletion endpoint), and
--     expired sessions are pruned by timestamp — so the FK buys
--     nothing today, and pg-mem cannot execute a FK-cascade DELETE
--     (it throws "No execution context available"). If account
--     deletion ever lands, add the FK then (and delete sessions in
--     the same transaction in app code).
--   * No gen_random_uuid() default on tow_accounts.id. Account ids
--     are generated in Node (crypto.randomUUID) and passed as
--     parameters, so the schema needs no pgcrypto / PG13+ function.
--     (Render runs modern Postgres either way; this keeps the
--     migration portable to the oldest supported version.)

-- Shared key/value namespace. `value` is always a string (saves are
-- JSON text, counters are decimal text, the trade-offers list is JSON
-- text). `expires_at` is NULL for keys that never expire (PC saves);
-- a set expires_at makes the key invisible to reads (the adapter
-- filters on it) until the hourly sweep deletes the row.
CREATE TABLE IF NOT EXISTS tow_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ
);

-- Sorted sets (leaderboards, weekly/monthly boards, challenge
-- contributions). One row per (key, member); score is a double so
-- XP / money / fame all fit. Ordering is score DESC, member ASC —
-- the same tie-break the in-memory store uses (score desc, then
-- member name ascending).
CREATE TABLE IF NOT EXISTS tow_zset (
  key TEXT NOT NULL,
  member TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (key, member)
);
CREATE INDEX IF NOT EXISTS tow_zset_key_score_idx
  ON tow_zset (key, score DESC, member ASC);

-- TTLs for sorted-set keys. Redis stores a TTL on the key itself;
-- a zset here is many rows, so its expiry lives in its own table.
-- The adapter purges an expired set (all members + this row) on
-- first access after expiry, and the hourly sweep removes the rest.
CREATE TABLE IF NOT EXISTS tow_zset_expiry (
  key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

-- PC accounts. `username` is the display name exactly as registered
-- (case preserved); `username_lower` carries the case-insensitive
-- uniqueness (UNIQUE) so "Alice" and "alice" can never both exist.
-- `password_hash` is scrypt, salt:hash hex (see accounts.ts — the
-- same shape Dispatch HQ uses). No email, no OAuth — display name +
-- password is the whole account (scope §8, decision #1 revised).
CREATE TABLE IF NOT EXISTS tow_accounts (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  username_lower TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions. Only the SHA-256 hash of the token is stored — a
-- database leak never yields a usable session token. The raw token
-- is returned to the client exactly once (register / login) and the
-- client sends it as `Authorization: Bearer <token>`.
CREATE TABLE IF NOT EXISTS tow_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tow_sessions_account_idx ON tow_sessions (account_id);
CREATE INDEX IF NOT EXISTS tow_sessions_expiry_idx ON tow_sessions (expires_at);
