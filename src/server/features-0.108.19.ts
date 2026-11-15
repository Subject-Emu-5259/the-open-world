// THE OPEN WORLD — v0.108.19 LIFE AND WORLD EXPANSION
// Tables + pure helpers. Same rules as .15/.18: additive state only,
// existing architecture only, no new currencies, no new services, no
// dialogue changes, rewards at or below the established economy scale
// (entry jobs ~$26k–$38k/yr, rents ~$800–$3,500/mo, bank 0.5%/mo).

import { WORLD_CITIES } from '../shared/world-data.js';

// === L1 — BONDS & MILESTONES ===
// Tiers extend the .15 ladder (25 Acquaintance, 50 Friend, 75 Close
// Friend). Partner at 90+ is a status label stored as a `partner` flag
// on the relationship record — not a power, not a new system.
export const PARTNER_THRESHOLD = 90;
export const MILESTONE_TIERS = [
  { min: 90, label: 'Partner' },
  { min: 75, label: 'Close Friend' },
  { min: 50, label: 'Friend' },
  { min: 25, label: 'Acquaintance' },
  { min: 0, label: 'Neutral' },
] as const;

export function milestoneTier(value: number): string {
  for (const t of MILESTONE_TIERS) if (value >= t.min) return t.label;
  return 'Strained';
}

export function nextMilestone(value: number): { label: string; away: number } | null {
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    const t = MILESTONE_TIERS[i]!;
    if (value < t.min) return { label: t.label, away: t.min - value };
  }
  return null;
}

export const CELEBRATE_COST = 50;
export const CELEBRATE_HOURS = 2;
export const CELEBRATE_ENERGY = 10;
export const CELEBRATE_REL_GAIN = 8;
export const CELEBRATE_HAPPY_GAIN = 5;
export const CELEBRATE_MIN_VALUE = 25;

// === L2 — HOME LIFE (furniture) ===
// Comfort tiers from furniture COUNT (not spend): 0 items = 0,
// 1–2 = 1, 3–4 = 2, 5+ = 3. Comfort only improves sleep recovery
// (see spec); it never changes rent or sell price.
export interface FurnitureItem { key: string; label: string; cost: number }
export const FURNITURE: FurnitureItem[] = [
  { key: 'chair', label: 'Reading Chair', cost: 150 },
  { key: 'bed', label: 'Cozy Bed', cost: 300 },
  { key: 'desk', label: 'Work Desk', cost: 400 },
  { key: 'kitchen', label: 'Kitchen Set', cost: 600 },
  { key: 'tv', label: 'TV & Sound', cost: 900 },
  { key: 'art', label: 'Art Collection', cost: 1500 },
];

export function comfortTier(furnitureCount: number): number {
  if (furnitureCount >= 5) return 3;
  if (furnitureCount >= 3) return 2;
  if (furnitureCount >= 1) return 1;
  return 0;
}

// === L3 — HOME COOKING ===
export interface Meal { key: string; label: string; cost: number; energy: number; happy: number; xp: number; minCookLevel: number }
export const MEALS: Meal[] = [
  { key: 'soup', label: 'Home Soup', cost: 10, energy: 15, happy: 2, xp: 10, minCookLevel: 1 },
  { key: 'pasta', label: 'Pasta Night', cost: 18, energy: 22, happy: 3, xp: 15, minCookLevel: 1 },
  { key: 'roast', label: 'Sunday Roast', cost: 30, energy: 30, happy: 4, xp: 20, minCookLevel: 2 },
  { key: 'feast', label: 'City Feast', cost: 40, energy: 38, happy: 5, xp: 25, minCookLevel: 4 },
];
export const COOK_ENERGY_COST = 5;
export const COOK_HOURS = 1;

// === W1 — WORLD EVENTS CALENDAR ===
// Events derive from each city's OWN modifiers — no invented venues,
// no invented cities. Unknown modifiers fall back to a community fair.
// weekKey is computed from the game calendar date (see weekKeyFromDate),
// so every player on the same game-date sees the same events.
export interface WorldEventTemplate { modifier: string; label: string; activity: string }
export const EVENT_TEMPLATES: WorldEventTemplate[] = [
  { modifier: 'blues_music', label: 'Blues Night', activity: 'live blues sets' },
  { modifier: 'blues_hustle', label: 'Blues Night', activity: 'live blues sets' },
  { modifier: 'bbq_capital', label: 'BBQ Cook-Off', activity: 'smoke, sauce, and judging' },
  { modifier: 'music_city', label: 'Open Mic Night', activity: 'local songwriters' },
  { modifier: 'music_industry', label: 'Studio Showcase', activity: 'local artists' },
  { modifier: 'jazz_birthplace', label: 'Jazz Parade', activity: 'street brass bands' },
  { modifier: 'party_city', label: 'Street Party', activity: 'food stalls and dancing' },
  { modifier: 'beach_city', label: 'Beach Festival', activity: 'sand, surf, and food trucks' },
  { modifier: 'small_town', label: 'Town Fair', activity: 'craft stalls and local food' },
  { modifier: 'family', label: 'Family Day Fair', activity: 'games and local food' },
  { modifier: 'nightlife', label: 'Night Market', activity: 'late stalls and music' },
  { modifier: 'hip_hop_capital', label: 'Hip-Hop Showcase', activity: 'local MCs and DJs' },
  { modifier: 'logistics_hub', label: 'Truckers Market', activity: 'road food and trade stalls' },
  { modifier: 'truck_stop', label: 'Truckers Market', activity: 'road food and trade stalls' },
  { modifier: 'government', label: 'Civic Expo', activity: 'local services and talks' },
  { modifier: 'banking_hub', label: 'Business Expo', activity: 'local founders and stalls' },
  { modifier: 'healthcare_hub', label: 'Wellness Fair', activity: 'fitness demos and food' },
  { modifier: 'latin_influence', label: 'Latin Street Festival', activity: 'food, dance, and music' },
  { modifier: 'crypto_hub', label: 'Tech Meetup', activity: 'demos and local founders' },
];
const FALLBACK_EVENT: WorldEventTemplate = { modifier: '', label: 'Community Fair', activity: 'craft stalls and local food' };

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// "Monday, January 15, 2024" -> whole weeks since epoch. Unparseable
// input falls back to 0 (stable, never crashes the command).
export function weekKeyFromDate(dateStr: string): number {
  const months: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
  const m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return 0;
  const month = months[m[1]!];
  if (month === undefined) return 0;
  const days = Math.floor(Date.UTC(parseInt(m[3]!, 10), month, parseInt(m[2]!, 10)) / 86400000);
  return Math.floor(days / 7);
}

export interface WorldEvent { id: string; city: string; label: string; activity: string }
export function worldEventForCity(cityId: string, weekKey: number): WorldEvent {
  const city = (WORLD_CITIES as Record<string, any>)[cityId];
  const modifiers: string[] = city?.modifiers ?? [];
  const templates = modifiers
    .map((mod) => EVENT_TEMPLATES.find((t) => t.modifier === mod))
    .filter((t): t is WorldEventTemplate => !!t);
  const pool = templates.length ? templates : [FALLBACK_EVENT];
  const pick = pool[(hashStr(cityId) + weekKey) % pool.length]!;
  return { id: `${cityId}:${weekKey}:${pick.label}`, city: cityId, label: pick.label, activity: pick.activity };
}

export function worldEventsThisWeek(weekKey: number): WorldEvent[] {
  return Object.keys(WORLD_CITIES).map((id) => worldEventForCity(id, weekKey));
}

export const ATTEND_COST = 10;
export const ATTEND_HOURS = 2;
export const ATTEND_HAPPY = 5;
export function attendPay(economicIndex: number): number {
  // $25–$75 scaled by economic index (50 → $25, 90 → $75), inside the
  // daily-goal reward scale, never above it.
  return 25 + Math.round(Math.min(50, Math.max(0, economicIndex - 50)));
}

// === W2 — ROAD TRIPS ===
// Driving your own car beats the $50 generic bus fare — the car is the
// investment that earns the discount. Flat fuel fee, no fuel system.
export const ROADTRIP_FUEL_COST = 15;
export const ROADTRIP_CONDITION_COST = 2;
export const ROADTRIP_MIN_CONDITION = 30;
export const ROADTRIP_DRIVING_XP = 20;

// === W3 — PASSPORT & WORLD JOURNEY ===
export const PASSPORT_MILESTONES = [
  { cities: 5, reward: 100 },
  { cities: 10, reward: 250 },
  { cities: 15, reward: 400 },
  { cities: 20, reward: 600 },
  { cities: 27, reward: 1000 },
] as const;
export const TOTAL_CITIES = 27;
