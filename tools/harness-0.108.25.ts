// v0.108.25 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves the three .25 additions with REAL behavior:
// five leaderboard boards ranking real recorded data (weekly/monthly
// deltas, wealth/fame snapshots, empty + outside-top-10 + throwing
// store honesty), the compact-only menu fit rules with expanded rules
// diff-clean vs the .24 baseline, and Avok branding on all three
// surfaces — never parser-existence-only for the boards themselves.
// Run:
//   npx esbuild tools/harness-0.108.25.ts --bundle --platform=node --format=esm --outfile=/tmp/h10825.mjs && node /tmp/h10825.mjs
import { GameEngine } from '../src/server/game-engine.js';
import {
  MemoryCommunityStore, recordLeaderboard, recordCommandOutcome, getBoard, getLeaderboard,
  BOARD_DEFS, leaderboardWeekSetKey, leaderboardMonthSetKey,
} from '../src/server/community.js';
import type { BoardId } from '../src/server/community.js';
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
// lifetimeXP = sum over skills of (level-1)*100 + xp.
function playerWith(xp: number, money: number, unlocked: number, jobTier?: string): any {
  const level = Math.floor(xp / 100) + 1;
  const rest = xp % 100;
  return {
    name: 'T', city: 'west_memphis', money, bankBalance: 0, properties: [], investments: [],
    businesses: [], skills: { a: { level, xp: rest } }, achievements: { unlocked: Array.from({ length: unlocked }, (_, i) => `ach${i}`), stats: {} },
    job: jobTier ? { tier: jobTier } : undefined, passportMilestones: [], challengePayouts: 0,
  };
}

async function main(): Promise<void> {
  // A fixed real-world Monday so week/month buckets are deterministic.
  const MONDAY = Date.UTC(2026, 10, 2, 12, 0, 0); // 2026-11-02, a Monday
  console.log('=== §74: leaderboard boards ===');
  {
    const store = new MemoryCommunityStore();
    await recordLeaderboard(store, 'alpha', playerWith(100, 100000, 0), MONDAY);
    await recordLeaderboard(store, 'bravo', playerWith(200, 1000, 5), MONDAY);
    await recordLeaderboard(store, 'charlie', playerWith(50, 5000, 1), MONDAY);
    // Second session for alpha: +50 XP in the same week/month.
    await recordLeaderboard(store, 'alpha', playerWith(150, 100000, 0), MONDAY);
    // Re-record with identical XP: delta 0, buckets unchanged.
    await recordLeaderboard(store, 'alpha', playerWith(150, 100000, 0), MONDAY);

    const life = await getBoard(store, 'lifetime', 'charlie', 10, MONDAY);
    check('lifetime order bravo > alpha > charlie', life.top.map((e) => e.username).join(',') === 'bravo,alpha,charlie', life.top);
    check('lifetime scores are XP', life.top[0].score === 200 && life.top[1].score === 150, life.top);
    check('lifetime own rank charlie #3', life.me?.rank === 3 && life.me?.score === 50, life.me);
    // Legacy reader still works (ticker top-3 + old client shape).
    const legacy = await getLeaderboard(store, 'charlie', 10);
    check('legacy getLeaderboard unchanged (top + me xp)', legacy.top[0].username === 'bravo' && legacy.me?.xp === 50, legacy);

    const week = await getBoard(store, 'weekly', 'alpha', 10, MONDAY);
    check('weekly deltas: bravo 200, alpha 150 (100+50, no double on re-record)', week.top.map((e) => `${e.username}:${e.score}`).join(',') === 'bravo:200,alpha:150,charlie:50', week.top);
    check('weekly bucket key is the UTC Monday', leaderboardWeekSetKey(MONDAY) === 'tow:lb:week:2026-11-02', leaderboardWeekSetKey(MONDAY));
    const month = await getBoard(store, 'monthly', null, 10, MONDAY);
    check('monthly mirrors weekly in the same month', month.top.map((e) => `${e.username}:${e.score}`).join(',') === 'bravo:200,alpha:150,charlie:50', month.top);
    check('monthly bucket key', leaderboardMonthSetKey(MONDAY) === 'tow:lb:month:2026-11', leaderboardMonthSetKey(MONDAY));

    const wealth = await getBoard(store, 'wealth', null, 10, MONDAY);
    check('wealth order diverges from XP: alpha first', wealth.top.map((e) => e.username).join(',') === 'alpha,charlie,bravo', wealth.top);
    check('wealth scores are net worth', wealth.top[0].score === 100000, wealth.top);
    // Fame in its own store: wealth tiers feed fame, so the fame order
    // is proven with equal wealth and differing achievement counts.
    const fameStore = new MemoryCommunityStore();
    await recordLeaderboard(fameStore, 'fameA', playerWith(100, 0, 0), MONDAY);
    await recordLeaderboard(fameStore, 'fameB', playerWith(100, 0, 5), MONDAY);
    await recordLeaderboard(fameStore, 'fameC', playerWith(100, 0, 1), MONDAY);
    const fame = await getBoard(fameStore, 'fame', null, 10, MONDAY);
    check('fame order: fameB (5 ach) > fameC (1) > fameA (0)', fame.top.map((e) => e.username).join(',') === 'fameB,fameC,fameA', fame.top);
    check('fame scores 10 / 2 / 0', fame.top.map((e) => e.score).join(',') === '10,2,0', fame.top);
    check('fame scores in 0-100', fame.top.every((e) => e.score >= 0 && e.score <= 100), fame.top);
    check('board defs cover all five boards', (Object.keys(BOARD_DEFS) as BoardId[]).sort().join(',') === 'fame,lifetime,monthly,wealth,weekly', Object.keys(BOARD_DEFS));

    // Empty boards read empty — never fabricated.
    const freshStore = new MemoryCommunityStore();
    const emptyWeek = await getBoard(freshStore, 'weekly', 'nobody', 10, MONDAY);
    check('empty weekly board: top [] + me null', emptyWeek.top.length === 0 && emptyWeek.me === null, emptyWeek);
    const emptyFame = await getBoard(freshStore, 'fame', null, 10, MONDAY);
    check('empty fame board: top []', emptyFame.top.length === 0, emptyFame);

    // Outside top 10: rank comes from the set, not a scan.
    const big = new MemoryCommunityStore();
    for (let i = 0; i < 11; i++) await recordLeaderboard(big, `p${i}`, playerWith(1100 - i * 100, 0, 0), MONDAY);
    const me11 = await getBoard(big, 'lifetime', 'p10', 10, MONDAY);
    check('outside-top-10 rank #11 with real score', me11.me?.rank === 11 && me11.me?.score === 100, me11.me);

    // Throwing store: the failure surfaces (caller renders the
    // unavailable line) — never a fabricated fallback board.
    const throwing: any = { zTop: async () => { throw new Error('redis down'); }, zRank: async () => { throw new Error('redis down'); }, zScore: async () => { throw new Error('redis down'); } };
    let threw = false;
    try { await getBoard(throwing, 'weekly', 'x', 10, MONDAY); } catch { threw = true; }
    check('throwing store propagates (no fabricated board)', threw, threw);

    // Green replacement for the .22 F11 count assertion (superseded:
    // the old path did 1 zAdd per record, the .25 path does 3 —
    // lifetime + wealth + fame — so a throw-counting store sees 4
    // calls, not 2). The guarded BEHAVIOR is re-proven here: retried
    // and recorded despite the first throw, on all three snapshot
    // boards, while the challenge failure stays independent.
    class FlakyStore extends MemoryCommunityStore {
      attempts = 0;
      override async zAdd(key: string, member: string, score: number): Promise<void> {
        this.attempts++;
        if (this.attempts === 1) throw new Error('boom');
        return super.zAdd(key, member, score);
      }
      override async incrBy(): Promise<number> { throw new Error('challenge down'); }
    }
    const flaky = new FlakyStore();
    const out = await recordCommandOutcome(flaky, 'tester', playerWith(40, 0, 0), { weekKey: 202601, amount: 2 });
    check('F11 behavior: leaderboard retried + recorded despite first throw', out.leaderboardOk === true, out);
    check('F11 behavior: challenge failure independent (false, not fatal)', out.challengeOk === false, out);
    const fBoard = await getBoard(flaky, 'lifetime', 'tester', 10, MONDAY);
    check('F11 behavior: player on lifetime board', fBoard.me !== null && fBoard.me.score === 40, fBoard.me);
    const fWealth = await getBoard(flaky, 'wealth', 'tester', 10, MONDAY);
    check('F11 behavior: player on wealth board too', fWealth.me !== null, fWealth.me);
  }

  console.log('=== §74/§76: engine — about + help ===');
  {
    const g = fresh();
    const about = await g.processCommand('about');
    check('about renders publisher credit', about.message.includes('Published by Avok Interactive'), about.message.slice(0, 120));
    check('about renders copyright notice', about.message.includes('Copyright © 2026 Avok Interactive. All Rights Reserved.'), about.message.slice(0, 200));
    const help = await g.processCommand('help');
    const bullets = help.message.split('\n').filter((l) => l.trim().startsWith('• '));
    check('help bullets 322 = 321 + about', bullets.length === 322, bullets.length);
    check('leaderboard bullet lists board filters', help.message.includes('leaderboard [weekly|monthly|wealth|fame]'), help.message.split('\n').find((l) => l.includes('leaderboard')));
    check('about bullet exists', bullets.some((b) => b.startsWith('• about')), bullets.filter((b) => b.includes('about')));
    check('about dispatches (not Unknown command)', !about.message.includes('Unknown command'), about.message.slice(0, 80));
    // Green replacement for the .21 client-nudge source check
    // (superseded: the leaderboard screen was rewritten with tabbed
    // boards, so the old variable names are gone). The guarded RULE is
    // re-proven on the new code: the me-line renders ONLY when the
    // board loaded AND the viewer is identified; unavailable shows
    // only the unavailable line.
    const clientSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    check('client nudge gated: meLine requires loaded + identified',
      clientSrc.includes('const meLine = unavailable || !b.identified'), 'meLine guard');
    check('client unavailable line stands alone (no nudge beside it)',
      clientSrc.includes("'<li>The board is unavailable right now — try again shortly.</li>'"), 'unavailable line');
    // Wiring: handler-owned leaderboard command routes board words to
    // getBoard + renderBoardText (handler.ts holds the server, so the
    // route is proven by source wiring + the getBoard behavior above).
    // TOW PC phase 1: the server handler moved from index.ts to
    // handler.ts (index.ts is now the thin Devvit bootstrap). These
    // checks assert the SERVER implementation, so they read the file
    // that holds it; the asserted strings are unchanged.
    const idx = fs.readFileSync('src/server/handler.ts', 'utf8');
    check('index routes board subs via getBoard', idx.includes('getBoard(communityStore(), boardId') && idx.includes('renderBoardText(boardId, board'), idx.slice(idx.indexOf('leaderboard'), idx.indexOf('leaderboard') + 200));
    check('api endpoint accepts ?board=', idx.includes('url.searchParams.get("board")'), 'board param');
  }

  console.log('=== §75: menu fit — compact rules + expanded diff-clean ===');
  {
    const css = fs.readFileSync('public/game.css', 'utf8');
    const base = fs.readFileSync('/tmp/game-css-baseline-0.108.24.css', 'utf8');
    const marker = 'v0.108.25 (§75)';
    const added = css.slice(css.indexOf(marker));
    check('compact pause rule: 92vh + 92dvh max-height + overflow-y auto',
      added.includes('.game-screen:not(.fullscreen) .game-menu-content') && added.includes('max-height: 92vh') && added.includes('max-height: 92dvh') && added.includes('overflow-y: auto'), added.slice(0, 400));
    check('compact main rule: overflow-y auto + 24px padding',
      added.includes('body:not(.tow-expanded) .menu-screen') && added.includes('overflow-y: auto') && added.includes('padding: 24px'), added.slice(0, 400));
    check('compact main content: margin auto (safe centering)',
      added.includes('body:not(.tow-expanded) .menu-screen .menu-content') && added.includes('margin: auto'), added.slice(0, 400));
    check('no positive expanded selectors in the added block',
      !added.includes('.game-screen.fullscreen') && !added.includes('body.tow-expanded'), added.slice(0, 400));
    // Expanded rule blocks diff-clean vs the .24 baseline.
    const blocks = (src: string, sel: string) => {
      const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}', 'g');
      return [...src.matchAll(re)].map((m) => m[0]);
    };
    for (const sel of ['.game-screen.fullscreen .game-menu-content', '.game-screen.fullscreen .game-menu-content h3', '.game-screen.fullscreen .game-menu-list']) {
      const a = blocks(base, sel);
      const b = blocks(css, sel);
      check(`expanded block diff-clean: ${sel}`, JSON.stringify(a) === JSON.stringify(b), { base: a, now: b });
    }
    // Base main-menu rule untouched (padding 40px). The selector regex
    // also matches the tail of the new body:not(...) rule, so only the
    // FIRST (base) block is compared.
    const baseMenu = blocks(base, '.menu-screen');
    const nowMenu = blocks(css, '.menu-screen');
    check('base .menu-screen rule diff-clean', baseMenu[0] === nowMenu[0], { base: baseMenu[0], now: nowMenu[0] });
    // Menu items: main order preserved with About appended; pause items unchanged.
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const mainMenuRegion = client.slice(client.indexOf('function renderMainMenu'), client.indexOf('// Bind menu actions'));
    const mainActions = [...mainMenuRegion.matchAll(/data-action="([a-z]+)"/g)].map((m) => m[1]);
    check('main menu order: continue,new,load,settings,leaderboard,updates,about',
      mainActions.join(',') === 'continue,new,load,settings,leaderboard,updates,about', mainActions);
    const pauseRegion = client.slice(client.indexOf('<div class="game-menu-list">'), client.indexOf('const gameMenu = document.getElementById'));
    const pauseActions = [...pauseRegion.matchAll(/data-action="([a-z]+)"/g)].map((m) => m[1]);
    check('pause menu items unchanged: resume,save,settings,updates,quit',
      pauseActions.join(',') === 'resume,save,settings,updates,quit', pauseActions);
  }

  console.log('=== §76: branding on all three surfaces ===');
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const markRefs = (client.match(/avok-mark\.png/g) ?? []).length;
    check('logo referenced exactly 3× (footer, splash, about)', markRefs === 3, markRefs);
    const footer = client.slice(client.indexOf('class="avok-footer"'), client.indexOf('class="avok-footer"') + 400);
    check('footer: mark + publisher credit + copyright',
      footer.includes('avok-mark.png') && footer.includes('Published by Avok Interactive') && client.includes('Copyright © 2026 Avok Interactive. All Rights Reserved.'), footer);
    const splash = client.slice(client.indexOf('class="avok-splash"'), client.indexOf('class="avok-splash"') + 400);
    check('splash: mark + name + copyright', splash.includes('avok-splash-mark') && splash.includes('Avok Interactive') && splash.includes('Copyright © 2026'), splash);
    const splashPos = client.indexOf('class="avok-splash"');
    const loadingPos = client.indexOf('<div class="loading-container">');
    check('splash sits before the loading bar (probe flow untouched)', splashPos !== -1 && loadingPos !== -1 && splashPos < loadingPos, { splashPos, loadingPos });
    check('about screen exists with back-to-menu', client.includes('function renderAboutScreen') && client.includes("state.currentScreen = 'about'"), 'about screen');
    // Game's own art untouched: landing + menu logos still the globe.
    check('game globe logos untouched', client.includes('<div class="landing-logo">🌍</div>') && client.includes('<div class="menu-logo">🌍</div>'), 'globe logos');
    // Bundled asset: real PNG, 256×256 (IHDR parse).
    const png = fs.readFileSync('public/avok-mark.png');
    const isPng = png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    check('bundled mark is a 256×256 PNG', isPng && w === 256 && h === 256 && png.length > 1000, { isPng, w, h, bytes: png.length });
  }

  console.log('=== version + whats new ===');
  {
    const ver = fs.readFileSync('src/shared/version.ts', 'utf8');
    check('GAME_VERSION 0.108.25', ver.includes('0.108.25'), ver.trim());
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...client.matchAll(/<details class="update-details" id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    check('.25 details first', detailIds[0] === 'update-v0-108-25' && detailIds[1] === 'update-v0-108-24', detailIds.slice(0, 3));
    const block25 = client.slice(client.indexOf('id="update-v0-108-25"'), client.indexOf('id="update-v0-108-24"'));
    check('.25 entry open + Latest', block25.includes('id="update-v0-108-25" open>') && block25.includes('update-latest'), block25.slice(0, 200));
    check('.25 entry lists leaderboard + menu fix + branding',
      block25.includes('Leaderboard revamp') && block25.includes('menus too large') && block25.includes('Avok Interactive branding'), block25.slice(0, 500));
    const block24 = client.slice(client.indexOf('id="update-v0-108-24"'), client.indexOf('id="update-v0-108-23"'));
    check('.24 entry collapsed, no Latest', block24.includes('id="update-v0-108-24">') && !block24.includes('update-latest'), block24.slice(0, 200));
    check('.24 bullets intact below .25', block24.includes('Help wording cleanup') && block24.includes('Pro sports'), block24.slice(0, 300));
    check('.25 index button prepended', client.includes('data-version="update-v0-108-25">v0.108.25</button> <button class="update-index-btn" data-action="goto-update" data-version="update-v0-108-24"'), 'index buttons');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('HARNESS ERROR', err);
  process.exit(1);
});
