// v0.108.10 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves the dialogue engine: voice profiles in prompts,
// memory write -> later callback, thread open -> answer -> follow-up,
// mood bands, missing-key template fallback, Optra failure fallback, and
// HARD per-user isolation (two users, same NPC, disjoint facts/memories/
// prompts/replies). MOCK FETCH ONLY — no live endpoint is ever called,
// and no real credential is ever read: the harness passes an explicit
// fake config object and never touches settings or env secrets. Run:
//   npx esbuild tools/harness-dialogue-engine.ts --bundle --platform=node --format=esm --outfile=/tmp/hdialogue.mjs && node /tmp/hdialogue.mjs
import { DialogueEngine, buildDialoguePrompt, deriveMood, scoreRelationshipChange, type DialogueNpc, type TemplateFallback } from '../src/server/dialogue-engine.js';
import { dialogueMemoryKey, getNpcMemory, openThreads, type DialogueScope } from '../src/server/dialogue-memory.js';
import { deriveVoiceProfile, profilePromptBlock } from '../src/server/dialogue-profiles.js';
import { getOptraConfig, isOptraConfigured, optraChatCompletion, type FetchImpl } from '../src/server/optra-client.js';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} :: ${JSON.stringify(extra)}`);
  }
}

const FALLBACK: TemplateFallback = {
  async generateGreeting(npc: unknown) {
    const n = npc as { name: string };
    return { text: `Template: hello from ${n.name}.`, relationshipChange: 0 };
  },
  async generateResponse(_npc: unknown, input: string) {
    return { text: `Template: you said "${input}".`, relationshipChange: 0 };
  },
};

const MARCUS: DialogueNpc = {
  id: 'npc_001',
  name: 'Marcus Williams',
  role: 'store_owner',
  city: 'memphis',
  district: 'downtown',
  description: 'Owns Williams General Store on Main St. Been in business 20 years.',
  personality: ['wise', 'generous'],
};

function marcusWithQuests(): DialogueNpc {
  return { ...MARCUS, quests: [{ id: 'q_stock', title: 'Stock the Shelves' }] };
}

function rel(value = 0) {
  return { value, flags: [], metAt: 0, lastInteracted: 0, memory: [] };
}

const TIME = { hour: 10, isWeekend: false, timeOfDay: 'morning' };
const GAME_DATE = 'Monday, January 1, 2024';

// Mock Optra endpoint: echoes the '- ' lines of the system prompt back, so
// a test can prove exactly which facts/threads reached the model.
let fetchCalls = 0;
let lastAuth = '';
let lastUrl = '';
const mockFetch: FetchImpl = async (url, init) => {
  fetchCalls++;
  lastUrl = url;
  lastAuth = init.headers.Authorization ?? '';
  const body = JSON.parse(init.body) as { messages: Array<{ role: string; content: string }> };
  const system = body.messages.find((m) => m.role === 'system')?.content ?? '';
  const seen = system
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .join(' / ');
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: `Mock reply from Marcus. Seen: ${seen}` } }],
    }),
  };
};

const FAKE_CONFIG = {
  apiKey: 'test-key-never-real',
  baseUrl: 'https://example.invalid/v1',
  model: 'test-model',
};

const scopeA: DialogueScope = { userId: 'user-A', installId: 'r/The_Open_World', npcId: 'npc_001' };
const scopeB: DialogueScope = { userId: 'user-B', installId: 'r/The_Open_World', npcId: 'npc_001' };

async function main(): Promise<void> {
  console.log('--- 1. voice profile derived from roster data ---');
  {
    const p = deriveVoiceProfile(MARCUS);
    check('profile register is shop talk', p.register.includes('shop'));
    check('profile carries wise speech notes', p.speechNotes.includes('proverb') || p.speechNotes.includes('story'));
    const block = profilePromptBlock(MARCUS, p);
    check('prompt block names NPC + role', block.includes('Marcus Williams') && block.includes('store owner'));
    check('prompt block carries description', block.includes('Williams General Store'));
  }

  console.log('--- 2. prompt built from profile + own memory only ---');
  {
    const player: Record<string, unknown> = { name: 'Alice', city: 'memphis', job: { title: 'Nurse' } };
    const mem = getNpcMemory(player, 'npc_001');
    const prompt = buildDialoguePrompt({
      npc: MARCUS, player, relValue: 10, mem,
      mood: deriveMood(10, mem), input: 'hello', timeCtx: TIME,
    });
    check('prompt contains NPC voice', prompt.system.includes('Marcus Williams'));
    check('fresh prompt invents no facts', prompt.system.includes('none yet'));
    check('prompt user context is this player only', prompt.user.includes('Alice') && !prompt.user.includes('Bob'));
  }

  console.log('--- 3. memory write -> later callback ---');
  {
    const engine = new DialogueEngine(FALLBACK);
    const player: Record<string, unknown> = { name: 'Alice', city: 'memphis' };
    const r1 = await engine.generateReply({
      scope: scopeA, npc: MARCUS, player, rel: rel(0), input: 'i like jazz',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    check('reply echoes learned fact via prompt', r1.text.includes('jazz'), r1.text.slice(0, 200));
    const mem = getNpcMemory(player, 'npc_001');
    check('fact stored on this player only', mem.facts.likes === 'jazz');
    check('usedAI true with mock endpoint', r1.usedAI === true);
    check('key travels only in Authorization header', lastAuth === 'Bearer test-key-never-real');
    check('request went to configured base URL', lastUrl === 'https://example.invalid/v1/chat/completions');
  }

  console.log('--- 4. thread open -> answer -> follow-up ---');
  {
    const engine = new DialogueEngine(FALLBACK);
    const player: Record<string, unknown> = { name: 'Alice', city: 'memphis' };
    const npc = marcusWithQuests();
    await engine.generateReply({
      scope: scopeA, npc, player, rel: rel(0), input: 'is there any work you can help with?',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    check('thread opened on help ask', openThreads(getNpcMemory(player, 'npc_001')).length === 1);
    const r2 = await engine.generateReply({
      scope: scopeA, npc, player, rel: rel(0), input: 'yes',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    check('yes answer triggers quest hook', r2.questTriggered === 'q_stock', r2.questTriggered);
    check('thread closed after answer', openThreads(getNpcMemory(player, 'npc_001')).length === 0);
    const mem = getNpcMemory(player, 'npc_001');
    check('answered thread kept with answer', mem.threads.some((t) => t.status === 'answered' && t.answer === 'yes'));
  }

  console.log('--- 5. HARD ISOLATION: two users, same NPC ---');
  {
    const engine = new DialogueEngine(FALLBACK);
    const playerA: Record<string, unknown> = { name: 'Alice', city: 'memphis' };
    const playerB: Record<string, unknown> = { name: 'Bob', city: 'memphis' };
    await engine.generateReply({
      scope: scopeA, npc: MARCUS, player: playerA, rel: rel(0), input: 'i like jazz',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    await engine.generateReply({
      scope: scopeB, npc: MARCUS, player: playerB, rel: rel(0), input: 'i like boxing',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    const memA = getNpcMemory(playerA, 'npc_001');
    const memB = getNpcMemory(playerB, 'npc_001');
    check('A memory has jazz, not boxing', memA.facts.likes === 'jazz');
    check('B memory has boxing, not jazz', memB.facts.likes === 'boxing');
    const promptA = buildDialoguePrompt({
      npc: MARCUS, player: playerA, relValue: 0, mem: memA,
      mood: deriveMood(0, memA), input: 'hi', timeCtx: TIME,
    });
    const promptB = buildDialoguePrompt({
      npc: MARCUS, player: playerB, relValue: 0, mem: memB,
      mood: deriveMood(0, memB), input: 'hi', timeCtx: TIME,
    });
    check('A prompt has jazz, not boxing, not Bob', promptA.system.includes('jazz') && !promptA.system.includes('boxing') && !promptA.system.includes('Bob'));
    check('B prompt has boxing, not jazz, not Alice', promptB.system.includes('boxing') && !promptB.system.includes('jazz') && !promptB.system.includes('Alice'));
    const keyA = dialogueMemoryKey(scopeA);
    const keyB = dialogueMemoryKey(scopeB);
    check('scoped keys differ per user', keyA !== keyB);
    check('key carries userId + installId + npcId', keyA.includes('user-A') && keyA.includes('The_Open_World') && keyA.includes('npc_001'));
    // Replies via mock echo prompt facts: disjoint by construction.
    const rA = await engine.generateReply({
      scope: scopeA, npc: MARCUS, player: playerA, rel: rel(0), input: 'tell me what you remember',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    check('A reply references A fact only', rA.text.includes('jazz') && !rA.text.includes('boxing'));
  }

  console.log('--- 6. fresh user starts empty; NPC object never mutated ---');
  {
    const fresh: Record<string, unknown> = { name: 'New', city: 'memphis' };
    const mem = getNpcMemory(fresh, 'npc_001');
    check('fresh memory empty', Object.keys(mem.facts).length === 0 && mem.episodes.length === 0 && mem.threads.length === 0);
    const frozen = Object.freeze({ ...MARCUS, quests: Object.freeze([]) });
    const engine = new DialogueEngine(FALLBACK);
    const player: Record<string, unknown> = { name: 'Carol', city: 'memphis' };
    const before = JSON.stringify(frozen);
    await engine.generateReply({
      scope: { userId: 'user-C', installId: 'r/The_Open_World', npcId: 'npc_001' },
      npc: frozen as DialogueNpc, player, rel: rel(0), input: 'hello',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: mockFetch,
    });
    check('engine never mutates the NPC object', JSON.stringify(frozen) === before);
  }

  console.log('--- 7. missing key -> template fallback, no fetch, no error ---');
  {
    let calls = 0;
    const neverFetch: FetchImpl = async () => {
      calls++;
      throw new Error('must not be called');
    };
    const engine = new DialogueEngine(FALLBACK);
    const player: Record<string, unknown> = { name: 'Dave', city: 'memphis' };
    const r = await engine.generateReply({
      scope: scopeA, npc: MARCUS, player, rel: rel(0), input: 'hello there',
      timeCtx: TIME, gameDate: GAME_DATE,
      optraConfig: { apiKey: '', baseUrl: 'https://example.invalid/v1', model: '' },
      fetchImpl: neverFetch,
    });
    check('fallback text returned', r.text.startsWith('Template:'));
    check('usedAI false without key', r.usedAI === false);
    check('fetch never called without key', calls === 0);
    const cfg = await getOptraConfig({ settingsGetter: async () => undefined, env: {} });
    check('unconfigured config detected', isOptraConfigured(cfg) === false);
  }

  console.log('--- 8. Optra failure -> template fallback, no throw ---');
  {
    const failingFetch: FetchImpl = async () => {
      throw new Error('network down');
    };
    const engine = new DialogueEngine(FALLBACK);
    const player: Record<string, unknown> = { name: 'Erin', city: 'memphis' };
    const r = await engine.generateReply({
      scope: scopeA, npc: MARCUS, player, rel: rel(0), input: 'hello',
      timeCtx: TIME, gameDate: GAME_DATE, optraConfig: FAKE_CONFIG, fetchImpl: failingFetch,
    });
    check('failure falls back to templates', r.text.startsWith('Template:') && r.usedAI === false);
    const nullText = await optraChatCompletion({
      config: FAKE_CONFIG, system: 's', user: 'u', fetchImpl: failingFetch,
    });
    check('client returns null on failure, never throws', nullText === null);
  }

  console.log('--- 9. mood bands + scorer ---');
  {
    check('mood warm at 80', deriveMood(80, getNpcMemory({}, 'npc_001')).label === 'warm');
    check('mood hostile at -80', deriveMood(-80, getNpcMemory({}, 'npc_001')).label === 'hostile');
    check('mood neutral at 0', deriveMood(0, getNpcMemory({}, 'npc_001')).label === 'neutral');
    check('insult scores negative', scoreRelationshipChange('you idiot') === -3);
    check('thanks scores positive', scoreRelationshipChange('thank you') === 1);
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('HARNESS CRASH', e);
  process.exit(1);
});
