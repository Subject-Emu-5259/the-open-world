import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, getServerPort, context, reddit } from "@devvit/web/server";
import { redisCompressed as redis } from "@devvit/redis";
import { GameEngine } from "./game-engine.js";

// NEW imports for serverless NPC reply endpoint
import { generateNPCReply, type GameTimeContext } from "./ai-npc-provider.js";
import type { NPCState } from "./social-engine.js";
import type { Player, Relationship } from "../shared/types.js";

console.log("[server] THE OPEN WORLD module loaded - v0.105.0 - STATELESS MODE");

// Single game engine instance (stateless - client sends state).
// Client ships full player state on every request, so a singleton is safe for
// the current process while still being server-authoritative.
const game = new GameEngine();

function saveKey(slot = "1"): string {
  // Prefer the immutable Reddit user id, then username, then LOID (logged-out),
  // then fall back to a shared placeholder. This keeps saves stable even if
  // usernames change and avoids collisions with logged-out traffic.
  const user = context.userId ?? context.username ?? context.loid ?? "player";
  return `tow:${user}:save:${slot}`;
}

async function serverSavePlayer(player: any, slot = "1"): Promise<void> {
  try {
    const payload = JSON.stringify({ ...player, lastSaved: Date.now() });
    await redis.set(saveKey(slot), payload, {
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    console.log(`[server] Authoritative save: ${saveKey(slot).replace(/^tow:([^:]+):save:.*/, '$1')}`);
  } catch (e) {
    console.error("[server] Authoritative save failed:", e);
  }
}

async function serverLoadPlayer(slot = "1"): Promise<any | null> {
  try {
    const data = await redis.get(saveKey(slot));
    if (data && typeof data === "string") {
      const player = JSON.parse(data);
      console.log(`[server] Loaded save: ${player.name}`);
      return player;
    }
  } catch (e) {
    console.error("[server] Authoritative load failed:", e);
  }
  return null;
}

export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  const requestUrl = req.url ?? "";
  const url = new URL(requestUrl, `http://localhost`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";
  const username = context.username ?? "player";
  
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
  
  try {
    // === MAIN GAME API ===
    if (pathname === "/api/init" && method === "GET") {
      // Try to resume the user's most recent save. Slot 1 is the auto-save
      // slot; if it's empty we scan slots 1-3 for any available save.
      const requestedSlot = url.searchParams.get("slot") || "1";
      let player: any | null = null;

      for (const slot of [requestedSlot, "1", "2", "3"]) {
        player = await serverLoadPlayer(slot);
        if (player) break;
      }

      if (player) {
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({
          type: "init",
          username,
          hasPlayer: true,
          player,
          dashboard: buildHUD(player),
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
          const player = await serverLoadPlayer(String(i));
          if (player) {
            slots.push({ slot: String(i), hasSave: true, player });
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

    if (pathname === "/api/save" && method === "POST") {
      const body = await readBody(req);
      const data = JSON.parse(body || "{}");
      const slot = data.slot || "1";
      const player = data.player;

      if (!player) {
        rsp.writeHead(400, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "No player data provided" }));
        return;
      }

      try {
        await serverSavePlayer(player, slot);
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ success: true, slot }));
      } catch (err) {
        console.error("[server] Redis save error:", err);
        rsp.writeHead(500, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "Persistence failure" }));
      }
      return;
    }

    if (pathname === "/api/load" && method === "GET") {
      const slot = url.searchParams.get("slot") || "1";
      const player = await serverLoadPlayer(slot);

      if (player) {
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ player }));
      } else {
        rsp.writeHead(404, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "Save not found" }));
      }
      return;
    }
    
    if (pathname === "/api/init" && method === "POST") {
      const body = await readBody(req);
      const data = JSON.parse(body || "{}");
      
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
        console.log(`[server] Created player, job: ${JSON.stringify(game.getPlayer().job)}`);
      }
      
      // Command processing
      const input = String(data.input || data.text || "").trim();
      if (input) {
        console.log(`[server] Processing command: "${input}", current job: ${JSON.stringify(game.getPlayer().job)}`);
        const result = await game.processCommand(input);
        console.log(`[server] After command, job: ${JSON.stringify(game.getPlayer().job)}`);
        
        const player = game.getPlayer();
        
        await serverSavePlayer(player);
        
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({
          text: result.message,
          npcName: result.npcName,
          dashboard: buildHUD(player),
          player,
          success: result.success,
        }));
        return;
      }
      
      // No command - return current state
      const player = game.getPlayer();
      await serverSavePlayer(player);
      rsp.writeHead(200, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({
        type: "created",
        player,
        dashboard: buildHUD(player),
        text: `🌍 Welcome to THE OPEN WORLD, ${player.name}!`,
      }));
      return;
    }
    
    // === SERVERLESS NPC REPLY API ===
    if (pathname === "/api/npc-reply" && method === "POST") {
      const body = await readBody(req);
      const data = JSON.parse(body || "{}");
      const input = String(data.input || data.playerInput || "").trim();
      if (!input || !data.npc) {
        rsp.writeHead(400, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "Missing npc or input" }));
        return;
      }

      const now = new Date();
      const hour = now.getHours();
      let timeOfDay: GameTimeContext["timeOfDay"] = "night";
      if (hour >= 5 && hour < 12) timeOfDay = "morning";
      else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
      else if (hour >= 17 && hour < 21) timeOfDay = "evening";

      const timeContext: GameTimeContext = {
        timeOfDay,
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        hour,
      };

      try {
        const result = await generateNPCReply({
          npc: data.npc as NPCState,
          player: (data.player || {}) as Player,
          relationship: (data.relationship || { value: 0, flags: [], memory: [] }) as Relationship,
          playerInput: input,
          timeContext,
          purpose: data.purpose === "greeting" ? "greeting" : "reply",
        });
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify(result || { text: "..." }));
      } catch (err) {
        console.error("[server] /api/npc-reply error:", err);
        rsp.writeHead(500, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "NPC reply failed" }));
      }
      return;
    }
    
    // === DEVVIT INTERNAL ENDPOINTS ===
    if (pathname === "/internal/on-app-install" && method === "POST") {
      console.log("[server] App installation triggered");
      rsp.writeHead(204);
      rsp.end();
      return;
    }
    
    if (pathname === "/internal/on-app-uninstall" && method === "POST") {
      console.log("[server] App uninstallation triggered");
      rsp.writeHead(204);
      rsp.end();
      return;
    }
    
    if (pathname === "/internal/menu/post-create" && method === "POST") {
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
    
    rsp.writeHead(404, { "Content-Type": "application/json" });
    rsp.end(JSON.stringify({ error: "Not found" }));
    
  } catch (err) {
    console.error("[server] Error:", err);
    rsp.writeHead(500, { "Content-Type": "application/json" });
    rsp.end(JSON.stringify({ error: "Server error" }));
  }
}

function buildHUD(player: any): string {
  const job = player.job ? `${player.job.title}` : 'Unemployed';
  return `${player.name} | ${job} | $${player.money.toFixed(0)} | ⚡${player.energy}`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

// Start server
const server = createServer(serverOnRequest);
const port = getServerPort();

server.on("error", (err) => console.error(`server error; ${err.stack}`));
server.listen(port);

console.log(`[server] THE OPEN WORLD running on port ${port}`);
