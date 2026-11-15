// THE OPEN WORLD — v0.108.24 WORLD DEPTH
// Transit (§63), weather depth (§64), and time-of-day life (§65).
// Pure-logic tables + deterministic helpers only. Same rules as
// .20/.21/.23: additive, no new currencies, no new services, no
// dialogue changes, no stored state, no Math.random.
//
// Conventions in this module:
// - Money is in whole cents (integers). A route's baseCost is in
//   DOLLARS, matching TRAVEL_ROUTES.cost in world-data.ts and the
//   $50 / 3h bus fallback from v0.108.20-era travel pricing: the
//   caller supplies baseCost/baseHours (using that $50 / 3h fallback
//   when no TRAVEL_ROUTES entry exists), and this module converts
//   dollars to cents (× 100) before applying a mode multiplier.
//   Example: baseCost $50 -> bus 4000¢, train 6250¢, flight 12500¢.
// - Times are in hours, rounded to 2 decimals. The mode multipliers
//   are chosen so the ordering always holds for any positive base:
//   flight is fastest and priciest, bus is cheapest and slowest,
//   train sits in the middle — no floor or cap is applied, because
//   one would break that ordering on very short routes.
// - No venue, city, or airport is invented here. Station names are
//   city-generic templates only ("[City] Airport", and so on), and
//   the airport-city list is closed: cities that are endpoints of a
//   method:'flight' TRAVEL_ROUTES entry, plus Atlanta, whose
//   world-data modifiers include 'airport_city'. Any other city is
//   a non-airport city for this module, even if it has a district
//   jobType mentioning airports.
// - Weather conditions in this module are pure labels. The parent
//   wires WEATHER_CONDITIONS_24 into the WeatherCondition union in
//   time-engine.ts; nothing here changes that union itself, and
//   nothing here reads or replaces the per-day getWeather cache.
// - Forecasts are outlooks, never facts: every outlook string uses
//   chance language ("About a 60% chance of rain") and carries an
//   "outlook only, not a guarantee" hedge. Chance percentages are
//   40–80% by construction — never 100%, never a precise claim.
// - Time-of-day boundaries match TimeEngine.getTimeOfDay exactly, so
//   a period computed here can never disagree with the engine:
//   morning 5–11, afternoon 12–16, evening 17–20, night 21–4.

import { WORLD_CITIES } from '../shared/world-data.js';

// Small deterministic string hash, defined here (FNV-1a, 32-bit).
// Used for all variation in this module; there is no randomness.
export function hash24(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Display name for a city id, from world-data only. "Memphis, TN"
// becomes "Memphis" (the part before the comma); an unknown id falls
// back to a prettified id ("west_memphis" -> "West Memphis") rather
// than inventing a place.
export function cityShortName(cityId: string): string {
  const display: string | undefined = (WORLD_CITIES as Record<string, { displayName?: string }>)[cityId]?.displayName;
  if (display) return display.split(',')[0]!.trim();
  return cityId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================
// §63 — TRANSIT MODES
// ============================================================

export const TRANSIT_MODES = ['bus', 'train', 'airport'] as const;
export type TransitMode = (typeof TRANSIT_MODES)[number];

// Closed airport list, grounded as documented in the header: every
// endpoint of a method:'flight' TRAVEL_ROUTES entry (memphis,
// new_york, los_angeles, chicago, miami, vegas, london, paris,
// tokyo, sydney, mexico_city, toronto, dubai, berlin) plus atlanta
// ('airport_city' modifier). No other city qualifies.
export const AIRPORT_CITIES: readonly string[] = [
  'atlanta', 'berlin', 'chicago', 'dubai', 'london', 'los_angeles',
  'memphis', 'mexico_city', 'miami', 'new_york', 'paris', 'sydney',
  'tokyo', 'toronto', 'vegas',
];

export function hasAirport(cityId: string): boolean {
  return AIRPORT_CITIES.includes(cityId);
}

// A route as this module consumes it. The parent maps a TravelRoute
// onto it as { fromCity: r.from, toCity: r.to, baseCost: r.cost,
// baseHours: r.timeHours }; when no TravelRoute exists, the parent
// supplies the $50 / 3h bus fallback as baseCost 50 / baseHours 3.
export interface TransitRouteInput {
  fromCity: string;
  toCity: string;
  baseCost: number; // dollars, per TRAVEL_ROUTES.cost
  baseHours: number; // hours, per TRAVEL_ROUTES.timeHours
}

export interface TransitOption {
  mode: TransitMode;
  available: boolean;
  fareCents: number; // whole cents, integer
  timeHours: number; // hours, 2-decimal
  fromStation: string;
  toStation: string;
  note: string;
}

const TRANSIT_MULTIPLIERS: Record<TransitMode, { fare: number; time: number }> = {
  bus: { fare: 0.8, time: 1.5 },
  train: { fare: 1.25, time: 1.0 },
  airport: { fare: 2.5, time: 0.4 },
};

const TRANSIT_STATION_SUFFIX: Record<TransitMode, string> = {
  bus: 'Bus Station',
  train: 'Train Station',
  airport: 'Airport',
};

export function transitOption(route: TransitRouteInput, mode: TransitMode): TransitOption {
  const mult = TRANSIT_MULTIPLIERS[mode];
  const available = mode !== 'airport' || (hasAirport(route.fromCity) && hasAirport(route.toCity));
  const fromName = cityShortName(route.fromCity);
  const toName = cityShortName(route.toCity);
  const note = mode === 'airport'
    ? available
      ? 'Fastest option, priciest fare — flight between airport cities.'
      : 'No flight on this route: one or both cities have no airport in the closed airport list.'
    : mode === 'train'
      ? 'Middle fare, middle speed.'
      : 'Cheapest fare, slowest trip.';
  return {
    mode,
    available,
    fareCents: Math.round(route.baseCost * 100 * mult.fare),
    timeHours: round2(route.baseHours * mult.time),
    fromStation: `${fromName} ${TRANSIT_STATION_SUFFIX[mode]}`,
    toStation: `${toName} ${TRANSIT_STATION_SUFFIX[mode]}`,
    note,
  };
}

// Only available modes, in TRANSIT_MODES order (bus, train, airport).
// An unavailable airport option is omitted here; callers that need
// to explain why a flight is missing should call transitOption
// directly with mode 'airport' and read its `available` + `note`.
export function transitOptions(route: TransitRouteInput): TransitOption[] {
  return TRANSIT_MODES.map((mode) => transitOption(route, mode)).filter((o) => o.available);
}

// ============================================================
// §64 — WEATHER DEPTH
// ============================================================

// The six time-engine conditions (clear, cloudy, rainy, stormy, hot,
// cold) plus foggy, snowy, windy, humid. Note: world-data's
// generateWeatherByClimate already returns 'snowy' and 'humid' even
// though the time-engine union does not list them; this list
// formalises all ten as labels for the parent to wire into the union.
export const WEATHER_CONDITIONS_24 = [
  'clear', 'cloudy', 'rainy', 'stormy', 'hot', 'cold',
  'foggy', 'snowy', 'windy', 'humid',
] as const;
export type WeatherCondition24 = (typeof WEATHER_CONDITIONS_24)[number];

const CONDITION_PHRASE: Record<WeatherCondition24, string> = {
  clear: 'clear skies',
  cloudy: 'cloudy skies',
  rainy: 'rain',
  stormy: 'storms',
  hot: 'hot weather',
  cold: 'cold weather',
  foggy: 'fog',
  snowy: 'snow',
  windy: 'windy conditions',
  humid: 'humid conditions',
};

// Climate pools the deterministic outlook draws from. Pools repeat a
// condition to weight it; the hash picks one entry, so the same
// (city, date, offset) always yields the same condition.
const CLIMATE_POOLS: Record<string, WeatherCondition24[]> = {
  tropical: ['rainy', 'rainy', 'stormy', 'humid', 'humid', 'clear', 'cloudy'],
  subtropical: ['clear', 'clear', 'cloudy', 'rainy', 'humid', 'hot'],
  temperate: ['clear', 'clear', 'cloudy', 'cloudy', 'rainy', 'windy'],
  continental: ['clear', 'cloudy', 'cloudy', 'rainy', 'windy', 'cold'],
  desert: ['hot', 'hot', 'clear', 'clear', 'windy'],
  mediterranean: ['clear', 'clear', 'clear', 'cloudy', 'rainy', 'hot'],
};

function climateForCity(cityId: string): string {
  return (WORLD_CITIES as Record<string, { climate?: string }>)[cityId]?.climate ?? 'temperate';
}

function poolFor(climate: string, month1: number): WeatherCondition24[] {
  const base = CLIMATE_POOLS[climate] ?? CLIMATE_POOLS['temperate']!;
  // Winter months (Nov–Feb) lean cold/snowy, summer months (Jun–Aug)
  // lean hot — still just pool weighting, never a stated fact.
  if (month1 === 11 || month1 === 12 || month1 === 1 || month1 === 2) {
    return [...base, 'cold', 'snowy'];
  }
  if (month1 >= 6 && month1 <= 8) {
    return [...base, 'hot'];
  }
  return base;
}

export interface ForecastDay {
  dateISO: string; // YYYY-MM-DD
  condition: WeatherCondition24;
  chancePercent: number; // 40–80, outlook only
  outlook: string; // chance language + hedge, e.g. "About a 60% chance of rain — outlook only, not a guarantee."
}

export interface ForecastOutlook {
  city: string;
  cityDisplayName: string;
  startDateISO: string;
  days: ForecastDay[]; // exactly 3: the given date and the next two days
}

function parseISODate(dateISO: string): { year: number; month1: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  const day = Number(m[3]);
  if (month1 < 1 || month1 > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month1 - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month1 - 1 || d.getUTCDate() !== day) return null;
  return { year, month1, day };
}

function addDaysISO(year: number, month1: number, day: number, offset: number): string {
  const d = new Date(Date.UTC(year, month1 - 1, day + offset));
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dd}`;
}

// Deterministic 3-day outlook from (city, date). Throws on a
// malformed dateISO so a bad input surfaces instead of silently
// forecasting for the wrong day; callers pass a valid YYYY-MM-DD.
export function forecastFor(city: string, dateISO: string): ForecastOutlook {
  const parsed = parseISODate(dateISO);
  if (!parsed) throw new Error(`forecastFor expects a YYYY-MM-DD date, got: ${dateISO}`);
  const pool = poolFor(climateForCity(city), parsed.month1);
  const days: ForecastDay[] = [];
  for (let offset = 0; offset < 3; offset++) {
    const dayISO = addDaysISO(parsed.year, parsed.month1, parsed.day, offset);
    const h = hash24(`${city}|${dayISO}`);
    const condition = pool[h % pool.length]!;
    const chancePercent = 40 + (hash24(`${city}|${dayISO}|chance`) % 41);
    days.push({
      dateISO: dayISO,
      condition,
      chancePercent,
      outlook: `About ${String(chancePercent).startsWith('8') ? 'an' : 'a'} ${chancePercent}% chance of ${CONDITION_PHRASE[condition]} — outlook only, not a guarantee.`,
    });
  }
  return {
    city,
    cityDisplayName: (WORLD_CITIES as Record<string, { displayName?: string }>)[city]?.displayName ?? cityShortName(city),
    startDateISO: dateISO,
    days,
  };
}

export interface WeatherEffect {
  condition: WeatherCondition24;
  // Multiplier the parent applies to work pay (1.00 = no change).
  // No condition pays above the baseline: weather can only dampen
  // pay, never invent a bonus.
  workPayMultiplier: number;
  travelDelayNote: string;
  moodNote: string;
  eventNote: string;
}

const WEATHER_EFFECTS: Record<WeatherCondition24, Omit<WeatherEffect, 'condition'>> = {
  clear: {
    workPayMultiplier: 1.0,
    travelDelayNote: 'No weather delay expected.',
    moodNote: 'Bright and easy — a good day to be out.',
    eventNote: 'Outdoor plans run as usual.',
  },
  cloudy: {
    workPayMultiplier: 1.0,
    travelDelayNote: 'No weather delay expected.',
    moodNote: 'Steady, unremarkable day.',
    eventNote: 'Outdoor plans run as usual.',
  },
  rainy: {
    workPayMultiplier: 0.95,
    travelDelayNote: 'Rain may slow travel — allow extra time.',
    moodNote: 'Grey skies drag a little.',
    eventNote: 'Outdoor events may feel damp; indoor plans are safer.',
  },
  stormy: {
    workPayMultiplier: 0.9,
    travelDelayNote: 'Storms may delay travel — expect disruption.',
    moodNote: 'Storms put people on edge.',
    eventNote: 'Outdoor events are at risk; indoor plans are safer.',
  },
  hot: {
    workPayMultiplier: 0.95,
    travelDelayNote: 'Heat may slow travel — allow extra time and breaks.',
    moodNote: 'Heat saps energy.',
    eventNote: 'Outdoor work and events feel harder in the heat.',
  },
  cold: {
    workPayMultiplier: 0.95,
    travelDelayNote: 'Cold may slow travel — allow extra time.',
    moodNote: 'Cold keeps people indoors.',
    eventNote: 'Outdoor events feel biting; indoor plans are warmer.',
  },
  foggy: {
    workPayMultiplier: 1.0,
    travelDelayNote: 'Fog may slow travel — allow extra time, especially early.',
    moodNote: 'Fog makes the day feel quiet and closed-in.',
    eventNote: 'Outdoor plans are harder to enjoy in low visibility.',
  },
  snowy: {
    workPayMultiplier: 0.9,
    travelDelayNote: 'Snow may delay travel — expect disruption.',
    moodNote: 'Snow slows everything down.',
    eventNote: 'Outdoor events are at risk in snow.',
  },
  windy: {
    workPayMultiplier: 1.0,
    travelDelayNote: 'Wind may slow travel slightly — allow a little extra time.',
    moodNote: 'Wind makes the day feel restless.',
    eventNote: 'Outdoor plans are blustery but runnable.',
  },
  humid: {
    workPayMultiplier: 0.95,
    travelDelayNote: 'Humidity may slow travel slightly — allow extra time.',
    moodNote: 'Sticky air saps energy.',
    eventNote: 'Outdoor plans feel heavier in humidity.',
  },
};

export function weatherEffects(condition: WeatherCondition24): WeatherEffect {
  return { condition, ...WEATHER_EFFECTS[condition] };
}

// ============================================================
// §65 — TIME-OF-DAY LIFE
// ============================================================

export type DayPeriod = 'night' | 'morning' | 'afternoon' | 'evening';

// Boundaries match TimeEngine.getTimeOfDay exactly. Fractional hours
// are floored to the hour; out-of-range hours wrap modulo 24.
export function periodOfHour(hour: number): DayPeriod {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export interface PeriodActivities {
  period: DayPeriod;
  shops: string; // word-state only, never a named venue
  offices: string;
  nightlife: string;
  transitFrequency: string; // word-state only ("frequent", "regular", "infrequent")
  effects: string[]; // day/night effect words, e.g. shift + safety notes
  summary: string;
}

const PERIOD_ACTIVITIES: Record<DayPeriod, Omit<PeriodActivities, 'period'>> = {
  night: {
    shops: 'mostly closed',
    offices: 'closed',
    nightlife: 'active late',
    transitFrequency: 'infrequent',
    effects: [
      'Night-shift note: night shifts pay a premium under the existing shift rules.',
      'Late-night safety note: stick to well-lit, busy streets after dark.',
    ],
    summary: 'The city is quiet — shops mostly closed, offices closed, nightlife active late, transit infrequent.',
  },
  morning: {
    shops: 'opening',
    offices: 'open',
    nightlife: 'closed',
    transitFrequency: 'frequent',
    effects: [
      'Morning-shift note: morning shifts pay the standard rate under the existing shift rules.',
    ],
    summary: 'The city wakes up — shops opening, offices open, nightlife closed, transit frequent.',
  },
  afternoon: {
    shops: 'open',
    offices: 'open',
    nightlife: 'quiet',
    transitFrequency: 'frequent',
    effects: [
      'Daytime note: standard-rate hours under the existing shift rules.',
    ],
    summary: 'The city is in full swing — shops open, offices open, nightlife quiet, transit frequent.',
  },
  evening: {
    shops: 'winding down',
    offices: 'closed',
    nightlife: 'building',
    transitFrequency: 'regular',
    effects: [
      'Evening-shift note: evening shifts pay a small premium under the existing shift rules.',
    ],
    summary: 'The day winds down — shops winding down, offices closed, nightlife building, transit regular.',
  },
};

export function activitiesForPeriod(period: DayPeriod): PeriodActivities {
  return { period, ...PERIOD_ACTIVITIES[period] };
}

function hourLabel(hour: number): string {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function isWeekendDay(dayName: string): boolean {
  const d = dayName.trim().toLowerCase();
  return d === 'saturday' || d === 'sunday' || d === 'sat' || d === 'sun';
}

// One-line day schedule from (hour, city, dayName). The city is shown
// by its world-data display name ("Memphis, TN"); an unknown city id
// falls back to its prettified id. Weekend days add a generic offices
// note; no venue is ever named.
export function dayScheduleSummary(hour: number, city: string, dayName: string): string {
  const period = periodOfHour(hour);
  const act = activitiesForPeriod(period);
  const display: string = (WORLD_CITIES as Record<string, { displayName?: string }>)[city]?.displayName ?? cityShortName(city);
  const base = `${dayName} in ${display} — ${period} (${hourLabel(hour)}): shops ${act.shops}, offices ${act.offices}, nightlife ${act.nightlife}, transit ${act.transitFrequency}.`;
  const effects = act.effects.join(' ');
  const weekend = isWeekendDay(dayName) ? ' Weekend note: offices are mostly closed on weekends.' : '';
  return `${base} ${effects}${weekend}`;
}
