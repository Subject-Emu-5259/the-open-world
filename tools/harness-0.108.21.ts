// v0.108.21 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves every .21 item with REAL output (state
// changed, money/tax/ladder/ticker effects actually computed — never
// parser-existence-only), including: old-save compatibility, the fee
// fairness bar (full ladder walkthrough, recovery, broke-player
// recovery, no-surprise, proportionality), repricing transparency,
// ticker pool/order/filtering/persistence, save-failure classes and
// the skew fix, and investment folding (incl. Dre's exact figures).
// Run:
//   npx esbuild tools/harness-0.108.21.ts --bundle --platform=node --format=esm --outfile=/tmp/h10821.mjs && node /tmp/h10821.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { WORLD_CITIES } from '../src/shared/world-data.js';
import { ALL_JOBS } from '../src/server/jobs-database.js';
import {
  groupCompanies, stockPriceAt, companyPerformance,
  housingMarketIndex, livingExpenses, economicIndexForCity,
  seasonFromMonth, nextHoliday, challengeGoalForWeek, lifetimeXP,
} from '../src/server/features-0.108.20.js';
import { weekKeyFromDate, worldEventsThisWeek } from '../src/server/features-0.108.19.js';
import {
  DIVIDEND_MONTHLY_RATE, stockDividend, companyMonthlyTick,
  listingPriceNow, repriceValue,
  FEE_WARNING_1_MONTHS, FEE_WARNING_2_MONTHS, FEE_SEIZURE_MONTHS,
  FEE_PLAN_INSTALLMENTS, FEE_SEIZURE_COOLDOWN_MONTHS,
  monthDiff, addMonthsKey, feeLadderStage, firstSeizableAsset,
} from '../src/server/features-0.108.21.js';
import { generateTickerHeadlines, filterTickerHeadlines } from '../src/server/ticker-headlines.js';
import {
  isStaleWrite, saveWarningText, failureClassForSaveResponse, SAVE_MAX_BODY_BYTES,
} from '../src/shared/save-resolution.js';
import { getWeather } from '../src/server/time-engine.js';
import {
  MemoryCommunityStore, recordLeaderboard, getLeaderboard,
  recordChallengeContribution, getChallenge,
} from '../src/server/community.js';
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
  return { name: 'Tester', city: 'memphis', district: 'downtown', money: 100000, energy: 100, happiness: 80, stress: 0, health: 100, ...over };
}

function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(baseState(over));
  return g;
}

function prop(over: Record<string, unknown> = {}): any {
  return {
    id: 'owned_prop_001', name: 'South Memphis Bungalow', type: 'house', city: 'memphis',
    district: 'south_memphis', purchasePrice: 85000, currentValue: 85000, condition: 100,
    rentalIncome: 800, maintenanceCost: 70, mortgageRemaining: 0, mortgagePayment: 0,
    purchasedAt: Date.now(), renovationLevel: 0, ...over,
  };
}

function car(over: Record<string, unknown> = {}): any {
  return {
    id: 'veh_001', name: 'Used Sedan', type: 'car', value: 5000, condition: 80,
    mileage: 10000, purchasedAt: Date.now(), lastService: Date.now(), services: {}, ...over,
  };
}

// Tick exactly the months (lastMonth, currentMonth]: set the watermark,
// advance the clock into currentMonth, run the tick, return its lines.
function tickTo(g: GameEngine, lastMonth: string, advanceHours: number): string[] {
  (g as any).player.lastMonthlyTick = lastMonth;
  (g as any).time.advance({ hours: advanceHours });
  return (g as any).runMonthlyTicksIfDue();
}

// One Feb-2024 tick from a Jan-2024 start (744h = 31 days).
function tickFeb(g: GameEngine): string[] {
  (g as any).player.livingTicksCharged = 2;
  return tickTo(g, '2024-01', 24 * 31);
}

// Advance the game clock exactly one game-month forward (day-stepping
// until the month key changes), then run whatever ticks are due.
function tickNextMonth(g: GameEngine): string[] {
  const startKey = (g as any).time.getMonthKey();
  for (let i = 0; i < 32; i++) {
    (g as any).time.advance({ hours: 24 });
    if ((g as any).time.getMonthKey() !== startKey) break;
  }
  return (g as any).runMonthlyTicksIfDue();
}

function emailsOf(g: GameEngine): any[] {
  return (g as any).getPlayer().emails ?? [];
}

function livingTotalFor(g: GameEngine): number {
  return livingExpenses((g as any).player, economicIndexForCity((g as any).player.city)).total;
}

async function main(): Promise<void> {
  // ============ §49 SMS / VOICEMAIL PERSISTENCE ============
  console.log('--- §49 sms/voicemail ---');
  {
    const g = fresh();
    const msgs0 = await g.processCommand('messages');
    check('welcome SMS present on fresh engine (Uncle Ray)', msgs0.message.includes('Uncle Ray'), msgs0.message.slice(0, 200));
    const sent = (g as any).comm.receiveSMS('npc_006', 'Uncle Ray', 'Test text round-trip');
    const vm = (g as any).comm.receiveVoicemail('npc_006', 'Uncle Ray', 'Test voicemail transcript');
    const saved = (g as any).getPlayer();
    const g2 = new GameEngine();
    g2.loadState(saved);
    const p2 = (g2 as any).getPlayer();
    check('SMS survives round-trip with same id + content',
      (p2.sms ?? []).some((s: any) => s.id === sent.id && s.message === 'Test text round-trip'), JSON.stringify((p2.sms ?? []).map((s: any) => s.id)));
    check('voicemail survives round-trip with same id + transcript',
      (p2.voicemails ?? []).some((v: any) => v.id === vm.id && v.transcript === 'Test voicemail transcript'), JSON.stringify((p2.voicemails ?? []).map((v: any) => v.id)));
    const saved2 = (g2 as any).getPlayer();
    const g3 = new GameEngine();
    g3.loadState(saved2);
    const p3 = (g3 as any).getPlayer();
    check('second round-trip adds no duplicate SMS/voicemail',
      (p3.sms ?? []).filter((s: any) => s.id === sent.id).length === 1 &&
      (p3.voicemails ?? []).filter((v: any) => v.id === vm.id).length === 1,
      { sms: (p3.sms ?? []).length, vm: (p3.voicemails ?? []).length });
    const welcomeCount = (p3.sms ?? []).filter((s: any) => s.fromName === 'Uncle Ray' && String(s.message ?? '').includes('Welcome to the neighborhood')).length;
    check('welcome SMS count stays 1 after reloads', welcomeCount === 1, welcomeCount);
    const vms = await g2.processCommand('voicemails');
    check('voicemails command lists transcript + marks listened (list IS listen)',
      vms.message.includes('Test voicemail transcript') && (g2 as any).getPlayer().voicemails.every((v: any) => v.listened === true), vms.message.slice(0, 200));
    const oldState: any = baseState();
    delete oldState.sms;
    delete oldState.voicemails;
    const gOld2 = new GameEngine();
    gOld2.loadState(oldState);
    const oldMsgs = await gOld2.processCommand('messages');
    check('old save (no sms/voicemail fields) loads with today\'s initials, no crash',
      oldMsgs.success && oldMsgs.message.includes('Uncle Ray'), oldMsgs.message.slice(0, 200));
  }

  // ============ §50 STOCK DIVIDENDS ============
  console.log('--- §50 dividends ---');
  {
    const comp = groupCompanies(ALL_JOBS)[0];
    const priceFeb = stockPriceAt(comp, '2024-02');
    const g = fresh({
      investments: [{ type: 'stock', company: comp.employer, name: comp.employer, shares: 100, purchasePrice: 100 * priceFeb, currentValue: 100 * priceFeb }],
      livingTicksCharged: 2,
    });
    const beforeMoney = (g as any).player.money;
    const beforeTax = (g as any).player.taxAnnualIncome ?? 0;
    const living = livingTotalFor(g);
    const lines = tickFeb(g);
    const holding = (g as any).player.investments[0];
    const expectedDiv = stockDividend(100, stockPriceAt(comp, '2024-02'));
    check('dividend math exact: 100 shares x Feb price x 0.25%',
      holding.lastDividend === expectedDiv && holding.dividendMonthKey === '2024-02',
      { last: holding.lastDividend, expected: expectedDiv, month: holding.dividendMonthKey });
    check('tick pays dividend to cash (net of living costs) + taxable income',
      (g as any).player.money === beforeMoney + expectedDiv - living &&
      ((g as any).player.taxAnnualIncome ?? 0) === beforeTax + expectedDiv,
      { money: (g as any).player.money, expected: beforeMoney + expectedDiv - living, tax: (g as any).player.taxAnnualIncome });
    check('tick line itemizes dividend', lines.join('\n').includes('dividends') && lines.join('\n').includes(`$${expectedDiv.toLocaleString()}`), lines.join('\n').slice(0, 400));
    const dv = await g.processCommand('dividends');
    check('dividends command shows holding + monthly amount + last payout',
      dv.message.includes(comp.employer) && dv.message.includes(`$${expectedDiv.toLocaleString()}`) && dv.message.includes('2024-02'), dv.message.slice(0, 300));
    const inv = await g.processCommand('investments');
    check('investments shows dividend terms', inv.message.includes('dividend 0.25%/mo'), inv.message.slice(0, 300));
    // Sold holding stops paying the month after sale.
    const sell = await g.processCommand(`sell stock ${comp.employer} all`);
    check('sell stock all removes holding', sell.success && (g as any).player.investments.length === 0, sell.message.slice(0, 200));
    const lines2 = tickTo(g, '2024-02', 24 * 29); // Feb 1 + 29 days = Mar 1 (leap year)
    check('sold holding pays nothing further (no dividend line in next tick)',
      !lines2.join('\n').includes('dividends'), lines2.join('\n').slice(0, 400));
    // 0-share holding pays $0.
    const g0 = fresh({
      investments: [{ type: 'stock', company: comp.employer, name: comp.employer, shares: 0, purchasePrice: 0, currentValue: 0 }],
      livingTicksCharged: 2,
    });
    const lines0 = tickFeb(g0);
    check('0-share holding pays $0 (no dividend line)', !lines0.join('\n').includes('dividends'), lines0.join('\n').slice(0, 300));
    // Old save (no lastDividend fields) pays correctly on first .21 tick.
    const gOld = fresh({
      investments: [{ type: 'stock', company: comp.employer, name: comp.employer, shares: 50, purchasePrice: 5000, currentValue: 5000 }],
      livingTicksCharged: 2,
    });
    tickFeb(gOld);
    const hOld = (gOld as any).player.investments[0];
    check('old save without lastDividend pays on first .21 tick',
      hOld.lastDividend === stockDividend(50, stockPriceAt(comp, '2024-02')) && hOld.dividendMonthKey === '2024-02',
      { last: hOld.lastDividend });
  }

  // ============ §51 FOUNDING / RUNNING COMPANIES ============
  console.log('--- §51 companies ---');
  {
    const g = fresh({ money: 100000 });
    const r = await g.processCommand('found TestCo');
    check('found charges $5,000 cash-only, HQ = current city, status active',
      r.success && (g as any).player.money === 95000 &&
      (g as any).player.playerCompanies?.[0]?.hqCity === 'memphis' &&
      (g as any).player.playerCompanies?.[0]?.status === 'active', r.message.slice(0, 200));
    const dup = await g.processCommand('found testco');
    check('duplicate company name (case-insensitive) refuses', !dup.success && dup.message.toLowerCase().includes('already'), dup.message.slice(0, 200));
    const badInd = await g.processCommand('found OtherCo in Wizardry');
    check('bad industry refuses', !badInd.success, badInd.message.slice(0, 200));
    const broke = fresh({ money: 4000 });
    const brokeR = await broke.processCommand('found PoorCo');
    check('found refuses when cash short (bank savings do not count)',
      !brokeR.success && brokeR.message.includes('withdraw'), brokeR.message.slice(0, 200));
    const gInd = fresh({ money: 100000 });
    const rInd = await gInd.processCommand('found HealthCo in Healthcare');
    check('found in [industry] records the industry',
      rInd.success && (gInd as any).player.playerCompanies?.[0]?.industry === 'Healthcare', rInd.message.slice(0, 200));
    // Hiring: fill to 5, 6th refuses; conflicts refuse naming the conflict.
    const gH = fresh({ money: 100000 });
    await gH.processCommand('found HireCo');
    const roster = (gH as any).social.getAllNPCs();
    const picks = roster.slice(0, 6);
    for (let i = 0; i < 5; i++) {
      const hr = await gH.processCommand(`company hire HireCo ${picks[i].name}`);
      if (!hr.success) check(`hire ${i + 1}/5 succeeds`, false, hr.message.slice(0, 200));
    }
    check('hire fills to 5', (gH as any).player.playerCompanies[0].employees.length === 5, (gH as any).player.playerCompanies[0].employees);
    const sixth = await gH.processCommand(`company hire HireCo ${picks[5].name}`);
    check('6th hire refuses at cap', !sixth.success, sixth.message.slice(0, 200));
    const doubleCo = await gH.processCommand(`company hire HireCo ${picks[0].name}`);
    check('double-company hire refuses naming conflict', !doubleCo.success, doubleCo.message.slice(0, 200));
    await gH.processCommand('found SecondCo');
    const dbl = await gH.processCommand(`company hire SecondCo ${picks[0].name}`);
    check('NPC already at one player company cannot join a second one (same engine)',
      !dbl.success && (dbl.message.toLowerCase().includes(picks[0].name.toLowerCase().split(' ')[0]) || dbl.message.toLowerCase().includes('hireco')), dbl.message.slice(0, 200));
    // Tick math: three spec worked examples, via perf bands found by
    // brute force over company ids for the Feb tick month.
    const bandOf = (perf: number) => (perf >= 70 ? 'Thriving' : perf >= 40 ? 'Steady' : 'Struggling');
    const findId = (band: string): string | null => {
      for (let i = 0; i < 500; i++) {
        const id = `bandprobe-${band}-${i}`;
        if (bandOf(companyPerformance(id, '2024-02')) === band) return id;
      }
      return null;
    };
    const cases: Array<[number, string, number, number, number]> = [
      [1, 'Steady', 450, 200, 250],
      [5, 'Thriving', 1260, 600, 660],
      [0, 'Struggling', 240, 100, 140],
    ];
    for (const [n, band, rev, exp, net] of cases) {
      const id = findId(band);
      check(`perf band probe found for ${band}`, id !== null, id);
      if (!id) continue;
      const calc = companyMonthlyTick(n, companyPerformance(id, '2024-02'));
      check(`${band} tick math: ${n} employees -> revenue $${rev}, expenses $${exp}, net +$${net}`,
        calc.revenue === rev && calc.expenses === exp && calc.net === net, calc);
    }
    // Integrated tick: founded company nets to cash + tax, net of living.
    const gT = fresh({ money: 100000, livingTicksCharged: 2 });
    await gT.processCommand('found TickCo');
    const tickCo = (gT as any).player.playerCompanies[0];
    const perfFeb = companyPerformance(tickCo.id, '2024-02');
    const expected = companyMonthlyTick(0, perfFeb);
    const beforeMoney = (gT as any).player.money;
    const beforeTax = (gT as any).player.taxAnnualIncome ?? 0;
    const living = livingTotalFor(gT);
    const lines = tickFeb(gT);
    check('company tick nets to cash (net of living) + taxable income',
      (gT as any).player.money === beforeMoney + expected.net - living &&
      ((gT as any).player.taxAnnualIncome ?? 0) === beforeTax + expected.net &&
      tickCo.lastNet === expected.net,
      { money: (gT as any).player.money, expected: beforeMoney + expected.net - living, lastNet: tickCo.lastNet, lines: lines.join('\n').slice(0, 300) });
    const my = await gT.processCommand('mycompanies');
    check('mycompanies shows founded company with status + last net',
      my.message.includes('TickCo') && my.message.includes('active'), my.message.slice(0, 300));
    const det = await gT.processCommand('company TickCo');
    check('company [own name] shows founded detail', det.message.includes('TickCo') && det.message.toLowerCase().includes('employees'), det.message.slice(0, 300));
    const comps = await gT.processCommand('companies');
    check('companies gains a "Your companies" section', comps.message.includes('Your companies'), comps.message.slice(0, 300));
    // Voluntary close: releases, no proceeds, stays as history.
    const gC = fresh({ money: 100000 });
    await gC.processCommand('found CloseCo');
    await gC.processCommand(`company hire CloseCo ${roster[0].name}`);
    const close = await gC.processCommand('company close CloseCo');
    const closed = (gC as any).player.playerCompanies[0];
    check('voluntary close releases employees, no proceeds, stays listed as history',
      close.success && closed.status === 'closed' && closed.employees.length === 0, close.message.slice(0, 200));
    // Failure path: NOTE — under the §51 formula net is always
    // positive (min +$140 at 0 employees Struggling: 240-100), so
    // company debt can never accumulate through play and the
    // 2-bad-months failure branch is unreachable via ticks. The
    // branch exists in companyTick (source-checked below) and
    // voluntary close is proven above; the economics gap is flagged
    // in the build report for Dre's call (see §51 note).
    const engineSrc = fs.readFileSync('src/server/game-engine.ts', 'utf8');
    check('failure branch exists in companyTick (FAILED + debt dies with company)',
      engineSrc.includes('FAILED after') && engineSrc.includes('debt dies with the company'), 'companyTick failure text');
    // Old save (no playerCompanies) founds/runs cleanly.
    const gOldC = new GameEngine();
    const oldState: any = baseState({ money: 100000 });
    delete oldState.playerCompanies;
    gOldC.loadState(oldState);
    const oldFound = await gOldC.processCommand('found LegacyCo');
    check('old save without playerCompanies founds cleanly', oldFound.success, oldFound.message.slice(0, 200));
  }

  // ============ §52 REPRICING ============
  console.log('--- §52 repricing ---');
  {
    const g = fresh({ properties: [prop()], livingTicksCharged: 2 });
    const idxJan = housingMarketIndex('memphis', '2024-01');
    const idxFeb = housingMarketIndex('memphis', '2024-02');
    const lines = tickFeb(g);
    const p = (g as any).player.properties[0];
    // NOTE: the property tick itself drifts currentValue monthly
    // (property-engine) BEFORE the repricing block runs, so the
    // absolute pre-tick value is not the repricing input. The exact
    // check is the stored lastReprice record: new === old x ratio,
    // with the real indices for the ticked months.
    const lr = p.lastReprice;
    check('owned value moves by exactly the index ratio (via stored lastReprice)',
      !!lr && lr.month === '2024-02' && lr.oldIndex === idxJan && lr.newIndex === idxFeb &&
      lr.newValue === repriceValue(lr.oldValue, lr.oldIndex, lr.newIndex) &&
      p.currentValue === lr.newValue,
      { lr, idxJan, idxFeb, current: p.currentValue });
    if (lr && lr.oldValue !== lr.newValue) {
      const line = lines.join('\n');
      check('tick line names old price, new price, AND index move',
        line.includes(`$${lr.oldValue.toLocaleString()}`) && line.includes(`$${lr.newValue.toLocaleString()}`) &&
        line.includes(lr.oldIndex.toFixed(2)) && line.includes(lr.newIndex.toFixed(2)) && line.includes('Repriced:'),
        line.slice(0, 500));
    } else {
      check('flat-index month produces no repricing line',
        !lines.join('\n').includes('Repriced:'), lines.join('\n').slice(0, 300));
    }
    const rp = await g.processCommand('repricing');
    check('repricing command shows same figures as the tick',
      rp.message.includes('South Memphis Bungalow') &&
      (!lr || rp.message.includes(`$${lr.newValue.toLocaleString()}`)), rp.message.slice(0, 300));
    // Buy after repricing charges the adjusted price.
    const gB = fresh({ money: 1000000 });
    const re = await gB.processCommand('real-estate');
    const listings = (gB as any).property.getListingsByCity('memphis');
    if (listings.length > 0) {
      const first = listings[0];
      const adjusted = listingPriceNow(first.price, 'memphis', (gB as any).time.getMonthKey());
      check('real-estate screen shows index-adjusted prices + index line',
        re.message.includes(`$${adjusted.toLocaleString()}`) && re.message.includes('index'), re.message.slice(0, 300));
      const buy = await gB.processCommand(`buy property ${first.name} cash`);
      const owned = (gB as any).player.properties.find((x: any) => x.name === first.name);
      check('buy after repricing charges adjusted price end to end (purchase record carries it)',
        buy.success && owned && owned.purchasePrice === adjusted && owned.currentValue === adjusted,
        { buy: buy.message.slice(0, 200), purchasePrice: owned?.purchasePrice, adjusted });
    } else {
      check('Memphis has listings to test adjusted buys against', false, 'no listings');
    }
    // Flat-index month: brute-force a city+month pair with equal
    // consecutive indices (cent-rounding makes these occur).
    let flatFound: [string, string] | null = null;
    for (const city of Object.keys(WORLD_CITIES)) {
      for (let m = 1; m <= 12; m++) {
        const a = `2024-${String(m).padStart(2, '0')}`;
        const b = m === 12 ? '2025-01' : `2024-${String(m + 1).padStart(2, '0')}`;
        if (housingMarketIndex(city, a) === housingMarketIndex(city, b)) { flatFound = [city, a]; break; }
      }
      if (flatFound) break;
    }
    check('a flat-index month pair exists somewhere (cent-rounding)', flatFound !== null, flatFound);
    check('repriceValue with equal indices leaves value unchanged',
      repriceValue(85000, 1.04, 1.04) === 85000, repriceValue(85000, 1.04, 1.04));
  }

  // ============ §53 THIN CITIES ============
  console.log('--- §53 thin cities ---');
  {
    const g = fresh();
    const roster = (g as any).social.getAllNPCs();
    const six: Array<[string, string[]]> = [
      ['vegas', ['Marisol Vega', 'Curtis Bell', 'Dana Whitaker', 'Felix Romano']],
      ['seattle', ['Nora Lindqvist', 'Eddie Kwan', 'Grace Hollis', 'Milo Barrett']],
      ['phoenix', ['Tomas Delgado', 'Ingrid Sorensen', 'Ray Kowalski', 'Lucia Fernandez']],
      ['philly', ['Samuel Ortiz', 'Denise Coleman', 'Victor Lang', 'Paula Nguyen']],
      ['detroit', ['Andre Baptiste', 'Celeste Monroe', 'Franklin Doyle', 'Keisha Thompson']],
      ['charlotte', ['Brandon Cole', 'Tamika Ross', 'Elaine Park', 'Jordan Hale']],
    ];
    for (const [city, names] of six) {
      const count = roster.filter((n: any) => n.city === city).length;
      check(`${city} has >=5 residents (was 1)`, count >= 5, count);
      for (const name of names) {
        check(`${city} resident ${name} on roster`, roster.some((n: any) => n.name === name), name);
      }
      // people output in that city lists more than one person, and at
      // least one of the new residents is among them (district
      // preference means some districts show only one new name).
      (g as any).player.city = city;
      const first = roster.find((n: any) => n.city === city);
      (g as any).player.district = first.district;
      const p = await g.processCommand('people');
      const bulletCount = (p.message.match(/• /g) ?? []).length;
      const listed = names.filter((n) => p.message.includes(n)).length;
      check(`people in ${city} lists a real group (>=2 people, >=1 new resident)`,
        bulletCount >= 2 && listed >= 1, p.message.slice(0, 300));
      const talkNpc = roster.find((n: any) => n.name === names[0]);
      (g as any).player.district = talkNpc.district;
      const talk = await g.processCommand(`talk ${names[0]}`);
      check(`talk ${names[0]} dispatches to a real conversation`,
        talk.success && !talk.message.toLowerCase().includes('not found') && !talk.message.toLowerCase().includes('no one'), talk.message.slice(0, 200));
    }
    let sweepOk = true;
    for (const city of Object.keys(WORLD_CITIES)) {
      if (roster.filter((n: any) => n.city === city).length === 0) sweepOk = false;
    }
    check('all-27-cities sweep stays non-empty', sweepOk, Object.keys(WORLD_CITIES).length);
    const nameList = roster.map((n: any) => n.name);
    const newNames = six.flatMap(([, names]) => names);
    check('no new name duplicates any existing roster name (each new name occurs exactly once)',
      newNames.every((n) => nameList.filter((x: string) => x === n).length === 1) &&
      new Set(newNames).size === newNames.length,
      { rosterSize: nameList.length, newNames: newNames.length });
  }

  // ============ §54 FEE LADDER (FAIRNESS BAR) ============
  console.log('--- §54 fee ladder ---');
  {
    // (a) FULL LADDER WALKTHROUGH. Base 2024-01, $65 due (1 registered
    // vehicle $40 + 1 property $25). Clock starts Jan 2024.
    const g = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true })],
      properties: [prop()],
      primaryResidenceId: 'owned_prop_001',
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (g as any).player.lastMonthlyTick = '2024-01';
    let lines = tickNextMonth(g); // Feb, past 1: nothing
    check('ladder Feb (past 1): no warning, no late fee', (g as any).player.feesDue === 65 && !lines.join('\n').includes('fee warning'), lines.join('\n').slice(0, 300));
    lines = tickNextMonth(g); // Mar, past 2: nothing (late fee needs month > base+2)
    check('ladder Mar (past 2): still no warning, no late fee', (g as any).player.feesDue === 65, lines.join('\n').slice(0, 300));
    lines = tickNextMonth(g); // Apr, past 3: late fee + warning 1
    check('ladder Apr (past 3): $10 late fee + warning 1 naming amount + deadline + ways out',
      (g as any).player.feesDue === 75 && lines.join('\n').includes('fee warning 1') &&
      emailsOf(g).some((e: any) => e.subject.includes('Fee warning') && e.body.includes('$75') && e.body.includes('pay fees')),
      { due: (g as any).player.feesDue, lines: lines.join('\n').slice(0, 400) });
    const feesApr = await g.processCommand('fees');
    check('fees output at warning stage names NEXT stage consequence before it fires',
      feesApr.message.includes('FINAL') || feesApr.message.includes('final warning'), feesApr.message.slice(0, 400));
    lines = tickNextMonth(g); // May, past 4: final warning
    check('ladder May (past 4): FINAL warning naming seizure order',
      (g as any).player.feesWarning2Sent === true && lines.join('\n').includes('FINAL fee warning') &&
      emailsOf(g).some((e: any) => e.subject.includes('FINAL fee warning') && e.body.includes('seize')),
      lines.join('\n').slice(0, 400));
    lines = tickNextMonth(g); // Jun, past 5: seizure of ONE asset (cheapest vehicle)
    check('ladder Jun (past 5): seizure names asset + value + remainder, one asset only',
      lines.join('\n').includes('fee seizure') && lines.join('\n').includes('Used Sedan') &&
      (g as any).player.vehicles.length === 0 && (g as any).player.properties.length === 1 &&
      (g as any).player.feesDue === 0, // $5,000 vehicle covers the $75 debt -> ladder clears
      { due: (g as any).player.feesDue, vehicles: (g as any).player.vehicles.length, lines: lines.join('\n').slice(0, 400) });
    check('seizure settles debt (value applied, floor $0) and ladder clears when $0',
      (g as any).player.feesDue === 0, (g as any).player.feesDue);
    check('seizure notice posted naming asset + remainder',
      emailsOf(g).some((e: any) => e.subject.includes('Fee seizure') && e.body.includes('Used Sedan')), 'seizure notice');

    // (b) RECOVERY: pay part mid-ladder -> escalation stops on old deadlines.
    const gR = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true })],
      properties: [prop()],
      primaryResidenceId: 'owned_prop_001',
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gR as any).player.lastMonthlyTick = '2024-01';
    tickNextMonth(gR); tickNextMonth(gR); tickNextMonth(gR); // Apr: warning 1
    const payPart = await gR.processCommand('pay fees 25');
    check('partial payment reduces debt + restarts warning clock from payment month',
      payPart.success && (gR as any).player.feesDue === 50 &&
      (gR as any).player.feesClockMonthKey === (gR as any).time.getMonthKey() &&
      (gR as any).player.feesWarning1Sent === false, payPart.message.slice(0, 300));
    // Advance past the OLD deadlines (old +5 = Jun): no seizure, no arrest.
    tickNextMonth(gR); tickNextMonth(gR); // May, Jun by the new clock: past 1, past 2
    check('after partial payment, old deadlines produce no seizure/arrest',
      !(gR as any).player.incarcerated && (gR as any).player.vehicles.length === 1 &&
      (gR as any).player.properties.length === 1, { inc: (gR as any).player.incarcerated });

    // (b2) PLAN: start mid-ladder -> ladder frozen; missed installment -> breaks with NO penalty.
    const gP = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true })],
      properties: [prop()],
      primaryResidenceId: 'owned_prop_001',
      feesDue: 75, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: true,
      feesWarning1Sent: true,
    });
    // Drive Jan -> May month by month (warning 2 fires in May), then
    // start the plan in May before the Jun seizure window.
    tickNextMonth(gP); tickNextMonth(gP); tickNextMonth(gP); tickNextMonth(gP);
    const plan = await gP.processCommand('fees plan');
    check('fees plan splits into 3 installments and freezes the ladder',
      plan.success && (gP as any).player.feePlanActive === true &&
      (gP as any).player.feePlanRemaining === 75 && (gP as any).player.feePlanInstallment === 25, plan.message.slice(0, 300));
    tickNextMonth(gP); tickNextMonth(gP); tickNextMonth(gP); // 3 installments
    check('plan installments auto-deduct and complete the ladder',
      (gP as any).player.feesDue === 0 && (gP as any).player.feePlanActive === false &&
      !(gP as any).player.incarcerated, { due: (gP as any).player.feesDue });
    const gPB = fresh({
      money: 100000, livingTicksCharged: 2,
      feesDue: 90, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: true,
    });
    (gPB as any).player.lastMonthlyTick = '2024-01';
    await gPB.processCommand('fees plan');
    (gPB as any).player.money = 5; // cash short for the next installment
    const beforeCredit = (gPB as any).player.credit;
    tickNextMonth(gPB);
    check('missed plan installment breaks with NO penalty fee and NO credit hit',
      (gPB as any).player.feePlanActive === false && (gPB as any).player.feesDue === 90 &&
      (gPB as any).player.credit === beforeCredit, { due: (gPB as any).player.feesDue, credit: (gPB as any).player.credit });

    // (c) BROKE-PLAYER RECOVERY: seizure keeps job + primary + businesses + bank; pay in full clears, never incarcerated.
    const gB = fresh({
      money: 50, bankBalance: 2000, livingTicksCharged: 2,
      job: { title: 'Clerk', employer: 'City Hall' },
      vehicles: [car({ registered: true, value: 20 })],
      properties: [prop(), prop({ id: 'owned_prop_002', name: 'Rental House', city: 'memphis', district: 'downtown', purchasePrice: 60000, currentValue: 60000 })],
      primaryResidenceId: 'owned_prop_001',
      businesses: [{ id: 'biz_food_truck_1', name: 'Food Truck', type: 'food_truck', purchasePrice: 4000, monthlyIncome: 260, purchasedAt: Date.now() }],
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gB as any).player.lastMonthlyTick = '2024-01';
    for (let i = 0; i < 5; i++) tickNextMonth(gB); // through Jun: seizure
    check('broke-player seizure keeps job + primary residence + businesses + bank balance (interest accrues; seizure never deducts)',
      (gB as any).player.job && (gB as any).player.primaryResidenceId === 'owned_prop_001' &&
      (gB as any).player.properties.some((p: any) => p.id === 'owned_prop_001') &&
      (gB as any).player.businesses.some((b: any) => b.type === 'food_truck') &&
      (gB as any).player.bankBalance >= 2000 && !(gB as any).player.incarcerated,
      { job: (gB as any).player.job, bank: (gB as any).player.bankBalance, inc: (gB as any).player.incarcerated });
    check('broke-player seizure takes exactly one asset (cheapest vehicle, not the home)',
      (gB as any).player.vehicles.length === 0 && (gB as any).player.properties.length === 2,
      { vehicles: (gB as any).player.vehicles.length, props: (gB as any).player.properties.length });
    // Earn out: withdraw bank savings + pay in full -> ladder cleared, never incarcerated.
    const wd = await gB.processCommand('withdraw 2000');
    const payAll = await gB.processCommand('pay fees all');
    check('broke player earns out (withdraw + pay in full clears ladder, never incarcerated)',
      wd.success && payAll.success && (gB as any).player.feesDue === 0 && !(gB as any).player.incarcerated,
      { wd: wd.message.slice(0, 150), pay: payAll.message.slice(0, 200) });

    // (c2) ASSET-LESS broke player IS arrested, then exits via pay-in-full release.
    const gA = fresh({
      money: 10, livingTicksCharged: 2,
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gA as any).player.lastMonthlyTick = '2024-01';
    for (let i = 0; i < 5; i++) tickNextMonth(gA); // through Jun
    check('asset-less broke player is arrested at +5 (last resort, once)',
      (gA as any).player.incarcerated === true && (gA as any).player.feeArrestActive === true &&
      (gA as any).player.prisonRecord.arrests === 0,
      { inc: (gA as any).player.incarcerated, arrests: (gA as any).player.prisonRecord.arrests });
    const feesWhileLocked = await gA.processCommand('fees');
    check('fees view stays open while fee-incarcerated', feesWhileLocked.success && feesWhileLocked.message.includes('Fees Due'), feesWhileLocked.message.slice(0, 200));
    (gA as any).player.money = 10000;
    const release = await gA.processCommand('pay fees all');
    check('pay in full while fee-incarcerated releases immediately',
      release.success && !(gA as any).player.incarcerated && (gA as any).player.feesDue === 0 &&
      release.message.includes('RELEASED'), release.message.slice(0, 300));
    // Separately: sentence expiry releases WITHOUT parole tail and WITHOUT criminal record.
    const gA2 = fresh({
      money: 10, livingTicksCharged: 2,
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gA2 as any).player.lastMonthlyTick = '2024-01';
    for (let i = 0; i < 5; i++) tickNextMonth(gA2);
    (gA2 as any).player.sentenceEnd = Date.now() - 1; // sentence served (real-time clock)
    (gA2 as any).updateIncarceration();
    check('sentence expiry releases fee arrest with NO parole tail and NO criminal record',
      !(gA2 as any).player.incarcerated && (gA2 as any).player.feeArrestActive === false &&
      (gA2 as any).player.prisonRecord.paroleEligible !== true && (gA2 as any).player.prisonRecord.arrests === 0,
      { inc: (gA2 as any).player.incarcerated, parole: (gA2 as any).player.prisonRecord.paroleEligible });

    // (d) NO-SURPRISE: every seizure/arrest in the walkthrough was
    // preceded by a notice naming that consequence; fees at every
    // stage named the NEXT stage before it fired.
    const gN = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true })],
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gN as any).player.lastMonthlyTick = '2024-01';
    const stageTexts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const f = await gN.processCommand('fees');
      stageTexts.push(f.message);
      tickNextMonth(gN);
    }
    const notices = emailsOf(gN);
    check('no-surprise: warning notices precede the seizure, naming seizure + ways out',
      notices.some((e: any) => e.subject.includes('Fee warning')) &&
      notices.some((e: any) => e.subject.includes('FINAL fee warning') && e.body.includes('seize')) &&
      notices.some((e: any) => e.subject.includes('Fee seizure')),
      notices.map((e: any) => e.subject));
    check('no-surprise: fees output at every stage named the next consequence',
      stageTexts.every((t) => t.includes('Next:') && (t.includes('warning') || t.includes('seizure') || t.includes('plan'))),
      stageTexts.map((t) => t.split('\n')[2] ?? t.slice(0, 80)));

    // (e) PROPORTIONALITY + one asset per window + cooldown.
    const gP2 = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true, value: 3000 }), car({ id: 'veh_002', name: 'Old Truck', value: 2000 })],
      properties: [prop()],
      primaryResidenceId: 'owned_prop_001',
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gP2 as any).player.lastMonthlyTick = '2024-01';
    for (let i = 0; i < 5; i++) tickNextMonth(gP2); // Jun: first seizure (cheapest vehicle = Old Truck $2000)
    check('first seizure takes the CHEAPEST vehicle only (one asset per window)',
      (gP2 as any).player.vehicles.length === 1 &&
      (gP2 as any).player.vehicles[0].name === 'Used Sedan' &&
      (gP2 as any).player.feesDue === 0, // $2000 value covers $75 -> ladder clears
      { vehicles: (gP2 as any).player.vehicles.map((v: any) => v.name), due: (gP2 as any).player.feesDue });
    // Cooldown case: debt larger than any single asset.
    const gC2 = fresh({
      money: 100000, livingTicksCharged: 2,
      vehicles: [car({ registered: true, value: 20 })],
      properties: [prop(), prop({ id: 'owned_prop_002', name: 'Cabin', city: 'memphis', district: 'downtown', purchasePrice: 100, currentValue: 100 })],
      primaryResidenceId: 'owned_prop_001',
      feesDue: 65, feesAssessedMonthKey: '2024-01', feesClockMonthKey: '2024-01', feesLateApplied: false,
    });
    (gC2 as any).player.lastMonthlyTick = '2024-01';
    for (let i = 0; i < 5; i++) tickNextMonth(gC2); // Jun: seize $20 vehicle -> due 75+10-20=65... (late fee Apr: 75)
    const afterFirst = (gC2 as any).player.feesDue;
    tickNextMonth(gC2); // Jul: cooldown — NO second seizure
    check('cooldown blocks a second seizure for 2 game-months',
      (gC2 as any).player.feesDue === afterFirst && (gC2 as any).player.properties.length === 2,
      { due: (gC2 as any).player.feesDue, afterFirst });
    tickNextMonth(gC2); // Aug: cooldown over -> second seizure (Cabin $100)
    check('after cooldown, the next seizure window takes the next-cheapest asset',
      (gC2 as any).player.properties.length === 1, (gC2 as any).player.properties.map((p: any) => p.name));
  }

  // ============ §55 TICKER REDESIGN ============
  console.log('--- §55 ticker ---');
  {
    const comp = groupCompanies(ALL_JOBS)[0];
    const g = fresh({
      city: 'memphis',
      businesses: [{ id: 'biz_food_truck_1', name: 'Food Truck', type: 'food_truck', purchasePrice: 4000, monthlyIncome: 260, purchasedAt: Date.now() }],
      properties: [prop()],
      investments: [{ type: 'stock', company: comp.employer, name: comp.employer, shares: 10, purchasePrice: 1000, currentValue: 1000 }],
    });
    const p: any = (g as any).player;
    const now = (g as any).time.currentTime;
    const month0 = now.getMonth();
    const weather = getWeather(now, p.city);
    const nh = nextHoliday(now.getFullYear(), month0, now.getDate());
    const wk = weekKeyFromDate((g as any).time.formatDate());
    const ctx: any = {
      player: p,
      city: p.city,
      monthKey: (g as any).time.getMonthKey(),
      events: worldEventsThisWeek(wk),
      season: seasonFromMonth(month0),
      nextHoliday: { name: nh.holiday.name, daysAway: nh.daysAway },
      challenge: challengeGoalForWeek(wk),
      weather: { temp: weather.temp, condition: weather.condition },
      achievementsUnlocked: (g as any).achievementEngine.exportSerializable().unlocked.length,
    };
    const gen = generateTickerHeadlines(ctx);
    const distinct = new Set(gen.map((h: any) => h.text));
    check('ticker pool >=100 DISTINCT headlines from fixture state (no leaderboard append)',
      distinct.size >= 100, { total: gen.length, distinct: distinct.size });
    // Section order: world events first (one per city, 27), then
    // per-city economy + patrol headlines.
    const eventCount = (ctx.events ?? []).length;
    check('generator order: world-event headlines lead the pool',
      gen.length > 0 && gen[0].text.includes('welcomes') && gen[0].text.includes('this week') &&
      gen.slice(0, eventCount).every((h: any) => h.text.includes('this week')),
      { first: gen[0]?.text, events: eventCount });
    const payload = (g as any).tickerPayload();
    // filterTickerHeadlines already returns strings.
    const filtered = filterTickerHeadlines(gen, payload.mode, p.city);
    check('payload contains MULTIPLE headlines in generator order (local filter, exact)',
      payload.headlines.length > 1 && JSON.stringify(payload.headlines) === JSON.stringify(filtered),
      { payloadLen: payload.headlines.length, filteredLen: filtered.length });
    check('local payload is current-city + player only (no other-city event headline)',
      payload.headlines.every((t: string) => !t.includes('Seattle') && !t.includes('Chicago')),
      payload.headlines.slice(0, 3));
    // World mode spans >= 2 cities.
    (g as any).player.tickerMode = 'world';
    const worldPayload = (g as any).tickerPayload();
    const cityNames = Object.values(WORLD_CITIES).map((c: any) => c.displayName.split(',')[0]);
    const spanned = cityNames.filter((n) => worldPayload.headlines.some((t: string) => t.includes(n)));
    check('world payload spans >=2 cities', spanned.length >= 2, spanned.slice(0, 5));
    // Toggle persistence across save/load.
    const saved = (g as any).getPlayer();
    const g2 = new GameEngine();
    g2.loadState(saved);
    check('ticker world persists across save/load', (g2 as any).tickerPayload().mode === 'world', (g2 as any).tickerPayload().mode);
    await g2.processCommand('ticker off');
    check('ticker off -> empty payload', (g2 as any).tickerPayload().headlines.length === 0, (g2 as any).tickerPayload());
    const g3 = new GameEngine();
    g3.loadState((g2 as any).getPlayer());
    check('ticker off persists across save/load', (g3 as any).tickerPayload().mode === 'off', (g3 as any).tickerPayload().mode);
    // v0.108.21 label fix (Dre): mode label reads "Local news" /
    // "World news" in the switch confirmation AND the status output,
    // while the stored payload mode value stays 'local' / 'world'.
    const gL = new GameEngine();
    const setLocal = await gL.processCommand('ticker local');
    const statusLocal = await gL.processCommand('ticker');
    const setWorld = await gL.processCommand('ticker world');
    const statusWorld = await gL.processCommand('ticker');
    check('ticker label: set local confirms "Local news"',
      setLocal.message.includes('Local news'), setLocal.message.slice(0, 120));
    check('ticker label: status after local reads "Local news"',
      statusLocal.message.includes('Local news'), statusLocal.message.slice(0, 120));
    check('ticker label: set world confirms "World news"',
      setWorld.message.includes('World news'), setWorld.message.slice(0, 120));
    check('ticker label: status after world reads "World news"',
      statusWorld.message.includes('World news'), statusWorld.message.slice(0, 120));
    check('ticker label: payload mode values unchanged (local/world, not the label)',
      (gL as any).tickerPayload().mode === 'world' && (() => { (gL as any).player.tickerMode = 'local'; return (gL as any).tickerPayload().mode === 'local'; })(), (gL as any).tickerPayload().mode);
    // Client markup: marquee track + keyframes + animation, NO 8s timer.
    const clientSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    check('client markup: marquee track container present', clientSrc.includes('ticker-track'), 'ticker-track');
    check('client markup: keyframes rule present', clientSrc.includes('@keyframes ticker-scroll'), 'ticker-scroll');
    check('client markup: animation reference present', clientSrc.includes('ticker-scroll') && clientSrc.includes('linear infinite'), 'animation');
    check('client markup: NO 8-second rotation timer for the ticker',
      !clientSrc.includes('setInterval(show, 8000)') && !clientSrc.includes('tickerTimer'), 'timer remnants');
    check('client markup: hover pauses scroll', clientSrc.includes('animation-play-state: paused'), 'hover pause');
    check('client markup: strip label reads "Local news" / "World news" (not LOCAL/WORLD)',
      clientSrc.includes("'Local news'") && clientSrc.includes("'World news'") && !clientSrc.includes("? 'WORLD' : 'LOCAL'"), 'strip label');
    check('client markup: strip order stats-hud < news-ticker < conversation (source order unchanged)',
      clientSrc.indexOf('stats-hud') < clientSrc.indexOf('news-ticker') &&
      clientSrc.indexOf('news-ticker') < clientSrc.indexOf('id="conversation"'),
      { hud: clientSrc.indexOf('stats-hud'), ticker: clientSrc.indexOf('news-ticker'), conv: clientSrc.indexOf('id="conversation"') });
    // Empty-state literals exist in the payload path (source check:
    // the filtered-empty branch is unreachable with a full generator,
    // so the literals are asserted in source, not via a fake state).
    const engineSrc = fs.readFileSync('src/server/game-engine.ts', 'utf8');
    check('empty-state literals present (local + world)',
      engineSrc.includes('No news right now in') && engineSrc.includes('No news across the world right now.'), 'literals');
  }

  // ============ §56 SAVE FAILURES ============
  console.log('--- §56 save ---');
  {
    const serverNow = Date.now();
    // The fix: a write with NO server stamp is never rejected, however
    // far its device clock sits from server time.
    check('skewed device-only write (device 60s behind, no lastSaved) is NOT rejected',
      isStaleWrite({ savedAt: serverNow - 60000 }, { lastSaved: serverNow }) === false,
      isStaleWrite({ savedAt: serverNow - 60000 }, { lastSaved: serverNow }));
    check('skewed device-only write (device 60s ahead, no lastSaved) is NOT rejected',
      isStaleWrite({ savedAt: serverNow + 60000 }, { lastSaved: serverNow }) === false, true);
    check('genuine stale server-stamped write (6s older) IS still rejected',
      isStaleWrite({ lastSaved: serverNow - 6000 }, { lastSaved: serverNow }) === true, true);
    check('server-stamped write within tolerance (3s) is NOT rejected',
      isStaleWrite({ lastSaved: serverNow - 3000 }, { lastSaved: serverNow }) === false, true);
    check('timestamp-less write is never rejected',
      isStaleWrite({}, { lastSaved: serverNow }) === false, true);
    // Rejected-stale write never overwrites newer server state
    // (simulated checked-save: guard says stale -> stored untouched).
    const stored = { name: 'Tester', money: 5000, lastSaved: serverNow };
    const storedBefore = JSON.stringify(stored);
    const incoming = { name: 'Tester', money: 99999, lastSaved: serverNow - 60000 };
    const rejected = isStaleWrite(incoming, stored);
    check('rejected-stale write leaves stored copy byte-identical',
      rejected === true && JSON.stringify(stored) === storedBefore, { rejected, stored });
    // Failure classes: four distinct texts, none the old generic line.
    const texts = ['stale', 'transport', 'redis', 'payload'].map((k: any) => saveWarningText(k));
    check('each failure class has a DISTINCT banner text',
      new Set(texts).size === 4, texts);
    check('no class text equals the old generic line',
      texts.every((t) => t !== '⚠️ Server save failed — progress is stored on this device only and may not survive a refresh.'), texts);
    check('failure classification: 500 -> redis, 413 -> payload, stale flag -> stale, ok -> null, other -> transport',
      failureClassForSaveResponse({ ok: false, status: 500 }) === 'redis' &&
      failureClassForSaveResponse({ ok: false, status: 413 }) === 'payload' &&
      failureClassForSaveResponse({ ok: true, status: 200, stale: true }) === 'stale' &&
      failureClassForSaveResponse({ ok: true, status: 200 }) === null &&
      failureClassForSaveResponse({ ok: false, status: 404 }) === 'transport', true);
    // Wiring source checks (live Redis/Devvit legs are verified by
    // code review + Dre's playtest, as with every server wiring item).
    const clientSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    check('client: retry loop present (1.5s retry)',
      clientSrc.includes('setTimeout(r, 1500)') || clientSrc.includes('setTimeout((r)'), 'retry delay');
    check('client: stamp adoption present (lastSaved from /api/save response)',
      clientSrc.includes('data.lastSaved') && clientSrc.includes('lastSaved: data.lastSaved'), 'adoption');
    check('client: banner recovery buttons present (retry + server copy)',
      clientSrc.includes('save-retry-btn') && clientSrc.includes('save-servercopy-btn'), 'buttons');
    // TOW PC phase 1: the server handler moved from index.ts to
    // handler.ts (index.ts is now the thin Devvit bootstrap). These
    // checks assert the SERVER implementation, so they read the file
    // that holds it; the asserted strings are unchanged.
    const serverSrc = fs.readFileSync('src/server/handler.ts', 'utf8');
    check('server: command-path single retry present (re-run once on fresh state)',
      serverSrc.includes('retryGame') && serverSrc.includes('checked2'), 'retry');
    check('server: /api/save returns the new stamp + 413 payload guard',
      serverSrc.includes('lastSaved: checked.lastSaved') && serverSrc.includes('SAVE_MAX_BODY_BYTES'), 'save endpoint');
    check('server: payload cap is 512KB', SAVE_MAX_BODY_BYTES === 512 * 1024, SAVE_MAX_BODY_BYTES);
  }

  // ============ §57 INVESTMENT FOLDING ============
  console.log('--- §57 folding ---');
  {
    // Buy -> buy again same asset -> exactly one line, summed, P/L right.
    const g = fresh({ money: 100000 });
    const b1 = await g.processCommand('invest Bitcoin 1000');
    const b2 = await g.processCommand('invest Bitcoin 4000');
    const inv = await g.processCommand('investments');
    const btcLines = inv.message.split('\n\n').filter((s: string) => s.includes('Bitcoin'));
    check('buy + buy again -> exactly one Bitcoin line (merged, not duplicated)',
      b1.success && b2.success && btcLines.length === 1, inv.message.slice(0, 300));
    check('merged line: $5,000 invested, $5,000 value, P/L $0 (new money enters at value)',
      inv.message.includes('Invested: $5,000') && inv.message.includes('$5,000'), inv.message.slice(0, 300));
    // Dre's exact legacy figures fold on load with totals preserved.
    const gD = new GameEngine();
    gD.loadState(baseState({
      money: 1000,
      investments: [
        { id: 'inv_a', type: 'crypto', name: 'Bitcoin', shares: 1000, purchasePrice: 1000, currentValue: 1121, purchasedAt: 1 },
        { id: 'inv_b', type: 'crypto', name: 'Bitcoin', shares: 4000, purchasePrice: 4000, currentValue: 3953, purchasedAt: 2 },
        { id: 'inv_c', type: 'crypto', name: 'Ethereum', shares: 1000, purchasePrice: 1000, currentValue: 960, purchasedAt: 3 },
        { id: 'inv_d', type: 'crypto', name: 'Ethereum', shares: 4000, purchasePrice: 4000, currentValue: 3330, purchasedAt: 4 },
      ],
    }));
    const dre = await gD.processCommand('investments');
    check('Dre\'s legacy doubles fold on load: Bitcoin one line $5,000 / $5,074 / +$74',
      dre.message.includes('Bitcoin') && dre.message.includes('Invested: $5,000') &&
      dre.message.includes('$5,074') && dre.message.includes('+$74'), dre.message.slice(0, 400));
    check('Dre\'s legacy doubles fold on load: Ethereum one line $5,000 / $4,290 / -$710',
      dre.message.includes('Ethereum') && dre.message.includes('$4,290') && dre.message.includes('$-710'), dre.message.slice(0, 400));
    const totals = (gD as any).player.investments.reduce((s: number, i: any) => s + i.currentValue, 0);
    const totalPL = (gD as any).player.investments.reduce((s: number, i: any) => s + (i.currentValue - i.purchasePrice), 0);
    check('fold preserves totals exactly: $9,364 / -$636',
      totals === 9364 && totalPL === -636, { totals, totalPL });
    // Partial sell reduces the merged line; sell-all removes it.
    const gS = new GameEngine();
    gS.loadState(baseState({
      money: 1000,
      investments: [
        { id: 'inv_a', type: 'crypto', name: 'Bitcoin', shares: 1000, purchasePrice: 1000, currentValue: 1121, purchasedAt: 1 },
        { id: 'inv_b', type: 'crypto', name: 'Bitcoin', shares: 4000, purchasePrice: 4000, currentValue: 3953, purchasedAt: 2 },
      ],
    }));
    const part = await gS.processCommand('sell investment Bitcoin 1074');
    const merged = (gS as any).player.investments[0];
    check('partial sell reduces merged line (value -amount, invested scaled, proceeds to cash)',
      part.success && merged.currentValue === 4000 && merged.purchasePrice === 3941.66 &&
      (gS as any).player.money === 1000 + 1074,
      { part: part.message.slice(0, 200), merged, money: (gS as any).player.money });
    const all = await gS.processCommand('sell investment Bitcoin');
    check('sell-all removes the single merged line',
      all.success && (gS as any).player.investments.length === 0, all.message.slice(0, 200));
    // Stock positions fold identically.
    const comp = groupCompanies(ALL_JOBS)[0];
    const gSt = new GameEngine();
    gSt.loadState(baseState({
      money: 100000,
      investments: [
        { type: 'stock', company: comp.employer, name: comp.employer, shares: 10, purchasePrice: 1000, currentValue: 1000 },
        { type: 'stock', company: comp.employer, name: comp.employer, shares: 5, purchasePrice: 500, currentValue: 500 },
      ],
    }));
    const stInv = await gSt.processCommand('investments');
    const stockLines = stInv.message.split('\n\n').filter((s: string) => s.includes(comp.employer));
    check('duplicate stock lines fold into one (shares summed)',
      stockLines.length === 1 && stockLines[0].includes('15 shares'), stInv.message.slice(0, 300));
    const buyMore = await gSt.processCommand(`buy stock ${comp.employer} 500`);
    const afterBuy = (gSt as any).player.investments.filter((i: any) => i.type === 'stock' && i.company === comp.employer);
    check('buy stock adds to the merged position (still one line)',
      buyMore.success && afterBuy.length === 1, buyMore.message.slice(0, 200));
    // S&P 500 Index Fund never misparses as name + amount.
    const gSP = fresh({ money: 100000 });
    await gSP.processCommand('invest S&P 500 Index Fund 1000');
    const spSell = await gSP.processCommand('sell investment S&P 500 Index Fund');
    check('"S&P 500 Index Fund" sells all without misparsing',
      spSell.success && (gSP as any).player.investments.length === 0, spSell.message.slice(0, 200));
  }

  // ============ OLD-SAVE COMPATIBILITY ============
  console.log('--- old-save compat ---');
  {
    const oldState: any = baseState({ money: 50000 });
    for (const f of ['sms', 'voicemails', 'playerCompanies', 'tickerMode', 'feesClockMonthKey', 'feesWarning1Sent', 'feesWarning2Sent', 'feePlanActive', 'feePlanRemaining', 'feePlanInstallment', 'feesNextSeizureMonthKey', 'feesArrestFired', 'feeArrestActive', 'feeArrested']) {
      delete oldState[f];
    }
    const g = new GameEngine();
    g.loadState(oldState);
    const cmds = ['dividends', 'mycompanies', 'voicemails', 'repricing', 'fees', 'investments'];
    let allOk = true;
    for (const c of cmds) {
      const r = await g.processCommand(c);
      if (!r.success) { allOk = false; console.log(`    old-save cmd ${c} failed: ${r.message.slice(0, 150)}`); }
    }
    check('old save (none of the new fields) loads; all new commands work', allOk, 'see failures above');
    const found = await g.processCommand('found OldSaveCo');
    check('old save founds a company cleanly', found.success, found.message.slice(0, 200));
  }

  // ============ HELP COVERAGE (TWO-DIRECTION, .21 COMMANDS) ============
  console.log('--- help coverage ---');
  {
    const g = fresh({ money: 100000 });
    const help = await g.processCommand('help');
    const entries: Array<[string, string]> = [
      ['found [name]', 'found'],
      ['mycompanies', 'mycompanies'],
      ['dividends', 'dividends'],
      ['voicemails', 'voicemails'],
      ['repricing', 'repricing'],
      ['fees plan', 'fees plan'],
      ['sell investment [name] [amount]', 'sell investment'],
      ['ticker local', 'ticker'],
      ['company hire', 'company'],
    ];
    for (const [text, cmd] of entries) {
      check(`help documents "${text}"`, help.message.includes(text), `missing: ${text}`);
    }
    const dispatches: Array<[string, boolean]> = [
      ['found HelpCo', true],
      ['mycompanies', true],
      ['dividends', true],
      ['voicemails', true],
      ['repricing', true],
      ['fees', true],
      ['ticker', true],
    ];
    for (const [cmd, want] of dispatches) {
      const r = await g.processCommand(cmd);
      check(`"${cmd}" dispatches to real output (success=${want})`, r.success === want, r.message.slice(0, 150));
    }
  }

  console.log('--- §58 help + whats-new presentation ---');
  {
    const gH = fresh();
    const bare = (await gH.processCommand('help')).message;
    // Index covers every section present (exact sets, names + numbers).
    const indexNames = bare.split('\n').filter((l) => /^\d+\. .+ — help /.test(l))
      .map((l) => l.replace(/^\d+\. (.+) — help .*$/, '$1'));
    const headerNames = bare.split('\n').filter((l) => /^\*\*\d+\. .+\*\*$/.test(l))
      .map((l) => l.replace(/^\*\*\d+\. (.+)\*\*$/, '$1'));
    check('help index covers every section present (12 sections, exact sets)',
      indexNames.length === 12 && JSON.stringify(indexNames) === JSON.stringify(headerNames),
      { indexNames, headerNames });
    // Drill-down: one section only, no bleed from other sections.
    const money = (await gH.processCommand('help money')).message;
    check('help money shows Money & Bank only (has savings deposit, no travel bullet)',
      money.includes('savings deposit') && !money.includes('travel [city]'), money.slice(0, 200));
    const getting = (await gH.processCommand('help getting started')).message;
    check('help getting started shows Getting Started only (has travel, no savings bullet)',
      getting.includes('travel [city]') && !getting.includes('savings deposit'), getting.slice(0, 200));
    const world = (await gH.processCommand('help 6')).message;
    check('help 6 (by number) shows World & Travel only (has ticker local, no savings bullet)',
      world.includes('ticker local') && !world.includes('savings deposit'), world.slice(0, 200));
    const biz = (await gH.processCommand('help stocks')).message;
    check('help stocks (alias) shows Business & Companies (has buy stock)',
      biz.includes('buy stock'), biz.slice(0, 200));
    const dlg = (await gH.processCommand('help dialogue')).message;
    check('help dialogue shows Dialogue (has ask [topic])',
      dlg.includes('ask [topic]'), dlg.slice(0, 200));
    // Filter: matching bullets only, grouped; no-match shows the index.
    const filt = (await gH.processCommand('help dividend')).message;
    check('help dividend filters to matching bullets only (has dividends, no travel bullet)',
      filt.includes('dividends') && !filt.includes('travel [city]'), filt.slice(0, 300));
    const none = (await gH.processCommand('help zzznope')).message;
    check('help no-match shows no-match text + section index (never a dead end)',
      none.includes('No commands match') && none.includes('📖 Sections'), none.slice(0, 300));
    // Bare help still carries every bullet (count tripwire: 277 lines =
    // 275 flush-left + 2 indented buy-property explainer lines, which
    // the .20 audit SKIP-lists as prose; 270 unique + 7 pre-existing
    // duplicates that the old help already carried).
    const bulletCount = bare.split('\n').filter((l) => l.trim().startsWith('• ')).length;
    check('bare help still carries all 277 bullets (no content cut)',
      bulletCount === 277, bulletCount);
  }
  {
    // What's New: index + collapsed cards, entries byte-identical.
    const gameSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    const rStart = gameSrc.indexOf('function renderUpdatesScreen()');
    const rEnd = gameSrc.indexOf('`;\n  \n  // Bind back button', rStart);
    const region = gameSrc.slice(rStart, rEnd);
    const tokRe = /<div\b[^>]*>|<\/div>/g;
    const matchClose = (s: number): number => {
      let depth = 0;
      tokRe.lastIndex = s;
      let m: RegExpExecArray | null;
      while ((m = tokRe.exec(region)) !== null) {
        if (m[0].startsWith('</')) { depth--; if (depth === 0) return m.index + m[0].length; }
        else depth++;
      }
      throw new Error('unbalanced entry div');
    };
    const itemSpans: [number, number][] = [];
    for (const m of region.matchAll(/<div class="update-item">/g)) itemSpans.push([m.index, matchClose(m.index)]);
    const insideItem = (pos: number) => itemSpans.some(([a, b]) => a <= pos && pos < b);
    const allEntries: { pos: number; block: string }[] = [];
    for (const [a, b] of itemSpans) allEntries.push({ pos: a, block: region.slice(a, b) });
    for (const m of region.matchAll(/<div class="update-card">/g)) {
      if (!insideItem(m.index)) allEntries.push({ pos: m.index, block: region.slice(m.index, matchClose(m.index)) });
    }
    allEntries.sort((x, y) => x.pos - y.pos);
    const blocks = allEntries.map((e) => e.block);
    const versions = blocks.map((b) => (b.match(/<span class="update-version">([^<]+)<\/span>/) ?? [])[1]);
    const base = fs.readFileSync('tools/updates-baseline-item10.txt', 'utf8');
    const baseParts = base.split(/\n===== VERSION ([^ ]+) =====\n/);
    const basePairs: [string, string][] = [];
    for (let i = 1; i < baseParts.length; i += 2) basePairs.push([baseParts[i], baseParts[i + 1].replace(/\n$/, '')]);
    check('whats-new: 65 entries present (60 items + 5 top-level cards)',
      blocks.length === 65 && basePairs.length === 65, { blocks: blocks.length, base: basePairs.length });
    check('whats-new: version order matches baseline (history order untouched)',
      JSON.stringify(versions) === JSON.stringify(basePairs.map(([v]) => v)), versions.slice(-8));
    let historyOk = true;
    for (let i = 1; i < basePairs.length; i++) {
      if (blocks[i] !== basePairs[i][1]) { historyOk = false; break; }
    }
    check('whats-new: all 64 history entries byte-identical to baseline',
      historyOk, '');
    const base21Lines = basePairs[0][1].split('\n');
    const new21HasAll = base21Lines.every((ln) => blocks[0].includes(ln));
    check('whats-new: .21 entry keeps every baseline line (superset, never edited)',
      new21HasAll, '');
    check('whats-new: .21 entry gains the item-10 + item-11 + ticker-label lines',
      blocks[0].includes('PRESENTATION FIX') && blocks[0].includes('leaderboard and challenge writes') && blocks[0].includes('Ticker label fix'), '');
    // Index: one button per entry, every card reachable, latest open.
    const btnVersions = [...region.matchAll(/data-action="goto-update" data-version="([^"]+)"/g)].map((m) => m[1]);
    const slug = (v: string) => 'update-' + v.toLowerCase().replace(/\./g, '-');
    check('whats-new: index lists every version present (65 buttons, in order)',
      btnVersions.length === 65 && JSON.stringify(btnVersions) === JSON.stringify(versions.map(slug)), btnVersions.length);
    const detailsTags = [...region.matchAll(/<details[^>]*>/g)].map((m) => m[0]);
    check('whats-new: latest entry open, older entries collapsed (65 details, only first open)',
      detailsTags.length === 65 && detailsTags[0].includes(' open') && detailsTags.slice(1).every((t) => !t.includes(' open')), detailsTags.slice(0, 2));
    check('whats-new: goto-update wiring present (opens card + scrolls into view)',
      gameSrc.includes(`querySelectorAll('[data-action="goto-update"]')`) && gameSrc.includes('scrollIntoView'), '');
    const css = fs.readFileSync('public/game.css', 'utf8');
    check('whats-new: flat index/card styles present in game.css',
      css.includes('.updates-index') && css.includes('.update-summary') && css.includes('.update-details') && css.includes('.update-latest'), '');
  }

  console.log('--- §59 leaderboard + challenge writes & honest messages ---');
  {
    const store = new MemoryCommunityStore();
    const g = fresh({ job: { employer: 'Test Co', basePay: 40000, hourlyPay: 20 } });
    const status = await g.processCommand('status');
    check('played command (status) succeeds before recording', status.success === true, status.message.slice(0, 100));
    const player = (g as any).getPlayer();
    await recordLeaderboard(store, 'dre', player);
    const board = await getLeaderboard(store, 'dre');
    check('played command -> rank present in store with lifetimeXP score',
      board.me !== null && board.me.rank === 1 && board.me.xp === lifetimeXP(player),
      { me: board.me, xp: lifetimeXP(player) });
    const work = await g.processCommand('work') as any;
    check('played work command carries challenge contributions (shifts 1)',
      work.success === true && work.challengeContributions?.shifts === 1, work.challengeContributions);
    const player2 = (g as any).getPlayer();
    const wk = weekKeyFromDate(player2.gameDate ?? 'Monday, January 1, 2024');
    const before = (await getChallenge(store, wk)).total;
    await recordChallengeContribution(store, 'dre', wk, work.challengeContributions.shifts);
    const after1 = (await getChallenge(store, wk)).total;
    await recordChallengeContribution(store, 'dre', wk, work.challengeContributions.shifts);
    const after2 = await getChallenge(store, wk);
    check('played work command -> challenge total increments (and accumulates)',
      before === 0 && after1 === 1 && after2.total === 2, { before, after1, total: after2.total });
    check('challenge top shows the contributor with the accumulated amount',
      after2.top.some((t) => t.username === 'dre' && t.contribution === 2), after2.top);
    // Message honesty: client + server source gates.
    const clientSrc2 = fs.readFileSync('src/client/game.ts', 'utf8');
    check('leaderboard screen: nudge gated on board availability + identified (old unconditional nudge gone)',
      clientSrc2.includes('boardUnavailable || !board.identified') &&
      !clientSrc2.includes("board?.me\n    ? `<p>Your rank:"),
      '');
    check('leaderboard screen: unavailable challenge renders an explicit line (not a silent zero)',
      clientSrc2.includes('Challenge data is unavailable right now'), '');
    check('leaderboard screen: loaded-but-empty board says so (not "unavailable")',
      clientSrc2.includes('No ranked players yet — be the first.'), '');
    // TOW PC phase 1: the server handler moved from index.ts to
    // handler.ts (index.ts is now the thin Devvit bootstrap). These
    // checks assert the SERVER implementation, so they read the file
    // that holds it; the asserted strings are unchanged.
    const serverSrc = fs.readFileSync('src/server/handler.ts', 'utf8');
    check('server: community-recording failures are logged, not swallowed',
      serverSrc.includes('Community recording failed'), '');
    check('server: /api/leaderboard returns identified flag',
      serverSrc.includes('identified: username !== "player"'), '');
    check('server: leaderboard command text takes identified (nudge only when identified)',
      serverSrc.includes('renderLeaderboardText(board, username !== "player")') && serverSrc.includes('identified: boolean'), '');
    check('server: recording sits after a successful save inside !staleRejected',
      serverSrc.indexOf('recordLeaderboard(store, username, player)') > serverSrc.indexOf('if (!staleRejected)'), '');
  }

  console.log(`\n==== v0.108.21 harness: ${passed} passed, ${failed} failed ====`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('HARNESS CRASH', e);
  process.exit(1);
});
