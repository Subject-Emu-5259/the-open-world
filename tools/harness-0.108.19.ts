// v0.108.19 LIFE AND WORLD EXPANSION verification harness — run via
// esbuild bundle, NOT part of the shipped game. Proves every new
// command/mechanic with REAL output (no parser-existence-only checks):
// milestones tiers + Partner, celebrate gates + gains, furnish catalog
// + buy + comfort sleep bonus, cook meals + level gates, world events
// determinism + attend rules, roadtrip vehicle/fuel/condition rules,
// passport stamps + one-time milestone payouts, help coverage, and
// old-save compatibility (a save with none of the new fields runs
// every new command without throwing).
// Run:
//   npx esbuild tools/harness-0.108.19.ts --bundle --platform=node --format=esm --outfile=/tmp/h10819.mjs && node /tmp/h10819.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { WORLD_CITIES } from '../src/shared/world-data.js';

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
  return { name: 'Tester', city: 'memphis', district: 'downtown', ...over };
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

function firstNpc(g: GameEngine): any {
  return (g as any).social.getAllNPCs()[0];
}

async function main(): Promise<void> {
  console.log('--- L1 bonds & milestones ---');
  {
    const g = fresh();
    const npc = firstNpc(g);
    (g as any).player.relationships = {
      [npc.id]: { value: 95, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] },
    };
    const r = await g.processCommand('milestones');
    check('milestones shows Partner at 95', r.message.includes('Partner') && r.message.includes('(95)'), r.message);
    const g0 = fresh();
    const npc0 = firstNpc(g0);
    (g0 as any).player.relationships = {
      [npc0.id]: { value: 30, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] },
    };
    const r0 = await g0.processCommand('milestones');
    check('milestones names next tier (30 -> Friend, 20 away)', r0.message.includes('Friend') && r0.message.includes('20 away'), r0.message);
  }
  {
    const g = fresh({ money: 1000, energy: 50, happiness: 80 });
    const npc = firstNpc(g);
    (g as any).player.relationships = {
      [npc.id]: { value: 30, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] },
    };
    const r = await g.processCommand(`celebrate ${npc.name}`);
    const rel = (g as any).player.relationships[npc.id];
    check('celebrate +8 rel, -$50, -10 energy, +5 happy', rel.value === 38 && (g as any).player.money === 950 && (g as any).player.energy === 40 && (g as any).player.happiness === 85, r.message);
    const g2 = fresh({ money: 1000, energy: 50 });
    const npc2 = firstNpc(g2);
    (g2 as any).player.relationships = {
      [npc2.id]: { value: 20, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] },
    };
    const r2 = await g2.processCommand(`celebrate ${npc2.name}`);
    check('celebrate refuses below 25', !r2.success && r2.message.includes('well enough'), r2.message);
    const g3 = fresh({ money: 1000, energy: 50 });
    const npc3 = firstNpc(g3);
    (g3 as any).player.relationships = {
      [npc3.id]: { value: 88, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] },
    };
    const r3 = await g3.processCommand(`celebrate ${npc3.name}`);
    check('celebrate crossing 90 sets Partner flag', (g3 as any).player.relationships[npc3.id].flags.includes('partner') && r3.message.includes('Partner'), r3.message);
  }

  console.log('--- L2 home life ---');
  {
    const g = fresh({ money: 10000, properties: [prop()] });
    const r0 = await g.processCommand('furnish');
    check('furnish lists catalog + homes', r0.message.includes('Reading Chair') && r0.message.includes('South Memphis Bungalow'), r0.message);
    const r = await g.processCommand('furnish South Memphis Bungalow bed');
    const p = (g as any).player.properties[0];
    check('furnish bed buys + stores furniture', r.success && p.furniture.includes('bed') && (g as any).player.money === 9700, r.message);
    const r2 = await g.processCommand('furnish South Memphis Bungalow bed');
    check('furnish duplicate refused', !r2.success && r2.message.includes('already has'), r2.message);
    const r3 = await g.processCommand('properties');
    check('properties shows furniture + comfort tier', r3.message.includes('bed') && r3.message.includes('Comfort tier 1'), r3.message);
  }
  {
    const g = fresh({ money: 5000, energy: 50, happiness: 80, stress: 30, properties: [prop({ furniture: ['bed', 'chair', 'desk'] })] });
    const r = await g.processCommand('sleep');
    check('sleep at comfort-2 home: +7 happy, stress 30->5', (g as any).player.happiness === 87 && (g as any).player.stress === 5 && r.message.includes('Home comfort'), r.message);
    const g2 = fresh({ money: 5000, energy: 50, happiness: 80, stress: 30, properties: [prop({ furniture: [] })] });
    const r2 = await g2.processCommand('sleep');
    check('sleep at unfurnished home: no comfort note, stress 30->10', (g2 as any).player.stress === 10 && !r2.message.includes('Home comfort'), r2.message);
  }

  console.log('--- L3 home cooking ---');
  {
    const g = fresh({ money: 100, energy: 50, happiness: 80 });
    const r0 = await g.processCommand('cook');
    check('cook lists meals', r0.message.includes('Home Soup') && r0.message.includes('City Feast'), r0.message);
    const r = await g.processCommand('cook soup');
    check('cook soup: -$10, energy 50->60, cooking xp 10', (g as any).player.money === 90 && (g as any).player.energy === 60 && (g as any).player.skills?.cooking?.xp === 10, r.message);
    const r2 = await g.processCommand('cook feast');
    check('cook feast refused at cooking level 1', !r2.success && r2.message.includes('level 4'), r2.message);
    const g2 = fresh({ money: 100, energy: 50, skills: { cooking: { level: 4, xp: 0 } } });
    const r3 = await g2.processCommand('cook feast');
    check('cook feast works at cooking level 4', r3.success && (g2 as any).player.money === 60, r3.message);
  }

  console.log('--- W1 world events ---');
  {
    const g = fresh({ happiness: 80 });
    const a = await g.processCommand('events');
    const g2 = fresh();
    const b = await g2.processCommand('events');
    check('events deterministic across engines', a.message === b.message && a.message.includes('World Events'), a.message.slice(0, 200));
    check('events lists real city display names, no raw ids', a.message.includes('Memphis, TN') && !a.message.includes('west_memphis') && !a.message.includes('southaven'), a.message.slice(0, 300));
    const r = await g.processCommand('attend');
    // v0.108.20 §17: Jan 1 is a holiday week, so attend pays base +5 AND the
    // holiday +5 = +10 total (80 -> 90), not the pre-.20 85.
    check('attend current-city event pays + happiness (holiday week: +10)', r.success && r.message.includes('attended') && (g as any).player.happiness === 90, r.message);
    const r2 = await g.processCommand('attend');
    check('attend twice refused (one per event)', !r2.success && r2.message.includes('already attended'), r2.message);
  }

  console.log('--- W2 road trips ---');
  {
    const g = fresh({ money: 1000, vehicles: [car()] });
    const r = await g.processCommand('roadtrip southaven');
    check('roadtrip moves city, -$15 fuel, -2 condition, driving xp', (g as any).player.city === 'southaven' && (g as any).player.money === 985 && (g as any).player.vehicles[0].condition === 78 && (g as any).player.skills?.driving?.xp === 20, r.message);
    const g2 = fresh({ money: 1000, vehicles: [] });
    const r2 = await g2.processCommand('roadtrip southaven');
    check('roadtrip without car names travel fallback', !r2.success && r2.message.includes('travel'), r2.message);
    const g3 = fresh({ money: 1000, vehicles: [car({ condition: 20 })] });
    const r3 = await g3.processCommand('roadtrip southaven');
    check('roadtrip refuses low-condition car', !r3.success && r3.message.includes('no shape'), r3.message);
    const g4 = fresh({ money: 10, vehicles: [car()] });
    const r4 = await g4.processCommand('roadtrip southaven');
    check('broke roadtrip stays put', !r4.success && (g4 as any).player.city === 'memphis', r4.message);
    const g5 = fresh({ money: 1000, vehicles: [car()] });
    const r5 = await g5.processCommand('roadtrip memphis');
    check('same-city roadtrip refused', !r5.success && (g5 as any).player.city === 'memphis', r5.message);
  }

  console.log('--- W3 passport ---');
  {
    const g = fresh({ money: 500, visitedCities: ['west_memphis', 'memphis', 'southaven', 'littlerock', 'nashville'] });
    const r = await g.processCommand('passport');
    check('passport claims 5-city $100 once', r.message.includes('5/27') && (g as any).player.money === 600 && (g as any).player.passportMilestones === 1, r.message);
    const r2 = await g.processCommand('passport');
    check('passport second call pays nothing twice', (g as any).player.money === 600 && !r2.message.includes('Milestone'), r2.message);
    check('passport lists display names + next stop idea', r.message.includes('West Memphis, AR') && r.message.includes('Next stop idea'), r.message);
    const g2 = fresh({ money: 500, visitedCities: Object.keys(WORLD_CITIES) });
    const r3 = await g2.processCommand('passport');
    check('passport all 27 claims full ladder', (g2 as any).player.money === 500 + 100 + 250 + 400 + 600 + 1000 && (g2 as any).player.passportMilestones === 5, r3.message);
  }

  console.log('--- help + old-save compat ---');
  {
    const g = fresh();
    const r = await g.processCommand('help');
    for (const cmd of ['milestones', 'celebrate', 'furnish', 'cook', 'events', 'attend', 'roadtrip', 'passport']) {
      check(`help documents ${cmd}`, r.message.includes(cmd), '');
    }
    const g2 = fresh();
    for (const cmd of ['milestones', 'furnish', 'cook', 'events', 'attend', 'passport', 'roadtrip southaven', 'celebrate Nobody']) {
      const res = await g2.processCommand(cmd);
      check(`old-save runs "${cmd}" without throwing`, typeof res.message === 'string' && res.message.length > 0, res.message);
    }
  }

  console.log(`\nTOTAL: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
