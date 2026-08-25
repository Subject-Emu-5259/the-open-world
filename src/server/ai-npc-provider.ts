import type { NPCState } from './social-engine.js';
import type { Relationship, Player } from '../shared/types.js';

export interface GameTimeContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;
  weather?: string;
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
 * This bridge is intentionally local so the game does not depend on an
 * external AI service. It uses the conversation memory, relationship value,
 * NPC personality, and recent player input to produce a believable line.
 *
 * If it cannot produce a strong reply it returns `null`, and the caller
 * falls back to the richer template pipeline in conversation-engine.ts.
 */
export async function generateNPCReply(req: NPCReplyRequest): Promise<NPCReplyResult | null> {
  const { npc, player, relationship: rel, playerInput, timeContext, purpose } = req;
  const input = playerInput.trim();
  const lower = input.toLowerCase();
  const memory = rel.memory;

  // Memory helpers
  const lastNpc = memory.length > 0 ? memory[memory.length - 1] : null;
  const lastQuestion = lastNpc?.role === 'npc' && lastNpc.content.includes('?') ? lastNpc.content : '';
  const knowsName = rel.flags.includes('knows_name') || !!player?.name;
  const playerName = player?.name || player?.firstName || 'stranger';
  const greeting = greetingWord(timeContext.timeOfDay);

  // Farewell — always allow a clean exit.
  if (['bye', 'goodbye', 'see ya', 'peace', 'later', 'im out', "i'm out", 'gotta go', 'head out'].some(w => lower.includes(w))) {
    return { text: farewellLine(npc, rel, playerName) };
  }

  // Greeting branch
  if (purpose === 'greeting' || (purpose === 'reply' && isGreeting(lower))) {
    return { text: greetingLine(npc, rel, knowsName, playerName, greeting) };
  }

  // Name introduction
  const extractedName = extractName(input);
  if (extractedName) {
    return { text: introductionLine(npc, extractedName, greeting), learnedName: extractedName };
  }

  // Answer to a direct yes/no question
  if (lastQuestion && (isAffirmative(lower) || isNegative(lower))) {
    return { text: answerLine(npc, rel, lower, lastQuestion, playerName) };
  }

  // Small-talk continuation
  if (isSmallTalk(lower)) {
    return { text: smallTalkLine(npc, rel, playerName, lower) };
  }

  // Generic contextual reply (weak fallback)
  return genericReply(npc, rel, playerName, lower);
}

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
  return ['how are you', 'hows it going', "how's it going", 'how you been', 'how you doing', 'whats good', "what's good", 'nothing much', 'not much', 'same old', 'chillin', 'chilling', 'im good', "i'm good", 'doing good', 'fine', 'alright', 'okay', 'ok'].some(w =>
    lower.includes(w)
  );
}

function extractName(input: string): string | null {
  const patterns = [
    /^(?:i['’]?m|i am)\s+([a-z\s'-]{2,30})$/i,
    /^(?:call me|my name is|name is)\s+([a-z\s'-]{2,30})$/i,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m && m[1]) return m[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

function npcName(npc: NPCState): string { return npc.firstName || npc.name.split(' ')[0] || npc.name; }

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function greetingLine(npc: NPCState, rel: Relationship, knowsName: boolean, playerName: string, greeting: string): NPCReplyResult['text'] {
  if (rel.value > 50 && knowsName) {
    return `"What's good, ${playerName}! Good ${greeting} to you."`;
  }
  if (rel.value > 0 && knowsName) {
    return `"${playerName}, good ${greeting}. What brings you around today?"`;
  }
  if (knowsName) {
    return `"Oh, ${playerName}. Didn't expect to see you. Good ${greeting}."`;
  }
  return `"Good ${greeting}. I'm ${npcName(npc)}. I don't think we've met — what's your name?"`;
}

function introductionLine(npc: NPCState, extractedName: string, greeting: string): NPCReplyResult['text'] {
  return pick([
    `"${extractedName}, nice to meet you. I'm ${npcName(npc)}. Good ${greeting}."`,
    `"Pleasure, ${extractedName}. I'm ${npcName(npc)}. I'll remember that."`,
    `"${extractedName} — I'm ${npcName(npc)}. You new around here or just passing through?"`,
  ]);
}

function farewellLine(npc: NPCState, rel: Relationship, playerName: string): NPCReplyResult['text'] {
  const name = rel.flags.includes('knows_name') ? playerName : '';
  return pick([
    name ? `"Take care, ${name}. Catch you around."` : '"Take care. Catch you around."',
    `"Stay safe out there${name ? ', ' + name : ''}."`,
    `"${npcName(npc)} nods. \"Later${name ? ' ' + name : ''}.\""`,
  ]);
}

function answerLine(npc: NPCState, rel: Relationship, lower: string, lastQuestion: string, playerName: string): NPCReplyResult['text'] {
  const affirmative = isAffirmative(lower);
  const name = rel.flags.includes('knows_name') ? playerName : '';

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

  if (affirmative) return `"Aight, noted."`;
  return `"I feel you."`;
}

function smallTalkLine(npc: NPCState, rel: Relationship, playerName: string, lower: string): NPCReplyResult['text'] {
  const name = rel.flags.includes('knows_name') ? playerName : '';
  if (lower.includes('how are you') || lower.includes('hows it') || lower.includes("how's it")) {
    return pick([
      `"Can't complain. You know how it is — same grind, different day${name ? ', ' + name : ''}."`,
      `"I'm good${name ? ', ' + name : ''}. Just keeping busy. How about yourself?"`,
    ]);
  }
  if (lower.includes('whats good') || lower.includes("what's good")) {
    return `"Nothing much${name ? ', ' + name : ''}. Just staying out of trouble. What's good with you?"`;
  }
  return `"Same old${name ? ', ' + name : ''}. What you been up to?"`;
}

function genericReply(npc: NPCState, rel: Relationship, playerName: string, lower: string): NPCReplyResult | null {
  // Only reply generically if we have a name; otherwise keep prompting for it.
  if (!rel.flags.includes('knows_name')) return null;
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
