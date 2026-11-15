// v0.108.9 verification harness — run via esbuild bundle, NOT part of the
// shipped game. Proves the 0.108.9 sim-fix batch: job-hire gates +
// fail-closed requirements, health movement + clamps, one investment tick
// per game-day, save-age warning, exact/ambiguous matching, property
// re-buy block, goto validation, goto wear/fuel, per-day weather cache,
// storyline money/reputation clamps, heat decay on real idle time, and
// small stress/happiness deltas. Run:
//   npx esbuild tools/harness-0.108.9.ts --bundle --platform=node --format=esm --outfile=/tmp/h1089.mjs && node /tmp/h1089.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { StorylineEngine } from '../src/server/storyline-engine.js';
import { PropertyEngine } from '../src/server/property-engine.js';
import { getWeather } from '../src/server/time-engine.js';

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

async function main(): Promise<void> {
  console.log('--- 1. fallback hire now gated ---');
  {
    const g = fresh({ city: 'west_memphis' });
    const r = await g.processCommand('apply Cashier');
    check('fallback hire works with a clean record', r.success && (g as any).player.job?.title === 'Cashier', r.message);
  }
  {
    const g = fresh({ city: 'west_memphis', criminalRecord: ['theft'] });
    const r = await g.processCommand('apply Registered Nurse');
    check('fallback trusted-role hire blocked with a criminal record', !r.success && r.message.includes('criminal record'), r.message);
  }
  {
    const g = fresh({ city: 'west_memphis', prisonRecord: { arrests: 1, timeServed: 0, paroleEligible: true } });
    const r = await g.processCommand('apply Cashier');
    check('fallback hire blocked while on parole', !r.success && r.message.includes('parole'), r.message);
  }

  console.log('--- 2. requirement matcher: aliases, new certs, fail-closed ---');
  {
    // v0.108.20 §42: 'Auto Technician' is now a mapped Trades rung requiring
    // ASSOC_AUTO_TECH, and the mapping wins over keyword matching — so the
    // old 'preferred does not block' expectation is superseded: without the
    // cert the rung refuses, with it the rung hires.
    const g = fresh({ certifications: [] });
    const r = await g.processCommand('apply Auto Technician');
    check('mapped rung refuses without its cert (mapping wins over keywords)', !r.success && r.message.includes('ASSOC'), r.message);
    const gCert = fresh({ certifications: ['ASSOC_AUTO_TECH'] });
    const rCert = await gCert.processCommand('apply Auto Technician');
    check('mapped rung hires with its cert', rCert.success, rCert.message);
  }
  {
    const g = fresh({ certifications: [] });
    const r = await g.processCommand('apply Registered Nurse');
    check('RN job rejected without RN_LICENSE', !r.success && r.message.includes('RN LICENSE'), r.message);
    const g2 = fresh({ certifications: ['RN_LICENSE'] });
    const r2 = await g2.processCommand('apply Registered Nurse');
    check('RN job hired with RN_LICENSE', r2.success, r2.message);
  }
  {
    const g = fresh({ certifications: [] });
    const r = await g.processCommand('apply Nurse Practitioner');
    check('NP job rejected without NP_CERT', !r.success && r.message.includes('NP CERT'), r.message);
    // v0.108.20 §42/§44: Nurse Practitioner is an elite rung (NP_CERT + GPA
    // 3.0); the old-save default GPA 2.5 no longer clears the bar.
    const g2 = fresh({ certifications: ['NP_CERT'], lastGPA: 3.5 });
    const r2 = await g2.processCommand('apply Nurse Practitioner');
    check('NP job hired with NP_CERT (new course cert) + GPA 3.5', r2.success, r2.message);
  }
  {
    const g = fresh({ certifications: ['PARAMEDIC_LICENSE'] });
    const r = await g.processCommand('apply Firefighter/Paramedic');
    check('Firefighter/Paramedic fails closed on ungranted Fire certification despite holding Paramedic', !r.success && r.message.toLowerCase().includes('fire'), r.message);
  }
  {
    const g = fresh({ certifications: ['MBA_DEGREE'] });
    const r = await g.processCommand('apply Surgeon');
    check('MD job NOT satisfied by an MBA (specific degree fails closed)', !r.success && r.message.includes('MD'), r.message);
  }
  {
    const g = fresh({ certifications: [] });
    const r = await g.processCommand('apply Police Officer');
    check('Police Officer fails closed on ungranted Police academy', !r.success && r.message.toLowerCase().includes('police academy'), r.message);
  }
  {
    const g = fresh({ certifications: [] });
    const r = await g.processCommand('apply Fire');
    check('ambiguous job title refused with a list', !r.success && r.message.includes('Multiple jobs match'), r.message);
  }

  console.log('--- 3. health moves, clamps, warns; no death ---');
  {
    const g = fresh({ health: 50, energy: 50 });
    await g.processCommand('sleep');
    check('restful sleep restores +5 health', (g as any).player.health === 55, (g as any).player.health);
  }
  {
    const g = fresh({ health: 99, energy: 50 });
    await g.processCommand('sleep');
    check('health caps at 100 on sleep', (g as any).player.health === 100, (g as any).player.health);
  }
  {
    const g = fresh({ health: 80, energy: 30, job: { title: 'Cashier', employer: 'Test', hourlyPay: 15, skill: 'charisma' } });
    await g.processCommand('work');
    check('work to zero energy costs -3 health', (g as any).player.health === 77 && (g as any).player.energy === 0, { h: (g as any).player.health, e: (g as any).player.energy });
  }
  {
    const g = fresh({ health: 10, energy: 100, incarcerated: true, sentenceEnd: Date.now() + 3 * 86400000, prisonRecord: { arrests: 1, timeServed: 0, paroleEligible: false } });
    const r = await g.processCommand('prison work');
    check('prison work costs -2 health', (g as any).player.health === 8, (g as any).player.health);
    check('low-health warning appears on prison-work message', r.message.includes('Health is low'), r.message);
    const s = await g.processCommand('status');
    check('status warns at low health', s.message.includes('Health is low'), s.message);
  }
  {
    const g = fresh({ health: 0, energy: 50 });
    const r = await g.processCommand('sleep');
    check('health 0 does not kill or block play (no death mechanic)', r.success, r.message);
  }

  console.log('--- 4. one investment tick per game-day ---');
  {
    const inv = { id: 't1', type: 'stocks', name: 'Test Stocks', shares: 10, purchasePrice: 10000, currentValue: 10000, purchasedAt: 0 };
    const g = fresh({ energy: 50, investments: [inv], gameTimeISO: '2024-01-01T06:00:00.000Z' });
    await g.processCommand('sleep'); // 6AM -> 2PM Jan 1, ticks, date = Jan 1
    const afterFirst = (g as any).player.investments[0].currentValue;
    const dateAfterFirst = (g as any).player.lastInvestmentTickDate;
    (g as any).player.energy = 50;
    await g.processCommand('sleep'); // 2PM -> 10PM Jan 1, same day: must NOT tick
    check('same-day second restful sleep does not re-tick investments', (g as any).player.investments[0].currentValue === afterFirst, { before: afterFirst, after: (g as any).player.investments[0].currentValue });
    check('tick date stays on the first day', (g as any).player.lastInvestmentTickDate === dateAfterFirst, (g as any).player.lastInvestmentTickDate);
    (g as any).player.energy = 50;
    await g.processCommand('sleep'); // 10PM -> 6AM Jan 2, day crosses: tick allowed
    check('sleep crossing midnight re-arms the tick', (g as any).player.lastInvestmentTickDate !== dateAfterFirst, (g as any).player.lastInvestmentTickDate);
  }

  console.log('--- 5. save-age warning ---');
  {
    const g = fresh({ lastSaved: Date.now() - 25 * 86400000 });
    const r = await g.processCommand('status');
    check('25-day-old save warns on next command', r.message.includes('25 days old') && r.message.includes('90 days'), r.message);
    const r2 = await g.processCommand('status');
    check('warning shows exactly once per load', !r2.message.includes('days old'), r2.message);
  }
  {
    const g = fresh({ lastSaved: Date.now() - 5 * 86400000 });
    const r = await g.processCommand('status');
    check('fresh save does not warn', !r.message.includes('days old'), r.message);
  }

  console.log('--- 6. exact vs ambiguous matching ---');
  {
    const g = fresh({
      investments: [
        { id: 'a', type: 'stocks', name: 'Alpha Stocks', shares: 1, purchasePrice: 100, currentValue: 120, purchasedAt: 0 },
        { id: 'b', type: 'bonds', name: 'Alpha Bonds', shares: 1, purchasePrice: 100, currentValue: 110, purchasedAt: 0 },
      ],
    });
    const r = await g.processCommand('sell investment Alpha');
    check('ambiguous investment refused with a list', !r.success && r.message.includes('Multiple investments match'), r.message);
    const r2 = await g.processCommand('sell investment Alpha Stocks');
    check('exact investment sells', r2.success && (g as any).player.investments.length === 1, r2.message);
  }
  {
    const veh = (name: string, type: string): any => ({ id: name, name, type, value: 5000, condition: 100, mileage: 0, purchasedAt: 0, lastService: Date.now(), services: {}, fuel: 10, fuelCap: 12, mpg: 25 });
    const g = fresh({ vehicles: [veh('Honda Civic', 'car'), veh('Honda Accord', 'car')] });
    const r = await g.processCommand('sell vehicle Honda');
    check('ambiguous vehicle refused with a list', !r.success && r.message.includes('Multiple vehicles match'), r.message);
    const r2 = await g.processCommand('sell vehicle Honda Civic');
    check('exact vehicle sells', r2.success && (g as any).player.vehicles.length === 1, r2.message);
  }

  console.log('--- 7. property re-buy blocked ---');
  {
    const pe = new PropertyEngine();
    const allListings = pe.getAllListings();
    const listing = allListings.find((l) => allListings.filter((x) => x.name === l.name).length === 1)!;
    const g = fresh({ city: listing.city, money: 10000000 });
    const r1 = await g.processCommand(`buy property ${listing.name}`);
    check('first property buy succeeds', r1.success, r1.message);
    const r2 = await g.processCommand(`buy property ${listing.name}`);
    check('re-buy of the same property blocked', !r2.success && r2.message.includes('already own'), r2.message);
  }

  console.log('--- 8. goto validation ---');
  {
    const g = fresh({ city: 'memphis' });
    const r = await g.processCommand('goto nowhereville');
    check('invalid district rejected with the valid list', !r.success && r.message.includes('Valid districts'), r.message);
    const r2 = await g.processCommand('goto downtown');
    check('valid district accepted', r2.success && (g as any).player.district === 'downtown', r2.message);
  }

  console.log('--- 9. goto wear + fuel ---');
  {
    const veh: any = { id: 'v1', name: 'Test Car', type: 'car', value: 5000, condition: 100, mileage: 1000, purchasedAt: 0, lastService: Date.now(), services: {}, fuel: 10, fuelCap: 12, mpg: 20 };
    const g = fresh({ city: 'memphis', vehicles: [veh] });
    await g.processCommand('goto midtown');
    const v = (g as any).player.vehicles[0];
    check('goto consumes fuel (3 miles / 20 mpg)', v.fuel < 10 && v.fuel > 9.5, v.fuel);
    check('goto adds mileage', v.mileage === 1003, v.mileage);
  }

  console.log('--- 11. weather stable within a game-day ---');
  {
    const w1 = getWeather(new Date('2024-01-01T06:00:00'), 'west_memphis');
    const w2 = getWeather(new Date('2024-01-01T18:00:00'), 'west_memphis');
    check('same game-day weather is identical', w1.temp === w2.temp && w1.condition === w2.condition, { w1, w2 });
  }

  console.log('--- 12. heat decay on real idle time ---');
  {
    const g = fresh({ heat: 10, lastActive: Date.now() - 2 * 3600000 });
    await g.processCommand('status');
    check('heat decays for a real 2h idle gap (10 -> 6)', (g as any).player.heat === 6, (g as any).player.heat);
    await g.processCommand('status');
    check('immediate follow-up command does not re-decay heat', (g as any).player.heat === 6, (g as any).player.heat);
  }

  console.log('--- 13. storyline money/reputation clamps ---');
  {
    const se = new StorylineEngine();
    const player: any = { name: 'Tester', money: 50, bankBalance: 0, reputation: { professional: 0, social: 0, criminal: 0, community: 0 } };
    const evt: any = { id: 'test_evt', outcomes: [{ id: 'take', text: 'test', effects: [{ type: 'money', target: 'cash', value: -75 }] }] };
    se.activateEvent(evt);
    const r = se.processInterviewChoice(player, 'test_evt', 'take');
    check('storyline loss bigger than balance floors cash at 0', player.money === 0, player.money);
    check('storyline shortfall is reported in the message', r.message.includes('capped'), r.message);
  }
  {
    const se = new StorylineEngine();
    const player: any = { name: 'Tester', money: 500, bankBalance: 0, reputation: { professional: 0, social: 0, criminal: 0, community: 0 } };
    const evt: any = { id: 'test_evt2', outcomes: [{ id: 'take', text: 'test', effects: [{ type: 'reputation', target: 'professional', value: -150 }] }] };
    se.activateEvent(evt);
    se.processInterviewChoice(player, 'test_evt2', 'take');
    check('storyline reputation clamps at -100', player.reputation.professional === -100, player.reputation.professional);
  }

  console.log('--- 14. small stress/happiness deltas ---');
  {
    const g = fresh({ stress: 10, energy: 100, job: { title: 'Cashier', employer: 'Test', hourlyPay: 15, skill: 'charisma' } });
    await g.processCommand('work');
    // v0.108.20 §21: work applies the day's deterministic workplace event;
    // employer 'Test' on Jan 1 2024 lands on deadline week (+5 stress), so
    // the total is base +4 + event +5 = +9 (10 -> 19), not the pre-.20 +4.
    check('work adds +4 stress + deadline-week event +5', (g as any).player.stress === 19, (g as any).player.stress);
  }
  {
    const g = fresh({ stress: 50, happiness: 80, money: 100 });
    await g.processCommand('gym');
    check('gym relieves -5 stress and +2 happiness', (g as any).player.stress === 45 && (g as any).player.happiness === 82, { s: (g as any).player.stress, h: (g as any).player.happiness });
  }

  console.log('--- regression: 0.108.8 fixes intact ---');
  {
    const g = fresh({ money: 677.8846153846154 });
    check('money still rounds to cents on load', (g as any).player.money === 677.88, (g as any).player.money);
    const g2 = fresh({ energy: 100, gameTimeISO: '2024-01-01T06:00:00.000Z' });
    await g2.processCommand('sleep');
    const p = g2.getPlayer();
    check('rested sleep clock advanced (getPlayer gameTime)', p.gameTime === '2:00 PM', p.gameTime);
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(1);
});
