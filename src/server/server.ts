import type { IncomingMessage, ServerResponse } from "node:http";
import { context } from "@devvit/web/server";
import type { Player } from "../shared/types.ts";

console.log("[server] THE OPEN WORLD module loaded");

export async function serverOnRequest(req: IncomingMessage, rsp: ServerResponse): Promise<void> {
  const url = req.url ?? "";
  const method = req.method ?? "GET";
  const username = context.username ?? "test_user";
  
  console.log(`[server] ${method} ${url} user=${username}`);

  // CORS headers
  rsp.setHeader("Access-Control-Allow-Origin", "*");
  rsp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  rsp.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    rsp.writeHead(200);
    rsp.end();
    return;
  }

  // Simple test endpoint - always returns success
  if (url === "/api/init" && method === "GET") {
    console.log("[server] GET /api/init - returning test response");
    const testPlayer = createTestPlayer(username);
    rsp.writeHead(200, { "Content-Type": "application/json" });
    rsp.end(JSON.stringify({
      type: "init",
      username,
      hasPlayer: true,
      dashboard: buildDashboard(testPlayer),
      player: testPlayer
    }));
    return;
  }

  if (url === "/api/init" && method === "POST") {
    console.log("[server] POST /api/init");
    const body = await readBody(req);
    console.log("[server] Body:", body);
    
    const data = JSON.parse(body || "{}");
    
    // Handle command input
    const input = String(data.input || data.text || "").trim();
    if (input) {
      const testPlayer = createTestPlayer(username, "Dre", "memphis");
      const response = processCommand(testPlayer, input);
      
      rsp.writeHead(200, { "Content-Type": "application/json" });
      rsp.end(JSON.stringify({
        type: "command",
        text: response,
        dashboard: buildDashboard(testPlayer)
      }));
      return;
    }
    
    // Handle player creation
    const name = String(data.firstName || data.name || "Stranger");
    const city = String(data.city || "memphis");
    
    const player = createTestPlayer(username, name, city);
    
    rsp.writeHead(200, { "Content-Type": "application/json" });
    rsp.end(JSON.stringify({
      type: "created",
      dashboard: buildDashboard(player),
      player,
      text: `Welcome to THE OPEN WORLD, ${name}! Your journey begins in ${city}.`
    }));
    return;
  }

  rsp.writeHead(404, { "Content-Type": "application/json" });
  rsp.end(JSON.stringify({ error: "not found" }));
}

function createTestPlayer(username: string, name: string = "Traveler", city: string = "memphis"): Player {
  return {
    id: `player_${Date.now()}`,
    redditUsername: username,
    firstName: name,
    lastName: "",
    age: 18,
    gender: "unspecified",
    background: "unemployed",
    traits: [],
    perk: "fast_learner",
    health: 100,
    happiness: 60,
    energy: 100,
    stress: 10,
    skills: { 
        charisma: 50, 
        tech: 50, 
        fitness: 50, 
        driving: 50, 
        cooking: 50, 
        craftsmanship: 50, 
        finance: 50,
        languages: 0,
      },
    reputation: { professional: 0, social: 0, criminal: 0, community: 0 },
    money: 500,
    bankBalance: 0,
    city: city as any,
    district: "downtown" as any,
    job: null,
    jobPerformance: 50,
    daysAtJob: 0,
    inventory: [],
    vehicles: [],
    relationships: {},
    currentEventId: null,
    activeStorylineId: null,
    backstoryFlags: [],
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
}

function buildDashboard(player: Player): string {
  return `🌍 ${player.firstName} | ${player.city.replace("_", " ")}
💰 Money: $${player.money}
⚡ Energy: ${player.energy}/100
😊 Happiness: ${player.happiness}/100
💼 Job: ${player.job?.title || "Unemployed"}`;
}

function processCommand(player: Player, input: string): string {
  const cmd = input.toLowerCase().trim();
  
  if (cmd.includes("work") || cmd.includes("job")) {
    return "You spend a few hours hustling on Beale Street. You make $25 from tips. 💵";
  }
  if (cmd.includes("study") || cmd.includes("learn")) {
    return "You spend time at the Memphis Public Library, learning new skills. 📚";
  }
  if (cmd.includes("explore") || cmd.includes("look")) {
    return "You walk through downtown Memphis. The blues music fills the air. You see a job posting at a local restaurant. 🎵";
  }
  if (cmd.includes("sleep") || cmd.includes("rest")) {
    return "You rest at your apartment. Energy restored. 😴";
  }
  if (cmd.includes("help")) {
    return "Commands: work, study, explore, sleep, help, status, money";
  }
  if (cmd.includes("status") || cmd.includes("stats")) {
    return `${player.firstName} | Age ${player.age} | $${player.money} | ⚡${player.energy}`;
  }
  if (cmd.includes("money") || cmd.includes("cash")) {
    return `💰 You have $${player.money} in your pocket.`;
  }
  if (cmd.includes("memphis")) {
    return "Memphis, TN - Home of the Blues, BBQ, and your journey begins. 🎸🍖";
  }
  
  return "The city hums with possibility. What would you like to do? (Try: work, study, explore, sleep, help)";
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}
