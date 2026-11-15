// THE OPEN WORLD — v0.108.20 MEGA-EXPANSION
// Tables + pure helpers. Same rules as .15/.18/.19: additive state only,
// existing architecture only, no new currencies, no new services, no
// dialogue changes, rewards at or below the established economy scale
// (entry jobs ~$26k–$38k/yr, rents ~$800–$3,500/mo, bank 0.5%/mo).
// Spec: docs/EXPANSION_ROADMAP_SPEC_v0.108.20.md.

import { WORLD_CITIES, WORLD_DISTRICTS } from '../shared/world-data.js';
import { CITY_METADATA } from '../shared/types.js';
import { weekKeyFromDate } from './features-0.108.19.js';

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Parse "Monday, January 15, 2024" -> { year, month (0-based), day }.
export function parseGameDate(dateStr: string): { year: number; month: number; day: number } | null {
  const months: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
  const m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = months[m[1]!];
  if (month === undefined) return null;
  return { year: parseInt(m[3]!, 10), month, day: parseInt(m[2]!, 10) };
}

export function monthKeyFromParts(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, '0')}`;
}

export function addMonthsToKey(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const total = (y ?? 2024) * 12 + ((m ?? 1) - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

// === §1 — IRS TAX ===
// Standard deduction $12,000; brackets on taxable income: 10% to
// $40,000, 15% to $85,000, 25% above. Spec-checked: $30,000 income ->
// taxable $18,000 -> $1,800 owed.
export const TAX_DEDUCTION = 12000;
export const TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 40000, rate: 0.10 },
  { upTo: 85000, rate: 0.15 },
  { upTo: Infinity, rate: 0.25 },
];
export function computeTaxLiability(annualIncome: number): number {
  const taxable = Math.max(0, annualIncome - TAX_DEDUCTION);
  let owed = 0;
  let prev = 0;
  for (const b of TAX_BRACKETS) {
    const slice = Math.max(0, Math.min(taxable, b.upTo) - prev);
    owed += slice * b.rate;
    prev = b.upTo;
    if (taxable <= b.upTo) break;
  }
  return Math.round(owed * 100) / 100;
}
export const TAX_PLAN_INSTALLMENTS = 3;
export const TAX_PLAN_BREAK_PENALTY_RATE = 0.05;
export const TAX_LATE_PENALTY_RATE = 0.10;
export const TAX_LATE_FEE_MONTHLY = 25;
export const TAX_DUE_MONTHS_AFTER_ASSESSMENT = 4;

// === §2 — COURT & POLICE ===
export const DEFEND_FEE = 250;
export const DEFEND_UPHELD_COSTS = 100;
export type DefendOutcome = 'dismissed' | 'reduced' | 'upheld';
// Deterministic from a hash of the case id: players get consistent
// rulings and the harness can assert them.
export function defendOutcome(caseId: string): DefendOutcome {
  const r = hashStr(caseId) % 3;
  return r === 0 ? 'dismissed' : r === 1 ? 'reduced' : 'upheld';
}
export function patrolLevel(crimeRate: number): string {
  if (crimeRate >= 60) return 'Strict';
  if (crimeRate >= 40) return 'Moderate';
  return 'Relaxed';
}
export const INVESTIGATION_HEAT_1 = 50;
export const INVESTIGATION_HEAT_2 = 80;
export const INVESTIGATION_CLOSE_HEAT = 30;
export const LAWYER_CLEAN_INVESTIGATION_SURCHARGE = 200;

// === §3 — COLLEGE ===
// Degree ladder by completed-course count within a school family,
// computed from live state, never stored as a separate rank.
export function degreeTitle(courseCount: number): string {
  if (courseCount >= 4) return 'Master';
  if (courseCount === 3) return 'Bachelor';
  if (courseCount === 2) return 'Associate';
  if (courseCount === 1) return 'Certificate';
  return 'None yet';
}
export function nextDegreeTitle(courseCount: number): { label: string; at: number } | null {
  if (courseCount >= 4) return null;
  const ladder = ['Certificate', 'Associate', 'Bachelor', 'Master'];
  return { label: ladder[courseCount]!, at: courseCount + 1 };
}
export const CAMPUS_STUDY_HOURS = 2;
export const CAMPUS_STUDY_XP = 10;
export const CAMPUS_CLUB_HOURS = 2;
export const CAMPUS_CLUB_HAPPY = 5;
export const CAMPUS_CLUB_REL = 3;

// === §4 — FAMILY ===
export const PROPOSE_COST = 200;
export const WELCOME_CHILD_COST = 300;
export const FAMILY_ACTIVITIES: Record<string, { cost: number; label: string }> = {
  movie: { cost: 40, label: 'Movie night' },
  picnic: { cost: 25, label: 'Picnic' },
  dinner: { cost: 60, label: 'Dinner out' },
};
export const FAMILY_ACTIVITY_HOURS = 2;
export const FAMILY_ACTIVITY_HAPPY_PER_MEMBER = 5;
export const FAMILY_ACTIVITY_HAPPY_CAP = 15;
export const FAMILY_ACTIVITY_SPOUSE_REL = 2;
export const FAMILY_EVENT_HAPPY = 5;
export function childStage(age: number): string {
  if (age <= 2) return 'baby';
  if (age <= 12) return 'child';
  if (age <= 17) return 'teen';
  return 'young adult';
}

// === §5 — GOVERNMENT TIERS ===
export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};
export const COUNTRY_NAMES: Record<string, string> = {
  USA: 'United States', UK: 'United Kingdom', Japan: 'Japan', France: 'France',
  Germany: 'Germany', UAE: 'United Arab Emirates', Mexico: 'Mexico',
  Canada: 'Canada', Australia: 'Australia',
};
// State/country derive from the city's display-name suffix
// ("Memphis, TN" -> Tennessee; "London, UK" -> United Kingdom).
export function stateNameForCity(cityId: string): string {
  const city = (WORLD_CITIES as Record<string, any>)[cityId];
  const display: string = city?.displayName ?? cityId;
  const suffix = display.split(', ').pop() ?? '';
  if (city?.country === 'USA') return US_STATE_NAMES[suffix] ?? suffix;
  return COUNTRY_NAMES[city?.country ?? ''] ?? suffix;
}
export function countryNameForCity(cityId: string): string {
  const city = (WORLD_CITIES as Record<string, any>)[cityId];
  return COUNTRY_NAMES[city?.country ?? ''] ?? city?.country ?? '';
}
export function stateCodeForCity(cityId: string): string | null {
  const city = (WORLD_CITIES as Record<string, any>)[cityId];
  if (city?.country !== 'USA') return null;
  const display: string = city?.displayName ?? '';
  return display.split(', ').pop() ?? null;
}
export function civicTitle(communityRep: number): string {
  if (communityRep >= 100) return 'Office Holder';
  if (communityRep >= 75) return 'Public Servant';
  if (communityRep >= 50) return 'Community Leader';
  if (communityRep >= 25) return 'Active Citizen';
  return 'Resident';
}

// === §6 + §9 — CALENDAR / YEARS / TIME / AGING ===
export function seasonFromMonth(month0: number): string {
  if (month0 === 11 || month0 === 0 || month0 === 1) return 'Winter';
  if (month0 >= 2 && month0 <= 4) return 'Spring';
  if (month0 >= 5 && month0 <= 7) return 'Summer';
  return 'Autumn';
}
export const LIFE_STAGE_START_AGE = 18;
export function lifeStage(age: number): string {
  if (age >= 65) return 'Senior';
  if (age >= 50) return 'Midlife';
  if (age >= 30) return 'Adult';
  return 'Young Adult';
}
export function dayOfYear(year: number, month0: number, day: number): number {
  const d = new Date(Date.UTC(year, month0, day));
  const start = new Date(Date.UTC(year, 0, 1));
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}
export function daysUntilYearEnd(year: number, month0: number, day: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return (isLeap ? 366 : 365) - dayOfYear(year, month0, day);
}
export interface Holiday { name: string; month: number; day: number }
export function holidaysForYear(year: number): Holiday[] {
  // Thanksgiving = 4th Thursday of November, computed.
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstThursdayOffset = (4 - nov1.getUTCDay() + 7) % 7;
  const thanksgivingDay = 1 + firstThursdayOffset + 21;
  return [
    { name: "New Year's Day", month: 0, day: 1 },
    { name: "Valentine's Day", month: 1, day: 14 },
    { name: 'Independence Day', month: 6, day: 4 },
    { name: 'Halloween', month: 9, day: 31 },
    { name: 'Thanksgiving', month: 10, day: thanksgivingDay },
    { name: 'Christmas', month: 11, day: 25 },
  ];
}
export const SEASON_STARTS: { name: string; month: number; day: number }[] = [
  { name: 'Spring begins', month: 2, day: 20 },
  { name: 'Summer begins', month: 5, day: 21 },
  { name: 'Autumn begins', month: 8, day: 22 },
  { name: 'Winter begins', month: 11, day: 21 },
];
function holidayWeekKey(h: Holiday, year: number): number {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return weekKeyFromDate(`${months[h.month]} ${h.day}, ${year}`);
}
export function holidayForWeek(weekKey: number, year: number): Holiday | null {
  for (const h of holidaysForYear(year)) {
    if (holidayWeekKey(h, year) === weekKey) return h;
  }
  // A week can straddle a year boundary; check the adjacent years too.
  for (const y of [year - 1, year + 1]) {
    for (const h of holidaysForYear(y)) {
      if (holidayWeekKey(h, y) === weekKey) return h;
    }
  }
  return null;
}
export function nextHoliday(year: number, month0: number, day: number): { holiday: Holiday; daysAway: number } {
  const today = Date.UTC(year, month0, day);
  for (const y of [year, year + 1]) {
    for (const h of holidaysForYear(y)) {
      const d = Date.UTC(y, h.month, h.day);
      if (d >= today) return { holiday: h, daysAway: Math.round((d - today) / 86400000) };
    }
  }
  return { holiday: holidaysForYear(year + 1)[0]!, daysAway: 0 };
}
// Seasonal event preference inside the existing template pool (§17):
// summer weeks prefer beach/outdoor templates, winter weeks prefer
// market/fair templates — a preference, never a new event system.
export function seasonalTemplateModifier(month0: number, modifiers: string[]): string | null {
  if (month0 >= 5 && month0 <= 7) {
    if (modifiers.includes('beach_city')) return 'beach_city';
    return null;
  }
  if (month0 === 11 || month0 === 0 || month0 === 1) {
    if (modifiers.includes('small_town')) return 'small_town';
    if (modifiers.includes('family')) return 'family';
    return null;
  }
  return null;
}

// === §7 — JOBS & GIGS ===
export interface GigDef { key: string; label: string; pay: number; hours: number; skill: string }
export const GIGS: GigDef[] = [
  { key: 'delivery', label: 'Delivery', pay: 60, hours: 2, skill: 'driving' },
  { key: 'rideshare', label: 'Rideshare', pay: 75, hours: 3, skill: 'driving' },
  { key: 'freelance', label: 'Freelance', pay: 90, hours: 3, skill: 'tech' },
];
export const GIG_ENERGY = 15;
export const GIG_XP = 10;
export const OVERTIME_MULTIPLIER = 1.5;
export const OVERTIME_HOURS = 8;
export const CAREER_TITLES: { shifts: number; title: string }[] = [
  { shifts: 10, title: 'Regular' },
  { shifts: 25, title: 'Reliable' },
  { shifts: 50, title: 'Veteran' },
  { shifts: 100, title: 'Lifer' },
];
export function careerTitle(shifts: number): string | null {
  let out: string | null = null;
  for (const t of CAREER_TITLES) if (shifts >= t.shifts) out = t.title;
  return out;
}
export function nextCareerTitle(shifts: number): { title: string; at: number } | null {
  for (const t of CAREER_TITLES) if (shifts < t.shifts) return { title: t.title, at: t.shifts };
  return null;
}

// === §8 — MONEY & BANK ===
export const MAX_SAVINGS_GOALS = 5;
export const CREDIT_START = 50;
export const CREDIT_MIN = 0;
export const CREDIT_MAX = 100;
export const CREDIT_ON_TIME_GAIN = 2;
export const CREDIT_MISSED_LOSS = 10;
export const LOAN_INTEREST_RATE = 0.02;
export const LOAN_LATE_FEE = 25;
export const LOAN_PAYMENT_RATE = 0.10;
export const LOAN_PAYMENT_MIN = 25;
export function loanCap(credit: number): number {
  return Math.min(6000, 1000 + Math.max(0, Math.min(100, credit)) * 50);
}
export function loanMonthlyPayment(balance: number): number {
  if (balance <= 0) return 0;
  return Math.min(balance, Math.max(LOAN_PAYMENT_MIN, Math.round(balance * LOAN_PAYMENT_RATE * 100) / 100));
}

// === §10 — LIFE HARD ===
export const HARD_BILL_UTILITIES = 120;
export const HARD_BILL_FOOD = 150;
export const HARD_BILL_PER_PROPERTY = 50;
export const HARD_BILL_PER_VEHICLE = 30;
export function hardBillsFor(player: any): number {
  const props = (player.properties ?? []).length;
  const vehicles = (player.vehicles ?? []).length;
  return HARD_BILL_UTILITIES + HARD_BILL_FOOD + props * HARD_BILL_PER_PROPERTY + vehicles * HARD_BILL_PER_VEHICLE;
}

// === §12 — CHARACTER & STARTS ===
export interface TraitBonus { stat?: string; value?: number; cash?: number }
export const TRAIT_BONUSES: Record<string, TraitBonus[]> = {
  charisma_trait: [{ stat: 'charisma', value: 5 }],
  discipline: [{ stat: 'energy', value: 5 }],
  empathy: [{ stat: 'happiness', value: 5 }],
  hustle: [{ cash: 100 }],
  intelligence: [{ stat: 'intelligence', value: 5 }],
  risk_taking: [{ cash: 100 }],
  resilient: [{ stat: 'stress', value: -10 }],
  ambitious: [{ stat: 'charisma', value: 3 }, { stat: 'intelligence', value: 3 }],
};
export const TRAIT_NAMES: Record<string, string> = {
  charisma_trait: 'Charisma', discipline: 'Discipline', empathy: 'Empathy',
  hustle: 'Hustle', intelligence: 'Intelligence', risk_taking: 'Risk Taking',
  resilient: 'Resilient', ambitious: 'Ambitious',
};
export function firstDistrictOfCity(cityId: string): string {
  const city = (WORLD_CITIES as Record<string, any>)[cityId];
  const districts: string[] = city?.districts ?? [];
  if (districts.length > 0) return districts[0]!;
  return 'downtown';
}
export function cityDisplayName(cityId: string): string {
  return (WORLD_CITIES as Record<string, any>)[cityId]?.displayName ?? cityId.replace(/_/g, ' ');
}
export function districtDisplayName(districtId: string): string {
  return (WORLD_DISTRICTS as Record<string, any>)[districtId]?.displayName ?? districtId.replace(/_/g, ' ');
}

// === §13 — LEADERBOARD ===
export function lifetimeXP(player: any): number {
  const skills = (player.skills ?? {}) as Record<string, { level?: number; xp?: number }>;
  let total = 0;
  for (const s of Object.values(skills)) {
    total += ((s.level ?? 1) - 1) * 100 + (s.xp ?? 0);
  }
  return total;
}

// === §14 — LEGACY ===
export const LEGACY_BONUS_PER_LIFE = 100;
export const LEGACY_BONUS_CAP = 500;
export const LEGACY_BONUS_CAP_LIVES = 5;
export function legacyBonus(legacyCount: number): number {
  return LEGACY_BONUS_PER_LIFE * Math.min(Math.max(0, legacyCount), LEGACY_BONUS_CAP_LIVES);
}

// === §15 — COMMUNITY CHALLENGES ===
export type ChallengeGoalType = 'earnings' | 'cities' | 'shifts';
export interface ChallengeGoal { type: ChallengeGoalType; label: string; threshold: number; howTo: string }
export function challengeGoalForWeek(weekKey: number): ChallengeGoal {
  const r = ((weekKey % 3) + 3) % 3;
  if (r === 0) return { type: 'earnings', label: 'Community Earnings', threshold: 500, howTo: 'Earn cash with work, gigs, or overtime.' };
  if (r === 1) return { type: 'cities', label: 'Cities Visited', threshold: 3, howTo: 'Travel or road-trip to new cities this week.' };
  return { type: 'shifts', label: 'Work Shifts', threshold: 3, howTo: 'Work shifts or overtime shifts.' };
}
export const CHALLENGE_REWARD = 75;

// === §16 — NEWSPAPER (data sources only; rendering lives in the engine) ===
export function economicIndexForCity(cityId: string): number {
  return (CITY_METADATA as Record<string, any>)[cityId]?.economicIndex
    ?? (WORLD_CITIES as Record<string, any>)[cityId]?.economicIndex ?? 50;
}

// === §17 — SEASONS & HOLIDAYS ===
export const HOLIDAY_ATTEND_HAPPY_BONUS = 5;
export const HOLIDAY_ATTEND_CASH_BONUS = 25;

// === §18 — TRADING ===
export const TRADE_MAX_OPEN_OFFERS = 3;
export const TRADE_MAX_PRICE = 10000;
export const TRADE_MAX_ITEM_VALUE = 5000;
export const TRADE_HOURLY_LIMIT_MS = 3600000;
export const TRADE_EXPIRY_MS: number = 7 * 24 * 3600000;
export function tradeItemName(item: any): string {
  if (typeof item === 'string') return item;
  return String(item?.name ?? item?.label ?? item?.type ?? '');
}
export function tradeItemValue(item: any): number {
  if (typeof item === 'string') return 0;
  const v = item?.value ?? item?.price ?? item?.cost ?? 0;
  return typeof v === 'number' ? v : 0;
}

// === §21 — DEEPER WORKING ===
// Shift differentials apply to the next `work` only, then reset.
// v0.108.26: three more one-shot keys. Weekend (×1.15) sits between
// evening and night and is only settable Sat/Sun; split (×1.00, less
// energy, +3 happiness) trades pay for flexibility; on-call (×1.10)
// charges stress instead of energy for the same premium as evening.
// `happy` is an optional happiness gain applied by work().
export interface ShiftDef { key: string; payMult: number; energy: number; stress: number; happy?: number }
export const SHIFTS: Record<string, ShiftDef> = {
  morning: { key: 'morning', payMult: 1, energy: 35, stress: 0 },
  evening: { key: 'evening', payMult: 1.10, energy: 40, stress: 0 },
  night: { key: 'night', payMult: 1.20, energy: 45, stress: 5 },
  weekend: { key: 'weekend', payMult: 1.15, energy: 40, stress: 2 },
  split: { key: 'split', payMult: 1, energy: 30, stress: 0, happy: 3 },
  oncall: { key: 'oncall', payMult: 1.10, energy: 35, stress: 5 },
};
export type WorkplaceEventKind = 'team_lunch' | 'deadline' | 'review' | 'quiet';
export interface WorkplaceEvent { kind: WorkplaceEventKind; label: string; payMult: number; stress: number; happy: number; bonus: number }
export function workplaceEventForDay(employer: string, dateStr: string): WorkplaceEvent {
  const r = hashStr(`${employer}|${dateStr}`) % 4;
  if (r === 0) return { kind: 'team_lunch', label: 'Team lunch', payMult: 1, stress: 0, happy: 5, bonus: 0 };
  if (r === 1) return { kind: 'deadline', label: 'Deadline week', payMult: 1.15, stress: 5, happy: 0, bonus: 0 };
  if (r === 2) return { kind: 'review', label: 'Review day', payMult: 1, stress: 0, happy: 0, bonus: 50 };
  return { kind: 'quiet', label: 'Quiet day', payMult: 1, stress: 0, happy: 0, bonus: 0 };
}
// The job record carries no performance field, so review day measures
// performance as professional reputation (0–100) — an existing,
// player-visible number. Documented here, not hidden in the engine.
export function workplacePerformance(player: any): number {
  return Math.max(0, Math.min(100, player.reputation?.professional ?? 0));
}
// Category -> role-keyword families, from the actual roster role
// strings. A coworker is a roster NPC in the job's district whose role
// contains one of the family's keywords. When nothing matches, the
// output says so plainly — coworkers are never invented.
export const COWORKER_FAMILIES: Record<string, string[]> = {
  entry: ['owner', 'vendor', 'clerk', 'cashier', 'cook', 'chef', 'driver', 'messenger', 'attendant', 'worker', 'associate', 'handler', 'stocker'],
  skilled: ['mechanic', 'technician', 'engineer', 'nurse', 'teacher', 'barber', 'chef'],
  career: ['manager', 'director', 'analyst', 'engineer', 'lawyer', 'professor', 'consultant', 'designer'],
  elite: ['ceo', 'director', 'founder', 'executive', 'chief', 'owner', 'investor'],
  government: ['politician', 'officer', 'detective', 'clerk'],
  federal: ['agent', 'officer', 'analyst', 'detective'],
  political: ['politician', 'consultant', 'organizer'],
  emergency: ['officer', 'nurse', 'doctor', 'firefighter', 'paramedic'],
};
export function coworkerKeywords(category: string | undefined, tier: string | undefined): string[] {
  const cat = String(category ?? '').toLowerCase();
  if (COWORKER_FAMILIES[cat]) return COWORKER_FAMILIES[cat]!;
  return COWORKER_FAMILIES[String(tier ?? 'entry').toLowerCase()] ?? COWORKER_FAMILIES['entry']!;
}
export const LUNCH_COST = 15;
export const LUNCH_HOURS = 1;
export const LUNCH_REL = 3;
export const LUNCH_HAPPY = 5;

// === §22 — DEEPER CITIZEN ===
export const VOLUNTEER_HOURS = 2;
export const VOLUNTEER_REP = 5;
export const VOLUNTEER_HAPPY = 3;
export const VOLUNTEER_ENERGY = 10;
export function needWordSafety(crimeRate: number): string {
  if (crimeRate <= 35) return 'Strong';
  if (crimeRate <= 55) return 'Steady';
  return 'Strained';
}
export function needWordProsperity(economicIndex: number): string {
  if (economicIndex >= 75) return 'Strong';
  if (economicIndex >= 50) return 'Steady';
  return 'Strained';
}
export function needWordSpirit(communityRepBonus: number): string {
  if (communityRepBonus >= 10) return 'Strong';
  if (communityRepBonus >= 5) return 'Steady';
  return 'Strained';
}
export function crowdActivity(jobTypes: string[], timeOfDay: string): string {
  if (timeOfDay === 'night') return 'night quiet — a few late stragglers, mostly still streets';
  if (timeOfDay === 'morning') {
    if (jobTypes.includes('truck_stop')) return 'morning commute — trucks rolling through, drivers grabbing coffee';
    return 'morning commute — people heading to work and school';
  }
  if (timeOfDay === 'evening') return 'evening leisure — neighbors out, shops winding down';
  return 'midday commerce — shops busy, errands being run';
}

// === §23 — FAME / WEALTH ===
export const WEALTH_TIERS: { at: number; label: string }[] = [
  { at: 250000, label: 'Elite' },
  { at: 100000, label: 'Wealthy' },
  { at: 25000, label: 'Comfortable' },
];
export function wealthTier(netWorth: number): string {
  for (const t of WEALTH_TIERS) if (netWorth >= t.at) return t.label;
  return 'Getting by';
}
export function wealthTierCount(netWorth: number): number {
  return WEALTH_TIERS.filter((t) => netWorth >= t.at).length;
}
// Spec-formula net worth (cash + bank + property currentValues +
// investment currentValues + business purchase prices). This differs
// from calculateNetWorth() (property equity + vehicles, no business
// prices); fame uses the spec formula, stated here.
export function specNetWorth(player: any): number {
  let total = (player.money ?? 0) + (player.bankBalance ?? 0);
  for (const p of player.properties ?? []) total += p.currentValue ?? 0;
  for (const i of player.investments ?? []) total += i.currentValue ?? 0;
  for (const b of player.businesses ?? []) total += b.purchasePrice ?? 0;
  return Math.floor(total);
}
export function fameScore(player: any, achievementsUnlocked: number): number {
  const netWorth = specNetWorth(player);
  let score = achievementsUnlocked * 2;
  score += wealthTierCount(netWorth) * 10;
  if (String(player.job?.tier ?? '').toLowerCase() === 'executive') score += 10;
  const pmRaw: any = player.passportMilestones ?? 0;
  score += (Array.isArray(pmRaw) ? pmRaw.length : pmRaw) * 5;
  score += (player.challengePayouts ?? 0) * 2;
  return Math.max(0, Math.min(100, score));
}
// Notable/elite NPC rule, surveyed from the real roster (see report):
// notable = role 'politician' OR description naming Mayor/Council;
// elite = CEO/founder/industrialist/tycoon/exec roles OR any *_owner
// role (role marks enterprise ownership). No hand-promotion outside it.
export const ELITE_ROLES: Set<string> = new Set(['ceo', 'tech_ceo', 'startup_founder', 'tech_founder', 'industrialist', 'tycoon', 'oil_exec', 'businessman']);
export function isNotableNpc(npc: any): boolean {
  if (!npc) return false;
  if (npc.role === 'politician') return true;
  return /\b(mayor|council)\b/i.test(String(npc.description ?? ''));
}
export function isEliteNpc(npc: any): boolean {
  if (!npc) return false;
  if (ELITE_ROLES.has(String(npc.role))) return true;
  return String(npc.role ?? '').endsWith('_owner');
}
export const GALA_ENTRY = 10;
export const GALA_HAPPY = 10;
export const GALA_PAY = 100;

// === §24 — COMPANIES ===
export interface CompanyInfo {
  employer: string; industry: string; hqCity: string; size: string;
  sizeNum: number; employeeCount: number; listings: any[];
}
export function companySizeTier(count: number): { label: string; num: number } {
  if (count >= 15) return { label: 'Large', num: 3 };
  if (count >= 5) return { label: 'Mid', num: 2 };
  return { label: 'Small', num: 1 };
}
const INDUSTRY_KEYWORDS: [RegExp, string][] = [
  [/fedex|ups|logistics|distribution|postal|freight/i, 'Logistics'],
  [/bank|financial|credit/i, 'Banking & Finance'],
  [/hospital|medical|health|clinic|ambulance/i, 'Healthcare'],
  [/police|sheriff|fire department|fbi|atf|marshals|dea/i, 'Public Safety'],
  [/school|university|college|education/i, 'Education'],
  [/government|legislature|council|mayor|city of|county|state/i, 'Government'],
  [/retail|store|kroger|walmart|target|walgreens|autozone/i, 'Retail'],
  [/tech|software|robotics|sony/i, 'Technology'],
  [/hotel|restaurant|food|coffee/i, 'Hospitality & Food'],
];
export function companyIndustry(employer: string, categories: string[]): string {
  for (const [re, label] of INDUSTRY_KEYWORDS) if (re.test(employer)) return label;
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = '';
  let bestN = -1;
  for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
  if (!best) return 'General';
  const map: Record<string, string> = {
    government: 'Government', federal: 'Federal Services', political: 'Politics & Advocacy',
    emergency: 'Emergency Services', entry: 'General Services', skilled: 'Skilled Trades',
    career: 'Professional Services', elite: 'Executive Services',
  };
  return map[best.toLowerCase()] ?? best;
}
export function groupCompanies(listings: any[]): CompanyInfo[] {
  const byEmployer = new Map<string, any[]>();
  for (const j of listings) {
    const key = String(j.employer ?? 'Unknown');
    if (!byEmployer.has(key)) byEmployer.set(key, []);
    byEmployer.get(key)!.push(j);
  }
  const out: CompanyInfo[] = [];
  for (const [employer, jobs] of byEmployer) {
    const cityCounts = new Map<string, number>();
    for (const j of jobs) cityCounts.set(String(j.city), (cityCounts.get(String(j.city)) ?? 0) + 1);
    let hqCity = String(jobs[0]?.city ?? 'west_memphis');
    let hqN = -1;
    for (const [c, n] of cityCounts) if (n > hqN) { hqCity = c; hqN = n; }
    const size = companySizeTier(jobs.length);
    out.push({
      employer,
      industry: companyIndustry(employer, jobs.map((j: any) => String(j.category ?? ''))),
      hqCity, size: size.label, sizeNum: size.num,
      employeeCount: jobs.length, listings: jobs,
    });
  }
  out.sort((a, b) => a.employer.localeCompare(b.employer));
  return out;
}
export function companyPerformance(employer: string, monthKey: string): number {
  return hashStr(`${employer}:${monthKey}`) % 101;
}
export function performanceWord(score: number): string {
  if (score >= 70) return 'Thriving';
  if (score >= 40) return 'Steady';
  return 'Struggling';
}
export function profitShareFactor(score: number): number {
  if (score >= 70) return 2;
  if (score >= 40) return 1;
  return 0;
}
export const PROFIT_SHARE_UNIT = 100;
export function companyRevenue(company: CompanyInfo, year: number): number {
  const econ = economicIndexForCity(company.hqCity);
  const growth = 1 + Math.max(0, year - 2024) * 0.02;
  return Math.round(company.sizeNum * econ * 10000 * growth);
}

// === §25 — WORLD STOCK ===
export function stockSizeBonus(sizeLabel: string): number {
  if (sizeLabel === 'Large') return 50;
  if (sizeLabel === 'Mid') return 25;
  return 0;
}
export function stockBasePrice(company: CompanyInfo): number {
  return 20 + economicIndexForCity(company.hqCity) + stockSizeBonus(company.size);
}
export function stockMonthlyChange(employer: string, monthKey: string, hqCity: string): number {
  const perf = companyPerformance(employer, monthKey);
  const econ = economicIndexForCity(hqCity);
  const raw = (perf - 50) * 0.001 + (econ - 75) * 0.0002;
  return Math.max(-0.05, Math.min(0.05, raw));
}
// Price at month M = base × product of monthly factors from 2024-01
// through M, recomputed on read. No stored series, no RNG.
export function stockPriceAt(company: CompanyInfo, monthKey: string): number {
  const base = stockBasePrice(company);
  if (monthKey <= '2024-01') return Math.round(base * (1 + stockMonthlyChange(company.employer, '2024-01', company.hqCity)) * 100) / 100;
  let price = base;
  let m = '2024-01';
  while (m <= monthKey) {
    price *= 1 + stockMonthlyChange(company.employer, m, company.hqCity);
    if (m === monthKey) break;
    const mParts = m.split('-');
    const y = Number(mParts[0]);
    const mo = Number(mParts[1]);
    m = mo >= 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  }
  return Math.round(price * 100) / 100;
}
export const MID_SOUTH_CITIES: string[] = ['memphis', 'west_memphis', 'littlerock', 'southaven'];

// === §26 — BUSINESS STAFF ===
export const STAFF_SLOTS: Record<string, number> = {
  coffee_cart: 1, food_truck: 2, barbershop: 2, corner_store: 3, laundromat: 2, auto_shop: 3,
};
export function staffSlotsFor(businessType: string): number {
  return STAFF_SLOTS[businessType] ?? 1;
}
export function staffWageFor(baseMonthlyIncome: number): number {
  return Math.round(baseMonthlyIncome * 0.25);
}
export function moraleMultiplier(avgMorale: number): number {
  if (avgMorale >= 70) return 1.1;
  if (avgMorale >= 30) return 1.0;
  return 0.8;
}
// Staffed income, exactly per the corrected §26 formula:
// base × (1 + 0.3 × staffCount) × moraleMult − totalWages, where
// moraleMult comes from the average morale at the START of the tick
// (so the worked examples hold regardless of that month's +5/−15).
export function staffedBusinessIncome(base: number, staffCount: number, avgMorale: number, wagesPaid: number): number {
  if (staffCount === 0) return base;
  return Math.round((base * (1 + 0.3 * staffCount) * moraleMultiplier(avgMorale) - wagesPaid) * 100) / 100;
}
export const STAFF_MORALE_START = 50;
export const STAFF_MORALE_PAID_GAIN = 5;
export const STAFF_MORALE_SHORT_LOSS = 15;
export const RAISE_MORALE_GAIN = 10;
export const RAISE_MIN_GAIN = 10;

// === §27 — DIALOGUE TOPICS (template-only) ===
export interface DialogueTopic { key: string; label: string; minRel: number; partnerOnly?: boolean }
export const DIALOGUE_TOPICS: DialogueTopic[] = [
  { key: 'greeting', label: 'Greeting', minRel: -100 },
  { key: 'city', label: 'City', minRel: -100 },
  { key: 'work', label: 'Work', minRel: -100 },
  { key: 'hometown', label: 'Hometown', minRel: 25 },
  { key: 'news', label: 'News', minRel: 25 },
  { key: 'personal', label: 'Personal', minRel: 50 },
  { key: 'advice', label: 'Advice', minRel: 50 },
  { key: 'secret', label: 'Secret', minRel: 75 },
  { key: 'future', label: 'Future', minRel: 75 },
  { key: 'future together', label: 'Future together', minRel: 90, partnerOnly: true },
];
export const TOPIC_REL_GAIN = 2;
export const TOPIC_REL_CAP_PER_CONVERSATION = 10;
export const HOSPITALITY_HAPPY = 10;

// === §28 — GREETINGS ===
export function greetingTierBand(value: number, isPartner: boolean): string {
  if (isPartner || value >= 90) return 'partner';
  if (value >= 75) return 'close';
  if (value >= 50) return 'friend';
  if (value >= 25) return 'acquaintance';
  return 'stranger';
}
export function greetingBaseChange(relValue: number): number {
  return relValue < 0 ? 1 : 2;
}

// ============================================================
// v0.108.20 — APPENDIX G/H/I (items 29–32) helpers
// ============================================================

// --- §31 mail kinds (item 29) ---
export const MAIL_KIND_ICONS: Record<string, string> = {
  letter: '✉️', bill: '🧾', notice: '🏛️', package: '📦',
};
export function mailKindIcon(kind: string | undefined): string {
  return MAIL_KIND_ICONS[kind ?? 'letter'] ?? '✉️';
}

// --- §32 living expenses (item 32) ---
// Multiplier applies to HOUSING + FOOD only; utilities/transport flat.
export function cityCostMultiplier(economicIndex: number): number {
  if (economicIndex < 60) return 0.8;
  if (economicIndex <= 84) return 1.0;
  return 1.25;
}
export function householdSize(player: any): number {
  const spouse = Object.values(player.relationships ?? {}).some((r: any) => r?.spouse) ? 1 : 0;
  const kids = Array.isArray(player.children) ? player.children.length : 0;
  return 1 + spouse + kids;
}
export interface LivingBreakdown {
  housing: number; food: number; utilities: number; transport: number;
  base: number; multiplier: number; members: number;
  surcharge: number; assetSurcharge: number; total: number;
}
export function livingExpenses(player: any, economicIndex: number): LivingBreakdown {
  const mult = cityCostMultiplier(economicIndex);
  const members = householdSize(player);
  const extra = members - 1;
  const ownsProperty = (player.properties ?? []).length > 0;
  const ownsVehicle = (player.vehicles ?? []).length > 0;
  const housing = roundCents((ownsProperty ? 100 : 300) * mult);
  const food = roundCents(150 * mult + 50 * extra);
  const utilities = 80 + 20 * extra;
  const transport = ownsVehicle ? 0 : 50;
  const base = roundCents(housing + food + utilities + transport);
  const hard = !!player.hardMode;
  const surcharge = hard ? roundCents(base * 0.5) : 0;
  const assetSurcharge = hard
    ? (player.properties ?? []).length * 50 + (player.vehicles ?? []).length * 30
    : 0;
  return {
    housing, food, utilities, transport, base, multiplier: mult, members,
    surcharge, assetSurcharge,
    total: roundCents(base + surcharge + assetSurcharge),
  };
}

// --- §33 permits / fees / benefits (item 31) ---
export const PERMITS: Record<string, { name: string; cost: number; effect: string }> = {
  business: { name: 'Business License', cost: 200, effect: '+5% business income in the monthly tick' },
  drivers: { name: "Driver's License", cost: 50, effect: 'Roadtrip fuel $15 → $10' },
  food: { name: 'Food Handler Permit', cost: 75, effect: 'Cooked meals restore +2 energy each' },
};
export const BUSINESS_PERMIT_MULTIPLIER = 1.05;
export const ROADTRIP_FUEL_WITH_LICENSE = 10;
export const FOOD_PERMIT_ENERGY_BONUS = 2;
export const VEHICLE_FEE = 40;
export const PROPERTY_FEE = 25;
export const FEE_LATE = 10;
export const FEE_LATE_MONTHS = 2;
export const BENEFIT_AMOUNT = 200;

// --- §32 packages (item 30) ---
export const PACKAGE_GOODS: { name: string; value: number }[] = [
  { name: 'coffee beans', value: 10 },
  { name: 'flowers', value: 15 },
  { name: 'book', value: 20 },
  { name: 'snacks', value: 25 },
];
export const POSTAGE = 5;
export const PACKAGE_GIFT_REL = 5;
export const COURIER_HOURS = 2;
export interface CourierJob {
  id: string; fromId: string; fromName: string; fromDistrict: string;
  toId: string; toName: string; toDistrict: string; pay: number;
}
export function courierJobsForDay(dateStr: string, cityId: string, npcs: { id: string; name: string; district: string }[]): CourierJob[] {
  const pool = npcs.filter((n) => n.district);
  if (pool.length < 2) return [];
  const jobs: CourierJob[] = [];
  const base = hashStr(`${dateStr}|${cityId}`);
  for (let i = 0; i < 3; i++) {
    const a = pool[(base + i * 7) % pool.length]!;
    let b = pool[(base + i * 11 + 3) % pool.length]!;
    if (b.id === a.id) b = pool[(base + i * 11 + 4) % pool.length]!;
    jobs.push({
      id: `courier-${dateStr.replace(/[^A-Za-z0-9]/g, '')}-${i}`,
      fromId: a.id, fromName: a.name, fromDistrict: a.district,
      toId: b.id, toName: b.name, toDistrict: b.district,
      pay: a.district === b.district ? 40 : 60,
    });
  }
  return jobs;
}
// Mirror of TimeEngine.formatDate for an arbitrary Date (used for
// package arrival dates); kept in sync with the engine's formatter.
export function formatGameDate(d: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ============================================================
// APPENDIX J — ITEMS 33-42 (v0.108.20, second wave)
// ============================================================

// --- Month-key arithmetic ("YYYY-MM") ---
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = (y! * 12 + (m! - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

// --- §35 ITEM 33 — ROUTINES ---
// Stores are DERIVED, never invented: a district in the city whose
// description contains 'shopping' OR whose jobTypes include retail /
// luxury_retail. No such district -> no stores, shop refuses honestly.
export function shoppingDistrictsForCity(cityId: string): { id: string; displayName: string; description: string }[] {
  const out: { id: string; displayName: string; description: string }[] = [];
  for (const [id, d] of Object.entries(WORLD_DISTRICTS as Record<string, any>)) {
    if (d.city !== cityId) continue;
    const desc: string = d.description ?? '';
    const jobTypes: string[] = d.jobTypes ?? [];
    if (desc.toLowerCase().includes('shopping') || jobTypes.includes('retail') || jobTypes.includes('luxury_retail')) {
      out.push({ id, displayName: d.displayName ?? id, description: desc });
    }
  }
  return out;
}
export interface ShopGood { key: string; name: string; price: number; inventoried: boolean; happy: number; energy: number; condition: number }
export const SHOP_GOODS: ShopGood[] = [
  { key: 'groceries', name: 'groceries', price: 40, inventoried: false, happy: 3, energy: 5, condition: 0 },
  { key: 'clothing', name: 'clothing', price: 60, inventoried: false, happy: 4, energy: 0, condition: 0 },
  { key: 'household goods', name: 'household goods', price: 50, inventoried: false, happy: 3, energy: 0, condition: 2 },
  { key: 'coffee beans', name: 'coffee beans', price: 10, inventoried: true, happy: 0, energy: 0, condition: 0 },
  { key: 'flowers', name: 'flowers', price: 15, inventoried: true, happy: 0, energy: 0, condition: 0 },
  { key: 'book', name: 'book', price: 20, inventoried: true, happy: 0, energy: 0, condition: 0 },
  { key: 'snacks', name: 'snacks', price: 25, inventoried: true, happy: 0, energy: 0, condition: 0 },
];

// --- §36 ITEM 34 — HOUSING MARKET INDEX ---
// Deterministic per city + monthKey, same rule shape as §23 stocks:
// monthly factors in a +/-2% band from a hash, compounded from 2024-01.
export function housingMarketIndex(cityId: string, monthKey: string): number {
  const months = monthIndexList('2024-01', monthKey);
  let idx = 1;
  for (const mk of months) {
    const h = hashStr(`${cityId}|housing|${mk}`);
    const pct = ((h % 401) - 200) / 10000; // -2.00% .. +2.00%
    idx *= (1 + pct);
  }
  return roundCents(idx * 100) / 100;
}
function monthIndexList(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) { out.push(cur); if (cur === to) break; cur = addMonths(cur, 1); }
  return out;
}
export function housingMarketTrend(cityId: string, monthKey: string): string {
  const idx = housingMarketIndex(cityId, monthKey);
  if (idx >= 1.05) return 'rising';
  if (idx <= 0.95) return 'falling';
  return 'steady';
}

// --- §37 ITEM 35a — WILL BONUS (within the §14 $500 global cap) ---
export function willBonus(bequestClasses: number, heirIsFamily: boolean): number {
  const classes = Math.min(4, Math.max(0, bequestClasses));
  return Math.min(500, 100 + 50 * classes + (heirIsFamily ? 50 : 0));
}

// --- §38 ITEM 35b — INSURANCE ---
export const INSURANCE_PREMIUMS = { health: 30, property: 25, vehicle: 20, business: 40 };
export const INSURANCE_CLAIM_CAPS = { property: 500, vehicle: 300, business: 400, health: 150 };

// --- §40 ITEM 37 — OFFICES ---
export interface OfficeDef { key: string; title: string; fee: number; minEvents: number; salary: number; repGate: number }
export const OFFICE_DEFS: Record<string, OfficeDef> = {
  mayor: { key: 'mayor', title: 'Mayor', fee: 250, minEvents: 2, salary: 5000, repGate: 25 },
  governor: { key: 'governor', title: 'Governor', fee: 1000, minEvents: 3, salary: 8000, repGate: 50 },
  president: { key: 'president', title: 'President', fee: 5000, minEvents: 4, salary: 15000, repGate: 75 },
};
export const OFFICE_TERM_MONTHS = 48;
// NPC roles that count as government-adjacent for incumbents/rivals.
// Surveyed from the live roster role strings (no invented roles).
export const GOV_ROLE_SET: Set<string> = new Set([
  'politician', 'political_consultant', 'community_organizer', 'police_officer',
  'police_detective', 'lawyer', 'corporate_lawyer', 'union_leader', 'nonprofit_director',
]);
export function roleTierRank(role: string): number {
  if (role === 'politician') return 4;
  if (role === 'lawyer' || role === 'corporate_lawyer' || role === 'police_detective') return 3;
  if (GOV_ROLE_SET.has(role)) return 2;
  return 0;
}
export function rivalScore(npc: { name: string; role: string; district: string }, officeKey: string): number {
  const repBonus = (WORLD_DISTRICTS as Record<string, any>)[npc.district]?.communityRepBonus ?? 0;
  return roleTierRank(npc.role) + repBonus + (hashStr(`${npc.name}|${officeKey}`) % 20);
}
// Entity mapping for `gov jobs`: category + employer keywords, surveyed
// from the jobs database. Courts has no employer in the database, so it
// is honestly empty (shown, never filled with unholdable jobs).
export function govEntityForJob(job: { category: string; employer: string }): string {
  if (job.category === 'federal') return 'Federal Agency';
  const e = job.employer;
  if (e.includes('Legislature') || e.includes('Council') || e.includes('Board of Aldermen')) return 'Legislature';
  if (e.includes('State Government') || e.includes('DHS') || e.includes("Governor's Office")) return 'State Capitol';
  if (e.includes('Court') || e.includes('Judicial')) return 'Courts';
  return 'City Hall';
}

// --- §42 ITEM 38 — CAREER PATHS + TRANSFERS ---
// Rung shape: job id (surveyed from jobs-database, or a §42-added job),
// required cert (a SCHOOLS rewardCertification, or none for entry rungs),
// GPA bar (elite rungs: 3.0; others: none).
export interface CareerRung { jobId: string; cert: string | null; gpaBar: number | null }
export interface CareerPath { path: string; rungs: CareerRung[] }
export const CAREER_PATHS: CareerPath[] = [
  { path: 'Retail', rungs: [
    { jobId: 'mem_retail_kroger', cert: null, gpaBar: null },
    { jobId: 'mem_retail_shift_lead', cert: 'ASSOC_BUSINESS', gpaBar: null },
    { jobId: 'mem_retail_store_mgr', cert: 'FIN_PLAN_CERT', gpaBar: null },
    { jobId: 'mem_exec_fedex', cert: 'MBA_DEGREE', gpaBar: 3.0 },
  ] },
  { path: 'Trades', rungs: [
    { jobId: 'mem_warehouse_nike', cert: null, gpaBar: null },
    { jobId: 'mem_mechanic_dealer', cert: 'ASSOC_AUTO_TECH', gpaBar: null },
    { jobId: 'lr_trades_shop_foreman', cert: 'EMBEDDED_CERT', gpaBar: null },
  ] },
  { path: 'Healthcare support', rungs: [
    { jobId: 'mem_health_aide', cert: null, gpaBar: null },
    { jobId: 'mem_911_dispatcher', cert: 'ASSOC_HEALTH', gpaBar: null },
    { jobId: 'mem_nurse_methodist', cert: 'RN_LICENSE', gpaBar: null },
    { jobId: 'mem_nurse_baptist', cert: 'NP_CERT', gpaBar: 3.0 },
  ] },
  { path: 'Tech', rungs: [
    { jobId: 'mem_tech_helpdesk', cert: null, gpaBar: null },
    { jobId: 'mem_tech_vantiva', cert: 'ASSOC_TECH', gpaBar: null },
    { jobId: 'mem_it_internationalpaper', cert: 'DATA_ENG_CERT', gpaBar: null },
    { jobId: 'tok_tech_sony', cert: 'ROBOTICS_LICENSE', gpaBar: 3.0 },
  ] },
  { path: 'Services/hospitality', rungs: [
    { jobId: 'lr_food_chilis', cert: null, gpaBar: null },
    { jobId: 'mem_cook_hueys', cert: 'PASTRY_CERT', gpaBar: null },
    { jobId: 'par_chef_le_meurice', cert: 'MASTER_CHEF_CERT', gpaBar: null },
    { jobId: 'tok_chef_sushi', cert: 'MASTER_CHEF_CERT', gpaBar: 3.0 },
  ] },
  { path: 'Finance', rungs: [
    { jobId: 'mem_fin_teller', cert: null, gpaBar: null },
    { jobId: 'lr_bank_ozk', cert: 'FIN_PLAN_CERT', gpaBar: null },
    { jobId: 'mem_bank_firsthorizon', cert: 'FINANCE_CERT', gpaBar: null },
    { jobId: 'lon_fin_portfolio_mgr', cert: 'MBA_DEGREE', gpaBar: 3.0 },
  ] },
];
export function careerMappingForJob(jobId: string): { path: string; rung: CareerRung; rungIndex: number } | null {
  for (const p of CAREER_PATHS) {
    const idx = p.rungs.findIndex((r) => r.jobId === jobId);
    if (idx >= 0) return { path: p.path, rung: p.rungs[idx]!, rungIndex: idx };
  }
  return null;
}
// GPA for §42 gates: current enrollment GPA, else last graduation GPA,
// else 2.5 for an old save with no GPA history (documented neutral-below-bar).
export function careerGPA(player: { enrolledCourse?: { gpa?: number }; lastGPA?: number }): number {
  if (player.enrolledCourse?.gpa !== undefined) return player.enrolledCourse.gpa;
  if (player.lastGPA !== undefined) return player.lastGPA;
  return 2.5;
}
// §43 transfer map: associate cert -> university program at -25% hours/cost.
export const TRANSFER_MAP: Record<string, { schoolId: string; courseId: string }> = {
  ASSOC_AUTO_TECH: { schoolId: 'tokyo_tech', courseId: 'embedded_systems' },
  ASSOC_BUSINESS: { schoolId: 'nyu_finance', courseId: 'personal_finance' },
  ASSOC_HEALTH: { schoolId: 'memphis_medical_academy', courseId: 'nursing_rn' },
  ASSOC_HOSPITALITY: { schoolId: 'cordon_bleu', courseId: 'pastry_fundamentals' },
  ASSOC_TECH: { schoolId: 'maestro_college', courseId: 'data_eng_basics' },
  ASSOC_GENERAL: { schoolId: 'lse_london', courseId: 'global_policy' },
};

// --- §44 ITEM 40 — ACADEMICS ---
export function gpaDeltaForEnergy(energy: number): number {
  if (energy >= 50) return 0.05;
  if (energy >= 20) return 0.02;
  return -0.05;
}
export function examScore(gpa: number, skillLevel: number, attendancePct: number): number {
  const raw = 40 + gpa * 10 + skillLevel * 5 - (attendancePct < 50 ? 10 : 0);
  return Math.min(100, Math.max(0, Math.round(raw)));
}
export function attendancePct(sessions: number, daysSinceEnroll: number): number {
  if (daysSinceEnroll <= 0) return 100;
  return Math.min(100, Math.round((sessions / daysSinceEnroll) * 100));
}

// --- §46 ITEM 42 — TICKER HEADLINES (shared §16 source: worldEventsThisWeek) ---
export function tickerHeadlines(events: { label: string; city: string }[], cityId: string): { local: string[]; world: string[] } {
  const world = events.map((e) => e.label);
  const local = events.filter((e) => e.city === cityId).map((e) => e.label);
  return { local, world };
}
