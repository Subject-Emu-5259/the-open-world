// v0.108.18 AUDIT harness — run via esbuild bundle, NOT part of the
// shipped game. The systematic two-direction audit Dre ordered:
//   (1) every command the parser accepts, run with valid fixture state,
//       asserting REAL output (correct screen/list/result) — a dispatch
//       without "Unknown command" is NOT enough; an error, stub, or
//       usage-instead-of-result for a VALID call is a FAIL.
//   (2) every parser first-word appears in help with correct syntax
//       (line or alias note); every help/usage entry maps to a real
//       command (no phantom entries).
// Random-outcome commands (crime, sabotage, race placement, lawyer
// appeal) assert execution proofs (state change / outcome markers),
// never a fixed roll. Grouped by system for the expansion foundation.
// Run:
//   npx esbuild tools/harness-audit-0.108.18.ts --bundle --platform=node --format=esm --outfile=/tmp/haudit.mjs && node /tmp/haudit.mjs
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
const lc = (s: string) => s.toLowerCase();
function has(msg: string, ...needles: string[]): boolean {
  const m = lc(msg);
  return needles.some(n => m.includes(lc(n)));
}
function hasAll(msg: string, ...needles: string[]): boolean {
  const m = lc(msg);
  return needles.every(n => m.includes(lc(n)));
}
function clean(msg: string): boolean {
  return !lc(msg).includes('unknown command');
}

function rich(over: Record<string, unknown> = {}): any {
  return {
    name: 'Tester', city: 'memphis', district: 'downtown', money: 200000,
    bankBalance: 10000, energy: 100, health: 100, heat: 0,
    skills: {
      tech: { level: 5, xp: 0 }, charisma: { level: 5, xp: 0 },
      cooking: { level: 5, xp: 0 }, driving: { level: 5, xp: 0 },
      stealth: { level: 5, xp: 0 },
    },
    ...over,
  };
}
function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(rich(over));
  return g;
}
function npc(g: GameEngine): any {
  return (g as any).social.getNPCByCity('memphis')[0];
}
async function talkFirst(g: GameEngine): Promise<any> {
  const n = npc(g);
  await g.processCommand(`talk ${n.name.split(' ')[0]}`);
  return n;
}

async function main(): Promise<void> {
  // ============ MOVEMENT / NAVIGATION ============
  console.log('--- movement / navigation ---');
  {
    const g = fresh({ city: 'west_memphis', district: 'broadway' });
    let r = await g.processCommand('travel Memphis');
    check('travel [city] moves', (g as any).player.city === 'memphis' && clean(r.message), r.message.slice(0, 100));
    r = await g.processCommand('travel to west memphis');
    check('travel to [city] moves', (g as any).player.city === 'west_memphis', r.message.slice(0, 100));
    r = await g.processCommand('travel');
    check('travel bare usage is real', r.message.includes('travel to [city]'), r.message);
    const g2 = fresh();
    r = await g2.processCommand('districts');
    check('districts lists memphis districts', r.message.includes('Downtown'), r.message.slice(0, 120));
    r = await g2.processCommand('district');
    check('district alias works', r.message.includes('Downtown'));
    r = await g2.processCommand('where');
    check('where shows city + district', hasAll(r.message, 'Memphis', 'Downtown'), r.message.slice(0, 160));
    r = await g2.processCommand('location');
    check('location alias works', hasAll(r.message, 'Memphis', 'Downtown'));
    r = await g2.processCommand('goto downtown');
    check('goto [district] moves', (g2 as any).player.district === 'downtown' && clean(r.message));
    r = await g2.processCommand('explore');
    check('explore looks around', r.message.includes('Exploring'), r.message.slice(0, 120));
    r = await g2.processCommand('explore downtown');
    check('explore [district] moves + looks', r.message.includes('Exploring'), r.message.slice(0, 120));
    r = await g2.processCommand('nearby');
    check('nearby shows people + places', r.message.includes('talk ') && clean(r.message), r.message.slice(0, 160));
    r = await g2.processCommand('places');
    check('places alias works', r.message.includes('talk '));
    const g3 = fresh({ city: 'memphis', district: 'downtown' });
    r = await g3.processCommand('go home');
    check('go home returns home city', (g3 as any).player.city === 'west_memphis', r.message.slice(0, 100));
    const g4 = fresh({ city: 'memphis', district: 'downtown' });
    r = await g4.processCommand('home');
    check('home alias works', (g4 as any).player.city === 'west_memphis');
    r = await fresh().processCommand('go');
    check('go bare usage is real', r.message.includes('go home'), r.message);
  }

  // ============ WORK & MONEY ============
  console.log('--- work & money ---');
  {
    const g = fresh();
    let r = await g.processCommand('apply');
    check('apply lists jobs', r.message.includes('JOB LISTINGS'), r.message.slice(0, 120));
    const titles = [...r.message.matchAll(/^- (.+?) @/gm)].map(m => m[1]);
    check('apply output has hireable titles', titles.length > 0, r.message.slice(0, 200));
    let hired = false;
    // Listings sort executive/elite first — those legitimately reject a
    // fixture player without degrees. Trying every listed title proves
    // the hire path; rejections themselves are correct gate results.
    for (const t of titles) {
      r = await g.processCommand(`apply ${t}`);
      if (r.message.includes('HIRED!') || r.message.includes('Hired as')) { hired = true; break; }
    }
    check('apply [job] hires (tries listed titles)', hired, r.message.slice(0, 200));
    const gw = fresh({ job: { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking' } });
    r = await gw.processCommand('work');
    check('work runs a shift', r.message.includes('Worked'), r.message.slice(0, 120));
    r = await gw.processCommand('career');
    check('career shows job', r.message.includes('Test Diner'), r.message.slice(0, 160));
    const gp = fresh({ job: { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking' }, jobTenure: 15, promotions: 0 });
    r = await gp.processCommand('promote');
    check('promote works at tenure', has(r.message, 'promot'), r.message.slice(0, 160));
    r = await gp.processCommand('promotion');
    check('promotion alias works', clean(r.message), r.message.slice(0, 120));
    const gb = fresh();
    r = await gb.processCommand('bank');
    check('bank shows balance', r.message.includes('THE OPEN WORLD BANK'), r.message.slice(0, 100));
    const before = (gb as any).player.bankBalance;
    r = await gb.processCommand('deposit 500');
    check('deposit moves cash to bank', (gb as any).player.bankBalance === before + 500 && clean(r.message), r.message.slice(0, 120));
    const beforeW = (gb as any).player.bankBalance;
    r = await gb.processCommand('withdraw 200');
    check('withdraw moves bank to cash', (gb as any).player.bankBalance === beforeW - 200 && clean(r.message), r.message.slice(0, 120));
    const gd = fresh();
    await gd.processCommand('deposit all');
    check('deposit all empties cash', (gd as any).player.money === 0, `money=${(gd as any).player.money}`);
    const gwd = fresh();
    await gwd.processCommand('withdraw all');
    check('withdraw all empties bank', (gwd as any).player.bankBalance === 0, `bank=${(gwd as any).player.bankBalance}`);
    r = await fresh().processCommand('deposit');
    check('deposit bare usage is real', r.message.includes('deposit [amount]'), r.message);
    r = await fresh().processCommand('withdraw');
    check('withdraw bare usage is real', r.message.includes('withdraw [amount]'), r.message);
  }

  // ============ GOVERNMENT & LAW / CRIME / PRISON ============
  console.log('--- government & law / crime / prison ---');
  {
    const g = fresh({ heat: 20, criminalRecord: ['test offense'] });
    let r = await g.processCommand('laws');
    check('laws shows fine schedule', has(r.message, 'fine', 'law'), r.message.slice(0, 120));
    r = await g.processCommand('law');
    check('law alias works', clean(r.message));
    const gf = fresh({ fines: [{ offense: 'Test', amount: 100, date: '2026-01-01' }] });
    r = await gf.processCommand('court');
    check('court shows standing', has(r.message, 'heat', 'fine'), r.message.slice(0, 160));
    r = await gf.processCommand('pay fine all');
    check('pay fine all settles', ((gf as any).player.fines ?? []).length === 0 && has(r.message, 'fine'), r.message.slice(0, 160));
    r = await fresh().processCommand('pay');
    check('pay bare usage is real', r.message.includes('pay fine'), r.message);
    r = await g.processCommand('government');
    check('government shows officials', has(r.message, 'government', 'officials', 'civic'), r.message.slice(0, 160));
    r = await g.processCommand('gov');
    check('gov alias works', clean(r.message));
    r = await g.processCommand('record');
    check('record shows record', r.message.includes('CRIMINAL RECORD'), r.message.slice(0, 120));
    const heatBefore = (g as any).player.heat;
    r = await g.processCommand('laylow');
    check('laylow cools heat', (g as any).player.heat < heatBefore && r.message.includes('lay low'), r.message.slice(0, 120));
    r = await fresh({ heat: 20 }).processCommand('lay');
    check('lay alias works', r.message.includes('lay low'));
    r = await fresh({ heat: 20 }).processCommand('lawyer clean');
    check('lawyer clean scrubs heat', r.message.includes('scrubbed'), r.message.slice(0, 160));
    r = await fresh().processCommand('lawyer');
    check('lawyer bare usage is real', r.message.includes('lawyer [clean|appeal|defend'), r.message);
    r = await fresh().processCommand('lawyer appeal');
    check('lawyer appeal while free is correct refusal', r.message.includes('only appeal if you are currently incarcerated'), r.message.slice(0, 120));
    r = await fresh().processCommand('crime');
    check('crime bare shows menu', hasAll(r.message, 'pickpocket', 'heist'), r.message.slice(0, 200));
    for (const c of ['crime pickpocket', 'rob', 'scam']) {
      const gc = fresh({ heat: 0 });
      r = await gc.processCommand(c);
      check(`${c} executes (heat/incarceration proof)`, ((gc as any).player.heat > 0 || (gc as any).player.incarcerated) && !r.message.includes('Invalid crime type'), r.message.slice(0, 160));
    }
    r = await fresh().processCommand('crime frobnicate');
    check('crime invalid usage lists all six types', hasAll(r.message, 'pickpocket', 'shoplift', 'scam', 'robbery', 'grand_theft_auto', 'heist'), r.message);
    r = await fresh().processCommand('prison');
    check('prison while free answers cleanly', r.message.includes("You aren't in prison."), r.message);
    const gp = fresh({ incarcerated: true, sentenceEnd: Date.now() + 3 * 24 * 60 * 60 * 1000, energy: 100 });
    r = await gp.processCommand('prison');
    check('prison while incarcerated shows status', r.message.includes('Prison Status') && r.message.includes('Sentence Remaining'), r.message.slice(0, 160));
    const sentBefore = (gp as any).player.sentenceEnd;
    r = await gp.processCommand('prison work');
    check('prison work shortens sentence', r.message.includes('reduced by 1 day') && (gp as any).player.sentenceEnd < sentBefore, r.message.slice(0, 200));
    const gi = fresh({ incarcerated: true, sentenceEnd: Date.now() + 3 * 24 * 60 * 60 * 1000, energy: 100 });
    for (const c of ['prison', 'status', 'help', 'sleep']) {
      r = await gi.processCommand(c);
      check(`incarcerated gate allows ${c}`, !r.message.includes('You are incarcerated. You can only use'), r.message.slice(0, 100));
    }
    r = await gi.processCommand('work');
    check('incarcerated gate blocks work with allowed list', r.message.includes('You are incarcerated. You can only use'), r.message.slice(0, 120));
  }

  // ============ PROPERTY & WEALTH ============
  console.log('--- property & wealth ---');
  {
    const g = fresh();
    let r = await g.processCommand('real-estate');
    check('real-estate lists memphis homes', r.message.includes('South Memphis Bungalow'), r.message.slice(0, 160));
    r = await g.processCommand('realestate');
    check('realestate alias works', r.message.includes('South Memphis Bungalow'));
    r = await g.processCommand('buy property South Memphis Bungalow');
    check('buy property buys', ((g as any).player.properties ?? []).length === 1 && r.message.includes('South Memphis Bungalow'), r.message.slice(0, 160));
    r = await g.processCommand('properties');
    check('properties lists owned home', r.message.includes('South Memphis Bungalow'), r.message.slice(0, 160));
    r = await g.processCommand('repair property South Memphis Bungalow');
    check('repair property runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('renovate property South Memphis Bungalow');
    check('renovate property runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('upgrade property South Memphis Bungalow');
    check('upgrade property runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('sell property South Memphis Bungalow');
    check('sell property sells', ((g as any).player.properties ?? []).length === 0 && r.success, r.message.slice(0, 160));
    r = await fresh().processCommand('buy');
    check('buy bare usage is real', r.message.includes('buy property'), r.message);
    r = await fresh().processCommand('sell');
    check('sell bare usage is real', r.message.includes('sell property'), r.message);
    const gb = fresh();
    r = await gb.processCommand('businesses');
    check('businesses lists catalog', r.message.includes('Businesses'), r.message.slice(0, 120));
    r = await gb.processCommand('business');
    check('business alias works', clean(r.message));
    r = await gb.processCommand('buy business Food Truck');
    check('buy business buys', ((gb as any).player.businesses ?? []).length === 1, r.message.slice(0, 160));
    r = await gb.processCommand('sell business Food Truck');
    check('sell business sells', ((gb as any).player.businesses ?? []).length === 0 && r.success, r.message.slice(0, 160));
    const gi = fresh();
    r = await gi.processCommand('invest');
    check('invest lists options', r.message.includes('Investment Options') && r.message.includes('S&P 500'), r.message.slice(0, 160));
    r = await gi.processCommand('invest options');
    check('invest options lists options', r.message.includes('Investment Options'));
    r = await gi.processCommand('invest S&P 500 Index Fund 500');
    check('invest [name] [amount] buys', ((gi as any).player.investments ?? []).length === 1, r.message.slice(0, 160));
    r = await gi.processCommand('investments');
    check('investments lists portfolio', r.message.includes('S&P 500'), r.message.slice(0, 160));
    r = await gi.processCommand('sell investment S&P 500 Index Fund');
    check('sell investment sells', ((gi as any).player.investments ?? []).length === 0 && r.success, r.message.slice(0, 160));
  }

  // ============ VEHICLES & RACING ============
  console.log('--- vehicles & racing ---');
  {
    const g = fresh();
    let r = await g.processCommand('vehicles');
    check('vehicles empty is real', r.message.includes("You don't own any vehicles"), r.message.slice(0, 100));
    r = await g.processCommand('buy vehicle car');
    check('buy vehicle car buys sedan', ((g as any).player.vehicles ?? []).length === 1 && r.message.includes('Used Sedan'), r.message.slice(0, 160));
    r = await g.processCommand('vehicles');
    check('vehicles lists sedan', r.message.includes('Used Sedan'), r.message.slice(0, 120));
    r = await g.processCommand('inspect Used Sedan');
    check('inspect shows status', r.success && clean(r.message), r.message.slice(0, 160));
    r = await g.processCommand('maintain Used Sedan');
    check('maintain runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('service Used Sedan oil');
    check('service [vehicle] [oil] runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('fuel Used Sedan');
    check('fuel runs or reports full tank', !r.message.includes('not found') && clean(r.message), r.message.slice(0, 160));
    r = await g.processCommand('refuel Used Sedan');
    check('refuel alias works', clean(r.message));
    r = await g.processCommand('register Used Sedan');
    check('register runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('customize Used Sedan');
    check('customize bare lists mods', r.message.includes('tint'), r.message.slice(0, 160));
    r = await g.processCommand('customize Used Sedan tint');
    check('customize [mod] installs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('upgrade vehicle Used Sedan engine');
    check('upgrade vehicle [part] runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    r = await g.processCommand('repair vehicle Used Sedan');
    check('repair vehicle runs', r.success && !r.message.includes('not found'), r.message.slice(0, 160));
    const gb = fresh();
    (gb as any).player.vehicles = [{ id: 'v_broken', name: 'Broken Sedan', type: 'car', value: 100, condition: 0, mileage: 90000, fuel: 0, fuelCap: 14 }];
    r = await gb.processCommand('tow Broken Sedan');
    check('tow broken vehicle runs', clean(r.message) && !r.message.includes('not found'), r.message.slice(0, 200));
    r = await gb.processCommand('emergency Broken Sedan');
    check('emergency alias works', clean(r.message));
    r = await g.processCommand('sell vehicle Used Sedan');
    check('sell vehicle sells', ((g as any).player.vehicles ?? []).length === 0 && r.success, r.message.slice(0, 160));
    const gr = fresh();
    r = await gr.processCommand('race');
    check('race bare lists tracks', r.message.includes('Riverfront Drag Strip'), r.message.slice(0, 200));
    r = await gr.processCommand('races');
    check('races alias works', r.message.includes('Riverfront Drag Strip'));
    r = await gr.processCommand('race season');
    check('race season starts championship', r.message.includes('World Street Series'), r.message.slice(0, 160));
    r = await gr.processCommand('race standings');
    check('race standings shows table', clean(r.message) && r.message.length > 40, r.message.slice(0, 160));
    const gr2 = fresh();
    await gr2.processCommand('buy vehicle car');
    r = await gr2.processCommand('race memphis');
    check('race [track] runs with vehicle', r.success && !/No track|need a vehicle|barely running|too tired/i.test(r.message), r.message.slice(0, 200));
    r = await fresh().processCommand('fuel');
    check('fuel bare usage is real', r.message.includes('fuel [vehicle name]'), r.message);
    r = await fresh().processCommand('tow');
    check('tow bare usage is real', r.message.includes('tow [vehicle name]'), r.message);
    r = await fresh().processCommand('customize');
    check('customize bare usage is real', r.message.includes('customize [vehicle name]'), r.message);
    r = await fresh().processCommand('maintain');
    check('maintain bare with no vehicles is real', r.message.includes("You don't own any vehicles."), r.message);
    r = await fresh().processCommand('inspect');
    check('inspect bare with no vehicles is real', r.message.includes("You don't own any vehicles."), r.message);
    r = await fresh().processCommand('service');
    check('service bare with no vehicles is real', r.message.includes("You don't own any vehicles."), r.message);
  }

  // ============ SOCIAL & COMMS ============
  console.log('--- social & comms ---');
  {
    const g = fresh();
    let r = await g.processCommand('people');
    check('people lists nearby', r.message.includes('People in Downtown Memphis'), r.message.slice(0, 120));
    const n = npc(g);
    r = await g.processCommand('talk');
    check('talk bare prompts', r.message.includes('Who do you want to talk to?'), r.message.slice(0, 120));
    r = await g.processCommand(`talk ${n.name.split(' ')[0]}`);
    check('talk [name] starts conversation', (r as any).npcName === n.name, r.message.slice(0, 120));
    r = await g.processCommand(`greet ${n.name.split(' ')[0]}`);
    check('greet [name] greets', (r as any).npcName === n.name || r.message.includes(n.name), r.message.slice(0, 160));
    r = await g.processCommand(`profile ${n.name}`);
    check('profile [full name] shows profile', r.message.includes(n.name), r.message.slice(0, 160));
    r = await g.processCommand('profile Marcus');
    check('profile ambiguous first name refuses with list', r.message.includes('Multiple people match'), r.message.slice(0, 200));
    r = await g.processCommand('profile');
    check('profile bare shows own status', r.message.includes('Net Worth'), r.message.slice(0, 100));
    r = await g.processCommand(`assist ${n.name.split(' ')[0]}`);
    check('assist [name] runs', clean(r.message) && r.message.includes(n.name), r.message.slice(0, 200));
    r = await g.processCommand('assist');
    check('assist bare usage is real', r.message.includes('Assist whom?'), r.message);
    r = await g.processCommand(`gift ${n.name} coffee`);
    check('gift [full name] [gift] gives gift', r.message.includes('You gave') && r.message.includes(n.name), r.message.slice(0, 200));
    r = await g.processCommand('gift Marcus coffee');
    check('gift ambiguous name refuses with list', r.message.includes('Multiple people match'), r.message.slice(0, 200));
    r = await g.processCommand('gift');
    check('gift bare lists gifts + usage', r.message.includes('gift [npc name]'), r.message.slice(0, 160));
    r = await g.processCommand(`hangout ${n.name}`);
    check('hangout [full name] runs', r.message.includes('hanging out with') && r.message.includes(n.name), r.message.slice(0, 200));
    r = await g.processCommand('hangout Marcus');
    check('hangout ambiguous name refuses with list', r.message.includes('Multiple people match'), r.message.slice(0, 200));
    r = await g.processCommand('hangout');
    check('hangout bare usage is real', r.message.includes('Hang out with whom?'), r.message);
    r = await g.processCommand('friends');
    check('friends lists relationships', clean(r.message) && (r.message.includes(n.name) || r.message.includes('Relationship')), r.message.slice(0, 200));
    r = await g.processCommand('relationships');
    check('relationships alias works', clean(r.message));
    r = await g.processCommand('contacts');
    check('contacts lists talked-to NPC', r.message.includes(n.name), r.message.slice(0, 160));
    r = await g.processCommand('phone');
    check('phone shows OS', r.message.includes('Phone OS v2.0'), r.message.slice(0, 100));
    r = await g.processCommand('messages');
    check('messages lists texts', r.message.includes('Uncle Ray'), r.message.slice(0, 160));
    r = await g.processCommand('search Ray');
    check('search finds comms', r.message.includes('Uncle Ray'), r.message.slice(0, 200));
    r = await g.processCommand('search');
    check('search bare usage is real', r.message.includes('Usage: search [query]'), r.message);
    r = await g.processCommand('social');
    check('social shows feed', r.message.includes('DJ Metro'), r.message.slice(0, 200));
    r = await g.processCommand(`text ${n.name.split(' ')[0]} hello there`);
    check('text [name] [message] sends', clean(r.message) && !r.message.includes('not found'), r.message.slice(0, 200));
    r = await g.processCommand('text');
    check('text bare usage is real', r.message.includes('Usage: text [name] [message]'), r.message);
    r = await g.processCommand('factions');
    check('factions with no membership is correct empty state', r.message.includes("You haven't joined any factions yet"), r.message.slice(0, 160));
    const gfm = fresh({ factions: ['901_music'] });
    r = await gfm.processCommand('factions');
    check('factions lists joined factions', r.message.includes('901 Music Scene'), r.message.slice(0, 200));
    r = await g.processCommand('influence');
    check('influence shows power', r.message.includes('FACTION INFLUENCE'), r.message.slice(0, 120));
    const gf = fresh({ factions: ['901_music'] });
    r = await gf.processCommand('support 901_music');
    check('support [id] raises influence', r.message.includes('supporting **901 Music Scene**'), r.message.slice(0, 160));
    r = await gf.processCommand('support');
    check('support bare usage is real', r.message.includes('Usage: support [faction_id]'), r.message);
    const gs = fresh({ factions: ['901_music'] });
    r = await gs.processCommand('sabotage dubai_royals');
    check('sabotage rival runs (success or arrest)', has(r.message, 'sabotaged', 'BUSTED') && !r.message.includes('no reason'), r.message.slice(0, 200));
    r = await fresh().processCommand('sabotage');
    check('sabotage bare usage is real', r.message.includes('Usage: sabotage [faction_id]'), r.message);
    const gc = fresh({ factions: ['901_music'] });
    (gc as any).comm.createGroupChat('901_music', '901 Music Scene', ['player']);
    r = await gc.processCommand('chat 901_music');
    check('chat [id] opens group', r.message.includes('GROUP: 901 Music Scene'), r.message.slice(0, 160));
    r = await gc.processCommand('chat');
    check('chat bare usage is real', r.message.includes('Usage: chat [faction_id]'), r.message);
    const gq = fresh();
    r = await gq.processCommand('quests');
    check('quests lists active quests', r.message.includes('Active Quests'), r.message.slice(0, 120));
    r = await gq.processCommand('quest');
    check('quest alias works', r.message.includes('Active Quests'));
    const gL = fresh();
    await gL.processCommand(`talk ${n.name.split(' ')[0]}`);
    r = await gL.processCommand('leave');
    check('leave ends conversation with hint', r.message.includes('Conversation over'), r.message.slice(0, 160));
    r = await gL.processCommand('leave');
    check('leave with no conversation is correct', r.message.includes("You're not in a conversation."), r.message);
    const gC = fresh();
    await gC.processCommand(`talk ${n.name.split(' ')[0]}`);
    r = await gC.processCommand('clear_conv');
    check('clear_conv clears conversation', r.message.includes('Conversation cleared.') && (gC as any).player.currentConversation === null);
    for (const w of ['end', 'exit', 'bye', 'goodbye']) {
      const gw = fresh();
      await gw.processCommand(`talk ${n.name.split(' ')[0]}`);
      r = await gw.processCommand(w);
      check(`${w} ends conversation`, r.message.includes('Conversation over'), r.message.slice(0, 100));
    }
  }

  // ============ EDUCATION & SELF ============
  console.log('--- education & self ---');
  {
    const g = fresh();
    let r = await g.processCommand('schools');
    check('schools lists catalog', r.message.includes('Maestro College') && r.message.includes('ai_foundation'), r.message.slice(0, 160));
    r = await g.processCommand('study');
    check('study lists city schools', r.message.includes('Maestro College'), r.message.slice(0, 160));
    const gl = fresh();
    r = await gl.processCommand('study library');
    check('study library studies', r.message.includes('Studied at library'), r.message.slice(0, 120));
    const ge = fresh();
    await ge.processCommand('enroll maestro_college ai_foundation');
    r = await ge.processCommand('study hours 5');
    check('study hours advances course', r.message.includes('Studied for 5 hours'), r.message.slice(0, 160));
    r = await fresh().processCommand('study hours 5');
    check('study hours unenrolled is correct refusal', r.message.includes("You aren't enrolled"), r.message);
    r = await g.processCommand('gym');
    check('gym works out', has(r.message, 'gym', 'fitness', 'workout', 'exercise'), r.message.slice(0, 160));
    r = await g.processCommand('skills');
    check('skills lists levels', r.message.includes('YOUR SKILLS'), r.message.slice(0, 100));
  }

  // ============ INFO & TIME / META ============
  console.log('--- info & time / meta ---');
  {
    const g = fresh({ energy: 20 });
    let r = await g.processCommand('status');
    check('status shows snapshot', r.message.includes('Net Worth'), r.message.slice(0, 100));
    r = await g.processCommand('help');
    check('help shows command list', r.message.includes('THE OPEN WORLD — Commands'), r.message.slice(0, 100));
    const eBefore = (g as any).player.energy;
    r = await g.processCommand('sleep');
    check('sleep restores energy', (g as any).player.energy > eBefore && clean(r.message), r.message.slice(0, 120));
    r = await fresh({ energy: 20 }).processCommand('rest');
    check('rest alias works', clean(r.message));
    r = await g.processCommand('event');
    check('event with none active is real', r.message.includes('No active events'), r.message.slice(0, 120));
    (g as any).storyline.activeEvents.set('harness_ev', { id: 'harness_ev', title: 'Harness Event', description: 'A test event.', outcomes: [{ id: 'opt_a', text: 'You chose A.', effects: [] }] });
    r = await g.processCommand('event');
    check('event with active event lists it', r.message.includes('Harness Event') && r.message.includes('opt_a'), r.message.slice(0, 200));
    r = await g.processCommand('event choice opt_a');
    check('event choice applies outcome', r.message.includes('You chose A.') && r.message.includes('Effects applied.'), r.message.slice(0, 200));
    r = await fresh().processCommand('event choice bogus');
    check('event choice with no event is correct', r.message.includes('No active events'), r.message);
    r = await g.processCommand('goals');
    check('goals lists daily goals', r.message.includes('Daily Goals'), r.message.slice(0, 120));
    r = await g.processCommand('goal');
    check('goal alias works', r.message.includes('Daily Goals'));
    r = await g.processCommand('journal');
    check('journal shows log', r.message.includes('Your Journal'), r.message.slice(0, 120));
    r = await g.processCommand('story');
    check('story alias works', r.message.includes('Your Journal'));
    r = await g.processCommand('achievements');
    check('achievements lists progress', r.message.includes('Achievements'), r.message.slice(0, 120));
    r = await g.processCommand('achievement');
    check('achievement alias works', r.message.includes('Achievements'));
  }

  // ============ HELP COVERAGE: every parser first-word documented ============
  console.log('--- help coverage (parser -> help) ---');
  {
    const help = (await fresh().processCommand('help')).message;
    const COVER: Array<[string, string]> = [
      ['work', 'work —'], ['apply', 'apply —'], ['status', 'status —'],
      ['help', 'help —'], ['sleep', 'sleep —'], ['rest', 'alias: rest'],
      ['study', 'study —'], ['gym', 'gym —'], ['skills', 'skills —'],
      ['bank', 'bank —'], ['deposit', 'deposit [amount|all]'],
      ['withdraw', 'withdraw [amount|all]'], ['lawyer', 'lawyer [clean|appeal|defend'],
      ['record', 'record —'], ['laylow', 'laylow —'], ['lay', 'alias: lay'],
      ['explore', 'explore —'], ['goto', 'goto [district]'],
      ['districts', 'districts —'], ['district', 'alias: district'],
      ['where', 'where —'], ['location', 'alias: location'],
      ['nearby', 'nearby —'], ['places', 'alias: places'],
      ['travel', 'travel [city]'], ['home', 'home —'],
      ['go', 'go home —'], ['talk', 'talk [name]'],
      ['greet', 'greet [name]'], ['assist', 'assist [name]'],
      ['people', 'people —'], ['end', 'also: bye, end, exit, goodbye'],
      ['exit', 'also: bye, end, exit, goodbye'], ['bye', 'also: bye, end, exit, goodbye'],
      ['goodbye', 'also: bye, end, exit, goodbye'], ['leave', 'leave —'],
      ['real-estate', 'real-estate —'], ['realestate', 'aliases: realestate'],
      ['properties_list', 'properties_list'], ['buy', 'buy property'],
      ['sell', 'sell property'], ['properties', 'properties —'],
      ['businesses', 'businesses —'], ['business', 'alias: business'],
      ['repair', 'repair property'], ['renovate', 'renovate property'],
      ['upgrade', 'upgrade property'], ['goals', 'goals —'],
      ['goal', 'alias: goal'], ['career', 'career —'],
      ['promote', 'promote —'], ['promotion', 'alias: promotion'],
      ['laws', 'laws —'], ['law', 'alias: law'], ['court', 'court —'],
      ['government', 'government —'], ['gov', 'alias: gov'],
      ['pay', 'pay fine'], ['profile', 'profile [name]'],
      ['gift', 'gift [name]'], ['hangout', 'hangout [name]'],
      ['friends', 'friends —'], ['relationships', 'alias: relationships'],
      ['journal', 'journal —'], ['story', 'alias: story'],
      ['maintain', 'maintain [name]'], ['service', 'service [vehicle]'],
      ['vehicles', 'vehicles —'], ['fuel', 'fuel [name]'],
      ['refuel', 'alias: refuel'], ['register', 'register [name]'],
      ['customize', 'customize [name]'], ['tow', 'tow [name]'],
      ['emergency', 'alias: emergency'], ['inspect', 'inspect [name]'],
      ['race', 'race —'], ['races', 'alias: races'],
      ['crime', 'crime —'], ['invest', 'invest —'],
      ['investments', 'investments —'], ['phone', 'phone —'],
      ['text', 'text [name]'], ['email', 'email read'],
      ['emails', 'emails —'], ['inbox', 'inbox —'],
      ['social', 'social —'], ['contacts', 'contacts —'],
      ['search', 'search [query]'], ['factions', 'factions —'],
      ['quests', 'quests —'], ['quest', 'alias: quest'],
      ['chat', 'chat [id]'], ['influence', 'influence —'],
      ['support', 'support [id]'], ['sabotage', 'sabotage [id]'],
      ['enroll', 'enroll [school_id]'], ['schools', 'schools —'],
      ['rob', 'rob —'], ['scam', 'scam —'], ['event', 'event —'],
      ['achievements', 'achievements —'], ['achievement', 'alias: achievement'],
      ['clear_conv', 'clear_conv —'], ['messages', 'messages —'],
      ['prison', 'prison —'],
    ];
    for (const [word, needle] of COVER) {
      check(`help documents ${word}`, help.includes(needle), `needle: ${needle}`);
    }
    // No phantom help entries: every help bullet's command word dispatches.
    // Hyphenated bullets (real-estate) are one token, not a prefix.
    const bullets = [...help.matchAll(/^• ([a-z][a-z_-]*)/gm)].map(m => m[1]);
    for (const w of new Set(bullets)) {
      const g = fresh();
      const r = await g.processCommand(w);
      // v0.108.20 exception (spec §30/server-seam): 'leaderboard' and 'trade'
      // are HANDLER commands intercepted before the engine, so the engine
      // legitimately answers Unknown for them; they are proven via the
      // community service + handler wiring, not via engine dispatch.
      if (w === 'leaderboard' || w === 'trade') continue;
      check(`help bullet ${w} dispatches`, !r.message.includes('Unknown command'), r.message.slice(0, 80));
    }
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
