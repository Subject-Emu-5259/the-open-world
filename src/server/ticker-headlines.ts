// THE OPEN WORLD — v0.108.21 §55 NEWS TICKER REDESIGN
// Pure headline generator: templates filled ONLY from real game state.
// No RNG, no stored series, no invented events, no fabricated quotes.
// Every headline traces to a fact the caller passes in (city data,
// computed stock prices, world events, player records, game clock).
// Output order is fixed (events → cities → markets → indices →
// player → milestones → season/holiday → challenge → weather) and
// the client cycles the FULL list in sequence and loops — never one
// segment at a time.
import { WORLD_CITIES } from '../shared/world-data.js';
import {
  groupCompanies, stockPriceAt, stockMonthlyChange,
  economicIndexForCity, needWordProsperity, patrolLevel,
  companyPerformance, performanceWord,
  fameScore, specNetWorth, wealthTier,
} from './features-0.108.20.js';
import { OFFICE_DEFS } from './features-0.108.20.js';
import type { WorldEvent } from './features-0.108.19.js';
import type { ChallengeGoal } from './features-0.108.20.js';
import { ALL_JOBS } from './jobs-database.js';

export interface TickerHeadline {
  text: string;
  scope: 'city' | 'player' | 'world';
  city?: string;
}

export interface TickerContext {
  player: any;
  city: string;
  monthKey: string;
  events: WorldEvent[];
  season: string;
  nextHoliday: { name: string; daysAway: number };
  challenge: ChallengeGoal;
  weather: { temp: number; condition: string } | null;
  achievementsUnlocked: number;
}

export function cityDisplay21(cityId: string): string {
  return (WORLD_CITIES as Record<string, any>)[cityId]?.displayName ?? cityId.replace(/_/g, ' ');
}

function marketVerb(change: number): string {
  if (change >= 0.005) return 'rally';
  if (change > 0) return 'edge up';
  if (change <= -0.005) return 'slide';
  return 'ease';
}

function econWord(econ: number): string {
  const w = needWordProsperity(econ);
  if (w === 'Strong') return 'running strong';
  if (w === 'Steady') return 'holding steady';
  return 'under strain';
}

export function generateTickerHeadlines(ctx: TickerContext): TickerHeadline[] {
  const out: TickerHeadline[] = [];
  const push = (text: string, scope: TickerHeadline['scope'], city?: string): void => {
    if (text) out.push({ text, scope, city });
  };
  const player = ctx.player ?? {};
  const cityName = cityDisplay21(ctx.city);

  // 1. World events this week — one per city.
  for (const e of ctx.events ?? []) {
    push(`${cityDisplay21(e.city)} welcomes ${e.label} this week — ${e.activity}.`, 'city', e.city);
  }

  // 2. Per-city economy + patrol — real city data, all 27 cities.
  for (const cityId of Object.keys(WORLD_CITIES)) {
    const econ = economicIndexForCity(cityId);
    const city = (WORLD_CITIES as Record<string, any>)[cityId];
    push(`Economy in ${cityDisplay21(cityId)} ${econWord(econ)} (economic index ${econ}).`, 'city', cityId);
    push(`Patrols in ${cityDisplay21(cityId)} stay ${patrolLevel(city?.crimeRate ?? 50)} as enforcement holds.`, 'city', cityId);
  }

  // 3. Per-company stock moves — §25 computed prices, never invented.
  const companies = groupCompanies(ALL_JOBS);
  for (const c of companies) {
    const price = stockPriceAt(c, ctx.monthKey);
    const chg = stockMonthlyChange(c.employer, ctx.monthKey, c.hqCity);
    const pct = Math.abs(chg * 100).toFixed(2);
    push(`Markets: shares in ${c.employer} ${marketVerb(chg)} ${pct}% this month to $${price.toFixed(2)}.`, 'city', c.hqCity);
  }

  // 4. Market indices — computed averages.
  if (companies.length > 0) {
    const avg = (list: typeof companies): number =>
      list.reduce((s, c) => s + stockMonthlyChange(c.employer, ctx.monthKey, c.hqCity), 0) / list.length;
    const world = avg(companies);
    const mid = companies.filter((c) => ['memphis', 'west_memphis', 'littlerock', 'southaven'].includes(c.hqCity));
    push(`World index ${world >= 0 ? 'climbs' : 'eases'} ${Math.abs(world * 100).toFixed(2)}% on average across ${companies.length} listed companies.`, 'world');
    if (mid.length > 0) {
      const m = avg(mid);
      push(`Mid-South index ${m >= 0 ? 'climbs' : 'eases'} ${Math.abs(m * 100).toFixed(2)}% on average across ${mid.length} Mid-South companies.`, 'world');
    }
  }

  // 5. Player activity — the player's own real records only.
  for (const b of player.businesses ?? []) {
    push(`${b.name} keeps trading at $${(b.monthlyIncome ?? 0).toLocaleString()}/mo net.`, 'player');
  }
  for (const p of player.properties ?? []) {
    push(`${p.name} in ${cityDisplay21(p.city)} now valued at $${(p.currentValue ?? 0).toLocaleString()}.`, 'player');
  }
  for (const h of (player.investments ?? []).filter((i: any) => i.type === 'stock' && (i.shares ?? 0) > 0)) {
    push(`Portfolio watch: ${h.company} holding at ${h.shares} shares, worth $${(h.currentValue ?? 0).toLocaleString()}.`, 'player');
  }
  if (player.job) {
    const title = player.job.title ?? player.job.name ?? 'a job';
    const employer = player.job.employer ? ` at ${player.job.employer}` : '';
    push(`Employment: ${title}${employer} in ${cityName}.`, 'player');
  }
  if (player.office) {
    const def = OFFICE_DEFS[player.office.key];
    if (def) push(`Office: ${def.title} of ${player.office.jurisdiction} serves this term.`, 'player');
  }
  if (player.candidacy) {
    push(`Election watch: candidacy filed for ${player.candidacy.office ?? 'office'} in ${player.candidacy.jurisdiction ?? cityName}.`, 'player');
  }
  const openCases = (player.cases ?? []).filter((c: any) => c.status === 'open').length;
  if (openCases > 0) push(`Court dockets in ${cityName} list ${openCases} open case${openCases === 1 ? '' : 's'}.`, 'player');
  const fineTotal = (player.fines ?? []).reduce((s: number, f: any) => s + (f.amount ?? 0), 0);
  if (fineTotal > 0) push(`Outstanding fines in ${cityName} total $${fineTotal.toLocaleString()}.`, 'player');
  for (const c of player.playerCompanies ?? []) {
    if (c.status === 'active') {
      const perf = performanceWord(companyPerformance(c.id, ctx.monthKey));
      push(`${c.name} (${c.industry}) of ${cityDisplay21(c.hqCity)} reports a ${perf} month with ${(c.employees ?? []).length} employees.`, 'player');
    }
  }

  // 6. Milestones — live computation, labels only above thresholds.
  const fame = fameScore(player, ctx.achievementsUnlocked);
  if (fame >= 25) push(`Local recognition grows for a resident now known around ${cityName} (fame ${fame}).`, 'player');
  const net = specNetWorth(player);
  const wt = wealthTier(net);
  if (wt !== 'Getting by') push(`Wealth watch: net worth reaches $${net.toLocaleString()} (${wt}).`, 'player');

  // 7. Season + next holiday — the game clock.
  push(`${ctx.season} settles over the game world.`, 'world');
  if (ctx.nextHoliday) {
    push(ctx.nextHoliday.daysAway <= 0
      ? `Holiday watch: ${ctx.nextHoliday.name} arrives today.`
      : `Holiday watch: ${ctx.nextHoliday.name} arrives in ${ctx.nextHoliday.daysAway} days.`, 'world');
  }

  // 8. Community challenge — deterministic from weekKey.
  if (ctx.challenge) {
    push(`Community challenge this week: ${ctx.challenge.label} — participation threshold ${ctx.challenge.threshold}.`, 'world');
  }

  // 9. Current-city weather — real computed weather.
  if (ctx.weather) {
    push(`Weather in ${cityName}: ${ctx.weather.condition}, ${ctx.weather.temp}°F.`, 'city', ctx.city);
  }

  // Deduplicate by exact text, preserving generator order. Duplicates
  // never pad the pool count.
  const seen = new Set<string>();
  return out.filter((h) => {
    if (seen.has(h.text)) return false;
    seen.add(h.text);
    return true;
  });
}

// Mode filtering: LOCAL = current-city headlines + the player's own;
// WORLD = everything. Off is handled by the caller (empty payload).
export function filterTickerHeadlines(headlines: TickerHeadline[], mode: string, city: string): string[] {
  if (mode === 'world') return headlines.map((h) => h.text);
  return headlines
    .filter((h) => h.scope === 'player' || (h.scope === 'city' && h.city === city))
    .map((h) => h.text);
}
