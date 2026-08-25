import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, getServerPort, context, reddit } from "@devvit/web/server";
import { redis } from "@devvit/redis";
import { GameEngine } from "./game-engine.js";

console.log("[server] THE OPEN WORLD module loaded - STATELESS MODE");

// Single game engine instance (stateless - client sends state)
const game = new GameEngine();
async function serverSavePlayer(username: string, player: any, slot = "1"): Promise<void> {
  try {
    await redis.set(`${username}_save_${slot}`, JSON.stringify(player));
    console.log(`[server] Authoritative save: ${username} slot ${slot}`);
  } catch (e) {
    console.error("[server] Authoritative save failed:", e);
  }
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
      // Try to resume the user's most recent save (slot 1 is the auto-save slot)
      const slot = url.searchParams.get("slot") || "1";
      try {
        const data = await redis.get(`${username}_save_${slot}`);
        if (data) {
          const player = JSON.parse(data);
          console.log(`[server] GET /api/init resumed save for ${username} slot ${slot}: ${player.name}`);
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
      } catch (err) {
        console.error("[server] Redis load error:", err);
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
          const data = await redis.get(`${username}_save_${i}`);
          if (data) {
            const player = JSON.parse(data);
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
        await redis.set(`${username}_save_${slot}`, JSON.stringify(player));
        console.log(`[server] Saved player ${username} slot ${slot} to Redis`);
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error("[server] Redis save error:", err);
        rsp.writeHead(500, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "Persistence failure" }));
      }
      return;
    }

    if (pathname === "/api/load" && method === "GET") {
      const slot = url.searchParams.get("slot") || "1";

      try {
        const data = await redis.get(`${username}_save_${slot}`);
        if (data) {
          rsp.writeHead(200, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ player: JSON.parse(data) }));
        } else {
          rsp.writeHead(404, { "Content-Type": "application/json" });
          rsp.end(JSON.stringify({ error: "Save not found" }));
        }
      } catch (err) {
        console.error("[server] Redis load error:", err);
        rsp.writeHead(500, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({ error: "Persistence failure" }));
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
        
        await serverSavePlayer(username, player);
        
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
      await serverSavePlayer(username, player);
      rsp.writeHead(200, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({
        type: "created",
        player,
        dashboard: buildHUD(player),
        text: `🌍 Welcome to THE OPEN WORLD, ${player.name}!`,
      }));
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
