// THE OPEN WORLD — Serverless LLM NPC reply bridge
// Prefers Hugging Face Inference API, then OpenRouter, Groq, and Gemini free tiers.
// API keys are read from Devvit app settings (global secrets) so they can be
// updated without redeploying. No SDKs required.

import type { NPCState } from './social-engine.js';
import type { Relationship } from '../shared/types.js';
import { settings } from '@devvit/web/server';

export interface NPCReplyRequest {
  npc: NPCState;
  player: any;
  relationship: Relationship;
  playerInput: string;
  timeContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    isWeekend: boolean;
    hour?: number;
    weather?: string;
  };
  purpose: 'greeting' | 'reply';
}

export interface NPCReplyResult {
  text: string;
  learnedName?: string;
  source?: string;
}

interface KeySet {
  hfApiKey: string;
  hfModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  groqApiKey: string;
  groqModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

type ProviderFn = (req: NPCReplyRequest, keys: KeySet) => Promise<NPCReplyResult | null>;

const REQUEST_TIMEOUT_MS = 7000;

let cachedKeys: KeySet | null = null;
let cacheExpiresAt = 0;
const KEY_CACHE_TTL_MS = 60_000;

async function getKeys(): Promise<KeySet> {
  if (cachedKeys && Date.now() < cacheExpiresAt) return cachedKeys;
  const defaults: KeySet = {
    hfApiKey: '',
    hfModel: 'HuggingFaceH4/zephyr-7b-beta',
    openrouterApiKey: '',
    openrouterModel: 'huggingfaceh4/zephyr-7b-beta:free',
    groqApiKey: '',
    groqModel: 'llama3-8b-8192',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash-latest',
  };
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof KeySet>) {
    try {
      const value = await settings.get(key);
      if (typeof value === 'string') {
        result[key] = value;
      } else if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    } catch (e) {
      // Key not defined or settings unavailable — keep default/empty.
    }
  }
  // Also allow local environment overrides during `devvit playtest`.
  result.hfApiKey ||= process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || '';
  result.openrouterApiKey ||= process.env.OPENROUTER_API_KEY || '';
  result.groqApiKey ||= process.env.GROQ_API_KEY || '';
  result.geminiApiKey ||= process.env.GEMINI_API_KEY || '';
  result.hfModel = process.env.HF_NPC_MODEL || result.hfModel;
  result.openrouterModel = process.env.OPENROUTER_NPC_MODEL || result.openrouterModel;
  result.groqModel = process.env.GROQ_NPC_MODEL || result.groqModel;
  result.geminiModel = process.env.GEMINI_NPC_MODEL || result.geminiModel;
  cachedKeys = result;
  cacheExpiresAt = Date.now() + KEY_CACHE_TTL_MS;
  return result;
}

export async function fetchNPCReply(req: NPCReplyRequest): Promise<NPCReplyResult | null> {
  const keys = await getKeys();
  const providers: Array<{ name: string; fn: ProviderFn }> = [
    { name: 'huggingface', fn: huggingFaceProvider },
    { name: 'openrouter', fn: openRouterProvider },
    { name: 'groq', fn: groqProvider },
    { name: 'gemini', fn: geminiProvider },
  ];

  for (const { name, fn } of providers) {
    try {
      const result = await withTimeout(fn(req, keys), REQUEST_TIMEOUT_MS);
      if (result && result.text.trim().length > 0) {
        result.source = name;
        return result;
      }
    } catch (e) {
      console.warn(`[llm-provider] ${name} failed:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// Hugging Face Inference API (preferred)
// -----------------------------------------------------------------------------
async function huggingFaceProvider(req: NPCReplyRequest, keys: KeySet): Promise<NPCReplyResult | null> {
  if (!keys.hfApiKey) return null;

  const prompt = buildRawPrompt(req);
  const res = await fetch(`https://api-inference.huggingface.co/models/${keys.hfModel}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${keys.hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 90,
        temperature: 0.75,
        do_sample: true,
        return_full_text: false,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HF status ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  return parseReply(generated, req);
}

// -----------------------------------------------------------------------------
// OpenRouter (OpenAI-compatible chat completions)
// -----------------------------------------------------------------------------
async function openRouterProvider(req: NPCReplyRequest, keys: KeySet): Promise<NPCReplyResult | null> {
  if (!keys.openrouterApiKey) return null;

  const messages = buildChatMessages(req);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${keys.openrouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: keys.openrouterModel,
      messages,
      max_tokens: 90,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter status ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  return parseReply(content, req);
}

// -----------------------------------------------------------------------------
// Groq (OpenAI-compatible, very fast free tier)
// -----------------------------------------------------------------------------
async function groqProvider(req: NPCReplyRequest, keys: KeySet): Promise<NPCReplyResult | null> {
  if (!keys.groqApiKey) return null;

  const messages = buildChatMessages(req);
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${keys.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: keys.groqModel,
      messages,
      max_tokens: 90,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq status ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  return parseReply(content, req);
}

// -----------------------------------------------------------------------------
// Google Gemini
// -----------------------------------------------------------------------------
async function geminiProvider(req: NPCReplyRequest, keys: KeySet): Promise<NPCReplyResult | null> {
  if (!keys.geminiApiKey) return null;

  const prompt = buildRawPrompt(req);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${keys.geminiModel}:generateContent?key=${keys.geminiApiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 90, temperature: 0.8 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini status ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseReply(content, req);
}

// -----------------------------------------------------------------------------
// Prompt builders
// -----------------------------------------------------------------------------
function buildChatMessages(req: NPCReplyRequest): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: buildSystemPrompt(req) },
    { role: 'user', content: req.purpose === 'greeting' ? '[greeting]' : req.playerInput },
  ];
}

function buildSystemPrompt(req: NPCReplyRequest): string {
  return buildRawPrompt(req);
}

function buildRawPrompt(req: NPCReplyRequest): string {
  const { npc, player, relationship: rel, playerInput, timeContext, purpose } = req;
  const npcFirstName = npc.firstName || npc.name.split(' ')[0] || npc.name;
  const playerName = player?.name || player?.firstName || 'stranger';
  const knowsName = rel.flags?.includes('knows_name') || false;

  const hour = timeContext.hour ?? hourFromTimeOfDay(timeContext.timeOfDay);
  const recentMemory = rel.memory
    ? rel.memory
        .slice(-6)
        .map((m) => `${m.role === 'player' ? 'Player' : npcFirstName}: ${stripQuotes(String(m.content))}`)
        .join('\n')
    : '';

  const greetingInstruction = knowsName
    ? `Greet ${playerName} warmly and naturally.`
    : `Greet the player, introduce yourself as ${npcFirstName}, and politely ask their name.`;

  const replyInstruction = knowsName
    ? `Reply naturally to ${playerName}. Use their name once if it fits. Keep it conversational (1-2 sentences).`
    : `Reply naturally. If they just told you their name, acknowledge it warmly.`;

  return `You are roleplaying as ${npc.name}, a ${npc.age || 'middle-aged'}-year-old ${npc.gender || 'person'} who works as a ${npc.role.replace(/_/g, ' ')} in ${formatCity(npc.city)}.
Traits: ${(npc.personality || []).join(', ') || 'friendly'}.
About you: ${npc.description || 'A local resident.'}
Current time: ${timeContext.timeOfDay} around ${hour}:00${timeContext.isWeekend ? ' on a weekend' : ''}.${timeContext.weather ? ` Weather: ${timeContext.weather}.` : ''}
Relationship with the player: ${rel.value || 0}/100 (${relationshipLabel(rel.value || 0)}).
${knowsName ? `You know the player's name is ${playerName}.` : "You do not know the player's name yet."}
${recentMemory ? `Recent conversation:\n${recentMemory}\n` : ''}
${purpose === 'greeting' ? greetingInstruction : replyInstruction}
Player says: "${purpose === 'greeting' ? 'Hey.' : stripQuotes(playerInput)}"
${npcFirstName}:`;
}

function relationshipLabel(value: number): string {
  if (value >= 70) return 'close friend';
  if (value >= 30) return 'friend';
  if (value > 0) return 'acquaintance';
  if (value === 0) return 'stranger';
  if (value > -30) return 'wary';
  return 'hostile';
}

function hourFromTimeOfDay(tod: string): number {
  switch (tod) {
    case 'morning':
      return 9;
    case 'afternoon':
      return 14;
    case 'evening':
      return 19;
    default:
      return 22;
  }
}

function formatCity(city: string): string {
  return city ? city.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'the city';
}

function stripQuotes(text: string): string {
  if (!text) return '';
  let t = text.trim();
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
  return t;
}

function parseReply(raw: any, req: NPCReplyRequest): NPCReplyResult | null {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  if (!text) return null;

  // Trim everything after the next "Player:" in case the model hallucinates onward.
  const playerIdx = text.toLowerCase().indexOf('player:');
  if (playerIdx > 0) text = text.slice(0, playerIdx).trim();

  // Strip surrounding quotes; the caller will re-add them consistently.
  text = stripQuotes(text).trim();
  if (!text) return null;

  // Extract a name if the player introduced themselves and we don't know it yet.
  let learnedName: string | undefined;
  if (!req.relationship.flags?.includes('knows_name')) {
    learnedName = extractName(req.playerInput) || extractName(text);
  }

  return { text, learnedName };
}

function extractName(input: string): string | undefined {
  const patterns = [
    /(?:i['’]?m|i am)\s+([a-z][a-z\s'-]{1,29})/i,
    /(?:call me|my name is|name is)\s+([a-z][a-z\s'-]{1,29})/i,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m && m[1]) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      if (name.length > 1) return name;
    }
  }
  return undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
