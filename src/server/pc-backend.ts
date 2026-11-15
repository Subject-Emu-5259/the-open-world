// THE OPEN WORLD — PC hosted backend entry (TOW PC phase 2).
//
// The production server the PC client talks to: the SAME game
// handler as Reddit (handler.ts), bound to Postgres accounts +
// Postgres stores + WebSocket sync, on one HTTP server on one port
// (Render injects PORT; the WS endpoint is /ws on that same port,
// like Dispatch HQ's game server).
//
// This is the hosted twin of pc-server.ts (the local-dev bootstrap
// with in-memory stores + dev identity). Nothing in the handler
// changes between them — only the injected dependencies:
//   identity  Account sessions (accounts.ts): a valid bearer token
//             becomes the account's id + display name; anything
//             else is all-nulls and the handler rejects writes.
//   stores    PostgresSaveStore + PostgresCommunityStore over ONE
//             Pool / one database (shared key namespace — trading
//             reads save keys through the community store).
//   settings  Env-only LLM settings (same as pc-server.ts): with no
//             keys set anywhere, NPC dialogue is templates-only —
//             the locked PC launch behavior. Dre's keys NEVER ship
//             in the app or in this backend's config.
//   ws        TowWsServer (ws.ts): presence + roster + community
//             push. Community writes flow through the notifying
//             store decorator, so a trade offer / leaderboard move /
//             challenge contribution pushes to every connected PC
//             client within ~2s (debounced).
//
// Env (all documented in backend/README.md):
//   DATABASE_URL    required — Postgres connection string. The
//                   server REFUSES to boot without it (a deploy
//                   that silently boots against the wrong database
//                   is a data-integrity failure, not a warning).
//   PORT            default 3101 (Render injects its own).
//   HOST            default 0.0.0.0.
//   TOW_SESSION_DAYS  default 30.
//   TOW_PG_SSL      default on (Render needs TLS); "false" for a
//                   local Postgres without TLS.
//   TOW_MIGRATIONS_DIR  override for the migration SQL location.
//
// Run as a script (CJS bundle from tools/build.ts --pc):
//   DATABASE_URL=... node dist/pc/server/pc-backend.cjs
// The script main lives in pc-backend-main.ts (kept separate so this
// file has no side effects when a harness imports it — a
// require.main guard would fire inside a CJS test bundle, where the
// bundle IS the main module). The Dockerfile CMD runs the migration
// + that entry (Dispatch HQ's shape: migrate, then serve).

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createTowHandler } from "./handler.js";
import type { OutcomeEvent, SaveStore } from "./handler.js";
import type { CommunityStore } from "./community.js";
import {
  PostgresKvStore, PostgresSaveStore, PostgresCommunityStore,
  createPostgresPool, runMigrations,
} from "./postgres-store.js";
import type { PgPoolLike } from "./postgres-store.js";
import { AccountStore, createAccountIdentityResolver, createAccountRoutes } from "./accounts.js";
import { TowWsServer, withCommunityNotifications } from "./ws.js";
import { tryHandlePreflight, applyPcCorsHeaders } from "./pc-cors.js";
import { GAME_VERSION } from "../shared/version.js";

export interface PcBackendOptions {
  /** Port to listen on. Default: PORT env, else 3101. Use 0 for an ephemeral port (tests). */
  port?: number;
  /** Host to bind. Default: HOST env, else 0.0.0.0. */
  host?: string;
  /** Pool to use. Default: a fresh Pool from DATABASE_URL (required). Tests pass a pg-mem pool. */
  pool?: PgPoolLike;
  /** Session lifetime in days. Default: TOW_SESSION_DAYS env, else 30. */
  sessionDays?: number;
  /** Skip the boot migration (tests that apply it themselves). Default false. */
  skipMigrations?: boolean;
}

export interface PcBackendHandle {
  server: Server;
  port: number;
  host: string;
  pool: PgPoolLike;
  accounts: AccountStore;
  /** The save store (Postgres). Exposed for tests / ops inspection. */
  saves: SaveStore;
  /** The community store (Postgres, with the WS notifier wrapped
   *  around it). Exposed for tests / ops inspection. */
  community: CommunityStore;
  ws: TowWsServer;
  /** Stop the server, the WS layer, the sweep timer, and the pool. */
  close: () => Promise<void>;
}

export async function startPcBackend(opts: PcBackendOptions = {}): Promise<PcBackendHandle> {
  const pool: PgPoolLike = opts.pool ?? (() => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "[tow-backend] FATAL: DATABASE_URL is not set — refusing to start without a database. " +
        "Set DATABASE_URL to the Render Postgres connection string (see backend/README.md).",
      );
    }
    return createPostgresPool(databaseUrl);
  })();
  if (!opts.skipMigrations) {
    await runMigrations(pool);
  }
  const sessionDays = opts.sessionDays ?? Number(process.env.TOW_SESSION_DAYS ?? "30") ?? 30;
  const accounts = new AccountStore(pool, sessionDays);

  const kv = new PostgresKvStore(pool);
  const saves = new PostgresSaveStore(kv);
  const communityBase = new PostgresCommunityStore(kv);
  // The WS server is attached after the HTTP server exists; the
  // decorator closes over a late-bound reference (null until then).
  let wsServer: TowWsServer | null = null;
  const community = withCommunityNotifications(communityBase, (event) => {
    wsServer?.broadcastCommunity(event);
  });

  const handler = createTowHandler({
    saves,
    community,
    resolveIdentity: createAccountIdentityResolver(accounts),
    // Env-only LLM settings (same as pc-server.ts): no Devvit
    // settings, so keys come from environment variables alone —
    // and with none set, NPC dialogue is templates-only.
    settings: async (_key: string): Promise<undefined> => undefined,
    // Same outcome line as the Devvit bootstrap, so PC log pulls
    // verify progression outcomes the same way (TOW-001).
    onOutcome: ({ username, input, outcomeLog }: OutcomeEvent): void => {
      console.log(`[server] Outcome user=${username} cmd="${input}" ${outcomeLog}`);
    },
    identityErrorText: (action: "save" | "play"): string => `A PC account is required to ${action}`,
  });
  const accountRoutes = createAccountRoutes(accounts);

  const server: Server = createServer((req: IncomingMessage, rsp: ServerResponse): void => {
    void (async (): Promise<void> => {
      // CORS preflight first: the PC client sends Authorization,
      // which the game handler's own preflight does not allow.
      if (tryHandlePreflight(req, rsp)) return;
      applyPcCorsHeaders(rsp);
      const requestUrl = req.url ?? "/";
      let pathname = "";
      try {
        pathname = new URL(requestUrl, "http://localhost").pathname;
      } catch { /* malformed URL — the handler 404s it */ }
      if (pathname === "/health" && (req.method ?? "GET") === "GET") {
        try {
          await pool.query("SELECT 1");
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            status: "ok",
            game: "The Open World",
            version: GAME_VERSION,
            edition: "pc",
            db: "ok",
            timestamp: new Date().toISOString(),
          }));
        } catch {
          rsp.writeHead(503, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            status: "degraded",
            game: "The Open World",
            version: GAME_VERSION,
            edition: "pc",
            db: "error",
            timestamp: new Date().toISOString(),
          }));
        }
        return;
      }
      try {
        if (await accountRoutes(req, rsp)) return;
      } catch (err) {
        console.error("[tow-backend] Account route error:", err);
        if (!rsp.headersSent) {
          rsp.writeHead(500, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Server error" }));
        }
        return;
      }
      await handler(req, rsp);
    })();
  });

  wsServer = new TowWsServer(server, {
    validateSession: (token: string) => accounts.validateSession(token),
  });

  // Hourly hygiene: expired KV rows / zsets + expired sessions.
  // Unref'd so it never holds the process open on its own.
  const sweepTimer = setInterval(() => {
    void (async (): Promise<void> => {
      try {
        const swept = await kv.sweepExpired();
        const pruned = await accounts.pruneExpiredSessions();
        if (swept > 0 || pruned > 0) {
          console.log(`[tow-backend] Sweep: ${swept} expired keys, ${pruned} expired sessions removed.`);
        }
      } catch (err) {
        console.error("[tow-backend] Sweep failed (next run retries):", err);
      }
    })();
  }, 60 * 60 * 1000);
  sweepTimer.unref?.();

  const host = opts.host ?? process.env.HOST ?? "0.0.0.0";
  const port = opts.port ?? Number(process.env.PORT ?? "3101");
  await new Promise<void>((resolve, reject): void => {
    server.once("error", reject);
    server.listen(port, host, (): void => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const boundPort = typeof address === "object" && address !== null ? address.port : port;

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    clearInterval(sweepTimer);
    wsServer?.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    if (!opts.pool) {
      await pool.end();
    }
  };
  return { server, port: boundPort, host, pool, accounts, saves, community, ws: wsServer, close };
}
