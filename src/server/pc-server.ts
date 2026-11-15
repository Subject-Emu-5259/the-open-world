// THE OPEN WORLD — PC bootstrap (TOW PC phase 1).
//
// Serves the SAME game handler as Reddit (see handler.ts) over plain
// Node HTTP — no Devvit runtime, no Reddit identity, no Redis.
//
// Phase 1 wiring (this file):
//   identity  Local-dev identity: a fixed dev player, overridable per
//             request with x-tow-user-id / x-tow-username headers so
//             smoke tests can act as several players. Phase 2 replaces
//             devIdentity with account auth (validate the session
//             token -> account id + display name; all-nulls when the
//             request is unauthenticated).
//   stores    One shared MemoryCommunityStore + a MemorySaveStore over
//             it (same key namespace — trading reads save keys through
//             the community store). Phase 2 swaps both for Postgres
//             adapters over one database, without changing the handler.
//   settings  Env-only LLM settings: keys come from environment
//             variables alone, never Devvit settings. With no keys
//             set, NPC dialogue is templates-only (the locked PC
//             launch behavior — Dre's keys NEVER ship in the app).
//
// Run as a script (CJS bundle from tools/build.ts --pc):
//   TOW_PC_PORT=3101 TOW_PC_HOST=127.0.0.1 TOW_PC_STATIC_DIR=dist/pc/client \
//     node dist/pc/server/pc-server.cjs
// TOW_PC_STATIC_DIR is optional: when set, non-/api GETs are served
// from that directory (the PC client bundle) so a browser can play
// against this server directly. The Electron shell (phase 3) loads
// the client itself and does not need it.
//
// The hosted backend (phase 2) is this same bootstrap with account
// auth + Postgres, bound to 0.0.0.0 behind its deploy. Nothing in the
// handler changes between the local-dev server and the hosted one.

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createTowHandler } from "./handler.js";
import type { OutcomeEvent, SaveStore, TowIdentity } from "./handler.js";
import { MemoryCommunityStore } from "./community.js";
import type { CommunityStore } from "./community.js";
import { MemorySaveStore } from "./memory-store.js";
import { tryHandlePreflight } from "./pc-cors.js";

export interface PcServerOptions {
  /** Port to listen on. Default 3101. Use 0 for an ephemeral port (tests). */
  port?: number;
  /** Host to bind. Default 127.0.0.1 (loopback only). */
  host?: string;
  /** Save store. Default: a MemorySaveStore over `community`. */
  saves?: SaveStore;
  /** Community store. Default: a fresh MemoryCommunityStore. */
  community?: CommunityStore;
  /** Optional directory of static files (the PC client bundle) served
   *  for non-/api GETs. Unset = API only. */
  staticDir?: string;
}

export interface PcServerHandle {
  server: Server;
  port: number;
  host: string;
  saves: SaveStore;
  community: CommunityStore;
}

function headerString(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

// Local-dev identity (see the header note — phase 2 replaces this
// with account auth). Always identified: dev traffic always has a
// user id + username, so the handler's identity guards never fire.
function devIdentity(req: IncomingMessage): TowIdentity {
  return {
    userId: headerString(req.headers["x-tow-user-id"]) ?? "pc-dev-1",
    username: headerString(req.headers["x-tow-username"]) ?? "PCPlayer",
    loid: null,
    installTag: "pc-dev",
  };
}

const STATIC_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Serve one static file. Returns true when a file was served, false
// when the request should fall through to the game handler (non-GET,
// /api/*, missing file, or a path escaping the static root).
async function tryServeStatic(staticRoot: string, req: IncomingMessage, rsp: ServerResponse): Promise<boolean> {
  if (req.method !== "GET") return false;
  const requestUrl = req.url ?? "/";
  let pathname: string;
  try {
    pathname = new URL(requestUrl, "http://localhost").pathname;
  } catch {
    return false;
  }
  if (pathname.startsWith("/api/")) return false;
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(staticRoot, rel);
  if (resolved !== staticRoot && !resolved.startsWith(staticRoot + path.sep)) return false;
  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    rsp.writeHead(200, { "Content-Type": STATIC_TYPES[ext] ?? "application/octet-stream" });
    rsp.end(data);
    return true;
  } catch {
    return false;
  }
}

export async function startPcServer(opts: PcServerOptions = {}): Promise<PcServerHandle> {
  const community: CommunityStore = opts.community ?? new MemoryCommunityStore();
  const saves: SaveStore = opts.saves ?? new MemorySaveStore(community);
  const handler = createTowHandler({
    saves,
    community,
    resolveIdentity: (req: IncomingMessage): TowIdentity => devIdentity(req),
    // Env-only LLM settings: the getter answers "no Devvit settings"
    // for every key, so llm-provider falls back to environment
    // variables alone (and, with none set, to local templates).
    settings: async (_key: string): Promise<undefined> => undefined,
    // Same outcome line as the Devvit bootstrap, so PC log pulls
    // verify progression outcomes the same way (TOW-001).
    onOutcome: ({ username, input, outcomeLog }: OutcomeEvent): void => {
      console.log(`[server] Outcome user=${username} cmd="${input}" ${outcomeLog}`);
    },
    identityErrorText: (action: 'save' | 'play'): string => `A PC account is required to ${action}`,
  });
  const staticRoot = opts.staticDir ? path.resolve(opts.staticDir) : null;
  const server: Server = createServer((req: IncomingMessage, rsp: ServerResponse): void => {
    void (async (): Promise<void> => {
      // CORS preflight first (phase 2): the PC client sends an
      // Authorization header, which the game handler's own
      // preflight does not allow. Same helper as pc-backend.ts.
      if (tryHandlePreflight(req, rsp)) return;
      if (staticRoot) {
        try {
          if (await tryServeStatic(staticRoot, req, rsp)) return;
        } catch { /* fall through to the game handler */ }
      }
      await handler(req, rsp);
    })();
  });
  const host = opts.host ?? "127.0.0.1";
  const port = opts.port ?? 3101;
  await new Promise<void>((resolve, reject): void => {
    server.once("error", reject);
    server.listen(port, host, (): void => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.address();
  const boundPort = typeof address === "object" && address !== null ? address.port : port;
  return { server, port: boundPort, host, saves, community };
}

// Run as a script: `node dist/pc/server/pc-server.cjs` (the CJS bundle
// from tools/build.ts --pc). The require.main guard is inert when this
// file is bundled as ESM (harness-pc-bootstrap.ts), where `require`
// does not exist.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (typeof require !== "undefined" && typeof module !== "undefined" && (require as unknown as { main?: unknown }).main === module) {
  const port = Number(process.env.TOW_PC_PORT ?? "3101");
  const host = process.env.TOW_PC_HOST ?? "127.0.0.1";
  const staticDir = process.env.TOW_PC_STATIC_DIR || undefined;
  startPcServer({ port, host, staticDir })
    .then(({ port: boundPort }: PcServerHandle): void => {
      console.log(`[pc-server] THE OPEN WORLD PC server listening on ${host}:${boundPort}`);
    })
    .catch((err: unknown): void => {
      console.error("[pc-server] Failed to start:", err);
      process.exit(1);
    });
}
