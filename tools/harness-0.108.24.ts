// v0.108.24 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves all 11 .24 items with REAL behavior: ID
// issue/renew/perks, record tiers + expunge, transit fares/modes/pass,
// weather conditions + forecast hedging, EMS ladder advance, time/day/
// wait, news categories from real state, social posts/follows, phone
// read-state (view marks read, open marks only that one), pro-sports +
// college ladders — never parser-existence-only.
// Run:
//   npx esbuild tools/harness-0.108.24.ts --bundle --platform=node --format=esm --outfile=/tmp/h10824.mjs && node /tmp/h10824.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { getWeather } from '../src/server/time-engine.js';
import { idPerkFor } from '../src/server/features-0.108.24-identity.js';
import { weatherEffects } from '../src/server/features-0.108.24-world.js';
import * as fs from 'node:fs';

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
  return { name: 'Tester', city: 'west_memphis', district: 'downtown', money: 100000, energy: 100, happiness: 80, stress: 0, health: 100, ...over };
}
function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(baseState(over));
  return g;
}
function playerOf(g: GameEngine): any { return (g as any).player; }
function clockISO(year: number, month1: number, day: number, hour: number): string {
  const d = new Date(year, month1 - 1, day, hour, 0, 0);
  return d.toISOString();
}

async function main(): Promise<void> {
  console.log('=== item 1: help parity + coverage ===');
  {
    const g = fresh();
    const help = await g.processCommand('help');
    const bullets = help.message.split('\n').filter((l) => l.trim().startsWith('• '));
    check('help bullets 321 = 289 + 32', bullets.length === 321, bullets.length);
    check('no stale markers', !['§14', '§32', '§36', 'Since v0.108.21'].some((s) => help.message.includes(s)));
    const newCmds = ['id', 'transit memphis', 'stations', 'weather', 'forecast', 'time', 'day', 'wait 2', 'careers police', 'advance', 'sports', 'sports basketball', 'tryout basketball', 'contract', 'season', 'college', 'college tutoring', 'post visit', 'follow', 'following', 'threads', 'thread Nobody', 'news crime', 'news world'];
    for (const c of newCmds) {
      const r = await g.processCommand(c);
      check(`"${c}" dispatches (not Unknown command)`, !r.message.includes('Unknown command'), r.message.slice(0, 80));
    }
    const ver = fs.readFileSync('src/shared/version.ts', 'utf8');
    check('GAME_VERSION 0.108.24', ver.includes('0.108.24'), ver.trim());
    // What's New state (green replacement for the .21/.22/.23
    // positional whats-new checks, which .24 supersedes by prepending).
    const gameSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...gameSrc.matchAll(/<details class="update-details" id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    check('whats-new order starts .24, .23, .22, .21', detailIds[0] === 'update-v0-108-24' && detailIds[1] === 'update-v0-108-23' && detailIds[2] === 'update-v0-108-22' && detailIds[3] === 'update-v0-108-21', detailIds.slice(0, 4));
    check('only .24 open + Latest', gameSrc.includes('<details class="update-details" id="update-v0-108-24" open>') && gameSrc.includes('<span>v0.108.24</span><span>November 2, 2026</span> <span class="update-latest">Latest</span>'), '');
    check('.23 collapsed without Latest', gameSrc.includes('<details class="update-details" id="update-v0-108-23">') && !gameSrc.includes('<span>v0.108.23</span><span>November 2, 2026</span> <span class="update-latest">Latest</span>'), '');
    check('index starts with .24 button', gameSrc.indexOf('data-version="update-v0-108-24"') !== -1 && gameSrc.indexOf('data-version="update-v0-108-24"') < gameSrc.indexOf('data-version="update-v0-108-23"'), '');
    const block23 = gameSrc.split('id="update-v0-108-23"')[1]?.split('<details')[0] ?? '';
    check('.23 entry keeps its 4 bullets below .24', block23.includes('Travel expansion') && block23.includes('Properties expansion') && block23.includes('Living your home expansion') && block23.includes('Help bodies, presented properly'), block23.slice(0, 200));
    // Company sizes (green replacement for the .20 "all Small" check,
    // superseded by design: ladder rungs concentrate listings under
    // their real employers).
    const { groupCompanies } = await import('../src/server/features-0.108.20.js');
    const { ALL_JOBS } = await import('../src/server/jobs-database.js');
    const companies = groupCompanies(ALL_JOBS);
    const big = companies.filter((c: any) => c.listings.length > 3).map((c: any) => c.employer);
    // Only the Memphis home-team employers carry sports listings (the
    // other 12 fictional teams are names only, no jobs); PD had 2 real
    // listings before .24 (officer + detective).
    const expectedBig = new Set(['Memphis Police Department', 'Memphis Fire Department', 'MEMS Ambulance', 'Memphis Bolts', 'Memphis Current', 'Memphis Forge', 'Memphis Rails']);
    check('only ladder employers exceed 3 listings', big.length === expectedBig.size && big.every((e: string) => expectedBig.has(e)), big);
    const pd = companies.find((c: any) => c.employer === 'Memphis Police Department');
    check('Memphis PD holds 7 listings (2 real + 5 gap)', pd?.listings.length === 7, pd?.listings.length);
  }

  console.log('=== item 2: identification ===');
  {
    const g = fresh();
    let r = await g.processCommand('id card');
    check('id card buys $35', r.success === true && playerOf(g).money === 100000 - 35, [r.message.slice(0, 80), playerOf(g).money]);
    r = await g.processCommand('id card');
    check('id card again refuses (already valid)', r.success === false && r.message.includes('already valid'), r.message.slice(0, 80));
    r = await g.processCommand('id');
    check('id status shows State ID valid', r.message.includes('State ID') && r.message.includes('Valid through'), r.message.slice(0, 200));
    check('module perk: license fuel 0.20 only when held', idPerkFor('roadtrip_fuel', playerOf(g).identityDocs, '2024-01') === 0, idPerkFor('roadtrip_fuel', playerOf(g).identityDocs, '2024-01'));
    const g2 = fresh({ vehicles: [{ type: 'car', name: 'Test Car', condition: 100 }] });
    await g2.processCommand('id license');
    const before = playerOf(g2).money;
    r = await g2.processCommand('roadtrip memphis');
    check('roadtrip fuel $12 with license, no §31 permit', r.success === true && playerOf(g2).money === before - 12, [r.message.slice(0, 80), playerOf(g2).money]);
    const g3 = fresh({ city: 'new_york', money: 100000 });
    await g3.processCommand('id passport');
    r = await g3.processCommand('travel london');
    check('passport 15% off routed intl fare ($600 → $510)', r.success === true && playerOf(g3).money === 100000 - 150 - 510, [r.message.slice(0, 100), playerOf(g3).money]);
  }

  console.log('=== item 3: criminal records ===');
  {
    const g = fresh({ criminalRecord: [{ offense: 'Shoplifting', date: '2023-01', severity: 'minor' }] });
    let r = await g.processCommand('record');
    check('record shows tier minor + numbered entry', r.message.includes('minor') && r.message.includes('1. Shoplifting'), r.message.slice(0, 300));
    r = await g.processCommand('lawyer expunge 1');
    check('expunge dated minor succeeds $500', r.success === true && playerOf(g).money === 100000 - 500 && (playerOf(g).criminalRecord ?? []).length === 0, [r.message.slice(0, 100), playerOf(g).money]);
    const g2 = fresh({ criminalRecord: ['Shoplifting'] });
    r = await g2.processCommand('lawyer expunge 1');
    check('legacy dateless entry refuses expunge', r.success === false && r.message.includes('no recorded date'), r.message.slice(0, 120));
    const g3 = fresh({ criminalRecord: ['Heist'] });
    r = await g3.processCommand('record');
    check('heist record tier serious', r.message.includes('serious'), r.message.slice(0, 200));
    r = await g3.processCommand('lawyer expunge 1');
    check('serious entry refuses expunge', r.success === false && r.message.includes('Only minor offenses'), r.message.slice(0, 120));
  }

  console.log('=== item 4: transit ===');
  {
    const g = fresh();
    let r = await g.processCommand('transit memphis');
    check('transit preview shows bus/train + airport unavailable', r.message.includes('BUS') && r.message.includes('TRAIN') && r.message.includes('unavailable'), r.message.slice(0, 300));
    check('transit bus fare $12.00 (15 × 0.8)', r.message.includes('$12.00'), r.message.slice(0, 300));
    check('transit train fare $18.75 (15 × 1.25)', r.message.includes('$18.75'), r.message.slice(0, 300));
    r = await g.processCommand('travel memphis by train');
    check('travel by train succeeds at $18.75', r.success === true && playerOf(g).money === 100000 - 18.75 && playerOf(g).city === 'memphis', [r.message.slice(0, 100), playerOf(g).money]);
    const g2 = fresh();
    r = await g2.processCommand('travel memphis by airport');
    check('airport from non-airport city refuses', r.success === false && r.message.includes('No airport service'), r.message.slice(0, 120));
    const g3 = fresh();
    r = await g3.processCommand('transit pass');
    check('transit pass buys $30', r.success === true && playerOf(g3).money === 100000 - 30 && !!playerOf(g3).transitPassWeek, r.message.slice(0, 80));
    r = await g3.processCommand('travel memphis');
    check('pass 20% off routed drive fare ($15 → $12)', r.success === true && playerOf(g3).money === 100000 - 30 - 12, [r.message.slice(0, 100), playerOf(g3).money]);
    r = await g3.processCommand('stations');
    check('stations lists bus + train + airport note', r.message.includes('Bus Station') && r.message.includes('Train Station'), r.message.slice(0, 200));
  }

  console.log('=== item 5: weather ===');
  {
    const g = fresh();
    let r = await g.processCommand('weather');
    check('weather shows condition + work line', r.success === true && r.message.includes('Work pay:'), r.message.slice(0, 200));
    r = await g.processCommand('forecast');
    check('forecast: today exact + outlook hedging', r.success === true && r.message.includes('(today)') && r.message.includes('outlook only, not a guarantee'), r.message.slice(0, 300));
    check('module: snowy work ×0.90', weatherEffects('snowy').workPayMultiplier === 0.9);
    check('module: humid work ×0.95', weatherEffects('humid').workPayMultiplier === 0.95);
    // Severe-day travel: find a stormy/snowy game-day, set the clock there.
    let severeDate: Date | null = null;
    for (let i = 0; i < 200 && !severeDate; i++) {
      const d = new Date(2024, 0, 1 + i, 10, 0, 0);
      const w = getWeather(d, 'west_memphis');
      if (w.condition === 'stormy' || w.condition === 'snowy') severeDate = d;
    }
    check('severe game-day found within 200 days', severeDate !== null);
    if (severeDate) {
      const g2 = fresh({ gameTimeISO: severeDate.toISOString(), properties: [{ id: 'p1', name: 'WM House', type: 'house', city: 'west_memphis', district: 'downtown', purchasePrice: 50000, currentValue: 50000, condition: 90, rentalIncome: 0, maintenanceCost: 0, mortgageRemaining: 0, mortgagePayment: 0, purchasedAt: 0, furniture: [] }] });
      const happyBefore = playerOf(g2).happiness;
      r = await g2.processCommand('travel memphis');
      check('severe travel succeeds with severe note', r.success === true && r.message.includes('Severe weather'), r.message.slice(0, 200));
      check('severe travel: happiness −2 once', playerOf(g2).happiness === happyBefore - 2, playerOf(g2).happiness);
      check('severe travel: origin property condition −1', (playerOf(g2).properties[0].condition) === 89, playerOf(g2).properties[0].condition);
      check('severe watermark set', !!playerOf(g2).severeDayNoted, playerOf(g2).severeDayNoted);
    }
  }

  console.log('=== item 6: EMS ladders ===');
  {
    const g = fresh({ city: 'memphis' });
    let r = await g.processCommand('careers police');
    check('police ladder lists Cadet→Chief', r.message.includes('Police Cadet') && r.message.includes('Police Chief'), r.message.slice(0, 300));
    r = await g.processCommand('apply Police Cadet');
    check('apply cadet gap job hires', r.success === true && playerOf(g).job?.title === 'Police Cadet', [r.message.slice(0, 100), playerOf(g).job?.title]);
    r = await g.processCommand('career');
    check('career shows ladder line', r.message.includes('Ladder: Police Cadet'), r.message.slice(0, 300));
    r = await g.processCommand('advance');
    check('advance refuses at 0 shifts', r.success === false && r.message.includes('15 shifts'), r.message.slice(0, 120));
    playerOf(g).jobTenure = 15;
    playerOf(g).skills = { fitness: { level: 2, xp: 0 }, charisma: { level: 1, xp: 0 } };
    r = await g.processCommand('advance');
    check('advance to Officer $32.00/hr, tenure resets', r.success === true && playerOf(g).job?.title === 'Police Officer' && playerOf(g).jobTenure === 0, [r.message.slice(0, 120), playerOf(g).job?.title]);
  }

  console.log('=== item 7: time & 24-hour ===');
  {
    const g = fresh();
    let r = await g.processCommand('time');
    check('time shows clock + period', r.success === true && r.message.includes('Period:'), r.message.slice(0, 200));
    r = await g.processCommand('day');
    check('day shows date + season', r.success === true && r.message.includes('Season:'), r.message.slice(0, 200));
    const before = { money: playerOf(g).money, energy: playerOf(g).energy, happiness: playerOf(g).happiness, clock: (g as any).time.formatTime() };
    r = await g.processCommand('wait 3');
    check('wait 3 advances clock, no stat change', r.success === true && playerOf(g).money === before.money && playerOf(g).energy === before.energy && playerOf(g).happiness === before.happiness && (g as any).time.formatTime() !== before.clock, [r.message.slice(0, 80), (g as any).time.formatTime()]);
    r = await g.processCommand('wait 9');
    check('wait 9 refuses (1–8h bound)', r.success === false, r.message.slice(0, 80));
    const gd = fresh({ happiness: 80, energy: 50 });
    await gd.processCommand('sleep');
    check('day sleep happy delta 5', playerOf(gd).lastSleep?.happy === 5, playerOf(gd).lastSleep);
    const gn = fresh({ happiness: 80, energy: 50, gameTimeISO: clockISO(2024, 1, 1, 22) });
    await gn.processCommand('sleep');
    check('night sleep happy delta 10 (base 5 + night 5)', playerOf(gn).lastSleep?.happy === 10, playerOf(gn).lastSleep);
  }

  console.log('=== item 8: news categories ===');
  {
    const g = fresh({ heat: 85 });
    let r = await g.processCommand('news crime');
    check('news crime succeeds + heat band', r.success === true && /heat/i.test(r.message), r.message.slice(0, 300));
    const w = getWeather((g as any).time.currentTime, 'west_memphis');
    r = await g.processCommand('news city');
    check('news city shows current-city weather headline', r.success === true && r.message.includes(w.condition), r.message.slice(0, 300));
    r = await g.processCommand('news world');
    check('news world succeeds', r.success === true, r.message.slice(0, 120));
    r = await g.processCommand('news bogus');
    check('news bogus refuses with category list', r.success === false && r.message.includes('celebrity'), r.message.slice(0, 120));
    r = await g.processCommand('news');
    check('bare news unchanged (daily paper)', r.success === true && r.message.includes('The Open World Daily'), r.message.slice(0, 120));
  }

  console.log('=== item 9: social media ===');
  {
    const g = fresh();
    let r = await g.processCommand('post hello world');
    check('free-text post refuses (template-only)', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('post visit');
    check('post visit succeeds at 0 likes', r.success === true && (playerOf(g).social?.posts ?? []).length === 1 && playerOf(g).social.posts[0].likes === 0, [r.message.slice(0, 100), playerOf(g).social?.posts]);
    r = await g.processCommand('social');
    check('social shows your post', r.message.includes('Checking in from'), r.message.slice(0, 300));
    const npc = (g as any).social.getAllNPCs()[0];
    r = await g.processCommand(`follow ${npc.name}`);
    check('follow roster NPC succeeds', r.success === true, r.message.slice(0, 80));
    r = await g.processCommand('following');
    check('following lists the NPC + follower count', r.message.includes(npc.name) && r.message.includes('Followers:'), r.message.slice(0, 200));
    r = await g.processCommand('social');
    check('social shows followed NPC post', r.message.includes(npc.name), r.message.slice(0, 400));
    r = await g.processCommand(`unfollow ${npc.name}`);
    check('unfollow succeeds', r.success === true, r.message.slice(0, 80));
  }

  console.log('=== item 10: phone read-state ===');
  {
    const g = fresh();
    const comm = (g as any).comm;
    comm.receiveSMS('npc_a', 'Ana Tester', 'Hello one, this is the first message');
    comm.receiveSMS('npc_b', 'Ben Tester', 'Hello two, this is the second message');
    // Fresh engines already carry a seed welcome SMS — filter to ours.
    const mine = (s: any) => s.fromName === 'Ana Tester' || s.fromName === 'Ben Tester';
    const ids = comm.getMessages().filter(mine).map((s: any) => s.id);
    check('two SMS seeded with ids', ids.length === 2 && !!ids[0] && !!ids[1], ids);
    let r = await g.processCommand('phone');
    check('phone shows 3 unread SMS (seed + 2)', r.message.includes('Messages: 3 unread'), r.message.slice(0, 200));
    r = await g.processCommand('messages');
    check('messages lists both with ids', r.message.includes(ids[0]) && r.message.includes(ids[1]), r.message.slice(0, 300));
    r = await g.processCommand('phone');
    check('view marks read: 0 unread after messages', r.message.includes('Messages: 0 unread'), r.message.slice(0, 200));
    // Fresh engine: open marks ONLY that message read.
    const g2 = fresh();
    const c2 = (g2 as any).comm;
    c2.receiveSMS('npc_a', 'Ana Tester', 'Hello one, this is the first message');
    c2.receiveSMS('npc_b', 'Ben Tester', 'Hello two, this is the second message');
    const ids2 = c2.getMessages().filter(mine).map((s: any) => s.id);
    r = await g2.processCommand(`read message ${ids2[0]}`);
    check('read message opens full content', r.success === true && r.message.includes('Hello one'), r.message.slice(0, 200));
    r = await g2.processCommand('phone');
    check('open marks only that one: 2 unread left (seed + other)', r.message.includes('Messages: 2 unread'), r.message.slice(0, 200));
    r = await g2.processCommand('threads');
    check('threads groups by contact with unread counts', r.message.includes('Ana Tester') && r.message.includes('Ben Tester') && r.message.includes('1 unread'), r.message.slice(0, 300));
    r = await g2.processCommand('thread Ben Tester');
    check('thread opens full conversation + marks read', r.success === true && r.message.includes('Hello two'), r.message.slice(0, 300));
    r = await g2.processCommand('phone');
    check('thread marks its messages read: 1 unread (seed) left', r.message.includes('Messages: 1 unread'), r.message.slice(0, 200));
    r = await g2.processCommand('read message nope_nonexistent');
    check('unknown message id refuses cleanly', r.success === false && r.message.includes('Message not found'), r.message.slice(0, 80));
    r = await g2.processCommand(`delete message ${ids2[1]}`);
    check('delete message succeeds', r.success === true, r.message.slice(0, 80));
    r = await g2.processCommand('messages');
    check('deleted message gone from listing', !r.message.includes(ids2[1]), r.message.slice(0, 300));
  }

  console.log('=== item 11: pro sports + college ===');
  {
    const g = fresh();
    let r = await g.processCommand('sports');
    check('sports lists 4 fictional leagues', r.message.includes('Mid-South Basketball') && r.message.includes('Delta Gridiron') && r.message.includes('River Valley Soccer') && r.message.includes('Delta Diamond'), r.message.slice(0, 300));
    r = await g.processCommand('sports basketball');
    check('basketball track shows ranks + salaries', r.message.includes('Rookie Player') && r.message.includes('$48,000'), r.message.slice(0, 300));
    r = await g.processCommand('tryout basketball');
    check('tryout refuses below fitness gates', r.success === false && r.message.includes('fitness'), r.message.slice(0, 120));
    playerOf(g).skills = { fitness: { level: 3, xp: 0 }, charisma: { level: 1, xp: 0 } };
    playerOf(g).fitness = 70;
    r = await g.processCommand('tryout basketball');
    check('tryout passes → rookie deal $48,000/yr', r.success === true && playerOf(g).job?.title === 'Rookie Player' && r.message.includes('$48,000'), [r.message.slice(0, 150), playerOf(g).job?.title]);
    r = await g.processCommand('contract');
    check('contract shows term + renewal bar', r.message.includes('12 game-months') && r.message.includes('40'), r.message.slice(0, 300));
    r = await g.processCommand('season');
    check('season shows 0 appearances + Developing score', r.message.includes('Appearances') && r.message.includes('Developing'), r.message.slice(0, 300));
    r = await g.processCommand('advance');
    check('sports advance refuses at fitness 3 (needs 4)', r.success === false, r.message.slice(0, 120));
    playerOf(g).skills.fitness.level = 4;
    r = await g.processCommand('advance');
    check('sports advance to Rotation Player', r.success === true && playerOf(g).job?.title === 'Rotation Player', [r.message.slice(0, 120), playerOf(g).job?.title]);
    const g2 = fresh();
    r = await g2.processCommand('college tutoring');
    check('college tutoring entry refuses without enrollment', r.message.includes('enrollment'), r.message.slice(0, 200));
    r = await g2.processCommand('tryout college basketball');
    check('college tryout refuses without enrollment', r.success === false && r.message.includes('enrollment'), r.message.slice(0, 120));
    playerOf(g2).enrolledCourse = { schoolId: 'little_rock_cc', courseId: 'gen101', hoursCompleted: 0, totalHours: 10 };
    playerOf(g2).lastGPA = 3.0;
    playerOf(g2).skills = { fitness: { level: 3, xp: 0 }, charisma: { level: 1, xp: 0 } };
    playerOf(g2).fitness = 70;
    r = await g2.processCommand('tryout college basketball');
    check('college tryout passes with enrollment + GPA 3.0', r.success === true && !!playerOf(g2).collegeTeam, [r.message.slice(0, 120), playerOf(g2).collegeTeam]);
    r = await g2.processCommand('college');
    check('college view shows your college team', r.message.includes(playerOf(g2).collegeTeam.team), r.message.slice(0, 300));
    r = await g2.processCommand('travel littlerock');
    check('travel to tutor city succeeds', r.success === true, r.message.slice(0, 80));
    r = await g2.processCommand('apply Campus Tutor');
    check('apply college entry rung hires (in its city)', r.success === true && playerOf(g2).job?.title === 'Campus Tutor', [r.message.slice(0, 100), playerOf(g2).job?.title]);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
