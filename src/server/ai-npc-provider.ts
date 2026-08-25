import type { NPCState } from './social-engine.js';
import type { Relationship, Player } from '../shared/types.js';
import { fetchNPCReply } from './llm-provider.js';

export interface GameTimeContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  weather?: string;
  hour?: number;
  isWeekend: boolean;
}

export interface NPCReplyRequest {
  npc: NPCState;
  player: Player;
  relationship: Relationship;
  playerInput: string;
  timeContext: GameTimeContext;
  purpose: 'greeting' | 'reply';
}

export interface NPCReplyResult {
  text: string;
  learnedName?: string;
}

/**
 * Best-effort contextual NPC reply generator.
 *
 * v3 now delegates to a serverless LLM backend (HuggingFace preferred, with
 * OpenRouter / Groq / Gemini fallbacks). If no API key is configured, the LLM
 * call fails, or the response is malformed, we fall back to the local template
 * pipeline so the game keeps working offline.
 */
export async function generateNPCReply(req: NPCReplyRequest): Promise<NPCReplyResult | null> {
  const { npc, player, relationship: rel, playerInput, purpose } = req;
  const input = playerInput.trim();

  // Farewell — always allow a clean exit.
  if (purpose === 'reply' && isFarewell(input.toLowerCase())) {
    return { text: farewellLine(npc, rel, playerName(rel, player)) };
  }

  // Try the LLM brain first if any provider is configured.
  try {
    const ai = await fetchNPCReply(req);
    if (ai?.text) return ai;
  } catch (e) {
    console.warn('[ai-npc-provider] LLM bridge failed, using local reply.', e);
  }

  // Local template fallback.
  return localGenerateReply(req);
}

// ---------------------------------------------------------------------------
// LOCAL TEMPLATE FALLBACK
// ---------------------------------------------------------------------------

function localGenerateReply(req: NPCReplyRequest): NPCReplyResult | null {
  const { npc, player, relationship: rel, playerInput, timeContext, purpose } = req;
  const input = playerInput.trim();
  const lower = input.toLowerCase();
  const knowsName = rel.flags.includes('knows_name') || rel.flags.some(f => f.startsWith('known_name:'));
  const name = playerName(rel, player);
  const greeting = greetingWord(timeContext.timeOfDay);

  if (purpose === 'greeting' || isGreeting(lower)) {
    return { text: greetingLine(npc, rel, knowsName, name, greeting) };
  }

  const extractedName = extractName(input);
  if (extractedName) {
    return { text: introductionLine(npc, extractedName, greeting), learnedName: extractedName };
  }

  const lastQuestion = recallLastQuestion(rel.memory);
  if (lastQuestion && (isAffirmative(lower) || isNegative(lower))) {
    return { text: answerLine(npc, rel, lower, lastQuestion, name) };
  }

  if (isSmallTalk(lower)) {
    return { text: smallTalkLine(npc, rel, name, lower) };
  }

  return genericReply(npc, rel, name, lower);
}

function recallLastQuestion(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'npc' && m.content.includes('?')) return m.content;
  }
  return '';
}

function playerName(rel: Relationship, player: Player): string {
  if (player?.name && player.name !== 'Traveler') return player.name;
  const known = rel.flags.find(f => f.startsWith('known_name:'));
  if (known) return known.replace('known_name:', '');
  if (player?.firstName) return player.firstName;
  return '';
}

function npcName(npc: NPCState): string { return npc.firstName || npc.name.split(' ')[0] || npc.name; }

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] as T; }

function greetingWord(tod: string): string {
  switch (tod) {
    case 'morning': return 'morning';
    case 'afternoon': return 'afternoon';
    case 'evening': return 'evening';
    case 'night': return 'night';
    default: return 'day';
  }
}

function isGreeting(lower: string): boolean {
  return ['hey', 'hi', 'hello', 'sup', 'wasup', 'wassup', 'yo', 'whats up', "what's up", 'howdy', 'good morning', 'good afternoon', 'good evening'].some(w =>
    lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w)
  );
}

function isFarewell(lower: string): boolean {
  return ['bye', 'goodbye', 'see ya', 'peace', 'later', 'im out', "i'm out", 'gotta go', 'head out', 'ima head out'].some(w => lower.includes(w));
}

function isAffirmative(lower: string): boolean {
  return ['yeah', 'yes', 'yep', 'yup', 'sure', 'definitely', 'absolutely', 'of course', 'right', 'correct', 'true', 'indeed', 'bet', 'aight', 'alright', 'okay', 'ok'].some(w =>
    lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w)
  );
}

function isNegative(lower: string): boolean {
  return ['nah', 'no', 'nope', 'not really', 'not at all', 'never', 'false', 'incorrect'].some(w =>
    lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w)
  );
}

function isSmallTalk(lower: string): boolean {
  return ['how are you', 'hows it going', "how's it going", 'how you been', 'how you doing', 'whats good', "what's good", 'nothing much', 'not much', 'same old', 'chillin', 'chilling', 'im good', "i'm good", 'doing good', 'fine', 'alright', 'okay', 'ok'].some(w => lower.includes(w));
}

function extractName(input: string): string | null {
  const patterns = [
    /(?:i['’]?m|i am)\s+([a-z][a-z\s'-]{1,29})/i,
    /(?:call me|my name is|name is)\s+([a-z][a-z\s'-]{1,29})/i,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m && m[1]) {
      const extracted = m[1].trim().replace(/\s+/g, ' ');
      if (extracted.length > 1) return extracted;
    }
  }
  return null;
}

function greetingLine(npc: NPCState, rel: Relationship, knowsName: boolean, playerName: string, greeting: string): string {
  if (rel.value > 50 && knowsName && playerName) {
    return pick([
      `"What's good, ${playerName}! Good ${greeting} to you."`,
      `"There they go — ${playerName}! Good ${greeting}, fam."`,
    ]);
  }
  if (rel.value > 0 && knowsName && playerName) {
    return pick([
      `"${playerName}, good ${greeting}. What brings you around today?"`,
      `"Good ${greeting}, ${playerName}. You out here handling business?"`,
    ]);
  }
  if (knowsName && playerName) {
    return pick([
      `"Oh, ${playerName}. Didn't expect to see you. Good ${greeting}."`,
      `"${playerName}. Good ${greeting}. What's on your mind?"`,
    ]);
  }
  return pick([
    `"Good ${greeting}. I'm ${npcName(npc)}. I don't think we've met — what's your name?"`,
    `"${npcName(npc)} here. Good ${greeting}. You new around here?"`,
  ]);
}

function introductionLine(npc: NPCState, extractedName: string, greeting: string): string {
  return pick([
    `"${extractedName}, nice to meet you. I'm ${npcName(npc)}. Good ${greeting}."`,
    `"Pleasure, ${extractedName}. I'm ${npcName(npc)}. I'll remember that."`,
    `"${extractedName} — I'm ${npcName(npc)}. You new around here or just passing through?"`,
  ]);
}

function farewellLine(npc: NPCState, rel: Relationship, playerName: string): string {
  const knowsName = rel.flags.includes('knows_name') || rel.flags.some(f => f.startsWith('known_name:'));
  const name = knowsName ? playerName : '';
  return pick([
    name ? `"Take care, ${name}. Catch you around."` : '"Take care. Catch you around."',
    `"Stay safe out there${name ? ', ' + name : ''}."`,
    `"${npcName(npc)} nods. \"Later${name ? ' ' + name : ''}.\""`,
  ]);
}

function answerLine(npc: NPCState, rel: Relationship, lower: string, lastQuestion: string, playerName: string): string {
  const affirmative = isAffirmative(lower);
  const knowsName = rel.flags.includes('knows_name') || rel.flags.some(f => f.startsWith('known_name:'));
  const name = knowsName ? playerName : '';

  if (lastQuestion.includes('name')) {
    return name
      ? pick([`"${name} it is. Good to put a name to the face."`, `"Got it — ${name}. I'm ${npcName(npc)}."`])
      : `"No problem. I'm ${npcName(npc)}. What's yours?"`;
  }

  if (lastQuestion.includes('help') || lastQuestion.includes('favor') || lastQuestion.includes('need')) {
    if (affirmative) return `"Bet${name ? ' ' + name : ''}. I might have something for you soon."`;
    return `"All good${name ? ', ' + name : ''}. I'll holler if something comes up."`;
  }

  if (lastQuestion.includes('work') || lastQuestion.includes('job')) {
    if (affirmative) return `"Good. Let me know when you're ready."`;
    return `"No pressure. The offer stands."`;
  }

  if (affirmative) return `"Aight${name ? ' ' + name : ''}, noted."`;
  return `"I feel you${name ? ', ' + name : ''}."`;
}

function smallTalkLine(npc: NPCState, rel: Relationship, playerName: string, lower: string): string {
  const knowsName = rel.flags.includes('knows_name') || rel.flags.some(f => f.startsWith('known_name:'));
  const name = knowsName ? playerName : '';
  if (lower.includes('how are you') || lower.includes('hows it') || lower.includes("how's it")) {
    return pick([
      `"Can't complain${name ? ', ' + name : ''}. You know how it is — same grind, different day."`,
      `"I'm good${name ? ', ' + name : ''}. Just keeping busy. How about yourself?"`,
    ]);
  }
  if (lower.includes('whats good') || lower.includes("what's good")) {
    return `"Nothing much${name ? ', ' + name : ''}. Just staying out of trouble. What's good with you?"`;
  }
  return `"Same old${name ? ', ' + name : ''}. What you been up to?"`;
}

function genericReply(npc: NPCState, rel: Relationship, playerName: string, lower: string): NPCReplyResult | null {
  const knowsName = rel.flags.includes('knows_name') || rel.flags.some(f => f.startsWith('known_name:'));

  if (!knowsName) {
    // Keep prompting for a name naturally.
    return { text: pick([
      `"I didn't catch your name. What was it again?"`,
      `"Sorry — I'm bad with faces. Who are you?"`,
    ]) };
  }

  const name = playerName;
  if (rel.value > 30) {
    return { text: pick([
      `"${name}, you always got something interesting to say. Go on."`,
      `"I hear that, ${name}. Keep talking."`,
    ]) };
  }

  if (lower.includes('?')) {
    return { text: `"That's a good question, ${name}. I don't have a clean answer, but I'll think on it."` };
  }

  return { text: pick([
    `"Yeah? Tell me more, ${name}."`,
    `"I feel you, ${name}."`,
    `"${npcName(npc)} listens. \"Go on, I'm following.\""`,
  ]) };
}
