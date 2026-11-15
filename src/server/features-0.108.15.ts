// THE OPEN WORLD — v0.108.15 feature batch
// Business ownership, daily goals, NPC depth tables, story/journal view,
// plus the scope expansion: government/law tables and the job ladder.
// Pure helpers over the player object: no new services, no new currencies,
// no dialogue/Optra changes. All new player fields are additive, so old
// saves (which lack them) keep loading — every accessor defaults them.

import { CITY_METADATA } from '../shared/types.js';

// === GOVERNMENT & LAW ===
// Built on the existing crime system, not a separate civ sim. Offense
// heat/reward numbers mirror the crime table in game-engine.ts; the fine
// schedule is the court's price for each offense (2x–4x the typical take
// for small offenses, so crime stays risky even when it pays). Enforcement
// comes from the city's existing crimeRate in CITY_METADATA.

export interface OffenseFine { key: string; label: string; fine: number; heat: number }

export const OFFENSE_FINES: OffenseFine[] = [
  { key: 'pickpocket', label: 'Pickpocketing', fine: 100, heat: 5 },
  { key: 'shoplift', label: 'Shoplifting', fine: 400, heat: 15 },
  { key: 'scam', label: 'Scamming', fine: 1000, heat: 20 },
  { key: 'robbery', label: 'Robbery', fine: 2000, heat: 30 },
  { key: 'grand_theft_auto', label: 'Grand theft auto', fine: 6000, heat: 35 },
  { key: 'heist', label: 'Heist', fine: 20000, heat: 50 },
];

export function fineForOffense(crimeName: string): OffenseFine | undefined {
  const n = crimeName.toLowerCase();
  return OFFENSE_FINES.find((o) => n.includes(o.key.replace(/_/g, ' ')) || n.includes(o.key));
}

export function enforcementLevel(city: string): string {
  const rate = CITY_METADATA[city as keyof typeof CITY_METADATA]?.crimeRate ?? 50;
  if (rate >= 60) return 'Strict';
  if (rate >= 40) return 'Moderate';
  return 'Relaxed';
}

export function totalOutstandingFines(player: any): number {
  return ((player.fines ?? []) as { amount: number }[]).reduce((s, f) => s + (f.amount || 0), 0);
}

// === JOB LADDER ===
// Tiers come from the existing JobTier type; the ladder only orders them.
// Promotion never changes the employer's listing — it mutates the player's
// own job record (pay + title prefix), so job-database data stays pristine
// and a re-hire always starts clean.

export const TIER_ORDER = ['entry', 'skilled', 'career', 'elite', 'executive'] as const;

export function nextTier(tier: string): string | null {
  const idx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1]!;
}

export const PROMOTION_TITLE_PREFIX = ['Senior ', 'Lead ', 'Principal '] as const;

// === BUSINESS OWNERSHIP ===
// Economy anchor (checked against the tree before pricing): entry jobs pay
// ~$26k–$38k/yr (~$2,200–$3,200/mo gross), owned-property rents run
// ~$800–$3,500/mo on occupied units only, bank interest is 0.5%/mo.
// Business net income is deliberately BELOW a typical rent: a business is
// a side income, not a money printer. Net = base income, already net of
// upkeep — the monthly tick pays exactly this, once per game-month.

export interface Business {
  id: string;
  name: string;
  type: string;
  purchasePrice: number;
  monthlyIncome: number; // net, per game-month
  purchasedAt: number;
}

export interface BusinessCatalogEntry {
  type: string;
  name: string;
  price: number;
  monthlyIncome: number;
  description: string;
}

export const BUSINESS_CATALOG: BusinessCatalogEntry[] = [
  { type: 'food_truck', name: 'Food Truck', price: 4000, monthlyIncome: 260, description: 'A rolling kitchen. Steady lunch crowds, thin margins.' },
  { type: 'barbershop', name: 'Barbershop', price: 6000, monthlyIncome: 380, description: 'Chairs full on weekends. Regulars keep it alive.' },
  { type: 'corner_store', name: 'Corner Store', price: 8000, monthlyIncome: 520, description: 'Snacks, drinks, and essentials for the block.' },
  { type: 'laundromat', name: 'Laundromat', price: 10000, monthlyIncome: 640, description: 'Machines hum all day. Low drama, steady quarters.' },
  { type: 'coffee_cart', name: 'Coffee Cart', price: 2500, monthlyIncome: 180, description: 'Cheap to start, modest return. Morning rush only.' },
  { type: 'auto_shop', name: 'Auto Shop', price: 12000, monthlyIncome: 750, description: 'Oil, brakes, and word of mouth. The priciest start here.' },
];

export function ownedBusinesses(player: any): Business[] {
  return (player.businesses ?? []) as Business[];
}

export function businessMonthlyIncome(player: any): number {
  return ownedBusinesses(player).reduce((sum, b) => sum + (b.monthlyIncome || 0), 0);
}

// === DAILY GOALS ===
// Three fresh objectives per game-day, picked deterministically from the
// game-date string so every view of the same day shows the same goals.
// Rewards are $20–$50 cash — below one work shift's pay (~$100+), so a
// goal never beats working. Progress is recorded by the command wrapper
// only on successful commands.

export interface DailyGoal {
  kind: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export interface DailyGoalState {
  date: string;
  goals: DailyGoal[];
}

const GOAL_DEFS: { kind: string; label: string; target: number; reward: number }[] = [
  { kind: 'work', label: 'Work a shift', target: 1, reward: 40 },
  { kind: 'explore', label: 'Explore your area', target: 1, reward: 30 },
  { kind: 'talk', label: 'Talk to someone', target: 1, reward: 25 },
  { kind: 'goto', label: 'Visit 2 districts (goto)', target: 2, reward: 30 },
  { kind: 'gym', label: 'Work out at the gym', target: 1, reward: 25 },
  { kind: 'travel', label: 'Travel to another city', target: 1, reward: 50 },
  { kind: 'rest', label: 'Get a restful sleep', target: 1, reward: 20 },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ensureDailyGoals(player: any, dateStr: string): DailyGoalState {
  const existing = player.dailyGoals as DailyGoalState | undefined;
  if (existing && existing.date === dateStr && Array.isArray(existing.goals)) return existing;
  const h = hashString(dateStr);
  const picked: DailyGoal[] = [];
  const used = new Set<number>();
  // Step 3, coprime to the 7-goal pool, so the walk visits distinct goals.
  // (Step 7 was a bug: 7 mod 7 is always 0, so every pick landed on the
  // same goal and a day only ever had one objective.)
  for (let i = 0; picked.length < 3 && i < GOAL_DEFS.length * 2; i++) {
    const idx = (h + i * 3) % GOAL_DEFS.length;
    if (used.has(idx)) continue;
    used.add(idx);
    const def = GOAL_DEFS[idx]!;
    picked.push({ kind: def.kind, label: def.label, target: def.target, progress: 0, completed: false, reward: def.reward });
  }
  const state: DailyGoalState = { date: dateStr, goals: picked };
  player.dailyGoals = state;
  return state;
}

// Advances matching goals for one successful command kind. Returns the
// goals that completed on THIS call so the wrapper can pay + announce.
export function recordDailyGoalProgress(player: any, kind: string): DailyGoal[] {
  const state = player.dailyGoals as DailyGoalState | undefined;
  if (!state || !Array.isArray(state.goals)) return [];
  const newly: DailyGoal[] = [];
  for (const g of state.goals) {
    if (g.kind !== kind || g.completed) continue;
    g.progress += 1;
    if (g.progress >= g.target) {
      g.completed = true;
      newly.push(g);
    }
  }
  return newly;
}

// === NPC DEPTH ===
// Gifts and hangouts build on the existing relationship value (-100..100)
// and the existing 273-NPC roster. Levels are titles over that value;
// perks are small, real bonuses inside the gift/hangout systems and one
// skill hook — no new currencies, no discounts on unrelated systems.

export interface GiftDef { key: string; label: string; cost: number; gain: number }

export const GIFTS: GiftDef[] = [
  { key: 'coffee', label: 'Coffee', cost: 15, gain: 3 },
  { key: 'flowers', label: 'Flowers', cost: 30, gain: 5 },
  { key: 'meal', label: 'A meal out', cost: 40, gain: 8 },
  { key: 'gift', label: 'A thoughtful gift', cost: 100, gain: 12 },
];

export function relationshipLevel(value: number): string {
  if (value >= 75) return 'Close Friend';
  if (value >= 50) return 'Friend';
  if (value >= 25) return 'Acquaintance';
  if (value >= 0) return 'Neutral';
  return 'Strained';
}

export function relationshipPerks(value: number): string[] {
  const perks: string[] = [];
  if (value >= 25) perks.push('Gifts give +2 bonus');
  if (value >= 50) perks.push('Hangouts restore +10 happiness and cost less energy');
  if (value >= 75) perks.push('Hangouts also grant charisma XP');
  return perks;
}

// Gift gain including the 25+ perk bonus. Pure, so the harness can check it.
export function giftGain(gift: GiftDef, relValue: number): number {
  return gift.gain + (relValue >= 25 ? 2 : 0);
}

// === STORY / JOURNAL ===
// Spec: docs/STORY_JOURNAL_SPEC_v0.108.15.md. Arcs are computed from live
// state, never stored; the log is the only persisted journal state.

export interface JournalLogEntry { date: string; text: string }

export function appendJournalLog(player: any, dateStr: string, text: string): void {
  if (!Array.isArray(player.journalLog)) player.journalLog = [];
  (player.journalLog as JournalLogEntry[]).unshift({ date: dateStr, text });
  if (player.journalLog.length > 50) player.journalLog.length = 50;
}

export function buildJournal(
  player: any,
  activeQuests: { title: string; description: string; objectives: { isCompleted: boolean }[] }[],
): string {
  const lines: string[] = [];
  lines.push('📖 **Your Journal**');
  lines.push('─'.repeat(40));
  lines.push('');
  lines.push('**Active quests**');
  if (activeQuests.length === 0) {
    lines.push('No active quests — talk to NPCs and ask for a quest.');
  } else {
    for (const q of activeQuests) {
      const done = q.objectives.filter((o) => o.isCompleted).length;
      lines.push(`• ${q.title} — ${done}/${q.objectives.length} objectives`);
      lines.push(`  ${q.description}`);
    }
  }
  lines.push('');
  lines.push('**Story arcs**');
  const shifts = player.workDaysCompleted ?? 0;
  const living = !player.job ? 'Unemployed — find work to start this arc' : shifts >= 50 ? 'Established worker (50+ shifts)' : shifts >= 10 ? 'Working regular (10+ shifts)' : 'First job — early days';
  const props = player.properties ?? [];
  const renovated = props.some((p: any) => (p.renovationLevel ?? 0) > 0);
  const roots = props.length === 0 ? 'No property yet' : renovated ? `Property owner, ${props.length} propert${props.length === 1 ? 'y' : 'ies'} — one renovated` : props.length >= 3 ? `Property owner, ${props.length} properties` : `First property — ${props[0]?.name ?? ''}`;
  const cities = player.visitedCities ?? [];
  const met = Object.keys(player.relationships ?? {}).length;
  const knowing = `Visited ${cities.length} cit${cities.length === 1 ? 'y' : 'ies'}, met ${met} people`;
  const vehicles = player.vehicles ?? [];
  const upgraded = vehicles.some((v: any) => v.upgrades && Object.values(v.upgrades).some((lv: any) => (lv as number) > 0));
  const road = vehicles.length === 0 ? 'No vehicle yet' : upgraded ? `On the road — ${vehicles.length} vehicle(s), one upgraded` : `First vehicle — ${vehicles[0]?.name ?? ''}`;
  const businesses = ownedBusinesses(player);
  const business = businesses.length === 0 ? 'No business yet' : businesses.length >= 3 ? `Business owner — ${businesses.length} businesses` : `First business — ${businesses[0]?.name ?? ''}`;
  const relValues = Object.values(player.relationships ?? {}).map((r: any) => r.value ?? 0);
  const close = relValues.filter((v: number) => v >= 75).length;
  const friends = relValues.filter((v: number) => v >= 50).length;
  const inner = close > 0 ? `Inner circle — ${close} close friend(s)` : friends > 0 ? `Building friendships — ${friends} friend(s) at 50+` : 'No close friends yet';
  lines.push(`• Making a Living — ${living}`);
  lines.push(`• Putting Down Roots — ${roots}`);
  lines.push(`• Knowing the City — ${knowing}`);
  lines.push(`• On the Road — ${road}`);
  lines.push(`• Building a Business — ${business}`);
  lines.push(`• Inner Circle — ${inner}`);
  lines.push('');
  lines.push('**Journal log**');
  const log = (player.journalLog ?? []) as JournalLogEntry[];
  if (log.length === 0) {
    lines.push('Nothing recorded yet — quests and achievements will appear here.');
  } else {
    for (const e of log.slice(0, 10)) lines.push(`• ${e.date} — ${e.text}`);
  }
  return lines.join('\n');
}
