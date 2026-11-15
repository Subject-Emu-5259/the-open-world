// v0.108.23 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves the three expansions (travel, properties,
// home) plus the Help body presentation with REAL behavior — trips
// counted, journey previews priced, leases/open houses honored in the
// tick, home routines applied, sleep recorded, help entries structured
// — never parser-existence-only.
// Run:
//   npx esbuild tools/harness-0.108.23.ts --bundle --platform=node --format=esm --outfile=/tmp/h10823.mjs && node /tmp/h10823.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { recordTrip, mostVisitedCity, leaseRent, leaseActive, openHouseActive, tenantNameFor } from '../src/server/features-0.108.23.js';import { isOccupied } from '../src/server/property-engine.js';
import { formatHelpMessage } from '../src/shared/help-format.js';
import { comfortTier } from '../src/server/features-0.108.19.js';
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
function prop(over: Record<string, unknown> = {}): any {
  return { id: 'prop_t1', name: 'Test Bungalow', type: 'house', city: 'memphis', district: 'downtown', purchasePrice: 85000, currentValue: 85000, condition: 90, rentalIncome: 1000, maintenanceCost: 0, mortgageRemaining: 0, mortgagePayment: 0, purchasedAt: 0, furniture: [], ...over };
}

async function main(): Promise<void> {
  console.log('=== §60 travel: trips journal ===');
  {
    const g = fresh();
    let r = await g.processCommand('travel memphis');
    check('travel succeeds', r.success === true, r.message.slice(0, 80));
    r = await g.processCommand('travel southaven');
    check('second travel succeeds', r.success === true, r.message.slice(0, 80));
    const t = await g.processCommand('trips');
    const st = (g as any).player.travelStats;
    check('trips counted 2', st.trips === 2, st);
    check('fares summed > 0', st.faresPaid > 0, st.faresPaid);
    check('visits per city 1 each', st.visitsByCity['memphis'] === 1 && st.visitsByCity['southaven'] === 1, st.visitsByCity);
    check('trips text lists both cities', t.message.includes('Memphis') && t.message.includes('Southaven'), t.message.slice(0, 200));
    check('most-visited helper', mostVisitedCity(st) === 'memphis' || mostVisitedCity(st) === 'southaven', mostVisitedCity(st));
  }
  console.log('=== §60 travel: roadtrip counts ===');
  {
    const g = fresh({ vehicles: [{ type: 'car', name: 'Test Car', condition: 100 }] });
    const before = (g as any).player.money;
    const r = await g.processCommand('roadtrip memphis');
    check('roadtrip succeeds', r.success === true, r.message.slice(0, 80));
    const st = (g as any).player.travelStats;
    check('roadtrip counted as trip + fuel fare', st.trips === 1 && st.faresPaid === 15, st);
    check('roadtrip charged fuel', (g as any).player.money === before - 15, (g as any).player.money);
  }
  console.log('=== §60 travel: journey preview is read-only ===');
  {
    const g = fresh();
    const beforeMoney = (g as any).player.money;
    const r = await g.processCommand('journey memphis');
    check('journey succeeds', r.success === true, r.message.slice(0, 120));
    check('journey names fare + method + districts', r.message.includes('$') && r.message.includes('Districts:'), r.message.slice(0, 300));
    check('journey never moves or charges', (g as any).player.city === 'west_memphis' && (g as any).player.money === beforeMoney, [(g as any).player.city, (g as any).player.money]);
    const bad = await g.processCommand('journey nowhereville');
    check('journey unknown city refuses', bad.success === false && !bad.message.includes('Unknown command'), bad.message.slice(0, 80));
  }
  console.log('=== §60 travel: souvenirs ===');
  {
    const g = fresh({ city: 'memphis', happiness: 80 });
    let r = await g.processCommand('souvenir memphis');
    check('souvenir buy succeeds', r.success === true, r.message.slice(0, 80));
    check('souvenir charged $25 +2 happy', (g as any).player.money === 100000 - 25 && (g as any).player.happiness === 82, [(g as any).player.money, (g as any).player.happiness]);
    r = await g.processCommand('souvenir memphis');
    check('repeat souvenir refused', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('souvenir chicago');
    check('non-current-city souvenir refused', r.success === false, r.message.slice(0, 80));
    const list = await g.processCommand('souvenirs');
    check('souvenirs lists Memphis 1 of 27', list.message.includes('Memphis') && list.message.includes('1 of 27'), list.message.slice(0, 200));
  }
  console.log('=== §61 properties: lease + open house in the tick ===');
  {
    const g = fresh();
    const p = prop({ leaseUntil: '2024-04', openHouseMonth: undefined });
    const q = prop({ id: 'prop_t2', name: 'Test Loft', leaseUntil: undefined, openHouseMonth: '2024-02' });
    (g as any).player.properties = [p, q];
    (g as any).player.money = 100000;
    const s = (g as any).property.runMonthlyTick((g as any).player, '2024-02');
    check('leased property pays 90% rent', s.rentCollected === leaseRent(1000) + 1000, s);
    check('leaseRent exact', leaseRent(1000) === 900, leaseRent(1000));
    check('lease active in-window, inactive after', leaseActive('2024-04', '2024-04') === true && leaseActive('2024-04', '2024-05') === false, '');
    check('openHouse active only its month', openHouseActive('2024-02', '2024-02') === true && openHouseActive('2024-02', '2024-03') === false, '');
    // After expiry both fall back to the deterministic roll.
    const s2 = (g as any).property.runMonthlyTick((g as any).player, '2024-05');
    const exp = (isOccupied(p, '2024-05') ? 1000 : 0) + (isOccupied(q, '2024-05') ? 1000 : 0);
    check('post-expiry rent follows the roll', s2.rentCollected === exp, { got: s2.rentCollected, exp });
  }
  console.log('=== §61 properties: lease/open-house/break commands ===');
  {
    const g = fresh({ city: 'memphis', properties: [prop()] });
    let r = await g.processCommand('lease Test Bungalow');
    check('lease signs through +3 months', r.success === true && (g as any).player.properties[0].leaseUntil === '2024-04', [(g as any).player.properties[0].leaseUntil, r.message.slice(0, 120)]);
    r = await g.processCommand('lease Test Bungalow');
    check('double lease refused', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('tenants');
    check('tenants shows leased + 90% rent', r.message.includes('leased') && r.message.includes('$900'), r.message.slice(0, 300));
    const tenantA = tenantNameFor('Test Bungalow', 'USA', '2024-01');
    const tenantB = tenantNameFor('Test Bungalow', 'USA', '2024-01');
    check('tenant name stable within a month', tenantA === tenantB && tenantA.length > 0, tenantA);
    r = await g.processCommand('break lease Test Bungalow');
    check('break lease charges $100 + clears', r.success === true && (g as any).player.properties[0].leaseUntil === undefined && (g as any).player.money === 100000 - 100, [(g as any).player.properties[0].leaseUntil, (g as any).player.money]);
    r = await g.processCommand('break lease Test Bungalow');
    check('break unleased refused', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('open house Test Bungalow');
    check('open house sets next month + charges $50', r.success === true && (g as any).player.properties[0].openHouseMonth === '2024-02' && (g as any).player.money === 100000 - 100 - 50, [(g as any).player.properties[0].openHouseMonth, (g as any).player.money]);
    r = await g.processCommand('open house Test Bungalow');
    check('double open house refused', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('open house No Such Place');
    check('open house unknown property refused', r.success === false, r.message.slice(0, 80));
  }
  console.log('=== §62 home: screen, routines, household, sleep record ===');
  {
    const g = fresh({
      city: 'memphis',
      energy: 80, happiness: 80,
      properties: [prop({ furniture: ['chair', 'bed', 'desk'] })],
      primaryResidenceId: 'prop_t1',
      relationships: { npc_1: { spouse: true, npcName: 'Test Spouse' } },
      children: ['Kiddo'],
    });
    let r = await g.processCommand('myhome');
    check('myhome shows comfort tier 2 + household', r.success === true && r.message.includes('comfort tier 2') && r.message.includes('Test Spouse') && r.message.includes('Kiddo'), r.message.slice(0, 300));
    r = await g.processCommand('household');
    check('household lists spouse + child, size 3', r.message.includes('Test Spouse') && r.message.includes('Kiddo') && r.message.includes('3 total'), r.message.slice(0, 300));
    r = await g.processCommand('morning');
    check('morning applies exact effects', r.success === true && (g as any).player.energy === 85 && (g as any).player.happiness === 82, [(g as any).player.energy, (g as any).player.happiness]);
    r = await g.processCommand('morning');
    check('morning repeat same day refused', r.success === false, r.message.slice(0, 80));
    r = await g.processCommand('evening');
    check('evening applies exact effects', r.success === true && (g as any).player.happiness === 86 && (g as any).player.energy === 80, [(g as any).player.happiness, (g as any).player.energy]);
    r = await g.processCommand('evening');
    check('evening repeat same day refused', r.success === false, r.message.slice(0, 80));
    const g2 = fresh({ city: 'chicago', properties: [prop()] });
    r = await g2.processCommand('morning');
    check('morning without property in city refused', r.success === false, r.message.slice(0, 100));
    const g3 = fresh({ energy: 50, happiness: 80, health: 90, city: 'memphis', properties: [prop({ furniture: ['chair', 'bed', 'desk'] })] });
    r = await g3.processCommand('sleep');
    const ls = (g3 as any).player.lastSleep;
    check('sleep records deltas + comfort tier 2', r.success === true && ls && ls.energy === 50 && ls.health === 5 && ls.comfort === comfortTier(3) && ls.comfort === 2, ls);
    check('comfortTier mapping', comfortTier(3) === 2, comfortTier(3));
  }
  console.log('=== §63 help body presentation ===');
  {
    const g = fresh();
    const helpText = (await g.processCommand('help')).message;
    const sourceBullets = helpText.split('\n').filter((l) => l.startsWith('• '));
    const sourceBulletsTrimmed = helpText.split('\n').filter((l) => l.trim().startsWith('• '));
    const formatted = formatHelpMessage(helpText);
    const entries = formatted.match(/class="help-entry"/g) ?? [];
    const titles = formatted.match(/class="help-section-title"/g) ?? [];
    check('one entry per source bullet, none lost', entries.length === sourceBullets.length, { entries: entries.length, bullets: sourceBullets.length });
    check('bullet count: .22 base 277 (trim method: 275 flush-left + 2 indented explainers) + 12 new .23 bullets = 289', sourceBulletsTrimmed.length === 289, sourceBulletsTrimmed.length);
    check('12 section titles rendered', titles.length === 12, titles.length);
    check('trips bullet renders as entry with cmd token', formatted.includes('<span class="help-cmd">trips</span>'), '');
    check('lease bullet renders with cmd token', formatted.includes('<span class="help-cmd">lease [property]</span>'), '');
    check('formatter escapes HTML (no live tags from input)', !formatHelpMessage('• test <script>alert(1)</script> — x').includes('<script>'), '');
    check('section index lines render as index lines', formatted.includes('help-index-line'), '');
    // Old-save compatibility: no .23 fields at all.
    const gOld = fresh();
    delete (gOld as any).player.travelStats;
    delete (gOld as any).player.souvenirs;
    delete (gOld as any).player.lastSleep;
    const ro = await gOld.processCommand('trips');
    check('old save (no .23 fields) runs trips cleanly', ro.success === true && ro.message.includes('No trips yet'), ro.message.slice(0, 100));
    const ho = await gOld.processCommand('myhome');
    check('old save runs myhome cleanly (no-property pointer)', ho.success === true, ho.message.slice(0, 100));
  }
  console.log('=== SUPERSESSIONS: .23 on top of the .22 updates screen ===');
  {
    // Mirrors the .22 harness's supersession section, shifted by one:
    // .23 is the new latest; .22 sits second intact; .21 third with its
    // item-10/11 + ticker-label lines; the 64 older entries are
    // byte-identical to the item-10 baseline. These replace the .21
    // and .22 harnesses' version-pinned checks, which fail only
    // because .23 is now the latest entry — not because content moved.
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
    check('SUPERSESSION whats-new: 67 entries (.23 on top of the 66)', blocks.length === 67, blocks.length);
    check('SUPERSESSION whats-new: order is .23, .22, then the untouched baseline order',
      versions[0] === 'v0.108.23' && versions[1] === 'v0.108.22' && JSON.stringify(versions.slice(2)) === JSON.stringify(basePairs.map(([v]) => v)), versions.slice(0, 4));
    check('SUPERSESSION whats-new: .22 entry second, carries its banner + leaderboard lines',
      blocks[1].includes('not applied') && blocks[1].includes('leaderboard and challenges actually record'), '');
    const base21Lines = basePairs[0][1].split('\n');
    check('SUPERSESSION whats-new: .21 entry third, keeps every baseline line + item-10/11 + ticker-label lines',
      base21Lines.every((ln) => blocks[2].includes(ln)) && blocks[2].includes('PRESENTATION FIX') && blocks[2].includes('leaderboard and challenge writes') && blocks[2].includes('Ticker label fix'), '');
    let historyOk = true;
    for (let i = 1; i < basePairs.length; i++) {
      if (blocks[i + 2] !== basePairs[i][1]) { historyOk = false; break; }
    }
    check('SUPERSESSION whats-new: all 64 older history entries byte-identical', historyOk, '');
    const btnVersions = [...region.matchAll(/data-action="goto-update" data-version="([^"]+)"/g)].map((m) => m[1]);
    const slug = (v: string) => 'update-' + v.toLowerCase().replace(/\./g, '-');
    check('SUPERSESSION whats-new: index lists all 67 versions, in order',
      btnVersions.length === 67 && JSON.stringify(btnVersions) === JSON.stringify(versions.map(slug)), btnVersions.length);
    const detailsTags = [...region.matchAll(/<details[^>]*>/g)].map((m) => m[0]);
    check('SUPERSESSION whats-new: latest (.23) open, all older collapsed',
      detailsTags.length === 67 && detailsTags[0].includes(' open') && detailsTags.slice(1).every((t) => !t.includes(' open')) && detailsTags[0].includes('update-v0-108-23'), detailsTags.slice(0, 2));
  }
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
