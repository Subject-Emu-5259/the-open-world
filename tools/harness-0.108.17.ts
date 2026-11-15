// v0.108.17 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves three things Dre called out:
//   1. The quick-button matrix: all 18 quick-bar buttons, each in TWO
//      states — (a) normal play and (b) conversation-active with the
//      quick-press flag — return their command's REAL output, never an
//      NPC dialogue reply. A parser-existence check does not count.
//   2. Typed input is untouched: the same three commands typed WITHOUT
//      the flag mid-conversation still route to NPC dialogue.
//   3. "go home" / "home": recognized, moves the player home (first owned
//      property's city, else the starting city west_memphis), charges
//      normal travel fares, and costs nothing same-city.
//   4. Help: contains every new command/system and no nonexistent one
//      (each help-listed token dispatches instead of "Unknown command").
// Run:
//   npx esbuild tools/harness-0.108.17.ts --bundle --platform=node --format=esm --outfile=/tmp/h10817.mjs && node /tmp/h10817.mjs
import { GameEngine } from '../src/server/game-engine.js';

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

function baseState(over: Record<string, unknown> = {}): any {
  return { name: 'Tester', city: 'memphis', district: 'downtown', money: 10000, ...over };
}

function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(baseState(over));
  return g;
}

function inConversation(g: GameEngine): void {
  const npc = (g as any).social.getNPCByCity('memphis')[0];
  (g as any).player.currentConversation = { npcId: npc.id, npcName: npc.name };
}

// --- 1. Quick-button matrix: 18 buttons x 2 states ---
// Markers are stable substrings from each command's real output (captured
// from live runs), never from dialogue. Work uses an employed player so
// the cell proves a real shift, not just the no-job message.
const BUTTONS: Array<{ cmd: string; marker: string; setup?: Record<string, unknown> }> = [
  { cmd: 'status', marker: 'Net Worth' },
  { cmd: 'work', marker: 'Worked 8hr shift', setup: { job: { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking' }, energy: 100 } },
  { cmd: 'explore', marker: 'Exploring downtown' },
  { cmd: 'talk', marker: 'Who do you want to talk to?' },
  { cmd: 'goals', marker: 'Daily Goals' },
  { cmd: 'journal', marker: 'Your Journal' },
  { cmd: 'quests', marker: 'Active Quests' },
  { cmd: 'skills', marker: 'YOUR SKILLS' },
  { cmd: 'achievements', marker: 'Achievements' },
  { cmd: 'bank', marker: 'THE OPEN WORLD BANK' },
  { cmd: 'properties', marker: "You don't own any properties yet" },
  { cmd: 'businesses', marker: 'Businesses' },
  { cmd: 'investments', marker: "You don't have any investments" },
  { cmd: 'vehicles', marker: "You don't own any vehicles" },
  { cmd: 'people', marker: 'People in Downtown Memphis' },
  { cmd: 'phone', marker: 'Phone OS v2.0' },
  { cmd: 'factions', marker: 'Factions' },
  { cmd: 'help', marker: 'THE OPEN WORLD — Commands' },
];

async function main(): Promise<void> {
  console.log('--- 1. quick-button matrix: normal state ---');
  for (const b of BUTTONS) {
    const g = fresh(b.setup ?? {});
    const r = await g.processCommand(b.cmd);
    check(`(a) ${b.cmd} -> command output`, r.message.includes(b.marker) && !(r as any).npcName, r.message.slice(0, 120));
  }

  console.log('--- 2. quick-button matrix: conversation-active + quick flag ---');
  for (const b of BUTTONS) {
    const g = fresh(b.setup ?? {});
    inConversation(g);
    const r = await g.processCommand(b.cmd, { asCommand: true });
    const convCleared = (g as any).player.currentConversation === null;
    check(`(b) ${b.cmd} mid-conversation -> command output, conversation exited`, r.message.includes(b.marker) && !(r as any).npcName && convCleared, r.message.slice(0, 120));
  }

  // v0.108.18 SUPERSEDES this section: typed known-commands mid-
  // conversation now RUN the command (commands win over chat) — the
  // old "typed input still chats" expectation is intentionally dead.
  // The full proof lives in harness-0.108.18 (section a); this section
  // now asserts the new contract for the same three commands, and keeps
  // the non-command chat proof (which still holds).
  console.log('--- 3. typed commands mid-conversation run the command (.18 rule) ---');
  for (const cmd of ['businesses', 'journal', 'investments']) {
    const g = fresh({});
    inConversation(g);
    const r = await g.processCommand(cmd);
    check(`typed "${cmd}" mid-conversation -> command output`, !(r as any).npcName && (g as any).player.currentConversation === null, r.message.slice(0, 120));
  }
  {
    const g = fresh({});
    inConversation(g);
    const r = await g.processCommand('tell me something interesting');
    check('typed non-command mid-conversation -> NPC dialogue', !!(r as any).npcName, r.message.slice(0, 120));
  }

  console.log('--- 4. go home ---');
  {
    const g = fresh({ city: 'west_memphis', money: 10000 });
    const r = await g.processCommand('go home');
    const p = (g as any).player;
    check('go home already home: no move, no charge', r.success && p.city === 'west_memphis' && p.money === 10000, r.message.slice(0, 120));
  }
  {
    const g = fresh({ city: 'nashville', money: 10000 });
    const r = await g.processCommand('go home');
    const p = (g as any).player;
    check('go home cross-city: moves to west_memphis, fare charged', r.success && p.city === 'west_memphis' && p.money < 10000 && r.message.includes('Heading home'), r.message.slice(0, 160));
  }
  {
    const g = fresh({ city: 'memphis', district: 'downtown', money: 10000, properties: [{ id: 'p1', name: 'South Memphis Bungalow', type: 'house', city: 'memphis', district: 'south_memphis', purchasePrice: 85000, currentValue: 85000, condition: 100, rentalIncome: 800, maintenanceCost: 70, mortgageRemaining: 0, mortgagePayment: 0, purchasedAt: Date.now(), renovationLevel: 0 }] });
    const r = await g.processCommand('go home');
    const p = (g as any).player;
    check('go home same-city: lands at property district, no charge', r.success && p.city === 'memphis' && p.district === 'south_memphis' && p.money === 10000, r.message.slice(0, 160));
  }
  {
    const g = fresh({ city: 'nashville', money: 10000, properties: [{ id: 'p1', name: 'South Memphis Bungalow', type: 'house', city: 'memphis', district: 'south_memphis', purchasePrice: 85000, currentValue: 85000, condition: 100, rentalIncome: 800, maintenanceCost: 70, mortgageRemaining: 0, mortgagePayment: 0, purchasedAt: Date.now(), renovationLevel: 0 }] });
    const r = await g.processCommand('go home');
    const p = (g as any).player;
    check('go home property city: moves to memphis at property district, fare charged', r.success && p.city === 'memphis' && p.district === 'south_memphis' && p.money < 10000, r.message.slice(0, 160));
  }
  {
    const g = fresh({ city: 'nashville', money: 0 });
    const r = await g.processCommand('go home');
    const p = (g as any).player;
    check('go home broke: stays put', !r.success && p.city === 'nashville', r.message.slice(0, 160));
  }
  {
    const g = fresh({ city: 'nashville', money: 10000 });
    const r = await g.processCommand('home');
    check("'home' alias works", r.success && (g as any).player.city === 'west_memphis', r.message.slice(0, 120));
  }
  {
    const g = fresh({});
    const r = await g.processCommand('go');
    check("'go' alone -> usage, not unknown", !r.message.startsWith('Unknown command') && r.message.includes('go home'), r.message.slice(0, 120));
  }

  console.log('--- 5. help: contains new, contains no nonexistent ---');
  {
    const g = fresh({});
    const help = (await g.processCommand('help')).message;
    for (const s of ['go home', 'businesses', 'buy business', 'goals', 'journal', 'story', 'upgrade property', 'upgrade vehicle', 'gift', 'hangout', 'friends', 'profile', 'laws', 'court', 'pay fine', 'government', 'career', 'promote', 'Quick Bar', 'Pause Menu', 'Status, Work, Explore, Talk', 'scrolls horizontally', 'Resume, Save Game, Settings', 'Quit to Menu', 'skills', 'achievements', 'phone']) {
      check(`help contains "${s}"`, help.includes(s));
    }
    check('help does not leak removed menu-quick concept', !help.includes('menu-quick'));
    const tokens = ['travel', 'explore', 'goto', 'go', 'home', 'apply', 'work', 'career', 'promote', 'laws', 'court', 'pay', 'government', 'bank', 'deposit', 'withdraw', 'real-estate', 'buy', 'sell', 'properties', 'renovate', 'upgrade', 'businesses', 'invest', 'investments', 'vehicles', 'inspect', 'fuel', 'register', 'maintain', 'repair', 'customize', 'tow', 'race', 'people', 'talk', 'greet', 'contacts', 'phone', 'assist', 'factions', 'influence', 'support', 'sabotage', 'chat', 'email', 'text', 'quests', 'gift', 'hangout', 'friends', 'profile', 'enroll', 'study', 'gym', 'skills', 'status', 'help', 'sleep', 'event', 'goals', 'journal', 'story', 'achievements'];
    for (const t of tokens) {
      try {
        const r = await fresh({}).processCommand(t);
        check(`help token "${t}" dispatches (not Unknown)`, !r.message.startsWith('Unknown command'), r.message.slice(0, 100));
      } catch (e: any) {
        check(`help token "${t}" dispatches (not Unknown)`, false, `THREW ${e?.message ?? e}`);
      }
    }
  }

  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('HARNESS CRASH', e);
  process.exit(2);
});
