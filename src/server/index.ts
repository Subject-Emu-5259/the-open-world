// THE OPEN WORLD — Devvit bootstrap (TOW PC phase 1).
//
// Thin platform wiring only: the game request handler lives in
// handler.ts (Devvit-agnostic, shared with the PC bootstrap in
// pc-server.ts) and this file wires it to Devvit — context identity,
// the Redis save store + community store, the outcome-log emission,
// the subreddit-menu post-create, and the telemetry express wrapper.
// The handler, the engine, and every feature module are untouched by
// the split; this bootstrap keeps calling the same handler with the
// same arguments the old monolithic index.ts used.

import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, getServerPort, context, reddit } from "@devvit/web/server";
import { redisCompressed as redis } from "@devvit/redis";
import { createTowHandler } from "./handler.js";
import type { SaveStore, TowIdentity } from "./handler.js";
import { RedisCommunityStore } from "./redis-community-store.js";
import type { RedisAdapterLike } from "./redis-community-store.js";
import express from "express";
import { createTelemetryRouter } from "@devvit/analytics/server/reddit";

console.log("[server] THE OPEN WORLD module loaded - v0.108.29 - STATELESS MODE");

// The Devvit Redis client, viewed through the adapter contract the
// community store already uses (redis-community-store.ts). Both the
// save store and the community store sit on this one client, so they
// share one key namespace — trading reads save keys through the
// community store, and that only works when both adapters see the
// same Redis.
const redisClient = redis as unknown as RedisAdapterLike;

// Devvit save store: get/set/del/expire over redisCompressed, with
// the 90-day expiration the handler passes on every save.
const devvitSaveStore: SaveStore = {
  get: async (key: string): Promise<string | null> => {
    const v = await redisClient.get(key);
    return typeof v === "string" ? v : null;
  },
  set: async (key: string, value: string, opts?: { expiration?: Date }): Promise<void> => {
    if (opts?.expiration) {
      await redisClient.set(key, value, { expiration: opts.expiration });
    } else {
      await redisClient.set(key, value);
    }
  },
  del: async (key: string): Promise<void> => {
    await redisClient.del(key);
  },
  expire: async (key: string, seconds: number): Promise<void> => {
    await redisClient.expire(key, seconds);
  },
};

// Devvit identity, read per request from the platform context:
// immutable user id, then username, then LOID (logged-out), with the
// subreddit name as the install tag. Settings are NOT passed —
// llm-provider's default reads Devvit app settings, exactly as before.
function devvitIdentity(): TowIdentity {
  return {
    userId: context.userId ?? null,
    username: context.username ?? null,
    loid: context.loid ?? null,
    installTag: context.subredditName ?? "default",
  };
}

const towHandler = createTowHandler({
  saves: devvitSaveStore,
  community: new RedisCommunityStore(redisClient),
  resolveIdentity: (): TowIdentity => devvitIdentity(),
  // v0.108.29 outcome logging (TOW-001): the emission lives HERE, in
  // the bootstrap — harness-0.108.29 §E asserts this exact string is
  // in index.ts. The handler reports outcomes via onOutcome after
  // save resolution; this callback is the only emitter.
  onOutcome: ({ username, input, outcomeLog }): void => {
    console.log(`[server] Outcome user=${username} cmd="${input}" ${outcomeLog}`);
  },
});

export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  const requestUrl = req.url ?? "";
  const url = new URL(requestUrl, `http://localhost`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";
  const username = context.username ?? "player";

  // === DEVVIT INTERNAL ENDPOINTS ===
  // These need the Reddit API (menu post-create) or are Devvit
  // lifecycle hooks; they have no PC meaning and stay here, in the
  // Devvit bootstrap, instead of the shared handler. Request log +
  // CORS match what the old monolithic handler did for these paths.
  if (pathname.startsWith("/internal/") && method === "POST") {
    console.log(`[server] ${method} ${requestUrl} user=${username}`);
    rsp.setHeader("Access-Control-Allow-Origin", "*");
    rsp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    rsp.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      if (pathname === "/internal/on-app-install") {
        console.log("[server] App installation triggered");
        rsp.writeHead(204);
        rsp.end();
        return;
      }

      if (pathname === "/internal/on-app-uninstall") {
        console.log("[server] App uninstallation triggered");
        rsp.writeHead(204);
        rsp.end();
        return;
      }

      if (pathname === "/internal/menu/post-create") {
        console.log("[server] Menu post-create triggered");

        // Deduplicate repeated menu clicks: if we already created a post for this
        // user in this subreddit recently, navigate to it instead of making another.
        const idempotencyKey = `menu_post:${context.subredditName ?? ''}:${username}`;
        const existingPostId = await redis.get(idempotencyKey);
        if (existingPostId) {
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ navigateTo: { post: existingPostId } }));
          return;
        }

        try {
          // Create a custom post with the game
          const post = await reddit.submitCustomPost({
            subredditName: context.subredditName!,
            title: "🌍 THE OPEN WORLD — A Life Simulation",
            entry: "game",
          });

          await redis.set(idempotencyKey, post.id);

          console.log(`[server] Created post: ${post.id}`);

          // Return navigation to the new post
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            navigateTo: {
              post: post.id
            }
          }));
        } catch (err) {
          console.error("[server] Failed to create post:", err);
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({
            showToast: {
              text: "Failed to create game post. Please try again.",
              appearance: "error"
            }
          }));
        }
        return;
      }
      // Unknown /internal/* POST falls through to the shared handler,
      // which 404s it — same as the old monolithic handler did.
    } catch (err) {
      console.error("[server] Error:", err);
      rsp.writeHead(500, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({ error: "Server error" }));
      return;
    }
  }

  // Everything else is the shared game handler.
  await towHandler(req, rsp);
}

// v0.108.12: Devvit Journeys telemetry. The game server is a raw
// node:http handler, while createTelemetryRouter() is an express Router,
// so the telemetry mount runs through a minimal express app that ONLY
// handles /api/telemetry (with its own JSON parsing) and falls through to
// the game's own handler for everything else. Scoping the JSON parser to
// the telemetry mount matters: serverOnRequest reads request bodies itself,
// and a global express.json() would drain them first. Telemetry failures
// surface as telemetry-endpoint errors only; they can never break game
// requests, and the client treats every telemetry call as best-effort.
// NOTE: metrics also need a server-side allowlist + journey-map
// review/approval that code cannot grant — see the v0.108.12 report.
const telemetryApp = express();
telemetryApp.use("/api/telemetry", express.json(), createTelemetryRouter());
telemetryApp.use((req, res) => {
  void serverOnRequest(req, res);
});

// Start server
const server = createServer(telemetryApp);
const port = getServerPort();

server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(port);

console.log(`[server] THE OPEN WORLD running on port ${port}`);
