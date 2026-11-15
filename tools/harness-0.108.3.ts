// v0.108.3 verification harness — run via esbuild bundle, NOT part of the
// shipped game. Proves: money cent-rounding, clock persistence + sleep
// advancing (incl. rested sleep + midnight crossing), monthly-tick
// idempotency, and the prison-work fitness cap.
import { GameEngine } from '../src/server/game-engine.js';
import { isOccupied } from '../src/server/property-engine.js';

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
  return { name: 'Tester', city: 'west_memphis', district: 'downtown', ...over };
}

async function main(): Promise<void> {
  console.log('--- money ---');
  {
    const g = new GameEngine();
    g.loadState(baseState({ money: 677.8846153846154 }));
    check('fractional balance heals to cents on load', g.getPlayer().money === 677.88, g.getPlayer().money);
    // Bypass loadState rounding to prove the per-command wrapper rounds.
    g.player.money = 500.127;
    await g.processCommand('status');
    check('per-command wrapper rounds to cents', g.getPlayer().money === 500.13, g.getPlayer().money);
    const fmt = (677.8846153846154).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    check('client fmtMoney expression renders 2 decimals', fmt === '677.88', fmt);
  }

  console.log('--- clock: default + legacy + persistence ---');
  {
    const g = new GameEngine();
    check('fresh engine starts Jan 1 2024 6:00 AM', g.getPlayer().gameTime === '6:00 AM' && g.getPlayer().gameDate === 'Monday, January 1, 2024', g.getPlayer());
    g.loadState(baseState({ energy: 50 }));
    check('save with no clock fields keeps default clock (no jump)', g.getPlayer().gameTime === '6:00 AM', g.getPlayer().gameTime);
  }
  {
    // Legacy save: only the old "Monday, January 1, 2024" + "6:00 AM" strings.
    const g = new GameEngine();
    g.loadState(baseState({ energy: 50, gameDate: 'Monday, January 1, 2024', gameTime: '6:00 AM' }));
    const r1 = await g.processCommand('sleep');
    check('legacy save: sleep advances 6:00 AM -> 2:00 PM', r1.success && g.getPlayer().gameTime === '2:00 PM', g.getPlayer().gameTime);
    // Simulate a server restart: brand-new engine, load the saved player.
    const saved = g.getPlayer();
    const g2 = new GameEngine();
    g2.loadState(saved);
    check('save->fresh-engine round-trip preserves clock', g2.getPlayer().gameTime === '2:00 PM' && g2.getPlayer().gameDate === 'Monday, January 1, 2024', g2.getPlayer());
    const r2 = await g2.processCommand('sleep');
    check('rested sleep still advances time (2:00 PM -> 10:00 PM)', r2.success && g2.getPlayer().gameTime === '10:00 PM', g2.getPlayer().gameTime);
    const r3 = await g2.processCommand('sleep');
    check('sleep across midnight advances the date', r3.success && g2.getPlayer().gameTime === '6:00 AM' && g2.getPlayer().gameDate === 'Tuesday, January 2, 2024', g2.getPlayer());
  }

  console.log('--- monthly tick ---');
  {
    const prop: any = {
      id: 'owned_test', name: 'Test House', type: 'house', city: 'memphis', district: 'downtown',
      purchasePrice: 85000, currentValue: 85000, condition: 100, rentalIncome: 800,
      maintenanceCost: 70, mortgageRemaining: 0, mortgagePayment: 0, purchasedAt: 0,
    };
    const g = new GameEngine();
    g.loadState(baseState({
      money: 500, energy: 100, properties: [prop], lastMonthlyTick: '2024-01',
      gameTimeISO: '2024-03-10T06:00:00.000Z',
    }));
    const r = await g.processCommand('status');
    check('tick fires once per crossed month (Feb + Mar)', r.message.includes('Monthly tick (2024-02)') && r.message.includes('Monthly tick (2024-03)'), r.message.slice(-400));
    // v0.108.12: rent follows occupancy — a vacant month pays nothing.
    // 'Test House' in memphis is vacant in exactly one of Feb/Mar 2024
    // under the deterministic 85% roll, so the old unconditional 2100
    // expectation no longer holds. Expected money is computed from the
    // same rule the tick uses.
    const occMonths = (isOccupied(prop, '2024-02') ? 1 : 0) + (isOccupied(prop, '2024-03') ? 1 : 0);
    check(`rent follows occupancy (500 + 800 x ${occMonths} occupied months)`, g.getPlayer().money === 500 + 800 * occMonths, g.getPlayer().money);
    check('vacant month noted in tick line', occMonths === 2 || r.message.includes('vacant — no rent'), r.message.slice(-400));
    check('watermark advanced to 2024-03', g.getPlayer().lastMonthlyTick === '2024-03', g.getPlayer().lastMonthlyTick);
    const r2 = await g.processCommand('status');
    check('second command does not re-fire the tick', !r2.message.includes('Monthly tick'), r2.message.slice(-200));
  }
  {
    // Pre-feature save: no watermark -> initialise, never retroactively tick.
    const g = new GameEngine();
    g.loadState(baseState({
      money: 500, energy: 100, properties: [], lastMonthlyTick: null,
      gameTimeISO: '2024-03-10T06:00:00.000Z',
    }));
    const r = await g.processCommand('status');
    check('pre-feature save gets no retroactive tick', !r.message.includes('Monthly tick'), r.message.slice(-200));
    check('pre-feature watermark initialises to current month', g.getPlayer().lastMonthlyTick === '2024-03', g.getPlayer().lastMonthlyTick);
  }

  console.log('--- prison fitness cap ---');
  {
    const g = new GameEngine();
    g.loadState(baseState({
      energy: 100, fitness: 100, incarcerated: true,
      sentenceEnd: Date.now() + 3 * 24 * 60 * 60 * 1000,
      prisonRecord: { arrests: 1, timeServed: 0, paroleEligible: false },
    }));
    const r = await g.processCommand('prison work');
    check('prison work at fitness 100 stays at 100', g.getPlayer().fitness === 100, g.getPlayer().fitness);
    check('prison work still shortens sentence', r.message.includes('reduced by 1 day'), r.message);
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(1);
});
