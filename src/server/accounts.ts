// THE OPEN WORLD — PC accounts + sessions (TOW PC phase 2).
//
// Minimal by design (scope §8, decision #1 revised): a display name
// + a password is the whole account. No email, no OAuth, no password
// reset (recorded as a known gap in backend/README.md — a forgotten
// password currently has no recovery path; the account is not
// locked out of the game itself, but its saves are unreachable
// without the password).
//
// Shape mirrors Dispatch HQ's web auth (servers/game-server/src/
// routes/auth.ts): scrypt password hashing (salt:hash hex), the
// same username/password validation, 30-day sessions. Two deliberate
// differences, both because the client is a desktop app, not a
// browser on the same origin:
//   * Sessions are opaque bearer tokens (Authorization: Bearer),
//     not HttpOnly cookies — the Electron shell loads the client
//     from a local file, so same-origin cookies do not apply. The
//     token is stored HASHED (SHA-256) in tow_sessions, so a
//     database leak never yields a usable session.
//   * No email column at all: login is by username, and uniqueness
//     is case-insensitive on username_lower.
//
// The handler sees accounts through createAccountIdentityResolver:
// a valid session token becomes TowIdentity { userId: "pc:<uuid>",
// username: <display name>, installTag: "pc" }; anything else is
// all-nulls, and the handler rejects writes for all-null identities
// with the PC identity error text. Save keys are therefore
// tow:pc:<uuid>:save:<slot> — stable even if the display name ever
// becomes changeable.

import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { PgPoolLike } from "./postgres-store.js";
import type { IdentityResolver, TowIdentity } from "./handler.js";

export interface Account {
  id: string;
  username: string;
  createdAt: string;
  lastActive: string;
}

export interface SessionPair {
  account: Account;
  /** Raw bearer token — returned to the client exactly once. The
   *  database holds only its SHA-256 hash. */
  token: string;
}

export type AccountErrorCode =
  | "invalid_username"
  | "invalid_password"
  | "username_taken"
  | "invalid_credentials";

export class AccountError extends Error {
  readonly code: AccountErrorCode;
  constructor(code: AccountErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// --- Validation (same rules as Dispatch HQ) ---

/** 3–30 characters: letters, digits, space, underscore, hyphen. */
export function isValidUsername(username: string): boolean {
  return typeof username === "string" && username.length >= 3 && username.length <= 30
    && /^[A-Za-z0-9 _-]+$/.test(username) && username.trim().length >= 3;
}

/** 6–128 characters. */
export function isValidPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6 && password.length <= 128;
}

// --- Password hashing (same shape as Dispatch HQ) ---

/** scrypt, 16-byte salt, 64-byte hash — `saltHex:hashHex`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  const saltHex = parts[0];
  const hashHex = parts[1];
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** SHA-256 hex of a bearer token — the only form ever stored. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface AccountRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date | string;
  last_active: Date | string;
}

function rowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    username: row.username,
    createdAt: new Date(row.created_at).toISOString(),
    lastActive: new Date(row.last_active).toISOString(),
  };
}

export class AccountStore {
  private readonly pool: PgPoolLike;
  private readonly sessionDays: number;

  constructor(pool: PgPoolLike, sessionDays: number = 30) {
    this.pool = pool;
    this.sessionDays = sessionDays;
  }

  private async createSession(accountId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + this.sessionDays * 24 * 60 * 60 * 1000);
    await this.pool.query(
      `INSERT INTO tow_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)`,
      [tokenHash, accountId, expiresAt.toISOString()],
    );
    return token;
  }

  /** Register a new account and log it in (returns a session, like
   *  Dispatch HQ's register, which sets the auth cookie). Throws
   *  AccountError: invalid_username / invalid_password /
   *  username_taken (409 — includes the case-insensitive clash). */
  async register(username: string, password: string): Promise<SessionPair> {
    const name = username.trim();
    if (!isValidUsername(name)) {
      throw new AccountError("invalid_username", "Username must be 3–30 characters (letters, digits, space, _ or -).");
    }
    if (!isValidPassword(password)) {
      throw new AccountError("invalid_password", "Password must be 6–128 characters.");
    }
    const id = randomUUID();
    try {
      const r = await this.pool.query(
        `INSERT INTO tow_accounts (id, username, username_lower, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, password_hash, created_at, last_active`,
        [id, name, name.toLowerCase(), hashPassword(password)],
      );
      const row = r.rows[0] as AccountRow | undefined;
      if (!row) throw new Error("[tow-accounts] Register insert returned no row.");
      const token = await this.createSession(id);
      return { account: rowToAccount(row), token };
    } catch (err) {
      // Postgres unique-violation (23505) on username_lower — the
      // only unique constraint this insert can hit.
      const code = (err as { code?: unknown }).code;
      if (code === "23505") {
        throw new AccountError("username_taken", "That username is already taken.");
      }
      throw err;
    }
  }

  /** Log in by username (case-insensitive). Throws AccountError
   *  invalid_credentials for an unknown username OR a wrong
   *  password — the two are indistinguishable on purpose. A dummy
   *  scrypt runs for unknown usernames so the timing does not leak
   *  whether the name exists. */
  async login(username: string, password: string): Promise<SessionPair> {
    const name = username.trim();
    const r = await this.pool.query(
      `SELECT id, username, password_hash, created_at, last_active
       FROM tow_accounts WHERE username_lower = $1`,
      [name.toLowerCase()],
    );
    const row = r.rows[0] as AccountRow | undefined;
    if (!row) {
      // Dummy verify against a fixed hash: same work, no leak.
      verifyPassword(password, "00".repeat(16) + ":" + "00".repeat(64));
      throw new AccountError("invalid_credentials", "Invalid username or password.");
    }
    if (!verifyPassword(password, row.password_hash)) {
      throw new AccountError("invalid_credentials", "Invalid username or password.");
    }
    await this.pool.query(
      `UPDATE tow_accounts SET last_active = now() WHERE id = $1`,
      [row.id],
    );
    const token = await this.createSession(row.id);
    return { account: rowToAccount(row), token };
  }

  /** Log out: delete the session. A missing/expired token is a
   *  no-op, never an error — logout always succeeds. */
  async logout(token: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM tow_sessions WHERE token_hash = $1`,
      [hashSessionToken(token)],
    );
  }

  /** Validate a bearer token. Returns the account, or null when
   *  the token is unknown or expired. Updates last_active
   *  best-effort (a failure there never fails validation). */
  async validateSession(token: string): Promise<Account | null> {
    const r = await this.pool.query(
      `SELECT a.id, a.username, a.password_hash, a.created_at, a.last_active
       FROM tow_sessions s JOIN tow_accounts a ON a.id = s.account_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashSessionToken(token)],
    );
    const row = r.rows[0] as AccountRow | undefined;
    if (!row) return null;
    const account = rowToAccount(row);
    try {
      await this.pool.query(
        `UPDATE tow_accounts SET last_active = now() WHERE id = $1`,
        [account.id],
      );
    } catch { /* best-effort */ }
    return account;
  }

  /** Delete expired sessions. The production entry runs this
   *  hourly; returns the number removed. */
  async pruneExpiredSessions(): Promise<number> {
    const r = await this.pool.query(
      `DELETE FROM tow_sessions WHERE expires_at <= now()`,
    );
    return r.rowCount ?? 0;
  }
}

// --- Identity resolution for the game handler ---

export function bearerTokenFromRequest(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

/** The account IdentityResolver (the phase-2 contract): a valid
 *  session token becomes the account's id + display name; anything
 *  else is all-nulls (the handler then rejects writes). A session
 *  lookup failure is treated as unauthenticated, never as an
 *  error — reads stay available during a session-store blip. */
export function createAccountIdentityResolver(store: AccountStore): IdentityResolver {
  return async (req: IncomingMessage): Promise<TowIdentity> => {
    const unauthenticated: TowIdentity = { userId: null, username: null, loid: null, installTag: "pc" };
    const token = bearerTokenFromRequest(req);
    if (!token) return unauthenticated;
    const account = await store.validateSession(token).catch(() => null);
    if (!account) return unauthenticated;
    return { userId: `pc:${account.id}`, username: account.username, loid: null, installTag: "pc" };
  };
}

// --- HTTP routes: POST /api/account/register|login|logout, GET /api/account/me ---

const MAX_AUTH_BODY_BYTES = 16 * 1024;

/** Tiny in-memory rate limiter for the auth endpoints: 10 attempts
 *  per IP per 15 minutes on register/login. No store, no config —
 *  it exists so a brute-force script cannot hammer login forever
 *  on a single-instance server. (Multi-instance deployments would
 *  need a shared limiter; this backend runs one instance.) */
class AuthRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  private readonly windowMs = 15 * 60 * 1000;
  private readonly maxAttempts = 10;

  check(key: string): boolean {
    const now = Date.now();
    const list = (this.attempts.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.maxAttempts) {
      this.attempts.set(key, list);
      return false;
    }
    list.push(now);
    this.attempts.set(key, list);
    // Opportunistic sweep so the map cannot grow forever.
    if (this.attempts.size > 10000) {
      for (const [k, v] of this.attempts) {
        if (v.length === 0 || now - (v[v.length - 1] as number) > this.windowMs) this.attempts.delete(k);
      }
    }
    return true;
  }
}

async function readJsonBody(req: IncomingMessage): Promise<{ ok: boolean; data?: Record<string, unknown>; oversize?: boolean }> {
  return new Promise((resolve) => {
    let body = "";
    let oversize = false;
    req.on("data", (chunk: Buffer) => {
      if (oversize) return;
      body += chunk.toString("utf8");
      if (body.length > MAX_AUTH_BODY_BYTES) oversize = true;
    });
    req.on("end", () => {
      if (oversize) { resolve({ ok: false, oversize: true }); return; }
      try {
        const parsed: unknown = JSON.parse(body || "{}");
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          resolve({ ok: false });
          return;
        }
        resolve({ ok: true, data: parsed as Record<string, unknown> });
      } catch {
        resolve({ ok: false });
      }
    });
  });
}

function json(rsp: ServerResponse, status: number, payload: unknown): void {
  rsp.writeHead(status, { "Content-Type": "application/json" });
  rsp.end(JSON.stringify(payload));
}

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.socket.remoteAddress ?? "unknown";
}

/** Returns true when the request was an /api/account/* route (and
 *  was answered), false when it is not an account route (the
 *  caller falls through to the game handler). The caller owns CORS
 *  headers + preflight — this handler only writes JSON bodies. */
export function createAccountRoutes(store: AccountStore): (req: IncomingMessage, rsp: ServerResponse) => Promise<boolean> {
  const limiter = new AuthRateLimiter();
  return async (req: IncomingMessage, rsp: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;
    const method = req.method ?? "GET";
    if (!pathname.startsWith("/api/account/")) return false;

    if (pathname === "/api/account/register" && method === "POST") {
      if (!limiter.check(`register:${clientIp(req)}`)) {
        json(rsp, 429, { error: "Too many attempts — try again in a few minutes." });
        return true;
      }
      const { ok, data, oversize } = await readJsonBody(req);
      if (oversize) { json(rsp, 413, { error: "Request too large." }); return true; }
      if (!ok || !data) { json(rsp, 400, { error: "Malformed request body." }); return true; }
      const username = data.username;
      const password = data.password;
      if (typeof username !== "string" || typeof password !== "string") {
        json(rsp, 400, { error: "Username and password are required." });
        return true;
      }
      try {
        const pair = await store.register(username, password);
        json(rsp, 201, { account: pair.account, token: pair.token });
      } catch (err) {
        if (err instanceof AccountError) {
          const status = err.code === "username_taken" ? 409 : 400;
          json(rsp, status, { error: err.message });
        } else {
          console.error("[tow-accounts] Register failed:", err);
          json(rsp, 500, { error: "Registration failed — try again shortly." });
        }
      }
      return true;
    }

    if (pathname === "/api/account/login" && method === "POST") {
      if (!limiter.check(`login:${clientIp(req)}`)) {
        json(rsp, 429, { error: "Too many attempts — try again in a few minutes." });
        return true;
      }
      const { ok, data, oversize } = await readJsonBody(req);
      if (oversize) { json(rsp, 413, { error: "Request too large." }); return true; }
      if (!ok || !data) { json(rsp, 400, { error: "Malformed request body." }); return true; }
      const username = data.username;
      const password = data.password;
      if (typeof username !== "string" || typeof password !== "string") {
        json(rsp, 400, { error: "Username and password are required." });
        return true;
      }
      try {
        const pair = await store.login(username, password);
        json(rsp, 200, { account: pair.account, token: pair.token });
      } catch (err) {
        if (err instanceof AccountError && err.code === "invalid_credentials") {
          json(rsp, 401, { error: err.message });
        } else {
          console.error("[tow-accounts] Login failed:", err);
          json(rsp, 500, { error: "Login failed — try again shortly." });
        }
      }
      return true;
    }

    if (pathname === "/api/account/logout" && method === "POST") {
      const token = bearerTokenFromRequest(req);
      if (token) {
        try { await store.logout(token); } catch { /* logout always succeeds */ }
      }
      json(rsp, 200, { success: true });
      return true;
    }

    if (pathname === "/api/account/me" && method === "GET") {
      const token = bearerTokenFromRequest(req);
      if (!token) { json(rsp, 401, { error: "Not logged in." }); return true; }
      const account = await store.validateSession(token).catch(() => null);
      if (!account) { json(rsp, 401, { error: "Session expired or invalid — please log in again." }); return true; }
      json(rsp, 200, { account });
      return true;
    }

    json(rsp, 404, { error: "Not found" });
    return true;
  };
}
