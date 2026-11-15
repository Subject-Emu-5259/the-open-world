// THE OPEN WORLD — v0.108.20 community systems (leaderboard,
// challenges, trading). Pure logic over an injected store interface so
// the harness can prove it with an in-memory store; production passes
// the Devvit Redis adapter (see src/server/index.ts). No engine
// dependency: the engine never sees Redis, so these live here and in
// the server handler. All trading failures FAIL CLOSED: no state moves
// unless every validation precedes every move.

import { challengeGoalForWeek, lifetimeXP, specNetWorth, fameScore } from './features-0.108.20.js';
import {
  TRADE_MAX_OPEN_OFFERS, TRADE_MAX_PRICE, TRADE_MAX_ITEM_VALUE,
  TRADE_HOURLY_LIMIT_MS, TRADE_EXPIRY_MS, tradeItemName, tradeItemValue,
} from './features-0.108.20.js';

export interface CommunityStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  zAdd(key: string, member: string, score: number): Promise<void>;
  zTop(key: string, n: number): Promise<{ member: string; score: number }[]>;
  zRank(key: string, member: string): Promise<number | null>; // 0-based, highest first
  zScore(key: string, member: string): Promise<number | null>;
  zIncrBy(key: string, member: string, amount: number): Promise<number>;
  incrBy(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

// In-memory store for the harness (and any non-Redis embedding).
export class MemoryCommunityStore implements CommunityStore {
  private kv = new Map<string, string>();
  private sets = new Map<string, Map<string, number>>();
  async get(key: string): Promise<string | null> { return this.kv.get(key) ?? null; }
  async set(key: string, value: string): Promise<void> { this.kv.set(key, value); }
  async del(key: string): Promise<void> { this.kv.delete(key); }
  async zAdd(key: string, member: string, score: number): Promise<void> {
    if (!this.sets.has(key)) this.sets.set(key, new Map());
    this.sets.get(key)!.set(member, score);
  }
  private sorted(key: string): { member: string; score: number }[] {
    const m = this.sets.get(key);
    if (!m) return [];
    return [...m.entries()].map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score || a.member.localeCompare(b.member));
  }
  async zTop(key: string, n: number): Promise<{ member: string; score: number }[]> {
    return this.sorted(key).slice(0, n);
  }
  async zRank(key: string, member: string): Promise<number | null> {
    const idx = this.sorted(key).findIndex((e) => e.member === member);
    return idx === -1 ? null : idx;
  }
  async zScore(key: string, member: string): Promise<number | null> {
    return this.sets.get(key)?.get(member) ?? null;
  }
  async zIncrBy(key: string, member: string, amount: number): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Map());
    const m = this.sets.get(key)!;
    const next = (m.get(member) ?? 0) + amount;
    m.set(member, next);
    return next;
  }
  async incrBy(key: string, amount: number): Promise<number> {
    const next = (parseFloat(this.kv.get(key) ?? '0') || 0) + amount;
    this.kv.set(key, String(next));
    return next;
  }
  async expire(_key: string, _seconds: number): Promise<void> { /* in-memory: no TTL */ }
}

export const LEADERBOARD_KEY = 'tow:leaderboard';
export const TRADE_OFFERS_KEY = 'tow:trade:offers';
export const USERNAME_INDEX_PREFIX = 'tow:username:';

export function usernameIndexKey(username: string): string {
  return `${USERNAME_INDEX_PREFIX}${username.toLowerCase()}`;
}
export function challengeTotalKey(weekKey: number): string {
  return `tow:challenge:${weekKey}:total`;
}
export function challengeContribKey(weekKey: number): string {
  return `tow:challenge:${weekKey}:contrib`;
}

export interface BoardEntry { username: string; xp: number; rank: number }

// v0.108.25 (§74): richer boards. Lifetime stays LEADERBOARD_KEY with
// its read/write path untouched. Weekly/monthly are REAL-world buckets
// of XP gained in the bucket, accumulated as deltas against the last
// lifetime XP the write path saw. lastxp is set BEFORE the increments,
// so a retry after a partial write can undercount a bucket but never
// double-count it — best-effort channel, same loss class as the
// existing path. Wealth/fame are current-value snapshots at save time.
// Every entry is a real recorded player; an empty board reads empty.
export const LEADERBOARD_LASTXP_PREFIX = 'tow:lb:lastxp:';
export const LEADERBOARD_WEALTH_KEY = 'tow:lb:wealth';
export const LEADERBOARD_FAME_KEY = 'tow:lb:fame';
export function leaderboardWeekKey(nowMs: number): string {
  const d = new Date(nowMs);
  const mondayOffset = (d.getUTCDay() + 6) % 7; // Monday of this UTC week
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset));
  return monday.toISOString().slice(0, 10);
}
export function leaderboardWeekSetKey(nowMs: number): string {
  return `tow:lb:week:${leaderboardWeekKey(nowMs)}`;
}
export function leaderboardMonthSetKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `tow:lb:month:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
export type BoardId = 'lifetime' | 'weekly' | 'monthly' | 'wealth' | 'fame';
export const BOARD_DEFS: Record<BoardId, { label: string; scoreLabel: string; money?: boolean }> = {
  lifetime: { label: 'Lifetime XP', scoreLabel: 'XP' },
  weekly: { label: 'This week', scoreLabel: 'XP this week' },
  monthly: { label: 'This month', scoreLabel: 'XP this month' },
  wealth: { label: 'Net worth', scoreLabel: 'net worth', money: true },
  fame: { label: 'Fame', scoreLabel: 'fame' },
};
export function boardSetKey(board: BoardId, nowMs: number): string {
  switch (board) {
    case 'lifetime': return LEADERBOARD_KEY;
    case 'weekly': return leaderboardWeekSetKey(nowMs);
    case 'monthly': return leaderboardMonthSetKey(nowMs);
    case 'wealth': return LEADERBOARD_WEALTH_KEY;
    case 'fame': return LEADERBOARD_FAME_KEY;
  }
}
export interface BoardResult {
  board: BoardId;
  top: { username: string; score: number; rank: number }[];
  me: { rank: number; score: number } | null;
}
export async function getBoard(store: CommunityStore, board: BoardId, username: string | null, n: number = 10, nowMs: number = Date.now()): Promise<BoardResult> {
  const key = boardSetKey(board, nowMs);
  const topRaw = await store.zTop(key, n);
  const top = topRaw.map((e, i) => ({ username: e.member, score: e.score, rank: i + 1 }));
  let me: { rank: number; score: number } | null = null;
  if (username) {
    const rank0 = await store.zRank(key, username);
    if (rank0 !== null) {
      const entry = topRaw.find((e) => e.member === username);
      let score = entry?.score;
      if (score === undefined) {
        score = (await store.zScore(key, username)) ?? 0;
      }
      me = { rank: rank0 + 1, score };
    }
  }
  return { board, top, me };
}

export async function recordLeaderboard(store: CommunityStore, username: string, player: any, nowMs: number = Date.now()): Promise<void> {
  const xp = lifetimeXP(player);
  await store.zAdd(LEADERBOARD_KEY, username, xp);
  // v0.108.25: weekly/monthly deltas + wealth/fame snapshots. Lifetime
  // lands first so a later throw never takes it down with the rest.
  const lastKey = `${LEADERBOARD_LASTXP_PREFIX}${username.toLowerCase()}`;
  const last = parseFloat((await store.get(lastKey)) ?? '0') || 0;
  const delta = Math.max(0, xp - last);
  await store.set(lastKey, String(xp));
  if (delta > 0) {
    const weekKey = leaderboardWeekSetKey(nowMs);
    await store.zIncrBy(weekKey, username, delta);
    await store.expire(weekKey, 14 * 24 * 60 * 60);
    const monthKey = leaderboardMonthSetKey(nowMs);
    await store.zIncrBy(monthKey, username, delta);
    await store.expire(monthKey, 62 * 24 * 60 * 60);
  }
  await store.zAdd(LEADERBOARD_WEALTH_KEY, username, specNetWorth(player));
  const unlocked = Array.isArray(player.achievements?.unlocked) ? player.achievements.unlocked.length : 0;
  await store.zAdd(LEADERBOARD_FAME_KEY, username, fameScore(player, unlocked));
}

export async function getLeaderboard(store: CommunityStore, username: string | null, n = 10): Promise<{ top: BoardEntry[]; me: { rank: number; xp: number } | null }> {
  const topRaw = await store.zTop(LEADERBOARD_KEY, n);
  const top: BoardEntry[] = topRaw.map((e, i) => ({ username: e.member, xp: e.score, rank: i + 1 }));
  let me: { rank: number; xp: number } | null = null;
  if (username) {
    const rank0 = await store.zRank(LEADERBOARD_KEY, username);
    if (rank0 !== null) {
      const entry = topRaw.find((e) => e.member === username);
      // Score comes from the set itself when the player is outside top N —
      // v0.108.22 (F15): a single zScore call, never the old 100000-row
      // full scan for one player's xp.
      let xp = entry?.score;
      if (xp === undefined) {
        xp = (await store.zScore(LEADERBOARD_KEY, username)) ?? 0;
      }
      me = { rank: rank0 + 1, xp };
    }
  }
  return { top, me };
}

export async function recordChallengeContribution(store: CommunityStore, username: string, weekKey: number, amount: number): Promise<void> {
  if (amount <= 0) return;
  // v0.108.22 (F15/F16): atomic increments, no read-modify-write race;
  // challenge keys expire a fortnight after the week (week + grace).
  // Expiry rides a separate expire call (INCRBY cannot carry one) —
  // it never rewrites the value, so it cannot clobber a concurrent
  // increment the way a get→set-back would.
  if (Number.isInteger(amount)) {
    await store.incrBy(challengeTotalKey(weekKey), amount);
  } else {
    const totalRaw = await store.get(challengeTotalKey(weekKey));
    const total = (parseFloat(totalRaw ?? '0') || 0) + amount;
    await store.set(challengeTotalKey(weekKey), String(total));
  }
  await store.expire(challengeTotalKey(weekKey), 14 * 24 * 60 * 60);
  await store.zIncrBy(challengeContribKey(weekKey), username, amount);
  await store.expire(challengeContribKey(weekKey), 14 * 24 * 60 * 60);
}

// v0.108.22 (F11): command-outcome recording, DECOUPLED from save
// success. The old code recorded only inside `if (!staleRejected)`
// after a successful save, in ONE try block — so a save exception
// skipped recording entirely, and a leaderboard throw killed the
// challenge contribution with it. Now each recording runs in its
// own try block with one retry, and the caller invokes this
// whenever the command was applied (save success OR save failure),
// never when the command was stale-rejected (provably unapplied).
// Returns per-channel success so the caller can log, never throw.
export async function recordCommandOutcome(
  store: CommunityStore,
  username: string,
  player: any,
  challenge: { weekKey: number; amount: number } | null,
): Promise<{ leaderboardOk: boolean; challengeOk: boolean }> {
  let leaderboardOk = false;
  for (let attempt = 0; attempt < 2 && !leaderboardOk; attempt++) {
    try {
      await recordLeaderboard(store, username, player);
      leaderboardOk = true;
    } catch { /* retry once, then report false */ }
  }
  let challengeOk = true;
  if (challenge && challenge.amount > 0) {
    challengeOk = false;
    for (let attempt = 0; attempt < 2 && !challengeOk; attempt++) {
      try {
        await recordChallengeContribution(store, username, challenge.weekKey, challenge.amount);
        challengeOk = true;
      } catch { /* retry once, then report false */ }
    }
  }
  return { leaderboardOk, challengeOk };
}

export async function getChallenge(store: CommunityStore, weekKey: number): Promise<{ goal: ReturnType<typeof challengeGoalForWeek>; total: number; top: { username: string; contribution: number }[] }> {
  const goal = challengeGoalForWeek(weekKey);
  const totalRaw = await store.get(challengeTotalKey(weekKey));
  const total = parseFloat(totalRaw ?? '0') || 0;
  const raw = await store.zTop(challengeContribKey(weekKey), 10);
  return { goal, total, top: raw.map((e) => ({ username: e.member, contribution: e.score })) };
}

// --- Trading ---

export interface TradeOffer {
  id: string; from: string; to: string;
  itemName: string; itemValue: number; price: number; createdAt: number;
}

async function loadOffers(store: CommunityStore): Promise<TradeOffer[]> {
  const raw = await store.get(TRADE_OFFERS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
async function saveOffers(store: CommunityStore, offers: TradeOffer[]): Promise<void> {
  await store.set(TRADE_OFFERS_KEY, JSON.stringify(offers));
  // v0.108.22 (F16): the offers key expires (offers themselves prune
  // after 7 days; the key must not accumulate forever).
  await store.expire(TRADE_OFFERS_KEY, 30 * 24 * 60 * 60);
}
function pruneExpired(offers: TradeOffer[], now: number): { kept: TradeOffer[]; pruned: TradeOffer[] } {
  const kept: TradeOffer[] = [];
  const pruned: TradeOffer[] = [];
  for (const o of offers) {
    if (now - o.createdAt > TRADE_EXPIRY_MS) pruned.push(o);
    else kept.push(o);
  }
  return { kept, pruned };
}
function findItemIndex(inventory: any[], itemName: string): number {
  const q = itemName.toLowerCase();
  return (inventory ?? []).findIndex((it: any) => tradeItemName(it).toLowerCase() === q);
}

export type TradeResult = { success: boolean; message: string; offer?: TradeOffer };

export async function createTradeOffer(
  store: CommunityStore,
  opts: {
    fromUsername: string; fromSaveKey: string; toUsername: string;
    itemName: string; price: number; now: number;
    resolveSaveKey: (username: string) => Promise<string | null>;
  },
): Promise<TradeResult> {
  const from = opts.fromUsername;
  const to = opts.toUsername;
  if (!to || to.toLowerCase() === from.toLowerCase()) {
    return { success: false, message: 'You cannot trade with yourself.' };
  }
  if (!Number.isFinite(opts.price) || opts.price < 0 || opts.price > TRADE_MAX_PRICE) {
    return { success: false, message: `Trade price must be between $0 and $${TRADE_MAX_PRICE.toLocaleString()}.` };
  }
  const senderRaw = await store.get(opts.fromSaveKey);
  if (!senderRaw) return { success: false, message: 'Your save could not be loaded — trading needs a saved game.' };
  let sender: any;
  try { sender = JSON.parse(senderRaw); } catch { return { success: false, message: 'Your save could not be read.' }; }
  if (sender.incarcerated) {
    return { success: false, message: 'You cannot trade while incarcerated.' };
  }
  const idx = findItemIndex(sender.inventory ?? [], opts.itemName);
  if (idx === -1) {
    return { success: false, message: `You don't own an item named "${opts.itemName}". Trading uses your saved inventory only.` };
  }
  const item = (sender.inventory ?? [])[idx];
  const value = tradeItemValue(item);
  if (value > TRADE_MAX_ITEM_VALUE) {
    return { success: false, message: `That item is worth $${value.toLocaleString()} — items worth more than $${TRADE_MAX_ITEM_VALUE.toLocaleString()} cannot be traded.` };
  }
  const toKey = await opts.resolveSaveKey(to);
  if (!toKey) {
    return { success: false, message: `${to} has no recorded save yet — they need to play (and save) first before they can receive trades.` };
  }
  const offers = await loadOffers(store);
  const { kept } = pruneExpired(offers, opts.now);
  const openFrom = kept.filter((o) => o.from.toLowerCase() === from.toLowerCase()).length;
  if (openFrom >= TRADE_MAX_OPEN_OFFERS) {
    await saveOffers(store, kept);
    return { success: false, message: `You already have ${TRADE_MAX_OPEN_OFFERS} open offers — cancel or wait for one to resolve first.` };
  }
  const offer: TradeOffer = {
    id: `trade-${opts.now}-${Math.random().toString(36).slice(2, 8)}`,
    from, to, itemName: tradeItemName(item), itemValue: value, price: opts.price, createdAt: opts.now,
  };
  kept.push(offer);
  await saveOffers(store, kept);
  return { success: true, message: `Trade offer created: ${offer.itemName} to ${to} for $${opts.price.toLocaleString()}${opts.price === 0 ? ' (gift)' : ''}. Offer id: ${offer.id}. It expires in 7 days.`, offer };
}

export async function listTradeOffers(
  store: CommunityStore, username: string, now: number,
): Promise<{ incoming: TradeOffer[]; outgoing: TradeOffer[] }> {
  const offers = await loadOffers(store);
  const { kept, pruned } = pruneExpired(offers, now);
  if (pruned.length > 0) await saveOffers(store, kept);
  const lower = username.toLowerCase();
  return {
    incoming: kept.filter((o) => o.to.toLowerCase() === lower),
    outgoing: kept.filter((o) => o.from.toLowerCase() === lower),
  };
}

async function removeOffer(store: CommunityStore, offerId: string, now: number): Promise<TradeOffer | null> {
  const offers = await loadOffers(store);
  const { kept } = pruneExpired(offers, now);
  const idx = kept.findIndex((o) => o.id === offerId);
  if (idx === -1) { await saveOffers(store, kept); return null; }
  const [offer] = kept.splice(idx, 1);
  await saveOffers(store, kept);
  return offer ?? null;
}

export async function declineTradeOffer(store: CommunityStore, username: string, offerId: string, now: number): Promise<TradeResult> {
  const offers = await loadOffers(store);
  const { kept } = pruneExpired(offers, now);
  const offer = kept.find((o) => o.id === offerId);
  if (!offer) { await saveOffers(store, kept); return { success: false, message: 'That offer no longer exists (it may have expired).' }; }
  if (offer.to.toLowerCase() !== username.toLowerCase()) {
    return { success: false, message: 'That offer was not addressed to you.' };
  }
  await saveOffers(store, kept.filter((o) => o.id !== offerId));
  return { success: true, message: `Declined ${offer.from}'s offer of ${offer.itemName}.` };
}

export async function cancelTradeOffer(store: CommunityStore, username: string, offerId: string, now: number): Promise<TradeResult> {
  const offers = await loadOffers(store);
  const { kept } = pruneExpired(offers, now);
  const offer = kept.find((o) => o.id === offerId);
  if (!offer) { await saveOffers(store, kept); return { success: false, message: 'That offer no longer exists (it may have expired).' }; }
  if (offer.from.toLowerCase() !== username.toLowerCase()) {
    return { success: false, message: 'Only the sender can cancel that offer.' };
  }
  await saveOffers(store, kept.filter((o) => o.id !== offerId));
  return { success: true, message: `Cancelled your offer of ${offer.itemName} to ${offer.to}.` };
}

// Atomic accept, in the spec's order: (1) load offer, missing/expired
// fails; (2) DELETE the offer first so a concurrent second accept finds
// nothing; (3) re-validate sender ownership against the LIVE save;
// (4) all validations precede all moves, so a cash-short abort happens
// before anything moves (offer already deleted = trade void, no
// duplication, no partial transfer); (5) save both players.
export async function acceptTradeOffer(
  store: CommunityStore,
  opts: {
    acceptorUsername: string; acceptorSaveKey: string; offerId: string; now: number;
    resolveSaveKey: (username: string) => Promise<string | null>;
  },
): Promise<TradeResult> {
  const acceptorName = opts.acceptorUsername;
  // Pre-delete validations that never move state.
  const offersPre = await loadOffers(store);
  const { kept: keptPre } = pruneExpired(offersPre, opts.now);
  const pre = keptPre.find((o) => o.id === opts.offerId);
  if (!pre) {
    await saveOffers(store, keptPre);
    return { success: false, message: 'That offer no longer exists (it may have expired or already been accepted).' };
  }
  if (pre.to.toLowerCase() !== acceptorName.toLowerCase()) {
    return { success: false, message: 'That offer was not addressed to you.' };
  }
  const acceptorRawPre = await store.get(opts.acceptorSaveKey);
  if (!acceptorRawPre) return { success: false, message: 'Your save could not be loaded.' };
  let acceptorPre: any;
  try { acceptorPre = JSON.parse(acceptorRawPre); } catch { return { success: false, message: 'Your save could not be read.' }; }
  if (acceptorPre.incarcerated) {
    return { success: false, message: 'You cannot accept trades while incarcerated.' };
  }
  const lastTrade = acceptorPre.lastTradeAt ?? 0;
  if (opts.now - lastTrade < TRADE_HOURLY_LIMIT_MS) {
    return { success: false, message: 'You already completed a trade within the last hour — one trade per hour.' };
  }
  // (2) DELETE the offer first.
  const offer = await removeOffer(store, opts.offerId, opts.now);
  if (!offer) {
    return { success: false, message: 'That offer no longer exists (it may have expired or already been accepted).' };
  }
  // (3) Re-validate sender ownership against the LIVE save.
  const senderKey = await opts.resolveSaveKey(offer.from);
  if (!senderKey) {
    return { success: false, message: 'Trade void: the sender\'s save could not be found. Nothing moved.' };
  }
  const senderRaw = await store.get(senderKey);
  if (!senderRaw) {
    return { success: false, message: 'Trade void: the sender\'s save could not be loaded. Nothing moved.' };
  }
  let sender: any;
  try { sender = JSON.parse(senderRaw); } catch {
    return { success: false, message: 'Trade void: the sender\'s save could not be read. Nothing moved.' };
  }
  const senderLastTrade = sender.lastTradeAt ?? 0;
  if (opts.now - senderLastTrade < TRADE_HOURLY_LIMIT_MS) {
    return { success: false, message: 'Trade void: the sender already traded within the last hour. Nothing moved.' };
  }
  const idx = findItemIndex(sender.inventory ?? [], offer.itemName);
  if (idx === -1) {
    return { success: false, message: `Trade void: ${offer.from} no longer owns ${offer.itemName}. Nothing moved.` };
  }
  const item = (sender.inventory ?? [])[idx];
  // (4) Cash check BEFORE any move.
  const acceptorRaw = await store.get(opts.acceptorSaveKey);
  if (!acceptorRaw) {
    return { success: false, message: 'Trade void: your save could not be reloaded. Nothing moved.' };
  }
  let acceptor: any;
  try { acceptor = JSON.parse(acceptorRaw); } catch {
    return { success: false, message: 'Trade void: your save could not be read. Nothing moved.' };
  }
  if ((acceptor.money ?? 0) < offer.price) {
    return { success: false, message: `Trade void: you need $${offer.price.toLocaleString()} but have $${(acceptor.money ?? 0).toFixed(2)}. The offer is gone and nothing moved.` };
  }
  // All validations passed — now, and only now, move state.
  (sender.inventory ?? []).splice(idx, 1);
  if (!Array.isArray(acceptor.inventory)) acceptor.inventory = [];
  acceptor.inventory.push(item);
  acceptor.money = Math.round(((acceptor.money ?? 0) - offer.price) * 100) / 100;
  sender.money = Math.round(((sender.money ?? 0) + offer.price) * 100) / 100;
  acceptor.lastTradeAt = opts.now;
  sender.lastTradeAt = opts.now;
  // v0.108.20 (item 28): stamp both saves so the server staleness guard
  // treats them as newer than any pre-trade client copy — otherwise a
  // stale client save could overwrite the traded state.
  // v0.108.22 (F9): bump the write sequence too (same reason), keep
  // the 90-day TTL the direct set used to drop, and leave the sender
  // a one-shot notice — their next command-path response surfaces it
  // and clears it, so they learn a trade changed their game.
  acceptor.lastSaved = opts.now;
  sender.lastSaved = opts.now;
  acceptor.saveSeq = (typeof acceptor.saveSeq === 'number' ? acceptor.saveSeq : 0) + 1;
  sender.saveSeq = (typeof sender.saveSeq === 'number' ? sender.saveSeq : 0) + 1;
  sender.tradeNotice = `Trade complete: ${acceptorName} received ${offer.itemName} from you${offer.price > 0 ? ` for $${offer.price.toLocaleString()}` : ' (gift)'}!`;
  await store.set(senderKey, JSON.stringify(sender));
  await store.expire(senderKey, 90 * 24 * 60 * 60);
  await store.set(opts.acceptorSaveKey, JSON.stringify(acceptor));
  await store.expire(opts.acceptorSaveKey, 90 * 24 * 60 * 60);
  return { success: true, message: `Trade complete: you received ${offer.itemName} from ${offer.from}${offer.price > 0 ? ` for $${offer.price.toLocaleString()}` : ' (gift)'}!` };
}
