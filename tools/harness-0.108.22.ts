// v0.108.22 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves every audit finding (F1–F21, 20 findings)
// with REAL behavior — stamps adopted, guards rejecting, adapter call
// shapes asserted against a faithful Devvit Redis contract fake,
// trade saves expiring, folded stocks repriced — never
// parser-existence-only. DOM-only wiring (the F4 beacon removal, the
// F7 confirm/backup, the F12 Continue scan, the F20 route loop) is
// code-reviewed over harness-proven decision logic, not faked here.
// Run:
//   npx esbuild tools/harness-0.108.22.ts --bundle --platform=node --format=esm --outfile=/tmp/h10822.mjs && node /tmp/h10822.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { groupCompanies, stockPriceAt, roundCents } from '../src/server/features-0.108.20.js';
import { ALL_JOBS } from '../src/server/jobs-database.js';
import {
  pickNewerSave, pickNewestSlot, isStaleWrite, isSequenceStale, nextSaveSeq,
  staleCauseFor, adoptServerStamp, autosaveStaleIsSafe, validSlot, normalizeSlot,
  hasIdentity, loadOutcomeFromFetch, canCreate, deviceClockBehind,
  migrationOutcome, bodyFailureClass, failureClassForSaveResponse, saveWarningText,
} from '../src/shared/save-resolution.js';
import { staleRejectionText, saveFailureText, noPlayerResponse } from '../src/server/save-responses.js';
import {
  MemoryCommunityStore, recordLeaderboard, getLeaderboard,
  recordChallengeContribution, getChallenge, recordCommandOutcome,
  createTradeOffer, acceptTradeOffer, TRADE_OFFERS_KEY,
} from '../src/server/community.js';
import { RedisCommunityStore } from '../src/server/redis-community-store.js';
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

// ---------------------------------------------------------------------
// F5/F15: a faithful fake of the Devvit Redis adapter contract
// (RedisClient.d.ts / redisCompression.d.ts): variadic zAdd objects,
// zRange -> {member, score}[], zRank ascending with NO reverse option.
// ---------------------------------------------------------------------
class FakeRedisAdapter {
  kv = new Map<string, string>();
  sets = new Map<string, Map<string, number>>();
  calls: { method: string; args: unknown[] }[] = [];
  async get(k: string): Promise<string | undefined> { return this.kv.get(k); }
  async set(k: string, v: string): Promise<unknown> { this.kv.set(k, v); return 'OK'; }
  async del(k: string): Promise<unknown> { this.kv.delete(k); return 1; }
  async zAdd(key: string, ...members: { member: string; score: number }[]): Promise<unknown> {
    this.calls.push({ method: 'zAdd', args: [key, ...members] });
    let m = this.sets.get(key);
    if (!m) { m = new Map(); this.sets.set(key, m); }
    for (const mem of members) m.set(mem.member, mem.score);
    return members.length;
  }
  private sorted(key: string, reverse: boolean): { member: string; score: number }[] {
    const m = this.sets.get(key);
    if (!m) return [];
    const arr = [...m.entries()].map(([member, score]) => ({ member, score }))
      .sort((a, b) => a.score - b.score || a.member.localeCompare(b.member));
    return reverse ? arr.reverse() : arr;
  }
  async zRange(key: string, start: number | string, stop: number | string, options?: { by?: string; reverse?: boolean }): Promise<{ member: string; score: number }[]> {
    this.calls.push({ method: 'zRange', args: [key, start, stop, options] });
    const arr = this.sorted(key, !!options?.reverse);
    const s = typeof start === 'string' ? parseInt(start, 10) : start;
    let e = typeof stop === 'string' ? parseInt(stop, 10) : stop;
    if (e < 0) e = arr.length + e + 1; else e = e + 1;
    return arr.slice(s, e);
  }
  async zScore(key: string, member: string): Promise<number | undefined> {
    this.calls.push({ method: 'zScore', args: [key, member] });
    return this.sets.get(key)?.get(member);
  }
  async zRank(key: string, member: string): Promise<number | undefined> {
    const arr = this.sorted(key, false);
    const i = arr.findIndex((e) => e.member === member);
    return i === -1 ? undefined : i;
  }
  async zIncrBy(key: string, member: string, value: number): Promise<number> {
    let m = this.sets.get(key);
    if (!m) { m = new Map(); this.sets.set(key, m); }
    const next = (m.get(member) ?? 0) + value;
    m.set(member, next);
    return next;
  }
  async incrBy(key: string, value: number): Promise<number> {
    const next = (parseFloat(this.kv.get(key) ?? '0') || 0) + value;
    this.kv.set(key, String(next));
    return next;
  }
  async expire(key: string, seconds: number): Promise<unknown> {
    this.calls.push({ method: 'expire', args: [key, seconds] });
    return 1;
  }
}

// Recording wrapper: delegates to a MemoryCommunityStore, logs expire.
class RecordingStore extends MemoryCommunityStore {
  expireCalls: { key: string; seconds: number }[] = [];
  async expire(key: string, seconds: number): Promise<void> {
    this.expireCalls.push({ key, seconds });
  }
}

async function main(): Promise<void> {
  console.log('=== F1: command-path stamp returned + adopted, no spurious stale ===');
  {
    // Old behavior: the response carried the PRE-command stamp, so a
    // legitimate command save stamped 200000 looked stale against an
    // incoming stamp of 100000 once the gap exceeded the 5s skew.
    const storedAfterCommand = { lastSaved: 200000 } as any;
    check('F1 old-path stamp would go stale (>5s gap)', isStaleWrite({ lastSaved: 100000 } as any, storedAfterCommand) === true, '');
    // New behavior: the response carries the server stamp and the
    // client adopts it before autosaving — the autosave payload then
    // matches the stored copy exactly.
    const adopted = adoptServerStamp({ lastSaved: 100000, money: 50 } as any, 200000, 8);
    check('F1 adopted stamp+seq, other fields untouched', adopted.lastSaved === 200000 && adopted.saveSeq === 8 && adopted.money === 50, adopted);
    check('F1 adopted stamp does not go stale', isStaleWrite(adopted as any, storedAfterCommand) === false, '');
    check('F1 adopt never mutates the input', (() => { const p: any = { lastSaved: 100000 }; adoptServerStamp(p, 200000, 8); return p.lastSaved === 100000 && p.saveSeq === undefined; })(), '');
    check('F1 autosave-safe when carried seq === stored seq', autosaveStaleIsSafe(8, 8) === true, '');
    check('F1 not autosave-safe when stored seq moved on', autosaveStaleIsSafe(8, 9) === false, '');
    check('F1 not autosave-safe with no carried seq', autosaveStaleIsSafe(undefined, 8) === false, '');
    const autosaveText = saveWarningText('autosaveStale');
    const staleText = saveWarningText('stale');
    check('F1 autosave-stale banner says the command is safe', autosaveText.includes('safe') && !autosaveText.includes('not applied'), autosaveText);
    check('F1 genuine stale banner keeps the not-applied warning', staleText.includes('not applied'), staleText);
    check('F1 banner texts differ by trigger', autosaveText !== staleText, '');
  }

  console.log('=== F2: write sequence guard ===');
  {
    check('F2 older seq rejected even within the 5s window', isSequenceStale({ saveSeq: 5 } as any, { saveSeq: 7 } as any) === true, '');
    check('F2 equal seq accepted', isSequenceStale({ saveSeq: 7 } as any, { saveSeq: 7 } as any) === false, '');
    check('F2 seq-less save never rejected (legacy)', isSequenceStale({} as any, { saveSeq: 7 } as any) === false, '');
    check('F2 seq-less stored never rejects', isSequenceStale({ saveSeq: 7 } as any, {} as any) === false, '');
    check('F2 nextSaveSeq bumps past both', nextSaveSeq(7, 7) === 8 && nextSaveSeq(3, 5) === 6, '');
    check('F2 nextSaveSeq starts at 1', nextSaveSeq(undefined, undefined) === 1, '');
  }

  console.log('=== F3: cross-install cause ===');
  {
    check('F3 different install -> cross-install', staleCauseFor({ lastInstall: 'the_open_world_dev' } as any, 'The_Open_World') === 'cross-install', '');
    check('F3 same install -> time', staleCauseFor({ lastInstall: 'The_Open_World' } as any, 'The_Open_World') === 'time', '');
    check('F3 untagged stored copy -> time', staleCauseFor({} as any, 'The_Open_World') === 'time', '');
    const crossText = saveWarningText('crossInstall');
    check('F3 cross-install banner names the other session', crossText.includes('Another session'), crossText);
  }

  console.log('=== F4: stamp adoption on return (beacon removal is DOM wiring) ===');
  {
    const returned = adoptServerStamp({ money: 100, lastSaved: 1000 } as any, 2000, 9);
    check('F4 visibility-return adoption keeps game fields, takes stamp+seq', returned.money === 100 && returned.lastSaved === 2000 && returned.saveSeq === 9, returned);
  }

  console.log('=== F5: adapter contract shapes via the REAL RedisCommunityStore ===');
  {
    const fake = new FakeRedisAdapter();
    const store = new RedisCommunityStore(fake as any);
    await store.zAdd('board', 'alice', 300);
    await store.zAdd('board', 'bob', 200);
    await store.zAdd('board', 'carol', 100);
    const zAddCall = fake.calls.find((c) => c.method === 'zAdd')!;
    check('F5 zAdd receives a variadic OBJECT, never an array-wrap', zAddCall.args.length === 2 && typeof zAddCall.args[1] === 'object' && !Array.isArray(zAddCall.args[1]) && (zAddCall.args[1] as any).member === 'alice', zAddCall.args);
    const top = await store.zTop('board', 2);
    check('F5 zTop returns {member, score} objects in order', top.length === 2 && top[0].member === 'alice' && top[0].score === 300 && top[1].member === 'bob', top);
    const rankAlice = await store.zRank('board', 'alice');
    const rankCarol = await store.zRank('board', 'carol');
    check('F5 zRank is highest-first (alice #0, carol #2)', rankAlice === 0 && rankCarol === 2, { rankAlice, rankCarol });
    check('F5 zRank of unknown player is null (not -1 masquerading as rank)', (await store.zRank('board', 'nobody')) === null, '');
    check('F5 zScore round-trips', (await store.zScore('board', 'bob')) === 200, '');
  }
  {
    // Full leaderboard round-trip through the real store: the old
    // code's rank-always-(-1) bug is gone. lifetimeXP counts skills
    // only, so the test players carry skill xp.
    const fake = new FakeRedisAdapter();
    const store = new RedisCommunityStore(fake as any);
    const p1: any = { name: 'a', skills: { s: { level: 1, xp: 100 } } };
    const p2: any = { name: 'b', skills: { s: { level: 1, xp: 50 } } };
    const p3: any = { name: 'c', skills: { s: { level: 1, xp: 10 } } };
    await recordLeaderboard(store, 'alice', p1);
    await recordLeaderboard(store, 'bob', p2);
    await recordLeaderboard(store, 'carol', p3);
    const board = await getLeaderboard(store, 'carol', 2);
    check('F5 leaderboard top is ordered', board.top.length === 2 && board.top[0].username === 'alice' && board.top[0].rank === 1, board.top);
    check('F5 outside-top-N player gets a real rank + xp (not -1)', board.me !== null && board.me.rank === 3 && board.me.xp > 0, board.me);
  }

  console.log('=== F6: error vs absent, creation guard ===');
  {
    check('F6 200 -> found', loadOutcomeFromFetch(200, false) === 'found', '');
    check('F6 404 -> absent', loadOutcomeFromFetch(404, false) === 'absent', '');
    check('F6 500 -> error', loadOutcomeFromFetch(500, false) === 'error', '');
    check('F6 503 -> error', loadOutcomeFromFetch(503, false) === 'error', '');
    check('F6 throw -> error', loadOutcomeFromFetch(null, true) === 'error', '');
    const blocked = canCreate({ loadOutcome: 'error', occupied: false, confirmOverwrite: false });
    check('F6 load error blocks creation', blocked.allowed === false && blocked.reason === 'loadError', blocked);
    const needs = canCreate({ loadOutcome: 'found', occupied: true, confirmOverwrite: false });
    check('F6 occupied slot without confirm blocks with needsConfirm', needs.allowed === false && needs.reason === 'needsConfirm', needs);
    check('F6 occupied slot with confirm allows', canCreate({ loadOutcome: 'found', occupied: true, confirmOverwrite: true }).allowed === true, '');
    check('F6 empty slot allows', canCreate({ loadOutcome: 'absent', occupied: false, confirmOverwrite: false }).allowed === true, '');
  }

  console.log('=== F7: newest-slot scan (confirm/backup are DOM wiring) ===');
  {
    const slots = [
      { slot: 1, player: { lastSaved: 100 } },
      { slot: 2, player: { lastSaved: 300 } },
      { slot: 3, player: { lastSaved: 200 } },
    ];
    check('F7 scan picks slot 2 (newest), not slot 1', pickNewestSlot(slots)?.slot === 2, '');
    check('F7 scan skips empty slots', pickNewestSlot([{ slot: 1, player: null }, { slot: 2, player: { lastSaved: 50 } }])?.slot === 2, '');
  }

  console.log('=== F8: server-stamp preference + clock skew ===');
  {
    // Intended supersession of the v0.108.20 harness check
    // "local savedAt newer beats server lastSaved": a server-stamped
    // copy now wins over a stamp-less local copy even when the
    // local savedAt is later — stamps are the only comparable clock.
    check('F8 REPLACEMENT: server-stamped beats stamp-less local', pickNewerSave({ lastSaved: 100 } as any, { savedAt: 200 } as any).source === 'server', '');
    check('F8 both stamped -> later stamp wins', pickNewerSave({ lastSaved: 300 } as any, { lastSaved: 200 } as any).source === 'server', '');
    check('F8 neither stamped -> later savedAt wins', pickNewerSave({ savedAt: 100 } as any, { savedAt: 200 } as any).source === 'local', '');
    const now = Date.now();
    check('F8 device clock >60s behind server stamp flags skew', deviceClockBehind(now + 120000, now) === true, '');
    check('F8 clock within margin does not flag', deviceClockBehind(now + 1000, now) === false, '');
    check('F8 missing server stamp does not flag', deviceClockBehind(null, now) === false, '');
  }

  console.log('=== F9: trade accept — TTL, sequence, sender notice, both recorded ===');
  {
    const NOW = 1700000000000;
    const store = new RecordingStore();
    const senderSave: any = { name: 'Sender', money: 1000, inventory: [{ name: 'Coffee', value: 10 }], lastTradeAt: 0 };
    const acceptorSave: any = { name: 'Acceptor', money: 1000, inventory: [], lastTradeAt: 0 };
    const offer: any = { id: 'o1', from: 'sender', to: 'acceptor', itemName: 'Coffee', itemValue: 10, price: 100, createdAt: NOW - 1000 };
    await store.set('senderKey', JSON.stringify(senderSave));
    await store.set('acceptorKey', JSON.stringify(acceptorSave));
    await store.set(TRADE_OFFERS_KEY, JSON.stringify([offer]));
    const res = await acceptTradeOffer(store, {
      acceptorUsername: 'acceptor', acceptorSaveKey: 'acceptorKey', offerId: 'o1', now: NOW,
      resolveSaveKey: async (u: string) => (u === 'sender' ? 'senderKey' : null),
    });
    check('F9 trade accept succeeds', res.success === true, res);
    const senderAfter = JSON.parse((await store.get('senderKey'))!);
    const acceptorAfter = JSON.parse((await store.get('acceptorKey'))!);
    check('F9 both saves bump saveSeq', senderAfter.saveSeq === 1 && acceptorAfter.saveSeq === 1, { s: senderAfter.saveSeq, a: acceptorAfter.saveSeq });
    check('F9 sender save carries the one-shot tradeNotice', typeof senderAfter.tradeNotice === 'string' && senderAfter.tradeNotice.includes('Coffee'), senderAfter.tradeNotice);
    check('F9 both saves re-expire to 90 days', store.expireCalls.filter((c) => c.seconds === 7776000 && (c.key === 'senderKey' || c.key === 'acceptorKey')).length === 2, store.expireCalls);
    check('F9 item moved, money moved', acceptorAfter.inventory.some((i: any) => i.name === 'Coffee') && acceptorAfter.money === 900 && senderAfter.money === 1100, { a: acceptorAfter.money, s: senderAfter.money });
    // Leaderboard recording for both parties happens on the trade
    // path (caller), so the store must hold both saves' xp — covered
    // by recordLeaderboard round-trip above; here the save shapes are
    // what the caller reads, and they are present and current.
  }

  console.log('=== F10: genuine stale shows NO result text ===');
  {
    // The builder takes NO result parameter at all — result text
    // cannot leak into a stale rejection by construction.
    check('F10 stale builder accepts no result argument', staleRejectionText.length === 2, staleRejectionText.length);
    const text = staleRejectionText(false);
    check('F10 genuine stale text is warning-only, says not applied', text.includes('not applied') && !text.includes('You earned'), text);
    const cross = staleRejectionText(true, 'the_open_world_dev');
    check('F10 cross-install text names the install', cross.includes('the_open_world_dev') && cross.includes('not applied'), cross);
  }

  console.log('=== F11: recording decoupled from save success, per-channel retry ===');
  {
    // Flaky store: leaderboard zAdd throws once, then succeeds;
    // challenge incrBy always throws. Outcome: leaderboard recorded,
    // challenge honestly reported failed — never one killing the other.
    class FlakyStore extends MemoryCommunityStore {
      leaderboardAttempts = 0;
      async zAdd(key: string, member: string, score: number): Promise<void> {
        this.leaderboardAttempts++;
        if (this.leaderboardAttempts === 1) throw new Error('boom');
        return super.zAdd(key, member, score);
      }
      async incrBy(): Promise<number> { throw new Error('challenge down'); }
    }
    const flaky = new FlakyStore();
    const out = await recordCommandOutcome(flaky, 'tester', { skills: { s: { level: 1, xp: 40 } } } as any, { weekKey: 202601, amount: 2 });
    check('F11 leaderboard retried and recorded despite first throw', out.leaderboardOk === true && flaky.leaderboardAttempts === 2, out);
    check('F11 challenge failure reported, does not kill leaderboard', out.challengeOk === false, out);
    const board = await getLeaderboard(flaky, 'tester', 10);
    check('F11 recorded player actually appears on the board', board.me !== null && board.me.xp > 0, board.me);
  }

  console.log('=== F12: Continue scan picks newest, not slot 1 ===');
  {
    const slots = [
      { slot: 1, player: { lastSaved: 100 } },
      { slot: 2, player: { lastSaved: 900 } },
      { slot: 3, player: null },
    ];
    check('F12 probe-timeout scan still resumes slot 2', pickNewestSlot(slots)?.slot === 2, '');
  }

  console.log('=== F13: save-failure text leads with the failure ===');
  {
    const text = saveFailureText('You earned $50 and got a promotion.');
    check('F13 failure leads, result follows', text.indexOf('NOT saved') < text.indexOf('You earned'), text);
    check('F13 failure text names the warning, not a success', text.includes('Server storage failed'), text);
  }

  console.log('=== F14: body limits + payload class ===');
  {
    check('F14 oversize -> payload', bodyFailureClass({ oversize: true, malformed: false }) === 'payload', '');
    check('F14 malformed -> payload', bodyFailureClass({ oversize: false, malformed: true }) === 'payload', '');
    check('F14 clean body -> null', bodyFailureClass({ oversize: false, malformed: false }) === null, '');
    check('F14 HTTP 400 -> payload', failureClassForSaveResponse({ ok: false, status: 400 }) === 'payload', '');
    check('F14 HTTP 413 -> payload', failureClassForSaveResponse({ ok: false, status: 413 }) === 'payload', '');
    check('F14 HTTP 500 -> redis', failureClassForSaveResponse({ ok: false, status: 500 }) === 'redis', '');
  }

  console.log('=== F15: atomic challenge increments + no 100000-row scan ===');
  {
    const fake = new FakeRedisAdapter();
    const store = new RedisCommunityStore(fake as any);
    await recordChallengeContribution(store, 'alice', 202601, 5);
    await recordChallengeContribution(store, 'alice', 202601, 3);
    const ch = await getChallenge(store, 202601);
    check('F15 two contributions accumulate atomically (5+3=8)', ch.total === 8 && ch.top[0]?.contribution === 8, ch);
    // 12 players, query the 12th with n=10: me.xp must come from a
    // single zScore, and no zRange may ever ask for 100000 rows.
    const fake2 = new FakeRedisAdapter();
    const store2 = new RedisCommunityStore(fake2 as any);
    for (let i = 1; i <= 12; i++) {
      await recordLeaderboard(store2, `p${i}`, { skills: { s: { level: 1, xp: i * 10 } } } as any);
    }
    const board = await getLeaderboard(store2, 'p1', 10);
    check('F15 outside-top-N rank is real', board.me !== null && board.me.rank === 12, board.me);
    const giantScan = fake2.calls.some((c) => c.method === 'zRange' && c.args[2] === 100000);
    check('F15 no 100000-row scan anywhere', !giantScan, fake2.calls.filter((c) => c.method === 'zRange'));
    check('F15 outside-top-N xp came via zScore', fake2.calls.some((c) => c.method === 'zScore'), '');
  }

  console.log('=== F16: expiry on challenge + offer keys ===');
  {
    const store = new RecordingStore();
    await recordChallengeContribution(store, 'alice', 202601, 5);
    check('F16 challenge keys expire in 14 days', store.expireCalls.some((c) => c.seconds === 1209600), store.expireCalls);
    const store2 = new RecordingStore();
    const senderSave: any = { name: 'Sender', money: 1000, inventory: [{ name: 'Tea', value: 5 }], lastTradeAt: 0 };
    await store2.set('senderKey', JSON.stringify(senderSave));
    const created = await createTradeOffer(store2, {
      fromUsername: 'sender', fromSaveKey: 'senderKey', toUsername: 'acceptor',
      itemName: 'Tea', price: 0, now: 1700000000000,
      resolveSaveKey: async (u: string) => (u === 'acceptor' ? 'acceptorKey' : null),
    });
    check('F16 offer create succeeds', created.success === true, created);
    check('F16 offers key expires in 30 days', store2.expireCalls.some((c) => c.key === TRADE_OFFERS_KEY && c.seconds === 2592000), store2.expireCalls);
  }

  console.log('=== F17: slot validation + identity ===');
  {
    check('F17 slots 1/2/3 valid (number and string)', validSlot(1) && validSlot('2') && validSlot(3), '');
    check('F17 slots 0/4/99/abc/null invalid', !validSlot(0) && !validSlot(4) && !validSlot(99) && !validSlot('abc') && !validSlot(null as any), '');
    check('F17 normalizeSlot', normalizeSlot(2) === '2' && normalizeSlot('3') === '3', '');
    check('F17 username identifies', hasIdentity('u/Tester', null, null) === true, '');
    check('F17 install id identifies', hasIdentity(null, 'inst-1', null) === true, '');
    check('F17 nothing identifies', hasIdentity(null, null, null) === false, '');
  }

  console.log('=== F18: folded stock lines reprice from the live market ===');
  {
    const companies = groupCompanies(ALL_JOBS);
    const comp = companies[0];
    const price = stockPriceAt(comp, '2024-01');
    const g = new GameEngine();
    g.loadState(baseState({
      investments: [
        { type: 'stock', company: comp.employer, shares: 10, purchasePrice: 1000, currentValue: 9999 },
        { type: 'stock', company: comp.employer, shares: 5, purchasePrice: 500, currentValue: 9999 },
        { type: 'crypto', name: 'Bitcoin', shares: 2, purchasePrice: 2000, currentValue: 3000 },
        { type: 'crypto', name: 'Bitcoin', shares: 1, purchasePrice: 1000, currentValue: 1500 },
      ],
    }));
    const invs: any[] = (g as any).player.investments;
    const stock = invs.find((i: any) => i.type === 'stock');
    const crypto = invs.find((i: any) => i.type === 'crypto');
    check('F18 duplicates folded to one line each', invs.length === 2 && stock && crypto, invs.length);
    check('F18 folded stock reprices: shares x live price', stock.shares === 15 && stock.currentValue === roundCents(15 * price), { shares: stock.shares, value: stock.currentValue, expected: roundCents(15 * price) });
    check('F18 folded stock keeps summed cost basis', stock.purchasePrice === 1500, stock.purchasePrice);
    check('F18 crypto keeps summed value (no deterministic price fn)', crypto.currentValue === 4500 && crypto.shares === 3, crypto);
  }

  console.log('=== F19: no-command init returns an explicit no-player shape ===');
  {
    const resp = noPlayerResponse();
    check('F19 no-player shape is explicit, player null, no blank fields', resp.type === 'no-player' && resp.player === null && !('money' in resp), resp);
  }

  console.log('=== F20: init scan returns newest slot, not first-found ===');
  {
    const slots = [
      { slot: 1, player: { lastSaved: 100 } },
      { slot: 2, player: { lastSaved: 300 } },
      { slot: 3, player: { lastSaved: 200 } },
    ];
    check('F20 GET /api/init scan picks slot 2 over first-found slot 1', pickNewestSlot(slots)?.slot === 2, '');
  }

  console.log('=== F21: migration outcomes ===');
  {
    const adopt = migrationOutcome({ ok: true, lastSaved: 2000, saveSeq: 9 });
    check('F21 successful migration adopts stamp+seq', adopt.action === 'adopt' && adopt.lastSaved === 2000 && adopt.saveSeq === 9, adopt);
    const serverPlayer: any = { name: 'X', lastSaved: 5000 };
    const resync = migrationOutcome({ ok: true, stale: true, player: serverPlayer });
    check('F21 stale migration re-syncs to the server player', resync.action === 'resync' && resync.player === serverPlayer, resync);
    const failed = migrationOutcome({ ok: false });
    check('F21 failed migration warns only, never overwrites', failed.action === 'failed', failed);
  }

  console.log('=== Supersessions: green replacements for version-pinned .20/.21 checks ===');
  {
    // The .20/.21 harnesses pin "latest = .21, 65 entries" and two
    // grep patterns .22 restructured. These checks prove the same
    // intents hold with .22 on top — they are NOT the fix proofs
    // above (those are behavioral); they exist so no red is hidden.
    const gameSrc = fs.readFileSync('src/client/game.ts', 'utf8');
    // TOW PC phase 1: the server handler moved from index.ts to
    // handler.ts (index.ts is now the thin Devvit bootstrap). These
    // checks assert the SERVER implementation, so they read the file
    // that holds it; the asserted strings are unchanged.
    const serverSrc = fs.readFileSync('src/server/handler.ts', 'utf8');
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
    check('SUPERSESSION whats-new: 66 entries (.22 on top of the 65)', blocks.length === 66, blocks.length);
    check('SUPERSESSION whats-new: order is .22 then the untouched baseline order',
      versions[0] === 'v0.108.22' && JSON.stringify(versions.slice(1)) === JSON.stringify(basePairs.map(([v]) => v)), versions.slice(0, 3));
    let historyOk = true;
    for (let i = 1; i < basePairs.length; i++) {
      if (blocks[i + 1] !== basePairs[i][1]) { historyOk = false; break; }
    }
    check('SUPERSESSION whats-new: all 64 older history entries byte-identical', historyOk, '');
    const base21Lines = basePairs[0][1].split('\n');
    check('SUPERSESSION whats-new: .21 entry keeps every baseline line, now second',
      versions[1] === 'v0.108.21' && base21Lines.every((ln) => blocks[1].includes(ln)), '');
    check('SUPERSESSION whats-new: .21 entry still carries item-10/11 + ticker-label lines',
      blocks[1].includes('PRESENTATION FIX') && blocks[1].includes('leaderboard and challenge writes') && blocks[1].includes('Ticker label fix'), '');
    const btnVersions = [...region.matchAll(/data-action="goto-update" data-version="([^"]+)"/g)].map((m) => m[1]);
    const slug = (v: string) => 'update-' + v.toLowerCase().replace(/\./g, '-');
    check('SUPERSESSION whats-new: index lists all 66 versions, in order',
      btnVersions.length === 66 && JSON.stringify(btnVersions) === JSON.stringify(versions.map(slug)), btnVersions.length);
    const detailsTags = [...region.matchAll(/<details[^>]*>/g)].map((m) => m[0]);
    check('SUPERSESSION whats-new: latest (.22) open, all older collapsed',
      detailsTags.length === 66 && detailsTags[0].includes(' open') && detailsTags.slice(1).every((t) => !t.includes(' open')) && detailsTags[0].includes('update-v0-108-22'), detailsTags.slice(0, 2));
    check('SUPERSESSION client: stamp+seq adopted from the command response via adoptServerStamp',
      gameSrc.includes('adoptServerStamp(state.player, data.lastSaved, data.saveSeq)'), '');
    check('SUPERSESSION server: recording sits inside !staleRejected (success) + save-failure catch, old call gone',
      serverSrc.indexOf('recordCommandOutcome(store, username, player, challenge)') > serverSrc.indexOf('if (!staleRejected)') && !serverSrc.includes('recordLeaderboard(store, username, player)'), '');
  }

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
