// v0.108.18 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves every .18 brief item with real output:
//   (a) typed known-command mid-conversation exits + runs the command
//   (b) typed non-command mid-conversation still chats with the NPC
//   (c) NPC replies: consistent name headers, no nested/mismatched quotes
//   (d) travel to / goto to parsing
//   (e) help lists leave, travel to, districts/where/nearby, schools, mail
//   (f) West Memphis listings + display-name empty message
//   (g) display-name sweep (no snake_case city ids in swept outputs)
//   (h) districts list + explore [district], names match goto data
//   (i) full navigation loop + where orientation
//   (j) nearby decision info, partial-name talk, ambiguous refuse-list
//   (k) fluency: suggestions, filler tolerance, next-step hints, chat safe
//   (l) schools catalog completeness + enroll accepts shown ids
//   (m) mail: bare emails lists inbox, usage is real syntax only,
//       unknown subcommand names valid subcommands, inbox alias
// The client replay sender fix is DOM code — verified by code review
// (renderGameScreen replays m.sender + m.cls) and the build, not here.
// Run:
//   npx esbuild tools/harness-0.108.18.ts --bundle --platform=node --format=esm --outfile=/tmp/h10818.mjs && node /tmp/h10818.mjs
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
  return {
    name: 'Tester', city: 'memphis', district: 'downtown', money: 100000,
    bankBalance: 10000, energy: 100, health: 100, heat: 0,
    skills: { tech: { level: 5, xp: 0 }, charisma: { level: 5, xp: 0 } },
    ...over,
  };
}

function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(baseState(over));
  return g;
}

function memphisNpc(g: GameEngine): any {
  return (g as any).social.getNPCByCity('memphis')[0];
}

function inConversation(g: GameEngine): void {
  const npc = memphisNpc(g);
  (g as any).player.currentConversation = { npcId: npc.id, npcName: npc.name };
}

const NO_SNAKE = /(west_memphis|littlerock|southaven|new_orleans|new_york|los_angeles|mexico_city)/;

async function main(): Promise<void> {
  // --- (a) typed known-command mid-conversation exits + runs ---
  console.log('--- (a) typed command mid-conversation wins over chat ---');
  const TYPED: Array<{ cmd: string; marker: string }> = [
    { cmd: 'businesses', marker: 'Businesses' },
    { cmd: 'journal', marker: 'Your Journal' },
    { cmd: 'investments', marker: "You don't have any investments" },
    { cmd: 'achievements', marker: 'Achievements' },
    { cmd: 'skills', marker: 'YOUR SKILLS' },
    { cmd: 'status', marker: 'Net Worth' },
    { cmd: 'bank', marker: 'THE OPEN WORLD BANK' },
  ];
  for (const t of TYPED) {
    const g = fresh();
    inConversation(g);
    const r = await g.processCommand(t.cmd);
    check(`${t.cmd} runs, not chats`, r.message.includes(t.marker) && !(r as any).npcName, r.message.slice(0, 100));
    check(`${t.cmd} clears conversation`, (g as any).player.currentConversation === null);
  }

  // --- (b) typed non-command mid-conversation still chats ---
  console.log('--- (b) typed non-command mid-conversation still chats ---');
  {
    const g = fresh();
    inConversation(g);
    const r = await g.processCommand('tell me more about yourself');
    check('chat keeps npcName + conversation', !!(r as any).npcName && (g as any).player.currentConversation !== null, r.message.slice(0, 100));
  }

  // --- (c) NPC reply headers + quote hygiene ---
  console.log('--- (c) NPC reply format ---');
  {
    const g = fresh();
    inConversation(g);
    const r = await g.processCommand('hello there, friend');
    const msg: string = r.message;
    check('reply has npcName header', !!(r as any).npcName);
    check('reply has no curly quotes', !msg.includes('”') && !msg.includes('“'), msg.slice(0, 160));
    const dq = (msg.match(/"/g) || []).length;
    check('reply double quotes balanced', dq % 2 === 0, msg.slice(0, 160));
  }

  // --- (d) travel to / goto to parsing ---
  console.log('--- (d) travel to / goto to ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    const r = await g.processCommand('travel to Memphis');
    check('travel to Memphis reaches memphis', (g as any).player.city === 'memphis', r.message.slice(0, 120));
    const r2 = await g.processCommand('travel to west memphis');
    check('travel to west memphis reaches west_memphis', (g as any).player.city === 'west_memphis', r2.message.slice(0, 120));
    const g2 = fresh({ city: 'memphis', district: 'downtown' });
    const r3 = await g2.processCommand('goto to downtown');
    check('goto to downtown tolerated', r3.success && (g2 as any).player.district === 'downtown', r3.message.slice(0, 120));
    const r4 = await fresh().processCommand('travel');
    check('bare travel usage names travel to form', r4.message.includes('travel to [city]'), r4.message);
  }

  // --- (e) help coverage ---
  console.log('--- (e) help lists new/changed commands ---');
  {
    const help = (await fresh().processCommand('help')).message;
    const NEED = ['leave', 'travel to [city]', 'districts', 'where', 'nearby',
      'schools', 'emails', 'inbox', 'email read', 'email compose', 'email delete',
      'messages', 'search [query]', 'social', 'lawyer', 'record', 'laylow',
      'crime', 'rob', 'scam', 'prison', 'prison work', 'service',
      'study library', 'invest [name] [amount]', 'sell investment',
      'repair property', 'event choice', 'clear_conv',
      'alias: rest', 'alias: district', 'alias: location', 'alias: places',
      'alias: goal', 'alias: promotion', 'alias: law', 'alias: gov',
      'alias: business', 'aliases: realestate', 'alias: achievement',
      'alias: quest', 'alias: races', 'alias: refuel', 'alias: emergency',
      'alias: relationships', 'goodbye'];
    for (const n of NEED) check(`help lists ${n}`, help.includes(n), help.slice(0, 80));
  }

  // --- (f) West Memphis listings + empty-message display name ---
  console.log('--- (f) West Memphis listings ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    const r = await g.processCommand('real-estate');
    check('west_memphis lists Broadway Starter Home', r.message.includes('Broadway Starter Home'), r.message.slice(0, 200));
    check('west_memphis lists Mississippi Park Duplex', r.message.includes('Mississippi Park Duplex'));
    check('west_memphis lists Meadowlake Lot', r.message.includes('Meadowlake Lot'));
    const g2 = fresh({ city: 'new_orleans', district: 'french_quarter' });
    const r2 = await g2.processCommand('real-estate');
    check('empty-listings message uses display name', r2.message.includes('New Orleans') && !NO_SNAKE.test(r2.message), r2.message.slice(0, 200));
  }

  // --- (g) display-name sweep ---
  console.log('--- (g) no snake_case city ids in swept outputs ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    for (const cmd of ['status', 'laws', 'government', 'crime', 'people', 'real-estate']) {
      const r = await g.processCommand(cmd);
      check(`${cmd} shows no city id`, !NO_SNAKE.test(r.message), r.message.slice(0, 160));
    }
    const r = await g.processCommand('travel to Nowhere City');
    check('travel error suggestions show display names', !NO_SNAKE.test(r.message) && r.message.includes('Memphis'), r.message.slice(0, 200));
  }

  // --- (h) districts + explore [district] ---
  console.log('--- (h) districts + explore [district] ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    const r = await g.processCommand('districts');
    check('districts lists Broadway', r.message.includes('Broadway'), r.message.slice(0, 200));
    check('districts lists Mississippi Park', r.message.includes('Mississippi Park'));
    check('districts lists Meadowlake', r.message.includes('Meadowlake'));
    const r2 = await g.processCommand('explore mississippi_park');
    check('explore [district] moves + explores', (g as any).player.district === 'mississippi_park' && r2.message.includes('Exploring'), r2.message.slice(0, 200));
  }

  // --- (i) full navigation loop + where ---
  console.log('--- (i) navigation loop ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    const t = await g.processCommand('travel to Memphis');
    check('loop: travel to Memphis', (g as any).player.city === 'memphis', t.message.slice(0, 100));
    const d = await g.processCommand('districts');
    check('loop: districts lists memphis districts', d.message.includes('Downtown'), d.message.slice(0, 160));
    const gt = await g.processCommand('goto downtown');
    check('loop: goto downtown', (g as any).player.district === 'downtown', gt.message.slice(0, 100));
    const w = await g.processCommand('where');
    check('loop: where shows city + district', w.message.includes('Memphis') && w.message.includes('Downtown'), w.message.slice(0, 200));
    const e = await g.processCommand('explore');
    check('loop: explore shows district', e.message.includes('downtown'), e.message.slice(0, 160));
    const h = await g.processCommand('go home');
    check('loop: go home returns west_memphis', (g as any).player.city === 'west_memphis', h.message.slice(0, 100));
  }

  // --- (j) nearby + talk matching ---
  console.log('--- (j) nearby + talk ---');
  {
    const g = fresh();
    const nb = await g.processCommand('nearby');
    check('nearby shows talk actions', nb.message.includes('talk '), nb.message.slice(0, 200));
    check('nearby shows a district', nb.message.includes('Downtown') || nb.message.includes('downtown'), nb.message.slice(0, 200));
    const npc = memphisNpc(g);
    const firstName = npc.name.split(' ')[0];
    const tp = await g.processCommand(`talk ${firstName}`);
    check('talk by partial name reaches NPC', (tp as any).npcName === npc.name, tp.message.slice(0, 120));
    const amb = await fresh().processCommand('talk a');
    check('ambiguous talk refuses with list', amb.message.includes('Multiple people match'), amb.message.slice(0, 200));
  }

  // --- (k) fluency ---
  console.log('--- (k) fluency ---');
  {
    const s = await fresh().processCommand('travle');
    check('unknown suggests nearest command', s.message.includes('Did you mean "travel"'), s.message);
    const cb = await fresh().processCommand('check bank');
    check('check bank reaches bank', cb.message.includes('THE OPEN WORLD BANK'), cb.message.slice(0, 100));
    const ss = await fresh().processCommand('show skills');
    check('show skills reaches skills', ss.message.includes('YOUR SKILLS'), ss.message.slice(0, 100));
    const gw = await fresh({ job: { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking' } }).processCommand('go to work');
    check('go to work reaches work', gw.message.includes('Worked'), gw.message.slice(0, 100));
    const gMem = fresh({ city: 'west_memphis', district: 'broadway' });
    const gm = await gMem.processCommand('go to Memphis');
    check('go to Memphis travels', (gMem as any).player.city === 'memphis' && gm.message.includes('districts'), gm.message.slice(0, 160));
    const gHome = fresh({ city: 'memphis', district: 'downtown' });
    const gh = await gHome.processCommand('go to home');
    check('go to home goes home, not travel error', (gHome as any).player.city === 'west_memphis', gh.message.slice(0, 160));
    const g2 = fresh({ city: 'west_memphis', district: 'broadway' });
    const tr = await g2.processCommand('travel to Memphis');
    check('travel hint points at districts', tr.message.includes('districts'), tr.message.slice(0, 200));
    const ex = await g2.processCommand('explore');
    check('explore hint present', ex.message.includes('talk') || ex.message.includes('districts'), ex.message.slice(0, 200));
    const g3 = fresh();
    inConversation(g3);
    const lv = await g3.processCommand('leave');
    check('conversation-end hint present', lv.message.includes('Conversation over'), lv.message.slice(0, 200));
    const g4 = fresh();
    inConversation(g4);
    const fc = await g4.processCommand('check this out');
    check('filler chat still chats', !!(fc as any).npcName && (g4 as any).player.currentConversation !== null, fc.message.slice(0, 100));
  }

  // --- (l) schools catalog ---
  console.log('--- (l) schools catalog ---');
  {
    const out = (await fresh().processCommand('schools')).message;
    const SCHOOL_IDS = ['maestro_college', 'memphis_medical_academy', 'nyu_finance', 'lse_london', 'tokyo_tech', 'cordon_bleu', 'uni_sydney'];
    const COURSE_IDS = ['ai_foundation', 'fullstack_dev', 'ai_software_eng', 'emt_basic', 'nursing_rn', 'paramedic', 'np_advanced', 'fin_analyst', 'mba', 'global_policy', 'robotics_auto', 'french_cuisine', 'marine_bio'];
    for (const id of [...SCHOOL_IDS, ...COURSE_IDS]) check(`schools lists ${id}`, out.includes(id));
    const g = fresh();
    const en = await g.processCommand('enroll maestro_college ai_foundation');
    check('enroll accepts a shown id', en.message.includes('Enrolled in AI Foundations'), en.message.slice(0, 120));
    const ue = await fresh().processCommand('enroll');
    check('bare enroll usage points at schools', ue.message.includes('schools'), ue.message);
  }

  // --- (m) mail discoverability ---
  console.log('--- (m) mail ---');
  {
    const g = fresh();
    // Distinct subject/body: the engine seeds its own welcome email at
    // construction, and same-millisecond timestamps sort stably, so the
    // harness must identify ITS message, never "the first id".
    (g as any).comm.receiveEmail('harness@test.local', 'Harness Sender', 'Harness Test Subject', 'Harness body text 12345.');
    const inbox = await g.processCommand('emails');
    check('bare emails lists the inbox', inbox.message.includes('Harness Test Subject') && inbox.message.includes('Harness Sender'), inbox.message.slice(0, 200));
    const block = inbox.message.split('\n\n').find(b => b.includes('Harness Test Subject')) ?? '';
    const idMatch = block.match(/id: (email_\S+)/);
    check('inbox shows a readable id', !!idMatch, block);
    check('inbox marks unread', inbox.message.includes('🔵'), inbox.message.slice(0, 120));
    const ib = await g.processCommand('inbox');
    check('inbox alias lists same mail', ib.message.includes('Harness Test Subject'));
    const id = idMatch ? idMatch[1] : '';
    const rd = await g.processCommand(`email read ${id}`);
    check('email read [listed id] shows body', rd.message.includes('Harness body text 12345.'), rd.message.slice(0, 160));
    const del = await g.processCommand(`email delete ${id}`);
    check('email delete [listed id] deletes', del.message.includes('Email deleted.'), del.message);
    const after = await g.processCommand('emails');
    check('deleted mail gone, other mail remains', !after.message.includes('Harness Test Subject') && after.message.includes('Welcome to West Memphis!'), after.message.slice(0, 200));
    const g2 = fresh();
    const npc = memphisNpc(g2);
    const comp = await g2.processCommand(`email compose ${npc.name.split(' ')[0]} Hello Hey there`);
    check('email compose sends', comp.message.includes('Email sent to'), comp.message.slice(0, 120));
    const usage = await fresh().processCommand('email');
    check('email usage has no fake syntax line', !usage.message.includes('emails - View inbox') && usage.message.includes('email read [id]'), usage.message);
    const unk = await fresh().processCommand('email frobnicate');
    check('unknown email subcommand names valid ones', unk.message.includes('email read [id]') && unk.message.includes('email delete [id]'), unk.message);
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
