// v0.108.15 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves the ten-item batch: property upgrade tiers +
// occupied-only boosted rent, business buy/income/sell, daily-goal
// determinism + completion reward, vehicle performance tiers, NPC
// gifts/hangouts/perks, journal view, laws/court/fines, career/promotion,
// NPC profile/people enrichment, and old-save compatibility (a save with
// none of the new fields runs every new command without throwing).
// Run:
//   npx esbuild tools/harness-0.108.15.ts --bundle --platform=node --format=esm --outfile=/tmp/h10815.mjs && node /tmp/h10815.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { isOccupied } from '../src/server/property-engine.js';
import { ensureDailyGoals, recordDailyGoalProgress } from '../src/server/features-0.108.15.js';

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

async function main(): Promise<void> {
  console.log('--- 1. property upgrades + occupied rent ---');
  {
    const g = fresh({ money: 100000, properties: [prop()] });
    const r = await g.processCommand('renovate property South Memphis Bungalow');
    const p = (g as any).player.properties[0];
    check('renovate raises level + rent (800 -> 970)', r.success && p.renovationLevel === 1 && p.rentalIncome === 970, r.message);
    const r2 = await g.processCommand('upgrade property South Memphis Bungalow');
    check('upgrade property is the renovate alias (level 2)', r2.success && p.renovationLevel === 2 && p.rentalIncome === 1140, r2.message);
    const r3 = await g.processCommand('properties');
    check('properties shows level + next cost', r3.message.includes('Lv 2') && r3.message.includes('next upgrade'), r3.message);
  }
  {
    // Find a month where this property is occupied, then tick exactly it.
    let month = '';
    for (let m = 1; m <= 12; m++) {
      const key = `2024-${String(m).padStart(2, '0')}`;
      if (isOccupied(prop(), key)) { month = key; break; }
    }
    check('found an occupied test month', month !== '', month);
    if (month) {
      const prev = month === '2024-01' ? '2023-12' : `2024-${String(Number(month.slice(5)) - 1).padStart(2, '0')}`;
      const g = fresh({
        money: 10000, properties: [prop({ renovationLevel: 1, rentalIncome: 970 })],
        lastMonthlyTick: prev, gameTimeISO: `${month}-01T06:00:00`,
      });
      const before = (g as any).player.money;
      const r = await g.processCommand('status');
      check('occupied tick pays boosted rent 970', (g as any).player.money === before + 970 && r.message.includes('970'), { before, after: (g as any).player.money, msg: r.message });
    }
  }

  console.log('--- 2. businesses ---');
  {
    const g = fresh({ money: 10000 });
    const r = await g.processCommand('buy business Coffee Cart');
    check('buy business works (2500, 180/mo)', r.success && (g as any).player.money === 7500 && (g as any).player.businesses.length === 1, r.message);
    const r2 = await g.processCommand('buy business Coffee Cart');
    check('second business of same type refused', !r2.success, r2.message);
    const r3 = await g.processCommand('sell business Coffee Cart');
    check('sell business pays 70% (1750)', r3.success && (g as any).player.money === 9250, r3.message);
  }
  {
    const g = fresh({
      money: 5000, businesses: [{ id: 'biz_x', name: 'Coffee Cart', type: 'coffee_cart', purchasePrice: 2500, monthlyIncome: 180, purchasedAt: Date.now() }],
      lastMonthlyTick: '2023-12', gameTimeISO: '2024-01-01T06:00:00',
    });
    await g.processCommand('status');
    check('monthly tick pays business income 180', (g as any).player.money === 5180, (g as any).player.money);
  }

  console.log('--- 3. daily goals ---');
  {
    const p: any = {};
    const a = ensureDailyGoals(p, 'Monday, January 1, 2024');
    const b = ensureDailyGoals(p, 'Monday, January 1, 2024');
    check('same day -> same 3 goals', a === b && a.goals.length === 3, a);
    const c = ensureDailyGoals(p, 'Tuesday, January 2, 2024');
    check('new day -> fresh goals', c.date === 'Tuesday, January 2, 2024' && c.goals.every((g: any) => g.progress === 0), c);
    const p2: any = { dailyGoals: { date: 'Monday, January 1, 2024', goals: [{ kind: 'gym', label: 'Work out at the gym', target: 1, progress: 0, completed: false, reward: 25 }] } };
    const done = recordDailyGoalProgress(p2, 'gym');
    check('goal progress completes at target', done.length === 1 && p2.dailyGoals.goals[0].completed, p2.dailyGoals);
  }
  {
    const g = fresh({
      money: 1000,
      dailyGoals: { date: 'Monday, January 1, 2024', goals: [{ kind: 'gym', label: 'Work out at the gym', target: 1, progress: 0, completed: false, reward: 25 }] },
    });
    const r = await g.processCommand('gym');
    check('gym completes goal + pays 25 (1000-15+25=1010)', r.success && r.message.includes('Daily goal complete') && (g as any).player.money === 1010, { msg: r.message, money: (g as any).player.money });
    const r2 = await g.processCommand('goals');
    check('goals command renders', r2.success && r2.message.includes('Daily Goals'), r2.message);
  }

  console.log('--- 4. vehicle upgrades ---');
  {
    const veh = { id: 'v1', name: 'Used Sedan', type: 'car', value: 5000, condition: 100, mileage: 0, lastService: Date.now(), services: {}, fuel: 14, fuelCap: 14, mpg: 28, registered: false, registrationExpiry: 0, inspected: false, inspectionExpiry: 0, modifications: [], immobilized: false };
    const g = fresh({ money: 10000, vehicles: [veh] });
    const r = await g.processCommand('upgrade vehicle Used Sedan engine');
    const v = (g as any).player.vehicles[0];
    check('engine tier 1 costs 10% of value (500)', r.success && v.upgrades.engine === 1 && (g as any).player.money === 9500, r.message);
    const r2 = await g.processCommand('upgrade vehicle Used Sedan');
    check('upgrade list renders parts', r2.success && r2.message.includes('Engine'), r2.message);
    const r3 = await g.processCommand('vehicles');
    check('garage shows performance tiers', r3.message.includes('Performance +1'), r3.message);
  }

  console.log('--- 5. NPC depth ---');
  {
    const g = fresh({ money: 1000 });
    const r = await g.processCommand('gift Marcus Williams coffee');
    check('gift coffee: +3 rel, -$15', r.success && (g as any).player.relationships.npc_001.value === 3 && (g as any).player.money === 985, r.message);
    const r2 = await g.processCommand('hangout Marcus Williams');
    check('hangout: +6 rel, -$25, +5 happy', r2.success && (g as any).player.relationships.npc_001.value === 9 && (g as any).player.money === 960 && (g as any).player.happiness === 85, r2.message);
  }
  {
    const rel = { value: 25, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };
    const g = fresh({ money: 1000, relationships: { npc_001: rel } });
    const r = await g.processCommand('gift Marcus Williams coffee');
    check('25+ perk: gift gains +2 bonus (3->5)', r.success && (g as any).player.relationships.npc_001.value === 30, r.message);
    const r2 = await g.processCommand('friends');
    check('friends shows level + perks', r2.message.includes('Acquaintance') && r2.message.includes('Gifts give +2'), r2.message);
  }

  console.log('--- 6. journal ---');
  {
    const g = fresh({});
    const r = await g.processCommand('journal');
    check('journal renders arcs + empty log', r.success && r.message.includes('Story arcs') && r.message.includes('Making a Living'), r.message);
  }

  console.log('--- 7. government & law ---');
  {
    const g = fresh({});
    const r = await g.processCommand('laws');
    check('laws lists offenses + fines', r.success && r.message.includes('Pickpocketing') && r.message.includes('100'), r.message);
    const r2 = await g.processCommand('government');
    check('government renders civic standing', r2.success && r2.message.includes('civic standing'), r2.message);
  }
  {
    const g = fresh({ money: 1000, heat: 30, fines: [{ offense: 'Shoplifting', amount: 400, date: 'Monday, January 1, 2024' }] });
    const r = await g.processCommand('court');
    check('court shows outstanding fine', r.success && r.message.includes('400'), r.message);
    const r2 = await g.processCommand('pay fine all');
    check('pay fine all settles + cools heat 10 (600 cash, heat 20)', r2.success && (g as any).player.money === 600 && (g as any).player.heat === 20 && (g as any).player.fines.length === 0, r2.message);
  }

  console.log('--- 8. career + promotion ---');
  {
    const g = fresh({
      job: { title: 'Cashier', employer: 'Kroger', tier: 'entry', hourlyPay: 14, skill: 'charisma' },
      jobTenure: 15, promotions: 0, workDaysCompleted: 15,
      skills: { charisma: { level: 3, xp: 0 } },
    });
    const r = await g.processCommand('career');
    check('career shows READY promotion', r.success && r.message.includes('READY'), r.message);
    const r2 = await g.processCommand('promote');
    check('promote: Senior Cashier at 16.10/hr', r2.success && (g as any).player.job.title === 'Senior Cashier' && (g as any).player.job.hourlyPay === 16.1, r2.message);
    const r3 = await g.processCommand('apply');
    check('apply groups by tier with shift pay', r3.success && r3.message.includes('/shift'), r3.message);
  }

  console.log('--- 9. NPC profile + people ---');
  {
    const rel = { value: 30, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };
    const g = fresh({ relationships: { npc_001: rel } });
    const r = await g.processCommand('profile Marcus Williams');
    check('profile shows dossier + relationship', r.success && r.message.includes('Marcus Williams') && r.message.includes('Acquaintance') && r.message.includes('schedule'), r.message);
    const r2 = await g.processCommand('people');
    check('people shows relationship level', r2.success && r2.message.includes('Acquaintance (30)'), r2.message);
  }

  console.log('--- 10. old-save compatibility ---');
  {
    const g = new GameEngine();
    g.loadState({ name: 'OldTimer', city: 'west_memphis', district: 'downtown' });
    for (const cmd of ['businesses', 'goals', 'journal', 'laws', 'court', 'career', 'friends', 'profile']) {
      const r = await g.processCommand(cmd);
      check(`old save runs "${cmd}"`, r.success, r.message.slice(0, 120));
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
