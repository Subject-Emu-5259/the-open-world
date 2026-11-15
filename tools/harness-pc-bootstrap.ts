// TOW PC phase-1 smoke test — run via esbuild bundle, NOT part of
// the shipped game. Proves the PC bootstrap serves the SAME game
// handler over real HTTP (never by importing the handler directly):
//   §A lifecycle: init (no player) -> create -> apply -> work ->
//      sleep -> invest -> talk (NO LLM keys set — must fall back to
//      templates, no crash, no hang) -> trade list.
//   §B saves: save/load round-trip across slots (slot 2 written and
//      read back; slot 1 still there; slot 3 is a clean 404), and a
//      final init GET returning the newest save.
//   §C community: leaderboard + challenge reads over HTTP; a second
//      player (different identity headers) appears on the same board,
//      proving the shared community store.
// Every check asserts REAL behavior (money moved, energy restored,
// an investment row exists, the board names both players) — never
// parser-existence. The bundle aliases '@devvit/web/server' to the PC
// stub, so this also proves the PC server runs with NO Devvit code.
// Run:
//   npx esbuild tools/harness-pc-bootstrap.ts --bundle --platform=node --format=esm --alias:@devvit/web/server=./src/server/stubs/devvit-server.ts --outfile=/tmp/hpc.mjs && node /tmp/hpc.mjs
import { startPcServer } from '../src/server/pc-server.js';

// No LLM keys anywhere in this process: talk MUST fall back to local
// templates. If a key leaked in, the test would still pass, but the
// template-fallback proof would be void — so scrub, don't assume.
for (const k of ['HF_API_KEY', 'HUGGINGFACE_API_KEY', 'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPTRA_API_KEY', 'OPTRA_MODEL']) {
  delete process.env[k];
}

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

// The harness must never hang the release checklist: a stuck LLM
// call, a wedged server, or a deadlocked store all end here.
const watchdog = setTimeout(() => {
  console.error('SMOKE TIMEOUT: the PC bootstrap harness did not finish in 90s');
  process.exit(1);
}, 90_000);

const H1: Record<string, string> = { 'x-tow-user-id': 'pc-test-1', 'x-tow-username': 'pctester1' };
const H2: Record<string, string> = { 'x-tow-user-id': 'pc-test-2', 'x-tow-username': 'pctester2' };

async function main(): Promise<void> {
  const { server, port } = await startPcServer({ port: 0, host: '127.0.0.1' });
  const base = `http://127.0.0.1:${port}`;
  try {
    const get = async (path: string, headers: Record<string, string> = H1): Promise<{ status: number; json: any }> => {
      const res = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15_000) });
      const json = await res.json().catch(() => null);
      return { status: res.status, json };
    };
    const post = async (path: string, body: unknown, headers: Record<string, string> = H1): Promise<{ status: number; json: any }> => {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, json };
    };
    // One game command, threading the player like the client does.
    const cmd = async (player: any, input: string, headers: Record<string, string> = H1, slot = '1'): Promise<any> => {
      const { status, json } = await post('/api/init', { player, input, slot }, headers);
      check(`POST /api/init "${input}" answers 200`, status === 200, { status, json });
      return json;
    };

    // §A — lifecycle, player 1.
    const init0 = await get('/api/init');
    check('init GET before creation: no player', init0.status === 200 && init0.json.hasPlayer === false, init0.json);

    const created = await post('/api/init', { firstName: 'PCTester', action: 'create' });
    check('create answers 200 + created shape', created.status === 200 && created.json.type === 'created', { status: created.status, json: created.json });
    let p1 = created.json.player;
    check('created player is PCTester with $500 and full energy', p1?.name === 'PCTester' && p1?.money === 500 && p1?.energy === 100, { name: p1?.name, money: p1?.money, energy: p1?.energy });

    const applied = await cmd(p1, 'apply cashier');
    check('apply cashier hires', applied.success === true && typeof applied.text === 'string' && applied.text.includes('Hired as Cashier'), applied.text?.slice(0, 160));
    p1 = applied.player;
    check('hired player holds the Cashier job', p1?.job?.title === 'Cashier', p1?.job);

    const moneyBeforeWork = p1.money;
    const worked = await cmd(p1, 'work');
    check('work succeeds and pays', worked.success === true && worked.player.money > moneyBeforeWork, { before: moneyBeforeWork, after: worked.player?.money, text: worked.text?.slice(0, 120) });
    p1 = worked.player;
    check('work records the shift', p1?.workDaysCompleted === 1, p1?.workDaysCompleted);
    const energyAfterWork = p1.energy;
    check('work costs energy', typeof energyAfterWork === 'number' && energyAfterWork < 100, energyAfterWork);

    const slept = await cmd(p1, 'sleep');
    check('sleep succeeds and restores energy', slept.success === true && slept.player.energy === 100 && slept.player.energy > energyAfterWork, { energy: slept.player?.energy });
    p1 = slept.player;

    const moneyBeforeInvest = p1.money;
    const invested = await cmd(p1, 'invest bitcoin 100');
    check('invest bitcoin 100 succeeds', invested.success === true, invested.text?.slice(0, 160));
    p1 = invested.player;
    check('invest moves the money into one position', p1?.money === moneyBeforeInvest - 100 && Array.isArray(p1?.investments) && p1.investments.length === 1, { money: p1?.money, investments: p1?.investments });

    // Talk with NO LLM keys: templates only, no crash, no hang. The
    // 10s bound is the proof no provider was awaited (each provider
    // times out at 7s; with keys absent there is no call at all).
    // Earl Whitfield is a West Memphis NPC — the created player
    // starts in West Memphis, and talk() only sees the player's city.
    const talkStart = Date.now();
    const talked = await cmd(p1, 'talk Earl');
    const talkMs = Date.now() - talkStart;
    check('talk Earl succeeds with template-speed reply', talked.success === true && typeof talked.text === 'string' && talked.text.length > 10 && talkMs < 10_000, { ms: talkMs, text: talked.text?.slice(0, 160) });
    check('talk reply names Earl', typeof talked.text === 'string' && talked.text.includes('Earl'), talked.text?.slice(0, 200));
    p1 = talked.player;

    const traded = await cmd(p1, 'trade list');
    check('trade list answers over the handler path', traded.success === true && typeof traded.text === 'string' && traded.text.includes('Trade Offers') && traded.text.includes('None.'), traded.text?.slice(0, 200));

    // §B — saves across slots.
    const saved2 = await post('/api/save', { slot: '2', player: p1 });
    check('save to slot 2 succeeds', saved2.status === 200 && saved2.json.success === true, saved2.json);
    const loaded2 = await get('/api/load?slot=2');
    check('load slot 2 returns the saved life', loaded2.status === 200 && loaded2.json.player?.name === 'PCTester' && loaded2.json.player?.money === p1.money, { money: loaded2.json.player?.money, expected: p1.money });
    const loaded3 = await get('/api/load?slot=3');
    check('load slot 3 is a clean 404 (never a fake save)', loaded3.status === 404, loaded3);
    const slots = await get('/api/save-slots');
    const slotList = slots.json?.slots ?? [];
    check('save-slots lists slots 1+2 occupied, 3 empty', slotList.length === 3 && slotList[0]?.hasSave === true && slotList[1]?.hasSave === true && slotList[2]?.hasSave === false, slotList.map((s: any) => s.hasSave));
    const init1 = await get('/api/init');
    check('init GET after play returns the newest save', init1.status === 200 && init1.json.hasPlayer === true && init1.json.player?.name === 'PCTester', { hasPlayer: init1.json?.hasPlayer, name: init1.json?.player?.name });

    // §C — community reads, then a second player on the same board.
    const lb1 = await get('/api/leaderboard');
    check('leaderboard read succeeds, identified', lb1.status === 200 && lb1.json.identified === true && Array.isArray(lb1.json.top), lb1.json);
    check('leaderboard names pctester1 at rank 1', lb1.json.top?.[0]?.username === 'pctester1' && lb1.json.me?.rank === 1, { top: lb1.json.top, me: lb1.json.me });
    const ch1 = await get('/api/challenge');
    check('challenge read succeeds with a goal + total', ch1.status === 200 && typeof ch1.json.goal?.type === 'string' && typeof ch1.json.total === 'number', ch1.json);
    // Work contributes earnings + shifts, so when this week's goal is
    // either of those the total must have moved; a cities week stays 0
    // (no travel happened) and only the shape is asserted.
    if (ch1.json.goal?.type === 'earnings' || ch1.json.goal?.type === 'shifts') {
      check(`challenge total moved on a ${ch1.json.goal.type} week`, ch1.json.total > 0, ch1.json);
    } else {
      check('challenge total is 0 on a cities week (no travel)', ch1.json.total === 0, ch1.json);
    }

    const created2 = await post('/api/init', { firstName: 'PCSecond', action: 'create' }, H2);
    check('second player creates under a different identity', created2.status === 200 && created2.json.player?.name === 'PCSecond', created2.json?.player?.name);
    let p2 = created2.json.player;
    const applied2 = await cmd(p2, 'apply cashier', H2);
    p2 = applied2.player;
    const worked2 = await cmd(p2, 'work', H2);
    check('second player works (own save, own money)', worked2.success === true && worked2.player?.money > 500, worked2.player?.money);
    const lb2 = await get('/api/leaderboard', H2);
    const names = (lb2.json.top ?? []).map((e: any) => e.username);
    check('leaderboard shares both PC players', names.includes('pctester1') && names.includes('pctester2') && lb2.json.top.length === 2, names);
    check('second player sees their own rank', lb2.json.me?.rank === 2 || lb2.json.me?.rank === 1, lb2.json.me);
  } finally {
    server.close();
  }

  clearTimeout(watchdog);
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
