import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, getServerPort, context, reddit } from "@devvit/web/server";
import { GameEngine } from "./game-engine.js";

console.log("[server] THE OPEN WORLD module loaded - STATELESS MODE");

// Single game engine instance (stateless - client sends state)
const game = new GameEngine();

export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const username = context.username ?? "player";
  
  console.log(`[server] ${method} ${url} user=${username}`);
  
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
    if (url === "/api/init" && method === "GET") {
      // Return default player for new users
      // Note: Player starts fresh each session (stateless)
      
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
    
    if (url === "/api/init" && method === "POST") {
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
        const result = game.processCommand(input);
        console.log(`[server] After command, job: ${JSON.stringify(game.getPlayer().job)}`);
        
        const player = game.getPlayer();
        
        rsp.writeHead(200, { "Content-Type": "application/json" });
        rsp.end(JSON.stringify({
          text: result.message,
          dashboard: buildHUD(player),
          player,
          success: result.success,
        }));
        return;
      }
      
      // No command - return current state
      const player = game.getPlayer();
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
    if (url === "/internal/on-app-install" && method === "POST") {
      console.log("[server] App installation triggered");
      rsp.writeHead(204);
      rsp.end();
      return;
    }
    
    if (url === "/internal/on-app-uninstall" && method === "POST") {
      console.log("[server] App uninstallation triggered");
      rsp.writeHead(204);
      rsp.end();
      return;
    }
    
    if (url === "/internal/menu/post-create" && method === "POST") {
      console.log("[server] Menu post-create triggered");
      
      try {
        // Create a custom post with the game
        const post = await reddit.submitCustomPost({
          subredditName: context.subredditName!,
          title: "🌍 THE OPEN WORLD — A Life Simulation",
          entry: "game",
        });
        
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
