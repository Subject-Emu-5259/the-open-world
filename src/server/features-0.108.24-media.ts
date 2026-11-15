// THE OPEN WORLD — v0.108.24 MEDIA: NEWS CATEGORIES + SOCIAL MEDIA
// Pure-logic module only. No engine edits, no new services, no new
// currencies, no stored series, no randomness of any kind.
//
// Same honesty rules as ticker-headlines.ts (v0.108.21 §55):
// every headline traces to a fact the caller passes in — real roster
// NPCs, real city data, computed stock prices, passed race results,
// the game's own offices — and templates never invent an event, a
// quote, a person, or a place. When an input list is empty, its
// section emits nothing; it is never padded with invented content.
//
// (A) NEWS CATEGORIES — generateCategoryHeadlines /
//     generateAllCategoryHeadlines. Within one category, headlines are
//     deduplicated by exact text, preserving generator order (the
//     ticker convention). generateAllCategoryHeadlines concatenates
//     the categories in NEWS_CATEGORIES order and deduplicates by
//     exact text globally, keeping the first category's occurrence.
//
// (B) SOCIAL MEDIA — pure helpers on top of the phone/comms shape.
//     State is ADDITIVE: player.social?: PlayerSocialState. Nothing
//     here mutates its input: createPost / likePost return a new
//     player-like object (shallow copy, new social object, new
//     arrays). CommHub (comm-hub.ts) is deliberately NOT reused: its
//     addPost invents random likes/comments/shares, which this
//     module must never do.

import { WORLD_CITIES } from '../shared/world-data.js';
import {
  fameScore,
  stockPriceAt,
  stockMonthlyChange,
  companyPerformance,
  performanceWord,
  economicIndexForCity,
  needWordProsperity,
  patrolLevel,
  cityDisplayName,
  isNotableNpc,
  isEliteNpc,
  GOV_ROLE_SET,
  civicTitle,
  OFFICE_DEFS,
  MID_SOUTH_CITIES,
  hashStr,
} from './features-0.108.20.js';
import type { CompanyInfo } from './features-0.108.20.js';
import type { WorldEvent } from './features-0.108.19.js';
import { RACE_TRACKS } from './racing-service.js';

// ============================================================
// (A) NEWS CATEGORIES
// ============================================================

export const NEWS_CATEGORIES = [
  'celebrity',
  'crime',
  'stocks',
  'sports',
  'politics',
  'city',
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export interface CategoryHeadline {
  text: string;
  scope: 'city' | 'player' | 'world';
  city?: string;
  category: NewsCategory;
}

/** Minimal roster-NPC shape. The full NPCState from social-engine.ts
 *  is assignable to this (it carries id, name, role, city,
 *  district, description). Only NPCs passed in can ever appear. */
export interface RosterNpcLike {
  id: string;
  name: string;
  role: string;
  city: string;
  district?: string;
  description?: string;
}

export interface PlayerSocialPost {
  id: string;
  text: string;
  timestamp: number;
  likes: number;
}

/** Additive social state: attach as player.social. likedPostIds
 *  records post ids the player has liked (player posts and feed
 *  posts alike); it never names followers. */
export interface PlayerSocialState {
  posts: PlayerSocialPost[];
  likedPostIds?: string[];
}

/** Relationship entry, matching the engine's Relationship shape
 *  ({ value, spouse, ... }) or a bare number for callers that only
 *  track a level. */
export type RelationshipLike = number | { value?: number; spouse?: boolean };

/** Loose player shape shared by the news generators and the social
 *  helpers. Every field is optional: a missing field simply yields
 *  no headline / no contribution, never a guessed value. The money /
 *  job / milestone fields are exactly the ones fameScore reads. */
export interface MediaPlayerLike {
  name?: string;
  city?: string;
  money?: number;
  bankBalance?: number;
  properties?: { name?: string; city?: string; currentValue?: number }[];
  investments?: { type?: string; company?: string; shares?: number; currentValue?: number }[];
  businesses?: { name?: string; monthlyIncome?: number; purchasePrice?: number }[];
  playerCompanies?: {
    id?: string; name?: string; industry?: string; hqCity?: string;
    status?: string; employees?: unknown[];
  }[];
  job?: { title?: string; name?: string; employer?: string; tier?: string };
  office?: { key?: string; jurisdiction?: string; endMonthKey?: string };
  candidacy?: { office?: string; jurisdiction?: string; events?: number; campaignScore?: number };
  cases?: { status?: string }[];
  fines?: { amount?: number }[];
  heat?: number;
  investigations?: unknown[];
  fitness?: number;
  skills?: Record<string, { level?: number; xp?: number }>;
  reputation?: { community?: number; professional?: number; social?: number };
  passportMilestones?: number | unknown[];
  challengePayouts?: number;
  achievementsUnlocked?: number;
  relationships?: Record<string, RelationshipLike>;
  social?: PlayerSocialState;
}

/** One passed-in race result. trackId (a RACE_TRACKS id) is
 *  preferred; trackName / city are fallbacks for callers that
 *  already resolved the track. placement, totalParticipants and
 *  prize must come from the recorded result, never re-rolled. */
export interface RaceNewsInput {
  trackId?: string;
  trackName?: string;
  city?: string;
  placement: number;
  totalParticipants: number;
  prize: number;
  breakdown?: boolean;
}

/** Championship facts, as reported by ChampionshipService
 *  (getStandings totals). All counts are passed in, not recomputed
 *  from a standings log this module does not own. */
export interface ChampionshipNewsInput {
  name: string;
  season: number;
  totalPoints: number;
  wins: number;
  totalPrize: number;
  racesCompleted: number;
  totalRaces: number;
  nextTrackName?: string;
}

/** A genuinely new opening. The caller passes ONLY openings that
 *  really happened (a new player business / company / property
 *  listing); this module never invents one. */
export interface CityOpeningInput {
  city: string;
  name: string;
  kind: 'business' | 'company' | 'property';
}

/**
 * Context for the news generators.
 *
 * - player: the player's real records (see MediaPlayerLike).
 * - monthKey: "YYYY-MM", used for computed stock prices/changes.
 * - currentCity: the player's city id (sports home-track section).
 * - npcs: roster NPCs to draw celebrity / politics names from.
 *   Pass a filtered slice (e.g. same-city or met NPCs) to bound
 *   output; every NPC headline names a passed NPC only.
 * - cities: city ids to cover in the crime / city sections.
 *   Default: every key of WORLD_CITIES, in table order (the
 *   ticker convention — all cities, not just the current one).
 * - events: WorldEvent[] for this week (features-0.108.19 shape).
 * - weatherByCity: computed weather per city id, when available.
 * - companies: CompanyInfo[] — the caller normally passes
 *   groupCompanies(ALL_JOBS). If omitted, the stocks section
 *   emits no company headlines rather than inventing prices.
 * - races / championship: recorded results / standings only.
 * - gymSessions: caller-tracked gym-visit count, if the caller
 *   tracks one. Omitted (or 0) means no gym headline — the
 *   player's fitness stat alone never implies a session count.
 * - openings: see CityOpeningInput.
 */
export interface CategoryNewsContext {
  player: MediaPlayerLike;
  monthKey: string;
  currentCity?: string;
  npcs: RosterNpcLike[];
  cities?: string[];
  events?: WorldEvent[];
  weatherByCity?: Record<string, { temp: number; condition: string }>;
  companies?: CompanyInfo[];
  races?: RaceNewsInput[];
  championship?: ChampionshipNewsInput | null;
  gymSessions?: number;
  openings?: CityOpeningInput[];
}

// --- shared helpers ---

function humanRole(role: string): string {
  return String(role ?? '').replace(/_/g, ' ').trim() || 'resident';
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? 'th'}`;
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

function cityIds(ctx: CategoryNewsContext): string[] {
  return ctx.cities && ctx.cities.length > 0 ? ctx.cities : Object.keys(WORLD_CITIES);
}

function isKnownCity(city: string | undefined): city is string {
  return !!city && city in WORLD_CITIES;
}

/** Dedup by exact text, preserving generator order. */
function dedup(headlines: CategoryHeadline[]): CategoryHeadline[] {
  const seen = new Set<string>();
  return headlines.filter((h) => {
    if (seen.has(h.text)) return false;
    seen.add(h.text);
    return true;
  });
}

// --- celebrity ---
// Eligibility is the v0.108.20 §23 notable/elite rule, surveyed from
// the real roster: notable = role 'politician' OR description naming
// Mayor/Council; elite = an ELITE_ROLES role OR any *_owner role.
// Roster NPCs carry no stored fame number, so no numeric fame is
// claimed for them — the role rule IS the threshold. The player's
// own celebrity headline uses fameScore bands (25 / 50 / 75),
// mirroring the ticker's fame >= 25 milestone.
function celebrityHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  for (const npc of ctx.npcs ?? []) {
    if (!npc?.name) continue;
    if (!isNotableNpc(npc) && !isEliteNpc(npc)) continue;
    out.push({
      text: `${npc.name}, ${humanRole(npc.role)} in ${cityDisplayName(npc.city)}, is among the notable names in local news.`,
      scope: 'city',
      city: npc.city,
      category: 'celebrity',
    });
  }
  const fame = fameScore(ctx.player ?? {}, ctx.player?.achievementsUnlocked ?? 0);
  const who = ctx.player?.name ?? 'A local resident';
  const cityName = cityDisplayName(ctx.player?.city ?? ctx.currentCity ?? '') || 'the game world';
  if (fame >= 75) {
    out.push({ text: `${who} is now a household name around ${cityName} (fame ${fame}).`, scope: 'player', category: 'celebrity' });
  } else if (fame >= 50) {
    out.push({ text: `${who} is now a well-known figure around ${cityName} (fame ${fame}).`, scope: 'player', category: 'celebrity' });
  } else if (fame >= 25) {
    out.push({ text: `Local recognition grows for ${who} around ${cityName} (fame ${fame}).`, scope: 'player', category: 'celebrity' });
  }
  return out;
}

// --- crime ---
// Patrol levels + crime rates come from WORLD_CITIES; heat, open
// investigations, open cases and fines come from the player's own
// records. No incident is ever narrated: there is no "robbery
// reported" headline here, because no incident list is passed in.
function crimeHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  for (const cityId of cityIds(ctx)) {
    const city = (WORLD_CITIES as Record<string, any>)[cityId];
    const crimeRate = city?.crimeRate ?? 50;
    out.push({
      text: `Patrols in ${cityDisplayName(cityId)} stay ${patrolLevel(crimeRate)} as enforcement holds (crime rate ${crimeRate}).`,
      scope: 'city',
      city: cityId,
      category: 'crime',
    });
  }
  const player = ctx.player ?? {};
  const cityName = cityDisplayName(player.city ?? ctx.currentCity ?? '');
  const heat = player.heat ?? 0;
  if (heat > 0) {
    const band = heat >= 80 ? 'high' : heat >= 50 ? 'elevated' : 'cooling';
    const openInv = (player.investigations ?? []).filter((i: any) => i?.status === 'open').length;
    const invNote = openInv > 0 ? `, with ${openInv} open investigation${openInv === 1 ? '' : 's'}` : '';
    out.push({
      text: `Police attention for a ${cityName} resident stays ${band} (heat ${heat}${invNote}).`,
      scope: 'player',
      category: 'crime',
    });
  }
  const openCases = (player.cases ?? []).filter((c) => c?.status === 'open').length;
  if (openCases > 0) {
    out.push({
      text: `Court dockets in ${cityName} list ${openCases} open case${openCases === 1 ? '' : 's'}.`,
      scope: 'player',
      category: 'crime',
    });
  }
  const fineTotal = (player.fines ?? []).reduce((s, f) => s + (f?.amount ?? 0), 0);
  if (fineTotal > 0) {
    out.push({
      text: `Outstanding fines in ${cityName} total $${fineTotal.toLocaleString()}.`,
      scope: 'player',
      category: 'crime',
    });
  }
  return out;
}

// --- stocks ---
// Prices and monthly changes are the §25 computed values
// (stockPriceAt / stockMonthlyChange), never quoted or guessed.
function stocksHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  const companies = ctx.companies ?? [];
  for (const c of companies) {
    const price = stockPriceAt(c, ctx.monthKey);
    const chg = stockMonthlyChange(c.employer, ctx.monthKey, c.hqCity);
    const pct = Math.abs(chg * 100).toFixed(2);
    out.push({
      text: `Markets: shares in ${c.employer} ${marketVerb(chg)} ${pct}% this month to $${price.toFixed(2)}.`,
      scope: 'city',
      city: isKnownCity(c.hqCity) ? c.hqCity : undefined,
      category: 'stocks',
    });
  }
  if (companies.length > 0) {
    const avg = (list: CompanyInfo[]): number =>
      list.reduce((s, c) => s + stockMonthlyChange(c.employer, ctx.monthKey, c.hqCity), 0) / list.length;
    const world = avg(companies);
    out.push({
      text: `World index ${world >= 0 ? 'climbs' : 'eases'} ${Math.abs(world * 100).toFixed(2)}% on average across ${companies.length} listed companies.`,
      scope: 'world',
      category: 'stocks',
    });
    const mid = companies.filter((c) => MID_SOUTH_CITIES.includes(c.hqCity));
    if (mid.length > 0) {
      const m = avg(mid);
      out.push({
        text: `Mid-South index ${m >= 0 ? 'climbs' : 'eases'} ${Math.abs(m * 100).toFixed(2)}% on average across ${mid.length} Mid-South companies.`,
        scope: 'world',
        category: 'stocks',
      });
    }
  }
  const player = ctx.player ?? {};
  for (const h of (player.investments ?? []).filter((i) => i?.type === 'stock' && (i?.shares ?? 0) > 0)) {
    out.push({
      text: `Portfolio watch: ${h.company} holding at ${h.shares} shares, worth $${(h.currentValue ?? 0).toLocaleString()}.`,
      scope: 'player',
      category: 'stocks',
    });
  }
  for (const c of player.playerCompanies ?? []) {
    if (c?.status === 'active' && c.id) {
      const perf = performanceWord(companyPerformance(c.id, ctx.monthKey));
      out.push({
        text: `${c.name} (${c.industry}) of ${cityDisplayName(c.hqCity ?? '')} reports a ${perf} month with ${(c.employees ?? []).length} employees.`,
        scope: 'player',
        category: 'stocks',
      });
    }
  }
  return out;
}

// --- sports ---
// Race headlines come only from passed results; the track catalogue
// section lists RACE_TRACKS facts (fee, field, prize pool) for the
// player's current city; fitness headlines use the player's real
// fitness stat and, only if passed, a caller-tracked gym count.
function sportsHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  for (const r of ctx.races ?? []) {
    const track = r.trackId ? RACE_TRACKS.find((t) => t.id === r.trackId) : undefined;
    const trackName = track?.name ?? r.trackName ?? r.trackId ?? 'a track';
    const city = track?.city ?? r.city;
    const cityId = isKnownCity(city) ? city : undefined;
    const place = `${ordinal(r.placement)} of ${r.totalParticipants}`;
    const prizeNote = r.prize > 0 ? `, taking home $${r.prize.toLocaleString()}` : '';
    const breakdownNote = r.breakdown ? ' A mid-race mechanical issue was recorded.' : '';
    out.push({
      text: r.placement === 1
        ? `Motorsport: first place at ${trackName} (${place})${prizeNote}.${breakdownNote}`.replace('..', '.')
        : `Motorsport: ${place} at ${trackName}${prizeNote}.${breakdownNote}`.replace('..', '.'),
      scope: cityId ? 'city' : 'world',
      city: cityId,
      category: 'sports',
    });
  }
  const champ = ctx.championship;
  if (champ && champ.totalRaces > 0) {
    out.push({
      text: `Championship: ${champ.name} (season ${champ.season}) stands at ${champ.totalPoints} points with ${champ.wins} win${champ.wins === 1 ? '' : 's'} and $${champ.totalPrize.toLocaleString()} earned across ${champ.racesCompleted} of ${champ.totalRaces} races.`,
      scope: 'world',
      category: 'sports',
    });
    if (champ.nextTrackName) {
      out.push({
        text: `Championship: next stop on ${champ.name} is ${champ.nextTrackName}.`,
        scope: 'world',
        category: 'sports',
      });
    }
  }
  const currentCity = ctx.currentCity ?? ctx.player?.city;
  if (currentCity) {
    const home = cityDisplayName(currentCity).split(',')[0]!.trim().toLowerCase();
    for (const t of RACE_TRACKS.filter((tr) => tr.city.toLowerCase() === home)) {
      out.push({
        text: `Track guide: ${t.name} in ${t.city} hosts ${t.type} racing — entry $${t.entryFee.toLocaleString()}, ${t.participants} racers, $${t.prizePool.toLocaleString()} prize pool.`,
        scope: 'city',
        city: currentCity,
        category: 'sports',
      });
    }
  }
  const player = ctx.player ?? {};
  const fitness = player.fitness ?? 0;
  if (fitness >= 75) {
    out.push({
      text: `Fitness watch: a ${cityDisplayName(player.city ?? ctx.currentCity ?? '')} resident trains at peak condition (fitness ${fitness}).`,
      scope: 'player',
      category: 'sports',
    });
  }
  const gymSessions = ctx.gymSessions ?? 0;
  if (gymSessions > 0) {
    out.push({
      text: `Fitness watch: ${gymSessions} gym session${gymSessions === 1 ? '' : 's'} logged.`,
      scope: 'player',
      category: 'sports',
    });
  }
  return out;
}

// --- politics ---
// Game offices ONLY: OFFICE_DEFS keys (mayor / governor /
// president) plus roster NPCs in GOV_ROLE_SET. No real-world
// politician is ever named — no such name exists in this module,
// and none may be passed in as an NPC: NPC headlines name only
// passed roster NPCs and their roster roles.
function politicsHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  const player = ctx.player ?? {};
  if (player.office) {
    const def = OFFICE_DEFS[player.office.key ?? ''];
    if (def) {
      const termNote = player.office.endMonthKey ? ` (term ends ${player.office.endMonthKey})` : '';
      out.push({
        text: `Office: ${def.title} of ${player.office.jurisdiction} serves this term${termNote}.`,
        scope: 'player',
        category: 'politics',
      });
    }
  }
  if (player.candidacy) {
    const def = OFFICE_DEFS[player.candidacy.office ?? ''];
    const title = def?.title ?? player.candidacy.office ?? 'office';
    out.push({
      text: `Election watch: candidacy filed for ${title} in ${player.candidacy.jurisdiction ?? cityDisplayName(player.city ?? '')} — ${player.candidacy.events ?? 0} campaign event${(player.candidacy.events ?? 0) === 1 ? '' : 's'}, score ${player.candidacy.campaignScore ?? 0}.`,
      scope: 'player',
      category: 'politics',
    });
  }
  for (const npc of ctx.npcs ?? []) {
    if (!npc?.name || !GOV_ROLE_SET.has(npc.role)) continue;
    out.push({
      text: `${npc.name}, ${humanRole(npc.role)} in ${cityDisplayName(npc.city)}, is among the government-adjacent figures in local politics.`,
      scope: 'city',
      city: npc.city,
      category: 'politics',
    });
  }
  const community = player.reputation?.community ?? 0;
  if (community >= 25) {
    out.push({
      text: `Civic standing: ${civicTitle(community)} (community reputation ${community}).`,
      scope: 'player',
      category: 'politics',
    });
  }
  return out;
}

// --- city ---
// Per-city happenings from real data only: this week's passed
// events, the computed economic index, passed weather, and passed
// openings. Fixed order: events → economy → weather → openings.
function cityHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const out: CategoryHeadline[] = [];
  for (const e of ctx.events ?? []) {
    out.push({
      text: `${cityDisplayName(e.city)} welcomes ${e.label} this week — ${e.activity}.`,
      scope: 'city',
      city: e.city,
      category: 'city',
    });
  }
  for (const cityId of cityIds(ctx)) {
    const econ = economicIndexForCity(cityId);
    out.push({
      text: `Economy in ${cityDisplayName(cityId)} ${econWord(econ)} (economic index ${econ}).`,
      scope: 'city',
      city: cityId,
      category: 'city',
    });
  }
  const weather = ctx.weatherByCity ?? {};
  for (const cityId of cityIds(ctx)) {
    const w = weather[cityId];
    if (!w) continue;
    out.push({
      text: `Weather in ${cityDisplayName(cityId)}: ${w.condition}, ${w.temp}°F.`,
      scope: 'city',
      city: cityId,
      category: 'city',
    });
  }
  for (const o of ctx.openings ?? []) {
    out.push({
      text: `New ${o.kind} in ${cityDisplayName(o.city)}: ${o.name}.`,
      scope: 'city',
      city: o.city,
      category: 'city',
    });
  }
  return out;
}

const CATEGORY_GENERATORS: Record<NewsCategory, (ctx: CategoryNewsContext) => CategoryHeadline[]> = {
  celebrity: celebrityHeadlines,
  crime: crimeHeadlines,
  stocks: stocksHeadlines,
  sports: sportsHeadlines,
  politics: politicsHeadlines,
  city: cityHeadlines,
};

/** Headlines for one category, deduplicated by exact text. An
 *  unknown category string returns [] (never throws, never
 *  invents a fallback category). */
export function generateCategoryHeadlines(
  category: NewsCategory,
  ctx: CategoryNewsContext,
): CategoryHeadline[] {
  const gen = CATEGORY_GENERATORS[category];
  if (!gen) return [];
  return dedup(gen(ctx));
}

/** All categories concatenated in NEWS_CATEGORIES order,
 *  deduplicated by exact text globally (first occurrence wins). */
export function generateAllCategoryHeadlines(ctx: CategoryNewsContext): CategoryHeadline[] {
  const all: CategoryHeadline[] = [];
  for (const category of NEWS_CATEGORIES) {
    all.push(...generateCategoryHeadlines(category, ctx));
  }
  return dedup(all);
}

// ============================================================
// (B) SOCIAL MEDIA — pure helpers on player.social
// ============================================================

export const MAX_POST_LENGTH = 280;
export const FOLLOWERS_PER_FAME_POINT = 2;
/** Relationship value >= 50 (the engine's "friend" band and up). */
export const FOLLOWERS_PER_CLOSE_RELATIONSHIP = 10;
/** Relationship value 25–49. */
export const FOLLOWERS_PER_RELATIONSHIP = 3;
export const FOLLOWERS_PER_POST = 5;

function relValue(rel: RelationshipLike | undefined): number {
  if (typeof rel === 'number') return rel;
  return rel?.value ?? 0;
}

function existingSocial(player: MediaPlayerLike): PlayerSocialState {
  return player.social ?? { posts: [], likedPostIds: [] };
}

/**
 * Append a player post. Pure: returns a new player-like object.
 * Empty / whitespace-only text returns the input unchanged.
 * Text is trimmed and capped at MAX_POST_LENGTH characters.
 * The id is deterministic — `social-<timestamp>-<hash(text)>` —
 * so no clock or random id is ever generated here; the caller
 * supplies the timestamp. A post with an id already present
 * returns the input unchanged (no duplicate posts).
 */
export function createPost(
  player: MediaPlayerLike,
  text: string,
  timestamp: number,
): MediaPlayerLike {
  const clean = String(text ?? '').trim().slice(0, MAX_POST_LENGTH);
  if (!clean) return player;
  const social = existingSocial(player);
  const post: PlayerSocialPost = {
    id: `social-${timestamp}-${hashStr(clean)}`,
    text: clean,
    timestamp,
    likes: 0,
  };
  if (social.posts.some((p) => p.id === post.id)) return player;
  return {
    ...player,
    social: {
      posts: [...social.posts, post],
      likedPostIds: [...(social.likedPostIds ?? [])],
    },
  };
}

/**
 * Like a post. Pure: returns a new player-like object, or the
 * input unchanged if the post was already liked.
 * - A matching player post gains +1 like and its id is recorded.
 * - Any other post id (e.g. an NPC feed post) is only recorded
 *   in likedPostIds, so feedFor can show it as liked and count
 *   it — no stored post is fabricated to hold the like.
 * There is no unlike in v0.108.24: a second like is a no-op,
 * never a decrement.
 */
export function likePost(player: MediaPlayerLike, postId: string): MediaPlayerLike {
  const social = existingSocial(player);
  const liked = social.likedPostIds ?? [];
  if (liked.includes(postId)) return player;
  const posts = social.posts.map((p) =>
    p.id === postId ? { ...p, likes: p.likes + 1 } : p,
  );
  return {
    ...player,
    social: { posts, likedPostIds: [...liked, postId] },
  };
}

/**
 * Follower count, derived deterministically — never a list of
 * invented follower names, and never a stored count:
 *   fameScore * FOLLOWERS_PER_FAME_POINT
 *   + close relationships (>= 50) * FOLLOWERS_PER_CLOSE_RELATIONSHIP
 *   + other relationships (25–49) * FOLLOWERS_PER_RELATIONSHIP
 *   + player posts * FOLLOWERS_PER_POST
 * fameScore uses player.achievementsUnlocked (default 0) and the
 * usual spec-formula net worth / job / milestone inputs.
 */
export function followerCount(player: MediaPlayerLike): number {
  const fame = fameScore(player ?? {}, player?.achievementsUnlocked ?? 0);
  let close = 0;
  let mid = 0;
  for (const rel of Object.values(player?.relationships ?? {})) {
    const v = relValue(rel);
    if (v >= 50) close += 1;
    else if (v >= 25) mid += 1;
  }
  const posts = existingSocial(player).posts.length;
  return (
    fame * FOLLOWERS_PER_FAME_POINT +
    close * FOLLOWERS_PER_CLOSE_RELATIONSHIP +
    mid * FOLLOWERS_PER_RELATIONSHIP +
    posts * FOLLOWERS_PER_POST
  );
}

export interface FeedItem {
  id: string;
  authorName: string;
  authorId: string;
  kind: 'player' | 'npc';
  text: string;
  timestamp: number;
  likes: number;
  likedByPlayer: boolean;
}

/** Deterministic feed-post id for a roster NPC (one post per NPC). */
export function npcPostId(npcId: string): string {
  return `npc-post-${npcId}`;
}

/**
 * Template text for a roster NPC's feed post. It states only the
 * NPC's real name, roster role and roster city — no event, no
 * quote about a real event, no claim about what the NPC did.
 */
export function npcPostText(npc: RosterNpcLike): string {
  return `${npc.name} checking in from ${cityDisplayName(npc.city)} — ${humanRole(npc.role)}.`;
}

export interface FeedOptions {
  /** Anchor timestamp for NPC template posts. Default: the newest
   *  player post timestamp, or 0 when there are no player posts.
   *  NPC posts share this timestamp purely for ordering — it is
   *  NOT a claim about when the NPC posted. */
  now?: number;
  /** Max items returned, after sorting. Omitted (or <= 0) = all. */
  limit?: number;
}

/**
 * Build a feed mixing the player's stored posts with at most one
 * template post per passed roster NPC (caller controls the slice:
 * pass same-city / met NPCs to bound the feed — the builder never
 * pulls in NPCs on its own). NPC template posts start at 0 likes,
 * +1 if the player liked that post id; they never carry invented
 * engagement. Sort: newest first, player posts before NPC posts
 * on timestamp ties, then id ascending. Pure: no input is mutated.
 */
export function feedFor(
  player: MediaPlayerLike,
  npcs: RosterNpcLike[],
  opts?: FeedOptions,
): FeedItem[] {
  const social = existingSocial(player);
  const liked = new Set(social.likedPostIds ?? []);
  const playerName = player?.name ?? 'You';
  const anchor =
    opts?.now ??
    social.posts.reduce((m, p) => Math.max(m, p.timestamp), 0);
  const items: FeedItem[] = [];
  for (const p of social.posts) {
    items.push({
      id: p.id,
      authorName: playerName,
      authorId: 'player',
      kind: 'player',
      text: p.text,
      timestamp: p.timestamp,
      likes: p.likes,
      likedByPlayer: liked.has(p.id),
    });
  }
  for (const npc of npcs ?? []) {
    if (!npc?.id || !npc?.name) continue;
    const id = npcPostId(npc.id);
    items.push({
      id,
      authorName: npc.name,
      authorId: npc.id,
      kind: 'npc',
      text: npcPostText(npc),
      timestamp: anchor,
      likes: liked.has(id) ? 1 : 0,
      likedByPlayer: liked.has(id),
    });
  }
  items.sort((a, b) => {
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    if (a.kind !== b.kind) return a.kind === 'player' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
  const limit = opts?.limit ?? 0;
  return limit > 0 ? items.slice(0, limit) : items;
}

/**
 * Trending slice of an already-built feed: most likes first,
 * then newest, then id ascending. Pure; the input order is kept
 * untouched (a copy is sorted).
 */
export function trendingPosts(feed: FeedItem[], limit = 5): FeedItem[] {
  const sorted = [...feed].sort((a, b) => {
    if (b.likes !== a.likes) return b.likes - a.likes;
    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
    return a.id.localeCompare(b.id);
  });
  return sorted.slice(0, Math.max(0, limit));
}
