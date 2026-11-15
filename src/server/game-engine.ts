// THE OPEN WORLD - Main Game Engine
// Version: 0.108.12

import { TimeEngine, getWeather } from './time-engine.js';
import { JOB_MARKET } from './economy-engine.js';
import { CommHub, generateInitialMessages } from './comm-hub.js';
// v0.108.24: pure-logic expansion modules (identity, world, careers,
// media, sports/college). All deterministic; money handling stays in
// the engine — modules return new state, never deduct.
import {
  ID_DEFS, issueId, renewId, idStatus, idPerkFor,
  buildCriminalRecord, expungeRecord, EXPUNGE_COST, EXPUNGE_CLEAN_MONTHS,
  type IdentityDocument,
} from './features-0.108.24-identity.js';
import {
  cityShortName, TRANSIT_MODES, hasAirport,
  transitOption, forecastFor,
  weatherEffects, periodOfHour, dayScheduleSummary,
} from './features-0.108.24-world.js';
import {
  EMS_LADDERS, rankFor, nextRank,
  isEligibleForRank,
} from './features-0.108.24-careers.js';
import {
  taskForDay,
  TASK_BONUS, TASK_HOURS, TASK_ENERGY, TASK_SKILL_XP,
  MENTOR_HOURS, MENTOR_ENERGY, MENTOR_REL, MENTOR_PRO_REP,
  MEETING_HOURS, MEETING_ENERGY, MEETING_SKILL_XP, MEETING_HAPPY,
  BREAKROOM_HOURS, BREAKROOM_ENERGY, BREAKROOM_HAPPY,
  REPORT_HOURS, REPORT_ENERGY, REPORT_PRO_REP, REPORT_SKILL_XP,
  COVER_HOURS, COVER_ENERGY, COVER_REL,
  EMERG_BONUS, EMERG_HOURS, EMERG_ENERGY, EMERG_SKILL_XP,
  TRAINING_SKILL_XP, RIDEALONG_ENERGY, RIDEALONG_SKILL_XP, RIDEALONG_HAPPY,
} from './features-0.108.26.js';
import {
  NEWS_CATEGORIES, generateCategoryHeadlines, generateAllCategoryHeadlines,
  createPost, followerCount, feedFor,
  type PlayerSocialState,
} from './features-0.108.24-media.js';
import {
  SPORTS_TEAMS, SPORTS_TRACKS, teamsForSport, tryoutEligibility,
  seasonPerformance, contractOffer, collegeTryoutEligibility, COLLEGE_CAREER_TRACKS, collegeCareerEligibility,
  collegeTrackProgress,
} from './features-0.108.24-sportscareers.js';
import { SocialEngine } from './social-engine.js';
import { PropertyEngine, propertyTierName, nextUpgradeCost } from './property-engine.js';
import type { Property, Investment } from './property-engine.js';
import {
  BUSINESS_CATALOG, businessMonthlyIncome, ownedBusinesses,
  ensureDailyGoals, recordDailyGoalProgress,
  GIFTS, giftGain, relationshipLevel, relationshipPerks,
  appendJournalLog, buildJournal,
  OFFENSE_FINES, fineForOffense, enforcementLevel, totalOutstandingFines,
  nextTier, PROMOTION_TITLE_PREFIX,
  type Business, type DailyGoalState,
} from './features-0.108.15.js';
import {
  PARTNER_THRESHOLD, milestoneTier, nextMilestone,
  CELEBRATE_COST, CELEBRATE_HOURS, CELEBRATE_ENERGY, CELEBRATE_REL_GAIN,
  CELEBRATE_HAPPY_GAIN, CELEBRATE_MIN_VALUE,
  FURNITURE, comfortTier,
  MEALS, COOK_ENERGY_COST, COOK_HOURS,
  worldEventForCity, worldEventsThisWeek, weekKeyFromDate,
  EVENT_TEMPLATES,
  ATTEND_COST, ATTEND_HOURS, ATTEND_HAPPY, attendPay,
  ROADTRIP_FUEL_COST, ROADTRIP_CONDITION_COST, ROADTRIP_MIN_CONDITION,
  ROADTRIP_DRIVING_XP,
  PASSPORT_MILESTONES, TOTAL_CITIES,
} from './features-0.108.19.js';
import {
  computeTaxLiability, TAX_DEDUCTION, TAX_PLAN_INSTALLMENTS,
  TAX_PLAN_BREAK_PENALTY_RATE, TAX_LATE_PENALTY_RATE, TAX_LATE_FEE_MONTHLY,
  TAX_DUE_MONTHS_AFTER_ASSESSMENT,
  defendOutcome, DEFEND_FEE, DEFEND_UPHELD_COSTS, patrolLevel,
  INVESTIGATION_HEAT_1, INVESTIGATION_HEAT_2, INVESTIGATION_CLOSE_HEAT,
  LAWYER_CLEAN_INVESTIGATION_SURCHARGE,
  degreeTitle,
  CAMPUS_STUDY_HOURS, CAMPUS_STUDY_XP, CAMPUS_CLUB_HOURS, CAMPUS_CLUB_HAPPY, CAMPUS_CLUB_REL,
  PROPOSE_COST, WELCOME_CHILD_COST, FAMILY_ACTIVITIES, FAMILY_ACTIVITY_HOURS,
  FAMILY_ACTIVITY_HAPPY_PER_MEMBER, FAMILY_ACTIVITY_HAPPY_CAP, FAMILY_ACTIVITY_SPOUSE_REL, FAMILY_EVENT_HAPPY,
  childStage,
  stateNameForCity, countryNameForCity, stateCodeForCity, civicTitle,
  seasonFromMonth, lifeStage, dayOfYear, daysUntilYearEnd,
  holidayForWeek, nextHoliday, seasonalTemplateModifier,
  addMonthsToKey,
  GIGS, GIG_ENERGY, GIG_XP, OVERTIME_MULTIPLIER, OVERTIME_HOURS,
  careerTitle, nextCareerTitle,
  MAX_SAVINGS_GOALS, CREDIT_START, CREDIT_MISSED_LOSS, CREDIT_ON_TIME_GAIN,
  LOAN_INTEREST_RATE, LOAN_LATE_FEE, loanCap, loanMonthlyPayment,
  TRAIT_BONUSES, TRAIT_NAMES, firstDistrictOfCity,
  legacyBonus,
  challengeGoalForWeek, CHALLENGE_REWARD,
  economicIndexForCity, HOLIDAY_ATTEND_HAPPY_BONUS, HOLIDAY_ATTEND_CASH_BONUS,
  SHIFTS, workplaceEventForDay, workplacePerformance, coworkerKeywords,
  LUNCH_COST, LUNCH_HOURS, LUNCH_REL, LUNCH_HAPPY,
  VOLUNTEER_HOURS, VOLUNTEER_REP, VOLUNTEER_HAPPY, VOLUNTEER_ENERGY,
  needWordSafety, needWordProsperity, needWordSpirit, crowdActivity,
  wealthTier, wealthTierCount, specNetWorth, fameScore, isEliteNpc,
  GALA_ENTRY, GALA_HAPPY, GALA_PAY,
  groupCompanies, companyPerformance, performanceWord,
  profitShareFactor, PROFIT_SHARE_UNIT, companyRevenue,
  stockPriceAt, MID_SOUTH_CITIES,
  staffSlotsFor, staffWageFor, moraleMultiplier, staffedBusinessIncome,
  STAFF_MORALE_START, STAFF_MORALE_PAID_GAIN, STAFF_MORALE_SHORT_LOSS,
  RAISE_MORALE_GAIN, RAISE_MIN_GAIN,
  DIALOGUE_TOPICS, TOPIC_REL_GAIN, TOPIC_REL_CAP_PER_CONVERSATION, HOSPITALITY_HAPPY,
  greetingTierBand, greetingBaseChange,
  livingExpenses, PERMITS, BUSINESS_PERMIT_MULTIPLIER, ROADTRIP_FUEL_WITH_LICENSE,
  FOOD_PERMIT_ENERGY_BONUS, VEHICLE_FEE, PROPERTY_FEE, FEE_LATE, FEE_LATE_MONTHS,
  BENEFIT_AMOUNT, PACKAGE_GOODS, POSTAGE, PACKAGE_GIFT_REL, COURIER_HOURS,
  courierJobsForDay, formatGameDate, mailKindIcon, stockMonthlyChange,
  shoppingDistrictsForCity, SHOP_GOODS,
  housingMarketIndex, housingMarketTrend, addMonths,
  INSURANCE_PREMIUMS, INSURANCE_CLAIM_CAPS,
  OFFICE_DEFS, OFFICE_TERM_MONTHS, GOV_ROLE_SET, roleTierRank, rivalScore, govEntityForJob,
  CAREER_PATHS, careerMappingForJob, careerGPA, TRANSFER_MAP,
  gpaDeltaForEnergy, examScore, attendancePct,
} from './features-0.108.20.js';
import {
  DIVIDEND_MONTHLY_RATE, stockDividend,
  FOUNDING_COST, COMPANY_MAX_EMPLOYEES, COMPANY_WAGE_PER_EMPLOYEE,
  COMPANY_OVERHEAD, COMPANY_DEBT_FAILURE_THRESHOLD,
  COMPANY_DEBT_FAILURE_MONTHS, COMPANY_INDUSTRIES, companyMonthlyTick,
  listingPriceNow, repriceValue,
  FEE_WARNING_1_MONTHS, FEE_WARNING_2_MONTHS, FEE_SEIZURE_MONTHS,
  FEE_PLAN_INSTALLMENTS, FEE_SEIZURE_COOLDOWN_MONTHS,
  monthDiff, addMonthsKey, feeLadderStage, firstSeizableAsset,
} from './features-0.108.21.js';
import {
  recordTrip, mostVisitedCity,
  SOUVENIR_PRICE, SOUVENIR_HAPPINESS,
  leaseRent, leaseUntilFor, leaseActive,
  OPEN_HOUSE_PRICE, BREAK_LEASE_FEE, openHouseActive, tenantNameFor,
  MORNING_ENERGY, MORNING_HAPPINESS, MORNING_HOURS,
  EVENING_HAPPINESS, EVENING_ENERGY_COST, EVENING_HOURS,
} from './features-0.108.23.js';
import {
  generateTickerHeadlines, filterTickerHeadlines,
} from './ticker-headlines.js';
import { ConversationEngine } from './conversation-engine.js';
import { StorylineEngine } from './storyline-engine.js';
import {
  DialogueEngine,
  type DialogueNpc,
  type TemplateFallback,
} from './dialogue-engine.js';
import type { DialogueScope } from './dialogue-memory.js';
import { WORLD_CITIES, WORLD_DISTRICTS, TRAVEL_ROUTES } from '../shared/world-data.js';
import { BACKGROUNDS } from '../shared/backgrounds.js';
import { AchievementEngine, ACHIEVEMENTS } from './achievements.js';
import type { Achievement } from './achievements.js';
import type { SerializableAchievements } from './achievements.js';
import type { Relationship } from '../shared/types.js';
import { SchoolEngine, SCHOOLS } from './school-engine.js';
import { VehicleService } from './vehicle-service.js';
import { RacingService, RACE_TRACKS } from './racing-service.js';
import { getJobsByCity, getJobsByCategory, ALL_JOBS } from './jobs-database.js';

export { GAME_VERSION } from '../shared/version.js';

// v0.108.9 fix (minor 6): shared name resolution — exact match first,
// then a unique substring match; ambiguous input is refused with a list
// instead of silently acting on the first hit.
export function resolveNamed<T>(items: T[], query: string, getName: (t: T) => string): { item?: T; ambiguous?: string[]; notFound?: boolean } {
  const q = query.trim().toLowerCase();
  if (!q) return { notFound: true };
  const exact = items.find((i) => getName(i).toLowerCase() === q);
  if (exact) return { item: exact };
  const cands = items.filter((i) => getName(i).toLowerCase().includes(q));
  if (cands.length === 1) return { item: cands[0] };
  if (cands.length > 1) return { ambiguous: cands.map(getName) };
  return { notFound: true };
}

export interface Skill {
  level: number;
  xp: number;
}

export interface PlayerState {
  name: string;
  city: string;
  district: string;
  money: number;
  bankBalance: number;
  health: number;
  energy: number;
  happiness: number;
  stress: number;
  fitness: number;
  intelligence: number;
  charisma: number;
  reputation: { professional: number; social: number; criminal: number; community: number };
  heat: number; // New: Track police attention. Increases with crimes, decays over time.
  background: string;
  job: any;
  inventory: any[];
  vehicles: any[];
  properties: Property[];
  investments: Investment[];
  relationships: Record<string, Relationship>;
  createdAt: number;
  lastActive: number;
  currentConversation?: any;
  incarcerated: boolean;
  sentenceEnd?: number;
  prisonRecord: {
    arrests: number;
    timeServed: number;
    paroleEligible: boolean;
  };
  criminalRecord: string[]; // Track history of offenses
  achievements?: SerializableAchievements;
  visitedCities?: string[];
  workDaysCompleted?: number;
  skills: Record<string, Skill>;
  certifications: string[];
  specialization: string | null;
  enrolledCourse?: {
    schoolId: string;
    courseId: string;
    hoursCompleted: number;
    totalHours: number;
  };
  // Monthly-tick watermark (v0.108.2): "YYYY-MM" of the last
  // game-month that received a property monthly tick. Persisted with the
  // player save, so reloading/replaying cannot re-apply a ticked month.
  lastMonthlyTick?: string | null;
  // Game-date (formatDate string) of the last investment market tick.
  // v0.108.9: restful sleep ticks investments at most once per game-day.
  lastInvestmentTickDate?: string | null;
  // One-shot save-age warning, set by loadState, consumed by the
  // processCommand wrapper. Never set by gameplay itself.
  pendingSaveWarning?: string | null;
  // Game-clock stamp (v0.108.3): ISO instant of the TimeEngine clock at
  // save time. Persisted with the player save so loadState can restore the
  // clock instead of snapping back to Jan 1 2024 06:00 on every server
  // restart. Written fresh by getPlayer() on every command response.
  gameTimeISO?: string | null;
  // v0.108.15 additive state (old saves lack these; every accessor
  // defaults them, so loading is unchanged): owned businesses, today's
  // daily goals, and the journal log (see docs/STORY_JOURNAL_SPEC_v0.108.15.md).
  businesses?: Business[];
  dailyGoals?: DailyGoalState | null;
  journalLog?: { date: string; text: string }[];
  // v0.108.15 expansion, same additive rule: outstanding court fines,
  // shifts at the CURRENT job (promotion tenure), promotions at it.
  fines?: { offense: string; amount: number; date: string }[];
  jobTenure?: number;
  promotions?: number;
  // v0.108.19 expansion, same additive rule: passport milestones claimed
  // (count into PASSPORT_MILESTONES), world-event attendances by event id.
  passportMilestones?: number;
  attendedEvents?: string[];
  // v0.108.23 expansion, same additive rule: travel journal stats,
  // souvenir cities (once each, in buy order), last restful sleep
  // recovery (deltas + comfort tier; rested sleeps record nothing).
  travelStats?: { trips: number; faresPaid: number; visitsByCity: Record<string, number> };
  souvenirs?: string[];
  lastSleep?: { energy: number; health: number; happy: number; comfort: number };
  // v0.108.24 expansion, same additive rule: held ID documents (module
  // shape: type + validity window, no numbers); social posts + liked
  // ids; followed roster NPC ids; current-game-week transit pass;
  // game-date of the last severe-weather day effect (once per day);
  // lifetime gym sessions (sports-news headline input).
  identityDocs?: IdentityDocument[];
  social?: PlayerSocialState;
  socialFollowing?: string[];
  transitPassWeek?: string | null;
  severeDayNoted?: string | null;
  gymSessions?: number;
}

// Whole cents, nothing else: every money mutation in the game goes through
// floats (hourly rates from basePay/2080, weather modifiers, rent and
// mortgage math), so without rounding the stored balance grows a long
// fractional tail. Rounding changes any balance by at most half a cent.
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// Best-effort clock restore for loadState. Prefers the exact v0.108.3 ISO
// stamp; falls back to the legacy saved "Monday, January 1, 2024" +
// "6:00 AM" strings that getPlayer() has always written into saves.
// Returns null when neither parses — the caller then keeps the default
// start clock, exactly as before, with no retroactive jump.
function parseGameClock(state: any): Date | null {
  if (typeof state?.gameTimeISO === 'string') {
    const d = new Date(state.gameTimeISO);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof state?.gameDate === 'string' && typeof state?.gameTime === 'string') {
    const d = new Date(`${state.gameDate} ${state.gameTime}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export interface GameAction { success: boolean; message: string; data?: any; npcName?: string; challengeContributions?: { earnings?: number; cities?: number; shifts?: number }; outcomeLog?: string; }
// v0.108.29: outcomeLog — one machine-readable line describing what a
// command ACTUALLY did (enroll/study/invest/exam/graduate/sleep-tick),
// set by the engine on the result. The server (index.ts) logs it after
// the command is known to have applied, so log pulls can verify
// progression outcomes — not just command receipts (TOW-001). Only
// set when state actually changed; a refusal or no-op sets nothing.

// "YYYY-MM" -> next month, e.g. "2024-01" -> "2024-02", "2024-12" -> "2025-01".
function nextMonthKey(key: string): string {
  const parts = key.split('-').map(Number);
  const y = parts[0] ?? 2024;
  const m = parts[1] ?? 1;
  if (m >= 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

// BACKGROUNDS lives in ../shared/backgrounds.js — the single source of
// truth shared with the client's character-creation labels.

// v0.108.18: first words the dispatcher actually handles (every `case`
// in processCommandInner). Mid-conversation, a typed input whose first
// word is in this set exits the conversation and dispatches as a command;
// anything else is NPC chat. Kept as an explicit list (not derived from
// the switch) so a new command must be added here to win over chat.
// v0.108.21 (§58): help section jump tokens + drill-down aliases.
// The index line for a section reads `N. Name — help <token>`.
const HELP_JUMP_TOKENS: Record<string, string> = {
  'Getting Started': 'getting started', 'Money & Bank': 'money',
  'Work & Careers': 'work', 'Home & Property': 'home',
  'Life & Family': 'life', 'World & Travel': 'world',
  'Government & Law': 'government', 'Business & Companies': 'business',
  'Education & Self': 'education', 'Community & Social': 'community',
  'Info & Time': 'info', 'Dialogue': 'dialogue',
};
const HELP_SECTION_ALIASES: Record<string, string[]> = {
  'Getting Started': ['getting started', 'start', 'movement', 'quick', 'tips', 'view', 'pause', 'basics'],
  'Money & Bank': ['money', 'bank', 'banking', 'hard'],
  'Work & Careers': ['work', 'careers', 'career', 'jobs', 'gigs', 'gig'],
  'Home & Property': ['home', 'property', 'housing', 'estate', 'insurance', 'living'],
  'Life & Family': ['life', 'family', 'social', 'relationships', 'routines', 'fame', 'legacy'],
  'World & Travel': ['world', 'travel', 'vehicles', 'racing', 'cars', 'newspaper', 'news', 'ticker', 'seasons', 'holidays'],
  'Government & Law': ['government', 'law', 'court', 'police', 'taxes', 'tax', 'services', 'offices', 'mail', 'delivery'],
  'Business & Companies': ['business', 'companies', 'company', 'stocks', 'stock', 'staff'],
  'Education & Self': ['education', 'self', 'college', 'academics', 'school'],
  'Community & Social': ['community', 'leaderboard', 'challenges', 'challenge', 'trading', 'trade', 'citizen'],
  'Info & Time': ['info', 'time', 'calendar', 'years'],
  'Dialogue': ['dialogue', 'topics', 'greetings', 'greet', 'talk'],
};

const KNOWN_COMMANDS = new Set([
  'work', 'apply', 'status', 'help', 'sleep', 'rest', 'study', 'gym',
  'skills', 'bank', 'deposit', 'withdraw', 'lawyer', 'record', 'laylow',
  'lay', 'explore', 'goto', 'travel', 'home', 'go', 'talk', 'greet',
  'assist', 'people', 'end', 'exit', 'bye', 'goodbye', 'leave',
  'real-estate', 'realestate', 'properties_list', 'buy', 'sell',
  'properties', 'businesses', 'business', 'repair', 'renovate', 'upgrade',
  'goals', 'goal', 'career', 'promote', 'promotion', 'laws', 'law',
  'court', 'government', 'gov', 'pay', 'profile', 'gift', 'hangout',
  'friends', 'relationships', 'journal', 'story', 'maintain', 'service',
  'vehicles', 'fuel', 'refuel', 'register', 'customize', 'tow',
  'emergency', 'inspect', 'race', 'races', 'crime', 'invest',
  'investments', 'phone', 'text', 'email', 'emails', 'social', 'contacts',
  'search', 'factions', 'quests', 'quest', 'chat', 'influence', 'support',
  'sabotage', 'enroll', 'rob', 'scam', 'event', 'achievements',
  'achievement', 'clear_conv', 'prison', 'districts', 'district', 'where',
  'location', 'nearby', 'places', 'schools', 'inbox', 'messages',
  'prison', 'milestones', 'celebrate', 'furnish', 'cook', 'events',
  'attend', 'roadtrip', 'passport',
  // v0.108.20: every new command token (handler tokens leaderboard/trade
  // included so typed input is never swallowed as chat mid-conversation).
  'tax', 'file', 'cases', 'case', 'police', 'degrees', 'campus',
  'propose', 'family', 'welcome', 'civic', 'calendar', 'years',
  'gigs', 'gig', 'overtime', 'savings', 'loans', 'loan', 'hardmode',
  'bills', 'backgrounds', 'name', 'retire', 'legacy', 'challenge',
  'news', 'leaderboard', 'trade',
  'workplace', 'shift', 'coworkers', 'lunch', 'citizens', 'volunteer',
  'fame', 'companies', 'company', 'stocks', 'stock', 'index', 'about',
  'hire', 'fire', 'staff', 'raise', 'topics', 'ask',
  'read', 'mail', 'packages', 'track', 'send', 'claim', 'deliver', 'pay',
  'services', 'permits', 'permit', 'fees', 'benefits', 'records',
  'utilities', 'living', 'expenses',
  // v0.108.20 Appendix J (items 33-42) + K (items 43-44).
  'stores', 'shop', 'commercial', 'stroll', 'errands', 'chores', 'selfcare',
  'routines', 'housing', 'mortgage', 'set', 'move', 'will', 'insurance',
  'insure', 'uninsure', 'offices', 'campaign', 'election', 'office',
  'decide', 'resign', 'careers', 'gpa', 'exam', 'graduate', 'ticker',
  // v0.108.24: every new command token (handler tokens included so
  // typed input is never swallowed as chat mid-conversation).
  'id', 'transit', 'stations', 'weather', 'forecast', 'time', 'day',
  'wait', 'advance', 'post', 'follow', 'unfollow', 'following',
  'threads', 'thread', 'delete', 'message', 'sports', 'tryout',
  'college', 'contract', 'season',
  'view',
  // v0.108.21: every new command token.
  'found', 'mycompanies', 'dividends', 'voicemails', 'repricing',
  // v0.108.23: every new command token.
  'trips', 'journey', 'souvenirs', 'souvenir',
  'tenants', 'open', 'lease', 'break',
  'myhome', 'morning', 'evening', 'household',
  // v0.108.26: deeper working activities + emergency-track activities.
  'task', 'tasks', 'mentor', 'meeting', 'breakroom', 'report', 'cover',
  'patrol', 'drill', 'respond', 'training', 'ridealong',
]);

// v0.108.18: city ids (west_memphis, littlerock, ...) are internal only.
// Player-facing strings must use the WORLD_CITIES display name ("West
// Memphis, AR", "Memphis, TN") — never the raw id or a hand-rolled
// underscore/titlecase hack (the old status line turned West Memphis
// into "west Memphis, TN" because its replace chain ran in the wrong
// order). Unknown ids fall back to a titlecased id, never the raw id.
function cityDisplay(cityId: string): string {
  return WORLD_CITIES[cityId as keyof typeof WORLD_CITIES]?.displayName ?? cityId.replace(/_/g, ' ');
}

// v0.108.18 fluency: forgiving unknown commands ("Did you mean ...?").
// Plain Levenshtein over the known command set; short inputs need a
// closer match so single letters never "suggest" a random command.
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur.push(Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[n]!;
}

function nearestCommand(cmd: string): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of KNOWN_COMMANDS) {
    const d = levenshtein(cmd, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return null;
  const threshold = cmd.length <= 3 ? 1 : 2;
  return bestD <= threshold ? best : null;
}

// v0.108.18 fluency: filler tolerance. "check bank", "show skills",
// "look at achievements", "go to work" dispatch as their commands, and
// "go to Memphis" travels (the remainder is treated as a destination).
// Only applies when the remainder starts with a real command (or, for
// "go to", when it names a destination) — anything else is returned
// untouched, so filler tolerance can never swallow a conversation line:
// chat always receives the ORIGINAL input.
function stripFiller(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  for (const f of ['go to ', 'check ', 'show ', 'look at ']) {
    if (lower.startsWith(f)) {
      const rest = trimmed.slice(f.length).trim();
      if (!rest) return trimmed;
      const [first] = rest.toLowerCase().split(/\s+/);
      if (first && KNOWN_COMMANDS.has(first)) return rest;
      if (f === 'go to ') {
        // v0.108.18 audit fix: 'go to home' must mean go home, not a
        // travel lookup for a city called "home".
        if (rest.toLowerCase() === 'home') return 'go home';
        return `travel ${rest}`;
      }
      return trimmed;
    }
  }
  return trimmed;
}

export class GameEngine {
  private time: TimeEngine;
  private comm: CommHub;
  private social: SocialEngine;
  private property: PropertyEngine;
  private storyline: StorylineEngine;
  private conversation: ConversationEngine;
  private dialogue: DialogueEngine;
  // v0.108.10: per-request dialogue scope (userId + installId), threaded
  // from index.ts per command. This is routing metadata ONLY — dialogue
  // memory payloads always come from the request's own player object
  // (player.dialogueMemory), never from this field or any singleton, so
  // a scope value can never carry another user's data with it.
  private dialogueScope: DialogueScope | null = null;
  private achievementEngine: AchievementEngine;
  private schools: SchoolEngine;
  private vehicleService: VehicleService;
  private racingService: RacingService;
  public player: any;

  constructor() {
    this.time = new TimeEngine();
    this.comm = new CommHub();
    this.social = new SocialEngine();
    this.property = new PropertyEngine();
    this.storyline = new StorylineEngine();
    this.conversation = new ConversationEngine();
    this.dialogue = new DialogueEngine(
      this.conversation as unknown as TemplateFallback,
    );
    this.achievementEngine = new AchievementEngine();
    this.schools = new SchoolEngine();
    this.vehicleService = new VehicleService();
    this.racingService = new RacingService();
    this.player = this.initPlayer();
    generateInitialMessages(this.comm);
  }

  private initPlayer(): any {
    return {
      name: 'Traveler',
      city: 'west_memphis',
      district: 'downtown',
      money: 500.00,
      bankBalance: 0.00,
      health: 100,
      energy: 100,
      happiness: 80,
      stress: 20,
      fitness: 50,
      intelligence: 50,
      charisma: 50,
      reputation: { professional: 0, social: 0, criminal: 0, community: 0 },
      background: 'working_class',
      job: null,
      inventory: [],
      vehicles: [],
      properties: [],
      investments: [],
      businesses: [],
      dailyGoals: null,
      journalLog: [],
      lastMonthlyTick: null,
      relationships: {},
      createdAt: Date.now(),
      lastActive: Date.now(),
      incarcerated: false,
      prisonRecord: { arrests: 0, timeServed: 0, paroleEligible: false },
      criminalRecord: [],
      achievements: { unlocked: [], stats: {} },
      visitedCities: ['west_memphis'],
      workDaysCompleted: 0,
      // v0.108.20 additive state (old saves default these on read).
      ageYears: 18,
      credit: 50,
      traits: [],
      skills: {
        tech: { level: 1, xp: 0 },
        driving: { level: 1, xp: 0 },
        cooking: { level: 1, xp: 0 },
        craftsmanship: { level: 1, xp: 0 },
        finance: { level: 1, xp: 0 },
        charisma: { level: 1, xp: 0 },
        fitness: { level: 1, xp: 0 },
        stealth: { level: 1, xp: 0 },
        combat: { level: 1, xp: 0 }
      },
      certifications: [],
      specialization: null,
      factions: []
    };
  }

  private addSkillXP(skillName: string, amount: number): string {
    if (!this.player.skills) {
      this.player.skills = {
        tech: { level: 1, xp: 0 },
        driving: { level: 1, xp: 0 },
        cooking: { level: 1, xp: 0 },
        craftsmanship: { level: 1, xp: 0 },
        finance: { level: 1, xp: 0 },
        charisma: { level: 1, xp: 0 },
        fitness: { level: 1, xp: 0 },
        stealth: { level: 1, xp: 0 },
        combat: { level: 1, xp: 0 }
      };
    }
    
    if (!this.player.skills[skillName]) {
      this.player.skills[skillName] = { level: 1, xp: 0 };
    }

    const skill = this.player.skills[skillName];
    skill.xp += amount;

    const xpToNextLevel = skill.level * 100;
    if (skill.xp >= xpToNextLevel) {
      skill.level++;
      skill.xp -= xpToNextLevel;
      return `\n🌟 **LEVEL UP!** Your ${skillName} skill is now level ${skill.level}!`;
    }
    return '';
  }

  private skills(): GameAction {
    if (!this.player.skills) return { success: false, message: "No skills data found." };
    
    let message = "📊 **YOUR SKILLS**\n" + "─".repeat(20) + "\n";
    const skills = this.player.skills as Record<string, Skill>;
    
    for (const [name, data] of Object.entries(skills)) {
      const progressBar = this.generateProgressBar(data.xp, data.level * 100);
      const skillName = name.charAt(0).toUpperCase() + name.slice(1);
      message += `**${skillName}**: Lvl ${data.level} ${progressBar} (${data.xp}/${data.level * 100} XP)\n`;
    }
    
    return { success: true, message };
  }

  private generateProgressBar(current: number, total: number): string {
    const bars = 10;
    const progress = Math.min(bars, Math.max(0, Math.round((current / total) * bars)));
    return '🟩'.repeat(progress) + '⬜'.repeat(bars - progress);
  }

  applyBackground(backgroundId: string): void {
    const bg = BACKGROUNDS.find(b => b.id === backgroundId);
    if (!bg) return;

    this.player.background = backgroundId;
    this.player.money = bg.startingMoney;

    for (const bonus of bg.bonuses) {
      if (bonus.stat in this.player) {
        this.player[bonus.stat] = Math.min(100, (this.player[bonus.stat] || 0) + bonus.value);
      }
    }
  }

  // v0.108.20: one optional trait at creation. Bonuses use ONLY
  // top-level stats/cash (TRAIT_BONUSES); every trait except hustle's
  // gig-pay hook is a recorded identity choice, per spec.
  applyTrait(traitId: string): void {
    const bonuses = TRAIT_BONUSES[traitId];
    if (!bonuses) return;
    this.player.traits = [traitId];
    for (const b of bonuses) {
      if (b.cash) {
        this.player.money = roundCents((this.player.money ?? 0) + b.cash);
      } else if (b.stat && b.value !== undefined) {
        if (b.stat === 'stress') {
          this.player.stress = Math.max(0, (this.player.stress ?? 20) + b.value);
        } else if (b.stat in this.player) {
          this.player[b.stat] = Math.min(100, (this.player[b.stat] || 0) + b.value);
        }
      }
    }
  }

  // v0.108.20: start-city selection. Invalid ids fall back to
  // west_memphis, never a crash; district = the city's first district.
  setStartCity(cityId: string): void {
    const valid = (WORLD_CITIES as Record<string, any>)[cityId] ? cityId : 'west_memphis';
    this.player.city = valid;
    this.player.district = firstDistrictOfCity(valid);
    this.player.visitedCities = [valid];
    this.player.startCity = valid;
  }

  // === WORK SYSTEM ===
  work(): GameAction {
    if (!this.player.job) {
      return { success: false, message: "You don't have a job. Use 'apply' to see openings." };
    }
    if (this.player.energy < 20) {
      return { success: false, message: "Too tired. Rest first." };
    }

    const weather = getWeather(this.time.currentTime, this.player.city);
    let weatherModifier = 1.0;

    if (weather.condition === 'stormy' || weather.condition === 'rainy') {
      weatherModifier = 0.85;
    } else if (weather.condition === 'hot') {
      weatherModifier = 0.95;
    } else if (weather.condition === 'snowy') {
      // v0.108.24: new conditions get the module's dampeners; old
      // conditions keep their exact pre-.24 modifiers above.
      weatherModifier = 0.90;
    } else if (weather.condition === 'humid') {
      weatherModifier = 0.95;
    }

    const shiftHours = 8;
    const hourlyRate = this.player.job.hourlyPay || (this.player.job.basePay / 2080);
    const grossPay = hourlyRate * shiftHours * weatherModifier;

    // v0.108.20 (§21): the pending shift (morning default) and today's
    // deterministic workplace event shape this shift's pay/energy/stress.
    // v0.108.26: a persistent preference fills in when no one-shot shift
    // is set; the one-shot always wins.
    const shiftKey = String(this.player.pendingShift ?? this.player.preferredShift ?? 'morning');
    const shiftDef = SHIFTS[shiftKey] ?? SHIFTS['morning']!;
    const todayEvent = workplaceEventForDay(String(this.player.job.employer ?? ''), this.time.formatDate());
    const reviewBonus = todayEvent.kind === 'review' && workplacePerformance(this.player) >= 70 ? todayEvent.bonus : 0;
    const finalPay = grossPay * shiftDef.payMult * todayEvent.payMult + reviewBonus;

    this.player.money += finalPay;
    this.trackTaxIncome(finalPay);
    this.player.energy = Math.max(0, this.player.energy - shiftDef.energy);
    // v0.108.9 fix (minor 14): a shift is tiring — small stress gain.
    this.player.stress = Math.min(100, (this.player.stress ?? 0) + 4 + shiftDef.stress + todayEvent.stress);
    // v0.108.26: night-shift fatigue — the 3rd and later consecutive night
    // shift costs extra energy and stress. The existing exhaustion rule
    // (energy 0 → health −3) is the only health cost; fatigue adds none.
    let fatigueNote = '';
    if (shiftKey === 'night') {
      this.player.nightStreak = (this.player.nightStreak ?? 0) + 1;
      if (this.player.nightStreak >= 3) {
        this.player.energy = Math.max(0, this.player.energy - 10);
        this.player.stress = Math.min(100, (this.player.stress ?? 0) + 5);
        fatigueNote = ` 😴 Night-shift fatigue (${this.player.nightStreak} nights running): −10 energy, +5 stress.`;
      }
    } else {
      this.player.nightStreak = 0;
    }
    // v0.108.9 fix (major 3): working to zero energy costs health.
    let exhaustNote = '';
    if (this.player.energy === 0) {
      this.player.health = Math.max(0, (this.player.health ?? 100) - 3);
      exhaustNote = ' ⚠️ Worked to exhaustion — health -3.';
    }
    this.time.advance({ hours: 8, minutes: 0 });
    const prevShifts = this.player.workDaysCompleted || 0;
    this.player.workDaysCompleted = prevShifts + 1;
    const careerNote = this.careerMilestoneNote(prevShifts, this.player.workDaysCompleted);
    if (todayEvent.kind === 'team_lunch') {
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + todayEvent.happy);
    }
    // v0.108.26: split shifts carry a small flexibility perk.
    if (shiftDef.happy) {
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + shiftDef.happy);
    }
    // The shift choice applies to the next `work` only, then resets.
    this.player.pendingShift = undefined;
    // v0.108.15: tenure at the CURRENT job drives promotions. A legacy
    // save with a job but no tenure field counts its lifetime shifts once
    // (preserves progress, never wipes it); fresh hires start at 0 (set
    // in applyForJob) and count up from there.
    this.player.jobTenure = (this.player.jobTenure ?? this.player.workDaysCompleted - 1) + 1;
    this.achievementEngine.updateProgress('master_worker', 1);
    this.achievementEngine.checkAchievement('first_day', this.player);
    
    // Add skill XP based on job
    const skillName = this.player.job.skill || 'charisma';
    const levelUpMsg = this.addSkillXP(skillName, 25);
    
    let shiftNote = shiftKey !== 'morning' ? ` (${shiftKey} shift)` : '';
    if (shiftDef.happy) shiftNote += ` (+${shiftDef.happy} happiness)`;
    let eventNote = '';
    if (todayEvent.kind === 'deadline') eventNote = ` 📋 Deadline week: +15% pay, +5 stress.`;
    else if (todayEvent.kind === 'team_lunch') eventNote = ` 🍱 Team lunch: +5 happiness.`;
    else if (todayEvent.kind === 'review') eventNote = reviewBonus > 0 ? ` ⭐ Review day: performance ${workplacePerformance(this.player)} — +$50 bonus.` : ` ⭐ Review day: performance ${workplacePerformance(this.player)} — no bonus this time.`;
    return {
      success: true,
      message: `💼 Worked 8hr shift at ${this.player.job.employer}. Earned $${finalPay.toFixed(2)}${levelUpMsg}${exhaustNote}${fatigueNote}${this.lowHealthWarning()}${shiftNote}${eventNote}${careerNote}`,
      challengeContributions: { earnings: finalPay, shifts: 1 },
    };
  }

  // v0.108.15 job-listing presentation: grouped by tier (highest first),
  // with per-shift pay next to the hourly rate so the money is obvious.
  // Grouping is display-only — hiring, requirements, and gates are untouched.
  private formatJobListings(jobs: any[], limit: number): string {
    // v0.108.26 fix: entry jobs first. The old executive-first sort buried
    // entry-tier jobs past the cap, so Police Cadet never displayed even
    // in Memphis. Display only — hiring rules, job data, and pay untouched.
    const tierRank: Record<string, number> = { entry: 0, skilled: 1, career: 2, elite: 3, executive: 4 };
    const sorted = [...jobs].sort((a, b) => (tierRank[String(a.tier ?? '').toLowerCase()] ?? 5) - (tierRank[String(b.tier ?? '').toLowerCase()] ?? 5));
    const groups = new Map<string, any[]>();
    for (const j of sorted.slice(0, limit)) {
      const tier = String(j.tier ?? 'entry');
      if (!groups.has(tier)) groups.set(tier, []);
      groups.get(tier)!.push(j);
    }
    const sections: string[] = [];
    for (const [tier, list] of groups) {
      const lines = list.map((job) => {
        const hourly = job.hourlyPay ?? (job.basePay ? job.basePay / 2080 : 0);
        const req = job.requirements ? ` (Req: ${job.requirements.join(', ')})` : '';
        return `- ${job.title} @ ${job.employer}: $${hourly.toFixed(2)}/hr (≈ $${(hourly * 8).toFixed(2)}/shift)${req}`;
      });
      sections.push(`**${tier.toUpperCase()}**\n${lines.join('\n')}`);
    }
    return sections.join('\n\n');
  }

  apply(): GameAction {
    const cityJobs = getJobsByCity(this.player.city);
    if (cityJobs.length === 0) {
      // Fallback to basic economy engine jobs if database is empty for this city.
      // v0.108.12 fix: label the listings with the city they actually come
      // from — the old header always showed the player's city even when
      // the listings were West Memphis jobs.
      const fallbackCity = JOB_MARKET[this.player.city] ? this.player.city : 'west_memphis';
      const fallbackJobs = JOB_MARKET[fallbackCity] || [];
      const note = fallbackCity === this.player.city
        ? ''
        : ` (no openings in ${cityDisplay(this.player.city)} — showing West Memphis listings)`;
      return { success: true, message: `📋 JOB LISTINGS (${fallbackCity})${note}\n${'─'.repeat(50)}\n${this.formatJobListings(fallbackJobs, 10)}\n\nType "apply [job name]" to get hired. Type "career" to see your progression.` };
    }

    const cityName = cityDisplay(this.player.city);
    return { success: true, message: `📋 JOB LISTINGS (${cityName})\n${'─'.repeat(50)}\n${this.formatJobListings(cityJobs, 15)}\n\nType "apply [job name]" to get hired. Type "career" to see your progression.` };
  }

  // v0.108.15 career ladder: current job, tenure, skill, and exactly what
  // the next promotion needs. Read-only — it never changes the job.
  career(): GameAction {
    if (!this.player.job) {
      const titleNow = careerTitle(this.player.workDaysCompleted ?? 0);
      return { success: true, message: `📈 **Career**\nYou're unemployed. Type "apply" to see openings, then "career" again to track your ladder.\n🏅 Work-milestone title: ${titleNow ?? 'None yet'}.` };
    }
    const job = this.player.job;
    const hourly = job.hourlyPay || (job.basePay ? job.basePay / 2080 : 0);
    const tenure = this.player.jobTenure ?? this.player.workDaysCompleted ?? 0;
    const lifetimeShifts = this.player.workDaysCompleted ?? 0;
    const milestoneTitle = careerTitle(lifetimeShifts);
    const nextMilestoneTitle = nextCareerTitle(lifetimeShifts);
    const promotions = this.player.promotions ?? 0;
    const skillName = job.skill || 'charisma';
    const skillLevel = this.player.skills?.[skillName]?.level ?? 1;
    const tier = String(job.tier ?? 'entry');
    const next = nextTier(tier);
    const tenureNeed = Math.max(0, 15 - tenure);
    const skillNeed = Math.max(0, 3 - skillLevel);
    const promoReady = tenureNeed === 0 && skillNeed === 0 && promotions < 3;
    const ladderLine = this.ladderLineForJob();
    return {
      success: true,
      message: `📈 **Career — ${job.title} @ ${job.employer}**\n${'─'.repeat(50)}\nTier: ${tier}${next ? ` → next tier: ${next}` : ' (top tier)'}\nPay: $${hourly.toFixed(2)}/hr (≈ $${(hourly * 8).toFixed(2)}/shift, ≈ $${(hourly * 8 * 22).toFixed(0)}/mo at 22 shifts)\nShifts at this job: ${tenure} | Promotions here: ${promotions}/3\nKey skill: ${skillName} (level ${skillLevel})\n\n🏅 Work-milestone title: ${milestoneTitle ?? 'None yet'}${nextMilestoneTitle ? ` (next: ${nextMilestoneTitle.title} at ${nextMilestoneTitle.at} shifts)` : ' — top title'}\n\n**Next promotion** (+15% pay): ${promoReady ? 'READY — type "promote"!' : `${tenureNeed > 0 ? `${tenureNeed} more shift(s); ` : ''}${skillNeed > 0 ? `${skillName} to level 3 (now ${skillLevel}); ` : ''}${promotions >= 3 ? 'max promotions at this job — apply for a higher-tier job.' : ''}${ladderLine ? `\n\n${ladderLine}` : ''}`}`,
    };
  }

  // v0.108.15 promotion: +15% hourly pay and a title prefix, gated on
  // tenure (15 shifts), key-skill level 3, max 3 per job. Only the player's
  // job record changes — the job database is never mutated.
  promote(): GameAction {
    if (!this.player.job) return { success: false, message: 'You don\'t have a job. Type "apply" to get hired first.' };
    const job = this.player.job;
    const promotions = this.player.promotions ?? 0;
    if (promotions >= 3) return { success: false, message: 'You\'ve maxed promotions at this job (3/3). Apply for a higher-tier job to climb further.' };
    const tenure = this.player.jobTenure ?? this.player.workDaysCompleted ?? 0;
    if (tenure < 15) return { success: false, message: `Promotion needs 15 shifts at this job. You have ${tenure}. Work ${15 - tenure} more shift(s).` };
    const skillName = job.skill || 'charisma';
    const skillLevel = this.player.skills?.[skillName]?.level ?? 1;
    if (skillLevel < 3) return { success: false, message: `Promotion needs ${skillName} level 3. You're at level ${skillLevel}. Work shifts to gain XP.` };
    const hourly = job.hourlyPay || (job.basePay ? job.basePay / 2080 : 0);
    const newHourly = Math.round(hourly * 1.15 * 100) / 100;
    const baseTitle = String(job.title).replace(/^(Senior |Lead |Principal )/, '');
    job.title = `${PROMOTION_TITLE_PREFIX[promotions]!}${baseTitle}`;
    job.hourlyPay = newHourly;
    this.player.promotions = promotions + 1;
    this.player.reputation.professional = Math.min(100, (this.player.reputation.professional ?? 0) + 5);
    return { success: true, message: `🎉 **PROMOTED!** You're now ${job.title} @ ${job.employer}.\nPay: $${hourly.toFixed(2)}/hr → $${newHourly.toFixed(2)}/hr (≈ $${(newHourly * 8).toFixed(2)}/shift). Promotions at this job: ${this.player.promotions}/3.` };
  }


  // v0.108.9 fix (minor 6): shared name resolution — exact match first,
  // then a unique substring match; ambiguous input is refused with a list
  // instead of silently acting on the first hit.
  private lowHealthWarning(): string {
    return (this.player.health ?? 100) <= 25
      ? ` ⚠️ Health is low (${this.player.health}/100) — restful sleep restores health.`
      : '';
  }

  // v0.108.9 fix (majors 1+2): requirement evaluation. "Preferred"
  // requirements are advisory and never block. Requirements naming a real
  // granted certification (or a recognised alias of one) require that
  // cert. Clean-record requirements check the criminal record. Anything
  // credential-like that no course grants (fire academy, MD, law, ASE,
  // CDL, police academy, detective exam, clearances, unevaluable
  // experience/age) FAILS CLOSED with a clear message instead of being
  // silently skipped. Anything else (equipment, soft skills, flavor) passes.
  private requirementDecision(req: string): { blocked: boolean; reason?: string } {
    const lower = req.toLowerCase();
    if (/preferred/i.test(req)) return { blocked: false };
    const certs = new Set<string>();
    for (const s of SCHOOLS) for (const c of s.courses) certs.add(c.rewardCertification);
    for (const cert of certs) {
      if (req.toUpperCase().includes(cert)) {
        return (this.player.certifications || []).includes(cert)
          ? { blocked: false }
          : { blocked: true, reason: `Requires the ${cert.replace(/_/g, ' ')} certification, which you don't hold yet.` };
      }
    }
    const held = this.player.certifications || [];
    const hasAny = (list: string[]) => list.some((c) => held.includes(c));
    const aliases: [RegExp, string[]][] = [
      [/paramedic/, ['PARAMEDIC_LICENSE']],
      [/nurse practitioner|\bnp\b/, ['NP_CERT']],
      [/\brn\b|registered nurse/, ['RN_LICENSE']],
      [/\bemt\b/, ['EMT_LICENSE']],
      [/full.?stack/, ['FULLSTACK_CERT']],
      [/\bit\b/, ['FULLSTACK_CERT']],
      [/\bai\b|artificial intelligence/, ['AI_BASICS', 'AI_SOFTWARE_ENG_DEGREE']],
      [/finance|financial/, ['FINANCE_CERT']],
      [/\bmba\b/, ['MBA_DEGREE']],
      [/robotics/, ['ROBOTICS_LICENSE']],
      [/chef|culinary|cuisine/, ['MASTER_CHEF_CERT']],
      [/marine/, ['MARINE_BIO_LICENSE']],
      [/global policy|public policy|political science/, ['GLOBAL_POLICY_CERT']],
    ];
    for (const [re, list] of aliases) {
      if (re.test(lower)) {
        return hasAny(list)
          ? { blocked: false }
          : { blocked: true, reason: `Requires ${list.map((c) => c.replace(/_/g, ' ')).join(' or ')}, which you don't hold yet.` };
      }
    }
    if (/clean record|clean background|background check/.test(lower)) {
      const hasRecord = (this.player.criminalRecord?.length || 0) > 0 || (this.player.prisonRecord?.arrests || 0) > 0;
      return hasRecord
        ? { blocked: true, reason: 'Requires a clean record, and you have a criminal record.' }
        : { blocked: false };
    }
    if (/21\+|years old/.test(lower)) {
      return { blocked: true, reason: `Requires "${req}", and age isn't tracked in the game, so this requirement can't be evaluated yet.` };
    }
    if (/\bmd\b|law degree|pharmd|engineering degree|social work degree|teaching certificate|\base\b|\bcdl\b|pe license|detective exam|fire academy|fire certification|police academy|law enforcement/.test(lower)) {
      return { blocked: true, reason: `Requires "${req}", and no course in the game grants it yet — so this job can't be earned until a matching course exists.` };
    }
    if (/degree/.test(lower)) {
      const degrees = [...certs].filter((c) => c.endsWith('_DEGREE'));
      return hasAny(degrees)
        ? { blocked: false }
        : { blocked: true, reason: 'Requires a degree, and you don\'t hold a degree certification yet.' };
    }
    if (/certification|certificate|license|licence|academy|exam|bar admission|clearance|residency|\d+\s*\+?\s*years|years of/.test(lower)) {
      return { blocked: true, reason: `Requires "${req}", and no course in the game grants it yet — so this job can't be earned until a matching course exists.` };
    }
    return { blocked: false };
  }

  // v0.108.9 fix (major 1): the single hire-eligibility gate, used by BOTH
  // the primary jobs-database path and the JOB_MARKET fallback path, so a
  // fallback hire is never unchecked. Trusted roles (restricted tiers,
  // emergency/government/federal/political categories, and trusted titles)
  // are closed to players with a criminal record; parole blocks everything.
  private hireBlocked(job: { employer?: string; tier?: string; category?: string; title?: string }): string | null {
    if (this.player.prisonRecord?.paroleEligible) {
      return `🚫 **REJECTED**: ${job.employer || 'This employer'} does not hire people currently on parole.`;
    }
    if ((this.player.criminalRecord?.length || 0) > 0) {
      const tier = (job.tier || '').toString().toLowerCase();
      const trustedTiers = ['tier3', 'tier4', 'executive', 'medical', 'government', 'law'];
      const trustedCats = ['emergency', 'government', 'federal', 'political'];
      const trustedTitle = /(nurse|doctor|surgeon|attorney|lawyer|police|detective|firefighter|paramedic|dispatcher|agent|marshal|pharmacist|teacher)/i.test(job.title || '');
      if (trustedTiers.includes(tier) || trustedCats.includes((job.category || '').toLowerCase()) || trustedTitle) {
        return `🚫 **REJECTED**: Your criminal record prevents you from holding a trusted position like ${job.title}.`;
      }
    }
    return null;
  }

  applyForJob(jobTitle: string): GameAction {
    const cityJobs = getJobsByCity(this.player.city);
    const found = resolveNamed(cityJobs, jobTitle, (j) => j.title);
    if (found.ambiguous) {
      return { success: false, message: `Multiple jobs match "${jobTitle}": ${found.ambiguous.join(', ')}. Be more specific.` };
    }
    const job = found.item;
    if (!job) {
      // v0.108.9 fix (major 1): the fallback used to hire with NO checks
      // at all. It now runs the same parole + criminal-record gate as the
      // primary path (fallback jobs carry no requirements list, so there
      // is nothing else to evaluate — but they are never hired unchecked).
      const fallbackJobs = JOB_MARKET[this.player.city] || JOB_MARKET.west_memphis || [];
      const fFound = resolveNamed(fallbackJobs, jobTitle, (j) => j.title);
      if (fFound.ambiguous) {
        return { success: false, message: `Multiple jobs match "${jobTitle}": ${fFound.ambiguous.join(', ')}. Be more specific.` };
      }
      const fJob = fFound.item;
      if (fJob) {
        const blocked = this.hireBlocked({ employer: fJob.employer, tier: fJob.tier, title: fJob.title });
        if (blocked) return { success: false, message: blocked };
        this.player.job = { ...fJob };
        this.player.jobTenure = 0;
        this.player.promotions = 0;
        this.player.lastActive = Date.now();
        return { success: true, message: `✅ Hired as ${fJob.title} at ${fJob.employer}!` };
      }
      return { success: false, message: `No job matching "${jobTitle}" in ${cityDisplay(this.player.city)}.` };
    }

    // v0.108.20 §42: the career mapping governs mapped jobs — it wins
    // wherever keyword matching would miss or misfire.
    const mapping = careerMappingForJob(job.id);
    if (mapping) {
      if (mapping.rung.cert && !(this.player.certifications ?? []).includes(mapping.rung.cert)) {
        const courseHit = SCHOOLS.flatMap((sc) => sc.courses.map((c) => ({ course: c, school: sc }))).find((x) => x.course.rewardCertification === mapping.rung.cert);
        return { success: false, message: `🚫 **REJECTED**: the ${mapping.path} rung "${job.title}" requires the ${mapping.rung.cert.replace(/_/g, ' ')} certification${courseHit ? ` — take "${courseHit.course.name}" at ${courseHit.school.name}` : ''}, which you don't hold yet.` };
      }
      if (mapping.rung.gpaBar !== null && mapping.rung.gpaBar !== undefined && careerGPA(this.player) < mapping.rung.gpaBar) {
        return { success: false, message: `🚫 **REJECTED**: the elite rung "${job.title}" requires GPA ≥ ${mapping.rung.gpaBar} (yours ${careerGPA(this.player)}; old saves without GPA read as 2.5).` };
      }
    } else if (job.requirements) {
      for (const req of job.requirements) {
        const d = this.requirementDecision(req);
        if (d.blocked) {
          return { success: false, message: `🚫 **REJECTED**: ${d.reason} (Needed: ${req}.)` };
        }
      }
    }

    const blocked = this.hireBlocked({ employer: job.employer, tier: job.tier, category: job.category, title: job.title });
    if (blocked) return { success: false, message: blocked };

    this.player.job = { ...job };
    this.player.jobTenure = 0;
    this.player.promotions = 0;
    this.player.reputation.professional += 5;
    this.player.lastActive = Date.now();

    return { success: true, message: `✅ **HIRED!** Welcome to the team at ${job.employer}. You are now a ${job.title}. Type "work" to begin your first shift.` };
  }

  // === SCHOOL & STUDY SYSTEM ===
  study(): GameAction {
    const citySchools = this.schools.getSchoolsByCity(this.player.city);
    if (citySchools.length === 0) {
      return { 
        success: true, 
        message: `📚 **Library Study**\nNo professional schools in ${cityDisplay(this.player.city)} currently. You can still study at the local library for $25.\n\nType "study library" to proceed.` 
      };
    }

    let message = `🎓 **PROFESSIONAL SCHOOLS (${cityDisplay(this.player.city)})**\n${'─'.repeat(50)}\n`;
    citySchools.forEach(school => {
      message += `**${school.name}** (${school.district})\n   ${school.description}\n`;
      school.courses.forEach(course => {
        const req = course.requirement ? ` [Req: ${course.requirement.skill} Lvl ${course.requirement.level}]` : '';
        message += `   • ${course.name} - $${course.cost} (${course.durationHours} hrs)${req}\n`;
      });
      message += '\n';
    });

    message += `To enroll, type "enroll [school_id] [course_id]".\nExample: "enroll maestro_college ai_foundation"`;
    return { success: true, message };
  }

  // v0.108.18: full schools catalog. study() lists only the player's
  // current city, so a player in a city with no schools (e.g. West
  // Memphis) could never learn the ids enroll demands. schools() lists
  // EVERY school from SCHOOLS with ids, courses, hours, and cost — one
  // command away, no guessing, nothing invented. (Method is listSchools
  // because `schools` is already the SchoolEngine field.)
  listSchools(): GameAction {
    const all = this.schools.getAllSchools();
    let message = `🎓 **ALL SCHOOLS**\n${'─'.repeat(50)}\n`;
    all.forEach(school => {
      const districtName = WORLD_DISTRICTS[school.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? school.district.replace(/_/g, ' ');
      const tier = (school as any).tier ?? 'university';
      message += `**${school.name}** — ${cityDisplay(school.city)} (${districtName}) [${tier}]\n   ${school.description}\n`;
      school.courses.forEach(course => {
        const req = course.requirement ? ` [Req: ${course.requirement.skill} Lvl ${course.requirement.level}]` : '';
        const transfer = Object.entries(TRANSFER_MAP).find(([, t]) => t.schoolId === school.id && t.courseId === course.id);
        const transferNote = transfer ? ` [Transfer: hold ${transfer[0].replace(/_/g, ' ')} for −25% hours/cost]` : '';
        const leads = CAREER_PATHS.filter((p) => p.rungs.some((r) => r.cert === course.rewardCertification)).map((p) => p.path);
        const leadsNote = leads.length > 0 ? ` [Leads to: ${leads.join(', ')}]` : '';
        message += `   • ${course.name} — $${course.cost} (${course.durationHours} hrs)${req}${transferNote}${leadsNote} — enroll ${school.id} ${course.id}\n`;
      });
      message += '\n';
    });
    message += `To enroll, type "enroll [school_id] [course_id]".`;
    return { success: true, message };
  }

  enroll(args: string): GameAction {
    if (!args) return { success: false, message: 'Usage: enroll [school_id] [course_id] — type "schools" to see every school and course.' };
    // v0.108.2 fix (M4): refuse re-enrolling while already enrolled. The
    // old code charged the new course and silently overwrote enrolledCourse,
    // discarding paid-for progress. There is no drop-course command, so the
    // only safe behavior is to block until the current course is finished.
    if (this.player.enrolledCourse) {
      const current = this.schools.getCourse(this.player.enrolledCourse.schoolId, this.player.enrolledCourse.courseId);
      const currentName = current ? current.name : `${this.player.enrolledCourse.schoolId} ${this.player.enrolledCourse.courseId}`;
      return { success: false, message: `You're already enrolled in ${currentName} (${this.player.enrolledCourse.hoursCompleted}/${this.player.enrolledCourse.totalHours} hrs). Finish it with "study hours [n]" before enrolling in another course — no charge was made.` };
    }
    const parts = args.split(' ');
    const schoolId = parts[0] || '';
    const courseId = parts[1] || '';
    
    const course = this.schools.getCourse(schoolId, courseId);
    if (!course) return { success: false, message: 'Invalid school or course ID. Type "schools" to see every school and course.' };

    // v0.108.20 §44: probation — GPA below 2.0 blocks NEW enrollments
    // until library study lifts it back to 2.0.
    if (this.player.lastGPA !== undefined && this.player.lastGPA < 2.0) {
      return { success: false, message: `Probation: your GPA is ${this.player.lastGPA.toFixed(2)} (below 2.0). You cannot enroll in a new course until it reaches 2.0 — recover with library study ("study library", +0.02 GPA each session).` };
    }

    // v0.108.20 §43: transfer — holding the mapped associate enrolls at
    // -25% hours AND -25% cost (advanced standing, shown with its reason).
    let effCost = course.cost;
    let effHours = course.durationHours;
    let transferNote = '';
    for (const [assocCert, target] of Object.entries(TRANSFER_MAP)) {
      if (target.schoolId === schoolId && target.courseId === courseId && (this.player.certifications ?? []).includes(assocCert)) {
        effCost = Math.round(course.cost * 0.75);
        effHours = Math.round(course.durationHours * 0.75);
        transferNote = ` (transfer: your ${assocCert.replace(/_/g, ' ')} gives −25% hours and cost)`;
        break;
      }
    }

    if (this.player.money < effCost) {
      return { success: false, message: `Insufficient funds. Course costs $${effCost}${transferNote}.` };
    }

    if (course.requirement) {
      const skill = this.player.skills[course.requirement.skill];
      if (!skill || skill.level < course.requirement.level) {
        return { success: false, message: `Requirements not met: ${course.requirement.skill} Level ${course.requirement.level} needed.` };
      }
    }

    this.player.money -= effCost;
    this.player.enrolledCourse = {
      schoolId,
      courseId,
      hoursCompleted: 0,
      totalHours: effHours,
      // v0.108.20 §44: GPA starts at 3.0 on enroll; enrollment date and
      // session count feed the attendance calculation.
      gpa: 3.0,
      enrolledDate: this.time.formatDate(),
      studySessions: 0,
      examFails: 0,
    };

    return {
      success: true,
      message: `✅ **Enrolled in ${course.name}!**\nCost: $${effCost} paid${transferNote}. You need to complete ${effHours} hours of study, then pass the exam to graduate.\n\nUse "study hours [number]" to progress.`,
      outcomeLog: `enrolled ${schoolId}/${courseId} "${course.name}" cost $${effCost} hours ${effHours}`,
    };
  }

  studyHours(hoursStr: string): GameAction {
    if (!this.player.enrolledCourse) {
      if (hoursStr === 'library' || !hoursStr) {
         // Fallback to library study
         if (this.player.money < 25) return { success: false, message: "Need $25 for library card." };
         this.player.money -= 25;
         this.player.intelligence = Math.min(100, this.player.intelligence + 2);
         this.player.energy = Math.max(0, this.player.energy - 15);
         this.time.advance({ hours: 3, minutes: 0 });
         const levelUpMsg = this.addSkillXP('tech', 20);
         // v0.108.20 §44: library study is the probation recovery path —
         // it lifts a held lastGPA by +0.02 when one exists.
         let gpaNote = '';
         if (this.player.lastGPA !== undefined) {
           this.player.lastGPA = Math.min(4.0, roundCents(this.player.lastGPA + 0.02));
           gpaNote = ` GPA +0.02 (now ${this.player.lastGPA.toFixed(2)}).`;
         }
         return { success: true, message: `Studied at library. INT +2${levelUpMsg}.${gpaNote}` };
      }
      return { success: false, message: "You aren't enrolled in any course. Use 'study' to see options." };
    }

    // v0.108.20 §44: library study while enrolled — same library costs,
    // plus GPA +0.02 and a counted attendance session.
    if (hoursStr === 'library') {
      if (this.player.money < 25) return { success: false, message: "Need $25 for library card." };
      this.player.money -= 25;
      this.player.intelligence = Math.min(100, this.player.intelligence + 2);
      this.player.energy = Math.max(0, this.player.energy - 15);
      this.time.advance({ hours: 3, minutes: 0 });
      const levelUpMsg = this.addSkillXP('tech', 20);
      const ec = this.player.enrolledCourse;
      ec.gpa = Math.min(4.0, roundCents((ec.gpa ?? 3.0) + 0.02));
      ec.studySessions = (ec.studySessions ?? 0) + 1;
      return { success: true, message: `Studied at library. INT +2${levelUpMsg}. GPA +0.02 (now ${ec.gpa.toFixed(2)}).` };
    }

    // v0.108.2 fix (M3): the old `parseInt(...) || 1` coercion turned
    // "study hours 0" into 1 hour silently, and a negative value farmed
    // energy and rewound game time (negative hours applied, negative energy
    // cost, negative time advance). Only a positive integer is accepted now.
    const hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours) || hours <= 0) {
      return { success: false, message: 'Study how many hours? Usage: "study hours [positive number]".' };
    }
    if (this.player.energy < hours * 5) {
      return { success: false, message: "Not enough energy for that much studying. Rest first." };
    }

    const courseData = this.player.enrolledCourse;
    const course = this.schools.getCourse(courseData.schoolId, courseData.courseId);
    if (!course) return { success: false, message: "Course data error." };

    // v0.108.20 §44: remediation hours may exceed totalHours after a
    // failed exam (eligibility = total + 10 x fails); the cap follows.
    const cap = courseData.totalHours + 10 * (courseData.examFails ?? 0);
    const hoursToApply = Math.min(hours, cap - courseData.hoursCompleted);
    if (hoursToApply <= 0) {
      return { success: true, message: `📖 Coursework for ${course.name} is complete (${courseData.hoursCompleted}/${courseData.totalHours} hrs). Take the exam with "exam" — graduation now comes from passing it, not from more study.` };
    }
    const energyBefore = this.player.energy;
    courseData.hoursCompleted += hoursToApply;
    this.player.energy -= hoursToApply * 5;
    this.time.advance({ hours: hoursToApply, minutes: 0 });
    this.player.intelligence = Math.min(100, this.player.intelligence + (course.intelligenceGain * (hoursToApply / course.durationHours)));
    // v0.108.20 §44: one study session moves GPA by the energy-at-start rule.
    const delta = gpaDeltaForEnergy(energyBefore);
    courseData.gpa = Math.min(4.0, Math.max(0, roundCents((courseData.gpa ?? 3.0) + delta)));
    courseData.studySessions = (courseData.studySessions ?? 0) + 1;

    let message = `📖 Studied for ${hoursToApply} hours on ${course.name}. Progress: ${courseData.hoursCompleted}/${courseData.totalHours} hrs. GPA ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} (now ${courseData.gpa.toFixed(2)}).`;

    // v0.108.20 §44: coursework completion NO LONGER auto-graduates.
    // The credential comes from passing "exam" (fee flow in examView).
    const complete = courseData.hoursCompleted >= courseData.totalHours;
    if (complete) {
      message += `\n\n✅ Coursework complete! Take the exam with "exam" (pass is 60; score = 40 + GPA×10 + skill×5, minus 10 below 50% attendance).`;
    }

    return {
      success: true,
      message,
      outcomeLog: `studied ${courseData.schoolId}/${courseData.courseId} +${hoursToApply}h (${courseData.hoursCompleted}/${courseData.totalHours} hrs, GPA ${courseData.gpa.toFixed(2)})${complete ? ' coursework complete' : ''}`,
    };
  }

  // === STATUS & INFO ===
  status(): GameAction {
    const weather = getWeather(this.time.currentTime, this.player.city);
    const job = this.player.job ? `${this.player.job.title} @ ${this.player.job.employer}` : 'Unemployed';
    const bg = BACKGROUNDS.find(b => b.id === this.player.background);
    const netWorth = this.calculateNetWorth();
    // v0.108.20: age + stage, background/trait/start lines, wealth tier,
    // and the fame recognition line (community rank is appended by the
    // client from /api/leaderboard when reachable).
    const ageYears = this.player.ageYears ?? 18;
    const stageNow = lifeStage(ageYears);
    const traitId = (this.player.traits ?? [])[0];
    const traitName = traitId ? (TRAIT_NAMES[traitId] ?? traitId) : 'None';
    const startCityName = this.player.startCity ? cityDisplay(this.player.startCity) : '—';
    const fameNow = fameScore(this.player, this.achievementEngine.exportSerializable().unlocked.length);
    const wealthNow = wealthTier(specNetWorth(this.player));
    
    return { 
      success: true, 
      message: `${this.player.name} | ${bg?.name || 'Unknown Background'}
📍 ${cityDisplay(this.player.city)}
💰 Cash: $${this.player.money.toFixed(2)} | 🏦 Bank: $${this.player.bankBalance.toFixed(2)} | 💎 Net Worth: $${netWorth.toLocaleString()}
⚡ Energy: ${this.player.energy}/100 | ❤️ Health: ${this.player.health}/100 | 😊 Happy: ${this.player.happiness}/100${(this.player.health ?? 100) <= 25 ? `\n⚠️ Health is low — restful sleep restores health.` : ''}
🧠 INT: ${this.player.intelligence} | 💪 FIT: ${this.player.fitness} | 😎 CHA: ${this.player.charisma}
💼 Job: ${job}\n🎂 Age: ${ageYears} (${stageNow}) · Wealth: ${wealthNow} · Background: ${bg?.name ?? '—'} · Trait: ${traitName} · Started in: ${startCityName}${fameNow >= 25 ? `\n⭐ Local recognition: people around town know your name (fame ${fameNow}).` : ''}${this.player.prisonRecord.arrests > 0 ? `\n🚨 Criminal Record: ${this.player.prisonRecord.arrests} arrests` : ''}
🕐 ${this.time.formatTime()} | ${this.time.formatDate()} | 🌡️ ${weather.temp}°F ${weather.condition}` 
    };
  }

  // === v0.108.19 LIFE AND WORLD EXPANSION ===
  // Spec: docs/LIFE_WORLD_EXPANSION_SPEC.md. All state additive.

  // L1 — Bonds & Milestones
  milestones(): GameAction {
    const entries = Object.entries(this.player.relationships ?? {}) as [string, any][];
    if (entries.length === 0) {
      return { success: true, message: 'You haven\'t met anyone yet. Type "people" to see who\'s around.' };
    }
    const rows = entries.map(([id, rel]) => {
      const npc = this.social.getNPCById(id);
      const value = rel.value ?? 0;
      const tier = rel.spouse ? 'Spouse' : milestoneTier(value);
      const next = nextMilestone(value);
      const partner = (rel.flags ?? []).includes('partner') ? ' 💍' : '';
      return { value, line: `• ${npc ? npc.name : id} — ${tier} (${value})${partner}${next ? ` → next: ${next.label} (${next.away} away)` : ' — top tier'}` };
    }).sort((a, b) => b.value - a.value);
    return { success: true, message: `💞 **Relationship Milestones**\n${rows.map((r) => r.line).join('\n')}\n\nTiers: Acquaintance 25 · Friend 50 · Close Friend 75 · Partner 90.\nCelebrate someone with "celebrate [name]" ($50, 2 hours).` };
  }

  celebrate(rawArgs: string): GameAction {
    if (!rawArgs) return { success: false, message: 'Celebrate with whom? Type "people" to see who\'s around.' };
    const resolved = this.resolveNpcAnywhere(rawArgs);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${rawArgs}": ${resolved.ambiguous.join(', ')}. Type "celebrate [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${rawArgs}" found. Type "people" to see who's around.` };
    const rel = this.ensureRel(npc);
    if ((rel.value ?? 0) < CELEBRATE_MIN_VALUE) {
      return { success: false, message: `You don't know ${npc.name} well enough yet (relationship ${rel.value}, need ${CELEBRATE_MIN_VALUE}+). Talk, gift, or hang out first.` };
    }
    if ((this.player.money ?? 0) < CELEBRATE_COST) return { success: false, message: `Celebrating costs $${CELEBRATE_COST}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    if ((this.player.energy ?? 0) < CELEBRATE_ENERGY) return { success: false, message: `You're too tired to celebrate (need ${CELEBRATE_ENERGY} energy). Rest first.` };
    this.player.money = roundCents((this.player.money ?? 0) - CELEBRATE_COST);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - CELEBRATE_ENERGY);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + CELEBRATE_HAPPY_GAIN);
    rel.value = Math.max(-100, Math.min(100, (rel.value ?? 0) + CELEBRATE_REL_GAIN));
    this.time.advance({ hours: CELEBRATE_HOURS, minutes: 0 });
    let partnerNote = '';
    if (rel.value >= PARTNER_THRESHOLD && !(rel.flags ?? []).includes('partner')) {
      rel.flags.push('partner');
      partnerNote = `\n💍 ${npc.name} is now your Partner!`;
    }
    return { success: true, message: `🎉 You spent the evening celebrating with ${npc.name} ($${CELEBRATE_COST}, ${CELEBRATE_HOURS} hours). Relationship +${CELEBRATE_REL_GAIN} → ${rel.value} (${milestoneTier(rel.value)}). Happiness +${CELEBRATE_HAPPY_GAIN}.${partnerNote}` };
  }

  // L2 — Home Life
  furnish(rawArgs: string): GameAction {
    const owned = this.player.properties ?? [];
    const catalog = FURNITURE.map((f) => `• ${f.key}: ${f.label} — $${f.cost}`).join('\n');
    if (owned.length === 0) {
      return { success: true, message: `🛋️ **Furniture Catalog**\n${catalog}\n\nYou don't own any properties yet. Buy one with "real-estate" first, then "furnish [property] [item]".` };
    }
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    const last = parts.length ? parts[parts.length - 1]!.toLowerCase() : '';
    const item = FURNITURE.find((f) => f.key === last);
    const propName = item ? parts.slice(0, -1).join(' ') : rawArgs;
    if (!propName) {
      const lines = owned.map((p: any) => {
        const furn = p.furniture ?? [];
        return `• ${p.name} (${cityDisplay(p.city)}) — Comfort tier ${comfortTier(furn.length)} (${furn.length} item${furn.length === 1 ? '' : 's'}${furn.length ? `: ${furn.join(', ')}` : ''})`;
      }).join('\n');
      return { success: true, message: `🛋️ **Furniture Catalog**\n${catalog}\n\n**Your homes:**\n${lines}\n\nBuy with "furnish [property] [item]". Comfort improves sleep recovery at home.` };
    }
    const resolved = resolveNamed<{ id: string; name: string; prop: any }>(owned.map((p: any) => ({ id: p.id, name: p.name, prop: p })), propName, (c) => c.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple properties match "${propName}": ${resolved.ambiguous.join(', ')}. Type "furnish [full property name] [item]".` };
    const target = resolved.item?.prop;
    if (!target) return { success: false, message: `No property named "${propName}" found. Type "properties" to see your portfolio.` };
    if (!item) {
      const furn = target.furniture ?? [];
      return { success: true, message: `🛋️ **${target.name}** — Comfort tier ${comfortTier(furn.length)} (${furn.length} item${furn.length === 1 ? '' : 's'}${furn.length ? `: ${furn.join(', ')}` : ''}).\n\nCatalog:\n${catalog}\n\nBuy with "furnish ${target.name} [item]".` };
    }
    if (!(target as any).furniture) (target as any).furniture = [];
    if ((target as any).furniture.includes(item.key)) return { success: false, message: `${target.name} already has a ${item.label}.` };
    if ((this.player.money ?? 0) < item.cost) return { success: false, message: `${item.label} costs $${item.cost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - item.cost);
    (target as any).furniture.push(item.key);
    const tier = comfortTier((target as any).furniture.length);
    return { success: true, message: `🛋️ You furnished ${target.name} with a ${item.label} ($${item.cost}). Comfort tier now ${tier}. Sleeping at home recovers better with higher comfort.` };
  }

  // L3 — Home Cooking
  cook(rawArgs: string): GameAction {
    const list = MEALS.map((m) => `• ${m.key}: ${m.label} — $${m.cost} (+${m.energy} energy, +${m.happy} happiness, +${m.xp} cooking XP${m.minCookLevel > 1 ? `, requires cooking level ${m.minCookLevel}` : ''})`).join('\n');
    if (!rawArgs) return { success: true, message: `🍳 **Home Cooking**\n${list}\n\nCook with "cook [meal]". Cooking costs ${COOK_ENERGY_COST} energy and takes ${COOK_HOURS} hour.` };
    const q = rawArgs.toLowerCase().trim();
    const meal = MEALS.find((m) => m.key === q) ?? MEALS.find((m) => m.label.toLowerCase().includes(q));
    if (!meal) return { success: false, message: `Unknown meal "${rawArgs}".\n\n${list}` };
    const cookLevel = this.player.skills?.['cooking']?.level ?? 1;
    if (cookLevel < meal.minCookLevel) return { success: false, message: `${meal.label} requires cooking level ${meal.minCookLevel} (you're level ${cookLevel}). Cook simpler meals to level up.` };
    if ((this.player.money ?? 0) < meal.cost) return { success: false, message: `${meal.label} costs $${meal.cost} in ingredients. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    if ((this.player.energy ?? 0) < COOK_ENERGY_COST) return { success: false, message: `You're too tired to cook (need ${COOK_ENERGY_COST} energy). Rest first.` };
    this.player.money = roundCents((this.player.money ?? 0) - meal.cost);
    const foodPermitBonus = (this.player.permits ?? []).includes('food') ? FOOD_PERMIT_ENERGY_BONUS : 0;
    this.player.energy = Math.min(100, Math.max(0, (this.player.energy ?? 0) - COOK_ENERGY_COST) + meal.energy + foodPermitBonus);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + meal.happy);
    this.time.advance({ hours: COOK_HOURS, minutes: 0 });
    const levelUpMsg = this.addSkillXP('cooking', meal.xp);
    return { success: true, message: `🍳 You cooked ${meal.label} ($${meal.cost}). Energy +${meal.energy} (now ${this.player.energy}), happiness +${meal.happy}.${levelUpMsg}` };
  }

  // W1 — World Events Calendar
  worldEvents(): GameAction {
    const weekKey = weekKeyFromDate(this.time.formatDate());
    const month0 = this.time.currentTime.getMonth();
    const events = Object.keys(WORLD_CITIES).map((id) => this.seasonalEventForCity(id, weekKey, month0));
    const lines = events.map((e) => `• ${e.label} — ${cityDisplay(e.city)} (${e.activity})`).join('\n');
    const holiday = holidayForWeek(weekKey, this.time.currentTime.getFullYear());
    const holidayLine = holiday ? `\n🎄 Holiday week: ${holiday.name}!\n` : '';
    const fameNow = fameScore(this.player, this.achievementEngine.exportSerializable().unlocked.length);
    const galaLine = fameNow >= 50
      ? `\n🎩 **Gala** — ${cityDisplay(this.player.city)} ($${GALA_ENTRY} entry, 2 hours, +${GALA_HAPPY} happiness, +$${GALA_PAY} appearance pay, once per game-week — type "attend gala").`
      : '';
    return { success: true, message: `🎪 **World Events This Week**${holidayLine}\n${lines}${galaLine}\n\nAttend one where you are with "attend [event]" ($${ATTEND_COST} entry, 2 hours). Events elsewhere name their city — travel there first.` };
  }

  attendEvent(rawArgs: string): GameAction {
    const weekKey = weekKeyFromDate(this.time.formatDate());
    // v0.108.20 (§23): galas are fame-gated weekly events in your city.
    if (rawArgs.trim().toLowerCase() === 'gala') {
      return this.attendGala(weekKey);
    }
    const here = this.seasonalEventForCity(this.player.city, weekKey, this.time.currentTime.getMonth());
    let target = here;
    if (rawArgs) {
      const q = rawArgs.toLowerCase().trim();
      if (here.label.toLowerCase().includes(q)) {
        target = here;
      } else {
        const elsewhere = Object.keys(WORLD_CITIES).map((id) => this.seasonalEventForCity(id, weekKey, this.time.currentTime.getMonth())).find((e) => e.label.toLowerCase().includes(q));
        if (elsewhere) return { success: false, message: `That event (${elsewhere.label}) is in ${cityDisplay(elsewhere.city)} — travel there first, then "attend".` };
        return { success: false, message: `No event matching "${rawArgs}" this week. Type "events" to see the calendar. This city's event: ${here.label}.` };
      }
    }
    const attended = this.player.attendedEvents ?? [];
    if (attended.includes(target.id)) return { success: false, message: `You already attended ${target.label} this week.` };
    if ((this.player.money ?? 0) < ATTEND_COST) return { success: false, message: `Entry costs $${ATTEND_COST}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    const cityData = (WORLD_CITIES as Record<string, any>)[target.city];
    let pay = attendPay(cityData?.economicIndex ?? 50);
    let happyGain = ATTEND_HAPPY;
    // v0.108.20 (§17): holiday-week attendance pays a small bonus.
    const holiday = holidayForWeek(weekKey, this.time.currentTime.getFullYear());
    let holidayNote = '';
    if (holiday) {
      pay += HOLIDAY_ATTEND_CASH_BONUS;
      happyGain += HOLIDAY_ATTEND_HAPPY_BONUS;
      holidayNote = ` 🎄 Holiday bonus (${holiday.name}): +$${HOLIDAY_ATTEND_CASH_BONUS}, +${HOLIDAY_ATTEND_HAPPY_BONUS} happiness.`;
    }
    this.player.money = roundCents((this.player.money ?? 0) - ATTEND_COST + pay);
    this.trackTaxIncome(pay);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + happyGain);
    this.time.advance({ hours: ATTEND_HOURS, minutes: 0 });
    if (!this.player.attendedEvents) this.player.attendedEvents = [];
    this.player.attendedEvents.push(target.id);
    return { success: true, message: `🎪 You attended ${target.label} in ${cityDisplay(target.city)} (${target.activity}). Entry $${ATTEND_COST}, appearance pay +$${pay}, happiness +${happyGain}.${holidayNote}` };
  }

  // W2 — Road Trips
  roadtrip(rawArgs: string): GameAction {
    if (!rawArgs) return { success: false, message: 'Road trip where? Usage: roadtrip [city]. You need a car in decent shape (condition 30%+).' };
    const dest = rawArgs.trim().replace(/^to\s+(the\s+)?/i, '');
    const cityIds = Object.keys(WORLD_CITIES) as string[];
    const q = dest.toLowerCase();
    let cityData = cityIds.find((id) => id === q);
    if (!cityData) {
      const resolved = resolveNamed(
        cityIds.map((id) => ({ id, name: (WORLD_CITIES as Record<string, any>)[id]?.displayName ?? id })),
        dest,
        (c) => c.name,
      );
      if (resolved.ambiguous) return { success: false, message: `Multiple cities match "${dest}": ${resolved.ambiguous.join(', ')}. Type "roadtrip [full city name]".` };
      cityData = resolved.item?.id;
    }
    if (!cityData) return { success: false, message: `City "${dest}" not found. Try: Memphis, Little Rock, Southaven, Nashville, Atlanta, Chicago, etc.` };
    const data = (WORLD_CITIES as Record<string, any>)[cityData];
    if (cityData === this.player.city) return { success: false, message: `You're already in ${data.displayName}. Road trips go between cities.` };
    const cars = (this.player.vehicles ?? []).filter((v: any) => v.type !== 'bike');
    if (cars.length === 0) return { success: false, message: `You need a car for a road trip (bicycles don't count). Buy one with "buy vehicle [type]", or travel normally with "travel ${data.displayName}".` };
    const car = cars.sort((a: any, b: any) => (b.condition ?? 100) - (a.condition ?? 100))[0]!;
    if ((car.condition ?? 100) < ROADTRIP_MIN_CONDITION) return { success: false, message: `Your ${car.name} is in no shape for the road (condition ${car.condition}%, need ${ROADTRIP_MIN_CONDITION}%+). Service it first with "service".` };
    // v0.108.20 (§31): driver's license cuts roadtrip fuel $15 → $10.
    // v0.108.24: the ID driver's license is the second fuel discount —
    // 20% off ($12) — but never stacks with the §31 permit ($10 wins).
    const fuelCost = (this.player.permits ?? []).includes('drivers')
      ? ROADTRIP_FUEL_WITH_LICENSE
      : roundCents(ROADTRIP_FUEL_COST * (1 - this.idDiscount('roadtrip_fuel')));
    if ((this.player.money ?? 0) < fuelCost) return { success: false, message: `Fuel costs $${fuelCost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    const route = TRAVEL_ROUTES.find((r) => r.from === this.player.city && r.to === cityData);
    const hours = route ? route.timeHours : 3;
    this.player.money = roundCents((this.player.money ?? 0) - fuelCost);
    car.condition = Math.max(0, (car.condition ?? 100) - ROADTRIP_CONDITION_COST);
    // v0.108.23 §60: road trips count in the journal (fuel as fare).
    this.player.travelStats = recordTrip(this.player.travelStats, cityData, fuelCost);
    this.player.city = cityData;
    this.player.district = 'downtown';
    if (!this.player.visitedCities) this.player.visitedCities = ['west_memphis'];
    const vc: string[] = this.player.visitedCities;
    const wasNewCity = !vc.includes(cityData);
    if (wasNewCity) vc.push(cityData);
    const challengeCityGain = wasNewCity && this.noteChallengeCity(cityData) ? 1 : 0;
    const bumpTo = (id: string, target: number) => {
      const prev = this.achievementEngine.getProgress(id);
      if (target > prev) this.achievementEngine.updateProgress(id, target - prev);
    };
    bumpTo('traveler', vc.length);
    bumpTo('jetsetter', vc.length);
    bumpTo('world_traveler', vc.length);
    const visitedInternational = vc.filter((c) => (WORLD_CITIES as Record<string, any>)[c]?.country !== 'USA').length;
    bumpTo('global_citizen', visitedInternational);
    bumpTo('passport_collector', visitedInternational);
    this.time.advance({ hours, minutes: 0 });
    const levelUpMsg = this.addSkillXP('driving', ROADTRIP_DRIVING_XP);
    return { success: true, message: `🚗 Road trip to ${data.displayName} in your ${car.name}! Fuel $${fuelCost}, ${hours}h on the road, condition ${car.condition}% (-${ROADTRIP_CONDITION_COST}). You pass small towns and open highway — the world feels bigger from behind the wheel.${levelUpMsg}`, challengeContributions: challengeCityGain ? { cities: challengeCityGain } : undefined };
  }

  // W3 — Passport & World Journey
  passport(): GameAction {
    const visited: string[] = this.player.visitedCities ?? ['west_memphis'];
    const claimed = this.player.passportMilestones ?? 0;
    const newly = PASSPORT_MILESTONES.filter((m, idx) => idx >= claimed && visited.length >= m.cities);
    let payout = 0;
    if (newly.length > 0) {
      payout = newly.reduce((s, m) => s + m.reward, 0);
      this.player.money = roundCents((this.player.money ?? 0) + payout);
      this.player.passportMilestones = claimed + newly.length;
    }
    const stamps = visited.map((c) => `• ${cityDisplay(c)}`).join('\n');
    const next = PASSPORT_MILESTONES.find((m) => visited.length < m.cities);
    const unvisited = (Object.keys(WORLD_CITIES) as string[]).find((id) => !visited.includes(id));
    const hint = unvisited
      ? `Next stop idea: ${cityDisplay(unvisited)} (${(WORLD_CITIES as Record<string, any>)[unvisited]?.region ?? 'somewhere new'} region).`
      : 'You have seen the whole world. 🌍';
    return { success: true, message: `🛂 **Your Passport** — ${visited.length}/${TOTAL_CITIES} cities\n${stamps}\n${newly.length ? `\n🎉 Milestone${newly.length === 1 ? '' : 's'} reached: +$${payout}!\n` : ''}${next ? `Next milestone: ${next.cities} cities → $${next.reward}.\n` : 'All milestones claimed. 🏆\n'}${hint}` };
  }

  // ==========================================================
  // v0.108.20 MEGA-EXPANSION — new command methods
  // ==========================================================

  private trackTaxIncome(amount: number): void {
    if (!amount || amount <= 0) return;
    const year = this.time.currentTime.getFullYear();
    if (this.player.taxYear !== undefined && this.player.taxYear !== year) {
      this.player.taxAnnualIncome = 0;
    }
    this.player.taxYear = year;
    this.player.taxAnnualIncome = roundCents((this.player.taxAnnualIncome ?? 0) + amount);
  }

  private careerMilestoneNote(prev: number, now: number): string {
    const before = careerTitle(prev);
    const after = careerTitle(now);
    if (after && after !== before) return ` 🏅 New work-milestone title: ${after}!`;
    return '';
  }

  private noteChallengeCity(cityId: string): boolean {
    const wk = weekKeyFromDate(this.time.formatDate());
    if (this.player.challengeWeek !== wk) {
      this.player.challengeWeek = wk;
      this.player.challengeContribution = 0;
      this.player.challengeVisitedCities = [];
    }
    const visited: string[] = this.player.challengeVisitedCities ?? [];
    if (visited.includes(cityId)) return false;
    visited.push(cityId);
    this.player.challengeVisitedCities = visited;
    return true;
  }

  private syncInvestigations(): void {
    const heat = this.player.heat ?? 0;
    if (!Array.isArray(this.player.investigations)) this.player.investigations = [];
    const open = this.player.investigations.filter((i: any) => i.status === 'open');
    const want = heat >= INVESTIGATION_HEAT_2 ? 2 : heat >= INVESTIGATION_HEAT_1 ? 1 : 0;
    for (let i = open.length; i < want; i++) {
      this.player.investigations.push({ id: `inv-${this.player.investigations.length + 1}`, openedAtHeat: heat, status: 'open' });
    }
  }

  private closeInvestigationsIfCool(): void {
    if ((this.player.heat ?? 0) >= INVESTIGATION_CLOSE_HEAT) return;
    for (const inv of this.player.investigations ?? []) {
      if (inv.status === 'open') inv.status = 'closed';
    }
  }

  private seasonalEventForCity(cityId: string, weekKey: number, month0: number): { id: string; city: string; label: string; activity: string } {
    const base = worldEventForCity(cityId, weekKey);
    const cityData = (WORLD_CITIES as Record<string, any>)[cityId];
    const pref = seasonalTemplateModifier(month0, cityData?.modifiers ?? []);
    if (!pref) return base;
    const match = EVENT_TEMPLATES.find((t: any) => t.key === pref);
    if (!match) return base;
    return { id: `${cityId}-${weekKey}`, city: cityId, label: match.label, activity: match.activity };
  }

  private attendGala(weekKey: number): GameAction {
    const fameNow = fameScore(this.player, this.achievementEngine.exportSerializable().unlocked.length);
    if (fameNow < 50) return { success: false, message: 'Galas open at fame 50. Build your name first — type "fame" to see where you stand.' };
    const galaId = `gala:${weekKey}`;
    if ((this.player.attendedEvents ?? []).includes(galaId)) {
      return { success: false, message: 'You already attended a gala this game-week. One gala per week.' };
    }
    if ((this.player.money ?? 0) < GALA_ENTRY) return { success: false, message: `Gala entry is $${GALA_ENTRY}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - GALA_ENTRY + GALA_PAY);
    this.trackTaxIncome(GALA_PAY);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + GALA_HAPPY);
    this.time.advance({ hours: 2, minutes: 0 });
    if (!this.player.attendedEvents) this.player.attendedEvents = [];
    this.player.attendedEvents.push(galaId);
    return { success: true, message: `🎩 You attended a gala in ${cityDisplay(this.player.city)}. Entry $${GALA_ENTRY}, appearance pay +$${GALA_PAY}, happiness +${GALA_HAPPY}.` };
  }

  // ---- §1 Taxes ----
  private taxStatus(): GameAction {
    const owed = this.player.taxOwed ?? 0;
    const plan = this.player.taxPlanRemaining ?? 0;
    const due = this.player.taxDueMonthKey ?? '—';
    const income = this.player.taxAnnualIncome ?? 0;
    const year = this.player.taxYear ?? this.time.currentTime.getFullYear();
    const est = computeTaxLiability(income);
    return {
      success: true,
      message: `🧾 **Taxes**\n${'─'.repeat(40)}\nGame-year ${year} income so far: $${income.toLocaleString()} (standard deduction $${TAX_DEDUCTION.toLocaleString()}; estimated liability $${est.toLocaleString()})\nOutstanding balance: $${owed.toLocaleString()}${owed > 0 ? ` (for game-year ${this.player.taxYearDue ?? '—'}, due by ${due})` : ''}${plan > 0 ? `\nPayment plan active: $${plan.toLocaleString()} remaining, $${this.player.taxPlanInstallment ?? 0}/month` : ''}\n\nCommands: file taxes | tax plan`,
    };
  }

  private fileTaxes(): GameAction {
    let owed = this.player.taxOwed ?? 0;
    let reliefNote = '';
    if (this.player.taxReliefPending && owed > 0) {
      owed = roundCents(owed * 0.9);
      this.player.taxReliefPending = false;
      reliefNote = ' (10% tax-relief decision applied)';
    }
    if (owed <= 0) return { success: false, message: 'You owe nothing right now. Type "tax" to see your standing.' };
    if ((this.player.money ?? 0) < owed) {
      const short = roundCents(owed - (this.player.money ?? 0));
      return { success: false, message: `You owe $${owed.toLocaleString()} but have $${(this.player.money ?? 0).toFixed(2)} — $${short.toLocaleString()} short. Type "tax plan" to split it into 3 monthly installments.` };
    }
    this.player.money = roundCents((this.player.money ?? 0) - owed);
    this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + owed;
    this.player.taxOwed = 0;
    this.player.taxPlanRemaining = 0;
    this.player.taxPlanInstallment = 0;
    this.player.taxPenaltyApplied = false;
    this.player.taxLateFees = 0;
    appendJournalLog(this.player, this.time.formatDate(), `Filed taxes for game-year ${this.player.taxYearDue ?? ''}: $${owed.toLocaleString()} paid on time.`);
    return { success: true, message: `🧾 Filed taxes: $${owed.toLocaleString()} paid in full${reliefNote}. You're square with the tax office.` };
  }

  private taxPlan(): GameAction {
    const owed = this.player.taxOwed ?? 0;
    if (owed <= 0) return { success: false, message: 'You owe nothing right now — no plan needed. Type "tax" to see your standing.' };
    if ((this.player.taxPlanRemaining ?? 0) > 0) return { success: false, message: `A payment plan is already active: $${this.player.taxPlanRemaining.toLocaleString()} remaining at $${this.player.taxPlanInstallment ?? 0}/month.` };
    const inst = Math.ceil((owed / TAX_PLAN_INSTALLMENTS) * 100) / 100;
    this.player.taxPlanRemaining = owed;
    this.player.taxPlanInstallment = inst;
    return { success: true, message: `🧾 Payment plan set: $${owed.toLocaleString()} split into ${TAX_PLAN_INSTALLMENTS} monthly installments of $${inst.toLocaleString()} (auto-deducted, no interest). Miss an installment and the plan breaks with a 5% penalty on the remainder.` };
  }

  // ---- §2 Court / police ----
  private casesList(): GameAction {
    const cases = (this.player.cases ?? []) as { id: string; offense: string; fine: number; status: string }[];
    if (cases.length === 0) return { success: true, message: '📋 No court cases on record.' };
    const lines = cases.map((c) => `• ${c.id}: ${c.offense} — $${c.fine.toLocaleString()} (${c.status})`).join('\n');
    return { success: true, message: `📋 **Court Cases**\n${lines}\n\nType "case [id]" for one case, or "lawyer defend [id]" to contest an open case ($250).` };
  }

  private caseDetail(id: string): GameAction {
    if (!id) return { success: false, message: 'Which case? Usage: case [id] — type "cases" to list them.' };
    const c = (this.player.cases ?? []).find((x: any) => x.id === id.toLowerCase());
    if (!c) return { success: false, message: `No case "${id}". Type "cases" to list your cases.` };
    return { success: true, message: `📋 **${c.id}**\nOffense: ${c.offense}\nFine: $${c.fine.toLocaleString()}\nStatus: ${c.status}${c.status === 'open' ? '\n\nContest it with "lawyer defend ' + c.id + '" ($250).' : ''}` };
  }

  private defendCase(id: string): GameAction {
    if (!id) return { success: false, message: 'Which case? Usage: lawyer defend [id] — type "cases" to list them.' };
    const c = (this.player.cases ?? []).find((x: any) => x.id === id.toLowerCase());
    if (!c) return { success: false, message: `No case "${id}". Type "cases" to list your cases.` };
    if (c.status !== 'open') return { success: false, message: `${c.id} is already ${c.status} — only open cases can be defended.` };
    if ((this.player.money ?? 0) < DEFEND_FEE) return { success: false, message: `Defending a case costs $${DEFEND_FEE}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - DEFEND_FEE);
    const outcome = defendOutcome(c.id);
    if (outcome === 'dismissed') {
      c.status = 'dismissed';
      const fines = this.player.fines ?? [];
      const idx = fines.findIndex((f: any) => f.offense === c.offense && f.amount === c.fine);
      if (idx >= 0) fines.splice(idx, 1);
      c.fine = 0;
      return { success: true, message: `⚖️ Case ${c.id} DISMISSED. The fine is gone. Legal fee: $${DEFEND_FEE}.` };
    }
    if (outcome === 'reduced') {
      const old = c.fine;
      c.fine = Math.round(c.fine / 2);
      c.status = 'reduced';
      const f = (this.player.fines ?? []).find((x: any) => x.offense === c.offense && x.amount === old);
      if (f) f.amount = c.fine;
      return { success: true, message: `⚖️ Case ${c.id} REDUCED: fine cut from $${old.toLocaleString()} to $${c.fine.toLocaleString()}. Legal fee: $${DEFEND_FEE}.` };
    }
    c.status = 'upheld';
    c.fine = c.fine + DEFEND_UPHELD_COSTS;
    const f2 = (this.player.fines ?? []).find((x: any) => x.offense === c.offense);
    if (f2) f2.amount = c.fine;
    return { success: true, message: `⚖️ Case ${c.id} UPHELD: the fine stands, plus $${DEFEND_UPHELD_COSTS} court costs (now $${c.fine.toLocaleString()}). Legal fee: $${DEFEND_FEE}.` };
  }

  private policeStatus(): GameAction {
    const heat = this.player.heat ?? 0;
    const cityData = (WORLD_CITIES as Record<string, any>)[this.player.city];
    const patrol = patrolLevel(cityData?.crimeRate ?? 50);
    const inv = (this.player.investigations ?? []).filter((i: any) => i.status === 'open');
    const invLines = inv.length === 0 ? 'None.' : inv.map((i: any) => `• ${i.id} (opened at heat ${i.openedAtHeat})`).join('\n');
    return {
      success: true,
      message: `🚔 **Police**\nHeat: ${heat}\nPatrol level in ${cityDisplay(this.player.city)}: ${patrol}\nOpen investigations:\n${invLines}\n\nWhat cools heat: laying low ("laylow"), time passing, and a lawyer clean ("lawyer clean", $${(heat * 100).toLocaleString()}${inv.length ? ` + $${inv.length * LAWYER_CLEAN_INVESTIGATION_SURCHARGE} investigation surcharge` : ''}). Investigations close once heat falls below ${INVESTIGATION_CLOSE_HEAT}.`,
    };
  }

  // ---- §3 College ----
  private degreesView(): GameAction {
    const certs: string[] = this.player.certifications ?? [];
    const enrolled = this.player.enrolledCourse;
    const enrolledLine = enrolled
      ? (() => { const c = this.schools.getCourse(enrolled.schoolId, enrolled.courseId); return c ? `\nIn progress: ${c.name} (${enrolled.hoursCompleted}/${enrolled.totalHours} hrs)` : `\nIn progress: ${enrolled.schoolId} ${enrolled.courseId}`; })()
      : '\nNot enrolled in a course.';
    // Next-credential hint: count completed courses per school family.
    const bySchool: Record<string, number> = {};
    for (const cert of certs) {
      for (const sch of SCHOOLS) {
        if (sch.courses.some((c: any) => c.certification === cert)) {
          bySchool[sch.id] = (bySchool[sch.id] ?? 0) + 1;
          break;
        }
      }
    }
    const hintSchool = Object.entries(bySchool).sort((a, b) => b[1] - a[1])[0];
    const hint = hintSchool
      ? `\nNext credential hint: ${degreeTitle(hintSchool[1] + 1)} — one more completed course in that school family.`
      : '\nNext credential hint: complete a course to earn your first credential (certificate).';
    return {
      success: true,
      message: `🎓 **Degrees & Credentials**\nCompleted (${certs.length}): ${certs.length ? certs.join(', ') : 'none yet'}${enrolledLine}${hint}\n\nLadder: certificate → associate → bachelor → master, by completed courses within a school family.`,
    };
  }

  private campusView(rawArgs: string): GameAction {
    const sub = rawArgs.trim().toLowerCase();
    const enrolled = this.player.enrolledCourse;
    if (!enrolled) {
      const schools = this.schools.getAllSchools();
      const names = schools.map((s: any) => `• ${s.name ?? s.id} (${s.city ?? ''})`).join('\n');
      return { success: true, message: `🏫 **Campus**\nYou're not enrolled in a school. Nearest schools:\n${names || 'Type "schools" to see every school and course.'}\n\nEnroll with "enroll [school] [course]", then come back for campus life.` };
    }
    const school = SCHOOLS.find((s: any) => s.id === enrolled.schoolId);
    const schoolName = school?.name ?? enrolled.schoolId;
    const course = this.schools.getCourse(enrolled.schoolId, enrolled.courseId);
    if (sub === 'study') {
      if ((this.player.energy ?? 0) < CAMPUS_STUDY_HOURS * 5) return { success: false, message: `You're too tired for a study group (need ${CAMPUS_STUDY_HOURS * 5} energy). Rest first.` };
      this.player.energy = Math.max(0, (this.player.energy ?? 0) - CAMPUS_STUDY_HOURS * 5);
      this.time.advance({ hours: CAMPUS_STUDY_HOURS, minutes: 0 });
      const lvlMsg = this.addSkillXP('intelligence', CAMPUS_STUDY_XP);
      return { success: true, message: `📚 Study group at ${schoolName} (free, ${CAMPUS_STUDY_HOURS}h): +${CAMPUS_STUDY_XP} intelligence XP.${lvlMsg}` };
    }
    if (sub === 'club') {
      const classmates = this.social.getNPCByCity(this.player.city).slice(0, 1);
      this.player.energy = Math.max(0, (this.player.energy ?? 0) - 10);
      this.time.advance({ hours: CAMPUS_CLUB_HOURS, minutes: 0 });
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + CAMPUS_CLUB_HAPPY);
      let relNote = '';
      if (classmates[0]) {
        const rel = this.ensureRel(classmates[0]);
        rel.value = Math.min(100, (rel.value ?? 0) + CAMPUS_CLUB_REL);
        classmates[0].relationship = rel.value;
        relNote = ` +${CAMPUS_CLUB_REL} relationship with ${classmates[0].name}.`;
      }
      return { success: true, message: `🎉 Club social at ${schoolName} (free, ${CAMPUS_CLUB_HOURS}h): +${CAMPUS_CLUB_HAPPY} happiness.${relNote}` };
    }
    return {
      success: true,
      message: `🏫 **Campus — ${schoolName}**\nEnrolled: ${course?.name ?? enrolled.courseId} (${enrolled.hoursCompleted}/${enrolled.totalHours} hrs)\n\n• campus study — study group (free, ${CAMPUS_STUDY_HOURS}h, +${CAMPUS_STUDY_XP} intelligence XP)\n• campus club — club social (free, ${CAMPUS_CLUB_HOURS}h, +${CAMPUS_CLUB_HAPPY} happiness, +${CAMPUS_CLUB_REL} with a classmate)`,
    };
  }

  // ---- §4 Family ----
  private spouseRel(): [string, any] | null {
    for (const [id, rel] of Object.entries(this.player.relationships ?? {})) {
      if ((rel as any)?.spouse) return [id, rel];
    }
    return null;
  }

  private propose(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Propose to whom? Usage: propose [name]. You need a Partner-tier (90+) relationship first.' };
    const nearby = this.social.getNPCByCity(this.player.city);
    const resolved = resolveNamed(nearby, name, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${name}": ${resolved.ambiguous.join(', ')}. Type "propose [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${name}" is around right now. Type "people" to see who's here.` };
    const rel = this.ensureRel(npc);
    if ((rel.value ?? 0) < 90) return { success: false, message: `${npc.name} is at relationship ${rel.value ?? 0} — proposals need Partner tier (90+). Build the relationship first.` };
    const existing = this.spouseRel();
    if (existing) {
      const cur = this.social.getNPCById(existing[0]);
      return { success: false, message: `You're already married to ${cur?.name ?? 'someone'} — one spouse at a time.` };
    }
    if ((this.player.money ?? 0) < PROPOSE_COST) return { success: false, message: `A ring costs $${PROPOSE_COST}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - PROPOSE_COST);
    rel.spouse = true;
    npc.relationship = rel.value;
    appendJournalLog(this.player, this.time.formatDate(), `Proposed to ${npc.name} — and they said yes! 💍`);
    return { success: true, message: `💍 You proposed to ${npc.name} — they said yes! (Ring: $${PROPOSE_COST}.) ${npc.name} is now your Spouse.` };
  }

  private familyView(): GameAction {
    const spouseEntry = this.spouseRel();
    const spouseName = spouseEntry ? (this.social.getNPCById(spouseEntry[0])?.name ?? '—') : 'None';
    const children: any[] = this.player.children ?? [];
    const year = this.time.currentTime.getFullYear();
    const childLines = children.length === 0 ? 'None yet.' : children.map((c) => {
      const age = year - (c.birthYear ?? year);
      return `• ${c.name} — age ${age} (${childStage(age)})`;
    }).join('\n');
    const household = 1 + (spouseEntry ? 1 : 0) + children.length;
    return {
      success: true,
      message: `👨‍👩‍👧 **Family**\nSpouse: ${spouseName}\nChildren:\n${childLines}\nHousehold size: ${household}\n\n• welcome child [name] — $${WELCOME_CHILD_COST} (needs a spouse + a property)\n• family activity [movie|picnic|dinner] — 2h, +5 happiness per household member (cap +15), +2 with your spouse`,
    };
  }

  private welcomeChild(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Usage: welcome child [name]. You need a spouse and an owned property first.' };
    if (!this.spouseRel()) return { success: false, message: 'You need a spouse first — propose to a Partner-tier friend with "propose [name]".' };
    if ((this.player.properties ?? []).length === 0) return { success: false, message: 'You need an owned property first — a child needs a home. Type "real-estate" to browse.' };
    if ((this.player.money ?? 0) < WELCOME_CHILD_COST) return { success: false, message: `Welcoming a child costs $${WELCOME_CHILD_COST}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - WELCOME_CHILD_COST);
    if (!Array.isArray(this.player.children)) this.player.children = [];
    this.player.children.push({ name, birthYear: this.time.currentTime.getFullYear() });
    appendJournalLog(this.player, this.time.formatDate(), `Welcomed ${name} into the family! 👶`);
    return { success: true, message: `👶 Welcome, ${name}! Your family grows. (Cost: $${WELCOME_CHILD_COST}.)` };
  }

  private familyActivity(rawArgs: string): GameAction {
    const kind = rawArgs.trim().toLowerCase();
    const act = FAMILY_ACTIVITIES[kind];
    if (!act) return { success: false, message: 'Usage: family activity [movie|picnic|dinner].' };
    const spouseEntry = this.spouseRel();
    if (!spouseEntry) return { success: false, message: 'Family activities need a spouse — propose to a Partner-tier friend with "propose [name]".' };
    if ((this.player.money ?? 0) < act.cost) return { success: false, message: `${act.label} costs $${act.cost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - act.cost);
    this.time.advance({ hours: FAMILY_ACTIVITY_HOURS, minutes: 0 });
    const household = 1 + 1 + (this.player.children ?? []).length;
    const happyGain = Math.min(FAMILY_ACTIVITY_HAPPY_CAP, FAMILY_ACTIVITY_HAPPY_PER_MEMBER * household);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + happyGain);
    const spouseNpc = this.social.getNPCById(spouseEntry[0]);
    if (spouseNpc) {
      const rel = this.ensureRel(spouseNpc);
      rel.value = Math.min(100, (rel.value ?? 0) + FAMILY_ACTIVITY_SPOUSE_REL);
      spouseNpc.relationship = rel.value;
    }
    return { success: true, message: `👨‍👩‍👧 ${act.label} with the family (2h, $${act.cost}): +${happyGain} happiness, +${FAMILY_ACTIVITY_SPOUSE_REL} with your spouse.` };
  }

  // ---- §5 Government tiers ----
  private governmentView(rawArgs: string): GameAction {
    const sub = rawArgs.trim().toLowerCase();
    // v0.108.20 §40: `gov jobs` is the entity catalog (routed here because
    // `gov` is already the governmentView alias in dispatch).
    if (sub === 'jobs') return this.govJobsView();
    if (sub === 'state') {
      const stateName = stateNameForCity(this.player.city);
      const stateCode = stateCodeForCity(this.player.city);
      const listings = stateCode
        ? getJobsByCategory('political').filter((j: any) => stateCodeForCity(j.city) === stateCode)
        : [];
      const lines = listings.length === 0
        ? 'No state-level political openings listed for this state right now.'
        : listings.map((j: any) => `• ${j.title} @ ${j.employer} — ${cityDisplay(j.city)}`).join('\n');
      return { success: true, message: `🏛️ **${stateName} — State Government**\nState-level openings (from the jobs database, never invented):\n${lines}\n\nApply with "apply [job]".` };
    }
    if (sub === 'federal') {
      const country = countryNameForCity(this.player.city);
      const listings = getJobsByCategory('federal');
      const lines = listings.length === 0
        ? 'No federal openings listed right now.'
        : listings.map((j: any) => `• ${j.title} @ ${j.employer} — ${cityDisplay(j.city)}`).join('\n');
      return { success: true, message: `🏛️ **${country} — Federal Government**\nFederal openings (from the jobs database, never invented):\n${lines}\n\nApply with "apply [job]".` };
    }
    return this.government();
  }

  private civicView(): GameAction {
    const rep = this.player.reputation?.community ?? 0;
    const title = civicTitle(rep);
    const blocked = (this.player.criminalRecord?.length ?? 0) > 0 || (this.player.prisonRecord?.arrests ?? 0) > 0;
    return {
      success: true,
      message: `🏛️ **Civic Standing**\nCommunity reputation: ${rep}\nCivic title: ${title}\n\nTitles: Resident (<25) · Active Citizen (25+) · Community Leader (50+) · Public Servant (75+) · Office Holder (100+)\nTier jobs open to you: ${blocked ? 'trusted government jobs are blocked by your record (see "court")' : 'all tiers — apply with "apply [job]"'}\n\nRaise reputation by volunteering ("volunteer") and helping neighbours.`,
    };
  }

  // ---- §6+§9 Calendar / years ----
  private calendarView(): GameAction {
    const now = this.time.currentTime;
    const month0 = now.getMonth();
    const season = seasonFromMonth(month0);
    const age = this.player.ageYears ?? 18;
    const stage = lifeStage(age);
    const doy = dayOfYear(now.getFullYear(), month0, now.getDate());
    const daysLeft = daysUntilYearEnd(now.getFullYear(), month0, now.getDate());
    const next = nextHoliday(now.getFullYear(), month0, now.getDate());
    const owed = this.player.taxOwed ?? 0;
    const taxLine = owed > 0 ? `\n🧾 Tax deadline: ${this.player.taxDueMonthKey ?? '—'} ($${owed.toLocaleString()} owed)` : '';
    const spouseEntry = this.spouseRel();
    const familyLines: string[] = [];
    if (spouseEntry) familyLines.push(`• Anniversary (spouse) — every year crossing`);
    for (const c of this.player.children ?? []) familyLines.push(`• ${c.name}'s birthday — every year crossing`);
    return {
      success: true,
      message: `📅 **Calendar**\nToday: ${this.time.formatDate()} (${season})\nDay ${doy} of the year — ${daysLeft} days until year end\nAge: ${age} (${stage})\nNext holiday: ${next.holiday.name} in ${next.daysAway} day${next.daysAway === 1 ? '' : 's'}${taxLine}${familyLines.length ? `\nFamily dates:\n${familyLines.join('\n')}` : ''}`,
    };
  }

  private yearsView(): GameAction {
    const stats: Record<string, any> = this.player.annualStats ?? {};
    const year = this.time.currentTime.getFullYear();
    const lines: string[] = [];
    for (const y of Object.keys(stats).sort()) {
      const s = stats[y];
      lines.push(`• ${y}: earned $${(s.earned ?? 0).toLocaleString()}, spent $${(s.spent ?? 0).toLocaleString()}, ${s.citiesVisited ?? 0} cities, ${s.shiftsWorked ?? 0} shifts, ${s.milestonesHit ?? 0} achievements`);
    }
    const curEarned = this.player.taxAnnualIncome ?? 0;
    const curSpent = this.player.annualSpentAccum ?? 0;
    lines.push(`• ${year} (running): earned $${curEarned.toLocaleString()}, spent $${curSpent.toLocaleString()}, ${(this.player.visitedCities ?? []).length} cities, ${this.player.workDaysCompleted ?? 0} shifts, ${this.achievementEngine.exportSerializable().unlocked.length} achievements`);
    return { success: true, message: `📅 **Years in Review**\n${lines.join('\n')}\n\nYears with no data show as such — nothing here is invented.` };
  }

  // ---- §7 Gigs / overtime ----
  private gigsList(): GameAction {
    const lines = GIGS.map((g) => `• ${g.key} — $${g.pay}/${g.hours}h, -${GIG_ENERGY} energy, +${GIG_XP} ${g.skill} XP${g.key === 'rideshare' ? ' (requires a car, 30%+ condition)' : g.key === 'freelance' ? ' (requires tech or craftsmanship level 3+)' : ''}`).join('\n');
    return { success: true, message: `🛵 **Side Gigs** (no employer, paid immediately)\n${lines}\n\nStart one with "gig [type]". Hustle trait pays +20% gig pay.` };
  }

  private gigWork(rawArgs: string): GameAction {
    const key = rawArgs.trim().toLowerCase();
    const gig = GIGS.find((g) => g.key === key);
    if (!gig) return { success: false, message: 'Usage: gig [delivery|rideshare|freelance]. Type "gigs" to see the catalog.' };
    if (gig.key === 'rideshare') {
      const car = (this.player.vehicles ?? []).find((v: any) => (v.condition ?? 0) >= 30);
      if (!car) return { success: false, message: 'Rideshare needs a car in 30%+ condition. Buy or repair one first.' };
    }
    if (gig.key === 'freelance') {
      const tech = this.player.skills?.['tech']?.level ?? 1;
      const craft = this.player.skills?.['craftsmanship']?.level ?? 1;
      if (tech < 3 && craft < 3) return { success: false, message: 'Freelance needs tech or craftsmanship level 3+.' };
    }
    if ((this.player.energy ?? 0) < GIG_ENERGY) return { success: false, message: `You're too tired for a gig (need ${GIG_ENERGY} energy). Rest first.` };
    const hustle = (this.player.traits ?? []).includes('hustle');
    const pay = hustle ? roundCents(gig.pay * 1.2) : gig.pay;
    this.player.money = roundCents((this.player.money ?? 0) + pay);
    this.trackTaxIncome(pay);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - GIG_ENERGY);
    this.time.advance({ hours: gig.hours, minutes: 0 });
    const skill = gig.key === 'freelance'
      ? ((this.player.skills?.['tech']?.level ?? 1) >= (this.player.skills?.['craftsmanship']?.level ?? 1) ? 'tech' : 'craftsmanship')
      : gig.skill;
    const lvlMsg = this.addSkillXP(skill, GIG_XP);
    if (gig.key === 'rideshare') {
      const car = (this.player.vehicles ?? []).find((v: any) => (v.condition ?? 0) >= 30);
      if (car) car.condition = Math.max(0, (car.condition ?? 100) - 1);
    }
    return {
      success: true,
      message: `🛵 ${gig.label} gig done (${gig.hours}h): +$${pay}${hustle ? ' (Hustle +20%)' : ''}, +${GIG_XP} ${skill} XP.${lvlMsg}`,
      challengeContributions: { earnings: pay },
    };
  }

  private overtimeWork(): GameAction {
    if (!this.player.job) return { success: false, message: 'Overtime is for the employed — apply for a job first ("apply").' };
    if ((this.player.energy ?? 0) < 35) return { success: false, message: 'You\'re too exhausted for overtime (need 35 energy). Rest first.' };
    const hourlyRate = this.player.job.hourlyPay || (this.player.job.basePay / 2080);
    const pay = roundCents(hourlyRate * OVERTIME_HOURS * OVERTIME_MULTIPLIER);
    this.player.money = roundCents((this.player.money ?? 0) + pay);
    this.trackTaxIncome(pay);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - 35);
    this.time.advance({ hours: OVERTIME_HOURS, minutes: 0 });
    const prevShifts = this.player.workDaysCompleted || 0;
    this.player.workDaysCompleted = prevShifts + 1;
    const note = this.careerMilestoneNote(prevShifts, this.player.workDaysCompleted);
    return {
      success: true,
      message: `💼 Overtime shift (8h at 1.5×): +$${pay.toFixed(2)}. Counts as a shift for tenure and promotion.${note}`,
      challengeContributions: { earnings: pay, shifts: 1 },
    };
  }

  // ---- §8 Savings / loans ----
  private savingsView(): GameAction {
    const goals: any[] = this.player.savingsGoals ?? [];
    const lines = goals.length === 0
      ? 'No savings goals yet.'
      : goals.map((g) => `• ${g.name} — $${(g.progress ?? 0).toLocaleString()} / $${g.target.toLocaleString()}${g.progress >= g.target ? ' ✅ GOAL REACHED' : ''}`).join('\n');
    return {
      success: true,
      message: `💰 **Savings**\nBank balance: $${(this.player.bankBalance ?? 0).toLocaleString()} (earns 0.5%/month)\nGoals:\n${lines}\n\nCommands: savings goal [name] [amount] | savings deposit [amount] | savings deposit [goal] [amount]`,
    };
  }

  private savingsGoal(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    const amount = Number(parts[parts.length - 1]);
    const name = parts.slice(0, -1).join(' ');
    if (!name || !amount || amount <= 0) return { success: false, message: 'Usage: savings goal [name] [amount] (amount must be positive).' };
    const goals: any[] = this.player.savingsGoals ?? [];
    if (goals.filter((g) => g.progress < g.target).length >= MAX_SAVINGS_GOALS) {
      return { success: false, message: `You already have ${MAX_SAVINGS_GOALS} open savings goals — the maximum.` };
    }
    if (!Array.isArray(this.player.savingsGoals)) this.player.savingsGoals = [];
    this.player.savingsGoals.push({ name, target: amount, progress: 0 });
    return { success: true, message: `💰 Savings goal "${name}" set: $${amount.toLocaleString()}. Money stays in your bank balance and earns the same 0.5%/month — the goal just tracks progress.` };
  }

  private savingsDeposit(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    let amount: number;
    let goalName: string | null = null;
    if (parts.length >= 2) {
      goalName = parts.slice(0, -1).join(' ');
      amount = Number(parts[parts.length - 1]);
    } else {
      amount = Number(parts[0]);
    }
    if (!amount || amount <= 0) return { success: false, message: 'Usage: savings deposit [amount] or savings deposit [goal] [amount].' };
    if ((this.player.money ?? 0) < amount) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} cash — not enough for a $${amount.toLocaleString()} deposit.` };
    this.player.money = roundCents((this.player.money ?? 0) - amount);
    this.player.bankBalance = roundCents((this.player.bankBalance ?? 0) + amount);
    const goals: any[] = this.player.savingsGoals ?? [];
    let target = goalName ? goals.find((g) => g.name.toLowerCase() === goalName!.toLowerCase() && g.progress < g.target) : undefined;
    if (!target) target = [...goals].reverse().find((g) => g.progress < g.target);
    let note = '';
    if (target) {
      target.progress = roundCents((target.progress ?? 0) + amount);
      if (target.progress >= target.target) {
        appendJournalLog(this.player, this.time.formatDate(), `Savings goal reached: ${target.name} ($${target.target.toLocaleString()})!`);
        note = ` 🎉 Goal "${target.name}" reached!`;
      }
    }
    return { success: true, message: `💰 Deposited $${amount.toLocaleString()} to the bank (balance $${this.player.bankBalance.toLocaleString()}).${note}` };
  }

  private loansView(): GameAction {
    const balance = this.player.loanBalance ?? 0;
    const credit = this.player.credit ?? CREDIT_START;
    const cap = loanCap(credit);
    const payment = balance > 0 ? loanMonthlyPayment(balance) : 0;
    return {
      success: true,
      message: `💳 **Loans**\nOutstanding balance: $${balance.toLocaleString()}\nCredit: ${credit}/100 (loan cap: $${cap.toLocaleString()})\nMonthly payment: $${payment.toLocaleString()} (10% of balance, min $25; interest 2%/month)\n\nCommands: loan [amount] | loan pay [amount]`,
    };
  }

  private loanBorrow(rawArgs: string): GameAction {
    const amount = Number(rawArgs.trim());
    if (!amount || amount <= 0) return { success: false, message: 'Usage: loan [amount].' };
    const credit = this.player.credit ?? CREDIT_START;
    const cap = loanCap(credit);
    const balance = this.player.loanBalance ?? 0;
    if (balance + amount > cap) {
      return { success: false, message: `Your loan cap is $${cap.toLocaleString()} (credit ${credit}). You already owe $${balance.toLocaleString()} — you can borrow at most $${(cap - balance).toLocaleString()} more.` };
    }
    this.player.loanBalance = roundCents(balance + amount);
    this.player.money = roundCents((this.player.money ?? 0) + amount);
    return { success: true, message: `💳 Borrowed $${amount.toLocaleString()}. Cash in hand now; the balance accrues 2%/month and is repaid at $${loanMonthlyPayment(this.player.loanBalance).toLocaleString()}/month. Borrowed cash is debt, not income.` };
  }

  private loanPay(rawArgs: string): GameAction {
    const amount = Number(rawArgs.trim());
    const balance = this.player.loanBalance ?? 0;
    if (balance <= 0) return { success: false, message: 'You have no outstanding loan balance.' };
    if (!amount || amount <= 0) return { success: false, message: 'Usage: loan pay [amount].' };
    if ((this.player.money ?? 0) < amount) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} cash — not enough to pay $${amount.toLocaleString()}.` };
    const paid = Math.min(amount, balance);
    this.player.money = roundCents((this.player.money ?? 0) - paid);
    this.player.loanBalance = roundCents(balance - paid);
    this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + paid;
    return { success: true, message: `💳 Paid $${paid.toLocaleString()} toward your loan. Remaining balance: $${this.player.loanBalance.toLocaleString()}.` };
  }

  // ---- §10 Life hard + §34 living (one system of record) ----
  private hardmodeView(): GameAction {
    const on = !!this.player.hardMode;
    const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
    return {
      success: true,
      message: `🧱 **Life Hard Mode: ${on ? 'ON' : 'OFF'}**\n${on ? `Living costs are charged at 1.5× (base $${living.base.toLocaleString()} → surcharge $${living.surcharge.toLocaleString()} + asset lines $${living.assetSurcharge.toLocaleString()} = $${living.total.toLocaleString()}/mo). Shortfalls become hard debt (stress +10, happiness −5).` : 'Off by default — nothing changes unless you opt in.'}\n\nRules when ON: monthly living costs (housing, food, utilities, transport) × 1.5, plus $50/property and $30/vehicle asset lines. Shortfalls become hard debt — never arrest, never seizure, never compounding.\n\nCommands: hardmode on | hardmode off | bills | bills pay [amount|all]`,
    };
  }

  private hardmodeSet(on: boolean): GameAction {
    this.player.hardMode = on;
    if (on) {
      return { success: true, message: `🧱 Life Hard Mode ENABLED.\n\nFull rules: every monthly tick charges living costs (housing, food, utilities, transport — see "living") at 1.5×, plus $50 per owned property and $30 per owned vehicle. If cash is short, the shortfall becomes hard debt (no compounding, no arrest, no seizure), with +10 stress and −5 happiness that month. Pay debt with "bills pay [amount|all]".` };
    }
    return { success: true, message: `🧱 Life Hard Mode OFF. Future living costs return to the normal rate. Any existing hard debt remains until you pay it ("bills pay").` };
  }

  private billsView(): GameAction {
    const debt = this.player.hardDebt ?? 0;
    const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
    if (!this.player.hardMode) {
      return { success: true, message: `🧾 **Bills**\nLife Hard Mode is OFF — no hard bills are due.\nHard debt outstanding: $${debt.toLocaleString()}${debt > 0 ? '\nPay it with "bills pay [amount|all]".' : ''}\n\nNormal living costs (see "living"): $${living.base.toLocaleString()}/mo.` };
    }
    return {
      success: true,
      message: `🧾 **Bills (hard mode)**\nNext month's living total: $${living.total.toLocaleString()}\n  Base living: $${living.base.toLocaleString()} (housing $${living.housing.toLocaleString()}, food $${living.food.toLocaleString()}, utilities $${living.utilities.toLocaleString()}, transport $${living.transport.toLocaleString()})\n  Pressure surcharge (×1.5): +$${living.surcharge.toLocaleString()}\n  Asset lines: +$${living.assetSurcharge.toLocaleString()} ($50/property, $30/vehicle)\nHard debt outstanding: $${debt.toLocaleString()}\n\nPay debt with "bills pay [amount|all]" (never overpays into a void).`,
    };
  }

  private billsPay(rawArgs: string): GameAction {
    const debt = this.player.hardDebt ?? 0;
    if (debt <= 0) return { success: false, message: 'You have no hard debt to pay.' };
    const arg = rawArgs.trim().toLowerCase();
    const amount = arg === 'all' ? debt : Number(arg);
    if (!amount || amount <= 0) return { success: false, message: 'Usage: bills pay [amount|all].' };
    const paid = Math.min(amount, debt);
    if ((this.player.money ?? 0) < paid) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} cash — not enough to pay $${paid.toLocaleString()} of hard debt.` };
    this.player.money = roundCents((this.player.money ?? 0) - paid);
    this.player.hardDebt = roundCents(debt - paid);
    this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + paid;
    return { success: true, message: `🧾 Paid $${paid.toLocaleString()} of hard debt. Remaining: $${this.player.hardDebt.toLocaleString()}.` };
  }

  private livingView(): GameAction {
    const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
    const cash = this.player.money ?? 0;
    const warns: string[] = [];
    if (cash < 2 * living.total) warns.push(`⚠️ Warning: your cash ($${cash.toLocaleString()}) covers less than 2 months of estimated living costs ($${living.total.toLocaleString()}/mo).`);
    const grace = (this.player.livingTicksCharged ?? 0) < 2;
    return {
      success: true,
      message: `🏠 **Living Expenses — ${cityDisplay(this.player.city)}**\nCity cost multiplier: ${living.multiplier}× (economic index ${economicIndexForCity(this.player.city)})\nHousehold size: ${living.members}\n  Housing: $${living.housing.toLocaleString()}/mo (${(this.player.properties ?? []).length > 0 ? 'homeowner upkeep' : 'basic rent'})\n  Food: $${living.food.toLocaleString()}/mo\n  Utilities: $${living.utilities.toLocaleString()}/mo\n  Transport: $${living.transport.toLocaleString()}/mo\nEstimated next month: $${living.base.toLocaleString()}${this.player.hardMode ? ` (hard mode total: $${living.total.toLocaleString()} with surcharge + asset lines — see "bills")` : ''}${grace ? `\n🕊️ Grace period: your first 2 monthly ticks carry no living costs.` : ''}${warns.length ? `\n${warns.join('\n')}` : ''}`,
    };
  }

  // ---- §12 Character ----
  private backgroundsList(): GameAction {
    const lines = BACKGROUNDS.map((b: any) => {
      const bonusText = b.bonuses.map((x: any) => `${x.stat} +${x.value}`).join(', ');
      return `• ${b.name} — starts with $${b.startingMoney}${bonusText ? ` (${bonusText})` : ''} — ${b.description}`;
    }).join('\n');
    const traitLines = Object.entries(TRAIT_NAMES).map(([id, name]) => {
      const bonuses = TRAIT_BONUSES[id] ?? [];
      const text = bonuses.map((b: any) => b.cash ? `cash +$${b.cash}` : `${b.stat} ${b.value > 0 ? '+' : ''}${b.value}`).join(', ');
      return `• ${name} — starting bonus: ${text}${id === 'hustle' ? ' (plus +20% gig pay, the one ongoing trait hook)' : ' (a recorded identity choice)'}`;
    }).join('\n');
    return {
      success: true,
      message: `🎭 **Backgrounds**\n${lines}\n\n**Traits** (one at creation):\n${traitLines}`,
    };
  }

  private renameCharacter(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name || !/^[A-Za-z ]+$/.test(name)) return { success: false, message: 'Usage: name [first name] — letters and spaces only, no empty names.' };
    const old = this.player.name;
    this.player.name = name;
    return { success: true, message: `✏️ Renamed: ${old} → ${name}.` };
  }

  // ---- §14 Legacy ----
  private legacyBonusLine(): string {
    const count = this.player.legacyCount ?? 0;
    return `Next life's starting money bonus: +$${legacyBonus(count)} ($100 × ${Math.min(count, 5)} retired lives, capped at $500).`;
  }

  private retirePreview(): GameAction {
    const years = this.player.ageYears ?? 18;
    const cities = (this.player.visitedCities ?? []).length;
    const wealth = this.calculateNetWorth();
    const achievements = this.achievementEngine.exportSerializable().unlocked.length;
    const estate = this.estateDistribution();
    const will = this.player.will ?? {};
    const classes = Object.keys(will.bequests ?? {}).length;
    const hasWill = Boolean(will.heir || classes > 0);
    const willExtra = hasWill ? 50 * Math.min(4, classes) + (this.willHeirIsFamily() ? 50 : 0) : 0;
    const combined = Math.min(500, legacyBonus((this.player.legacyCount ?? 0) + 1) + willExtra);
    const willLine = hasWill
      ? `\nWill bonus: +$${willExtra} (${classes} asset class${classes === 1 ? '' : 'es'} bequeathed${this.willHeirIsFamily() ? ', family heir' : ''}) → combined next-life bonus +$${combined} (global cap $500).`
      : `\nNo will: next-life bonus is the §14 base (+$${legacyBonus((this.player.legacyCount ?? 0) + 1)}).`;
    return {
      success: true,
      message: `🕊️ **Retire — preview**\nName: ${this.player.name}\nYears lived: ${years}\nCities visited: ${cities}\nWealth: $${wealth.toLocaleString()}\nAchievements: ${achievements}\nEstate total: $${estate.total.toLocaleString()}${willLine}\n\n${this.legacyBonusLine()}\n\nNothing changes on preview. Type "retire confirm" to retire — your life is archived and a fresh life begins (keeping only your legacy record). The will executes ONLY on retirement; there is no death mechanic.`,
    };
  }

  private retireConfirm(): GameAction {
    const years = this.player.ageYears ?? 18;
    const cities = (this.player.visitedCities ?? []).length;
    const wealth = this.calculateNetWorth();
    const achievements = this.achievementEngine.exportSerializable().unlocked.length;
    const year = this.time.currentTime.getFullYear();
    // §37: estate + will bonus computed BEFORE the reset, from live state.
    const estate = this.estateDistribution();
    const will = this.player.will ?? {};
    const classes = Object.keys(will.bequests ?? {}).length;
    const hasWill = Boolean(will.heir || classes > 0);
    const willExtra = hasWill ? 50 * Math.min(4, classes) + (this.willHeirIsFamily() ? 50 : 0) : 0;
    if (!Array.isArray(this.player.legacy)) this.player.legacy = [];
    this.player.legacy.push({ name: this.player.name, years, cities, wealth, achievements, retiredYear: year, distribution: { total: estate.total, lines: estate.lines, perBusiness: estate.perBusiness } });
    this.player.legacyCount = (this.player.legacyCount ?? 0) + 1;
    const prevBackground = this.player.background;
    const fresh = this.initPlayer();
    const keptLegacy = this.player.legacy;
    const keptCount = this.player.legacyCount;
    this.player = fresh as any;
    this.player.legacy = keptLegacy;
    this.player.legacyCount = keptCount;
    this.player.background = prevBackground;
    this.player.name = 'Traveler';
    const bonus = Math.min(500, legacyBonus(keptCount) + willExtra);
    // §14: next life starts at the BACKGROUND's starting money + bonus —
    // not initPlayer's flat $500 (a working_class retiree would otherwise
    // gain $100 of base money on every retirement).
    const bg = BACKGROUNDS.find((b) => b.id === prevBackground);
    const baseMoney = bg ? bg.startingMoney : (this.player.money ?? 0);
    this.player.money = roundCents(baseMoney + bonus);
    appendJournalLog(this.player, this.time.formatDate(), `A new life begins. Legacy bonus: +$${bonus}.`);
    return { success: true, message: `🕊️ Retired. Your life is archived in "legacy". A fresh life begins as Traveler (background kept, legacy bonus +$${bonus} applied). Estate $${estate.total.toLocaleString()} was recorded${hasWill ? ' and distributed per your will' : ' (no will on file)'}. Rename with "name [first name]".` };
  }

  private legacyView(): GameAction {
    const lives: any[] = this.player.legacy ?? [];
    const lines = lives.length === 0
      ? 'No retired lives yet.'
      : lives.map((l) => `• ${l.name} — ${l.years} years, ${l.cities} cities, $${(l.wealth ?? 0).toLocaleString()}, ${l.achievements} achievements (retired ${l.retiredYear})`).join('\n');
    return {
      success: true,
      message: `🕊️ **Legacy**\n${lines}\n\n${this.legacyBonusLine()}`,
    };
  }

  // ---- §15 Challenge ----
  private challengeView(): GameAction {
    const wk = weekKeyFromDate(this.time.formatDate());
    const goal = challengeGoalForWeek(wk);
    const contrib = this.player.challengeWeek === wk ? (this.player.challengeContribution ?? 0) : 0;
    const unit = goal.type === 'earnings' ? '$' : '';
    return {
      success: true,
      message: `🏆 **Community Challenge — this week**\nGoal: ${goal.label} (community-wide, same goal for every player this week)\nYour contribution this week: ${unit}${contrib.toLocaleString()} / ${unit}${goal.threshold.toLocaleString()} to qualify\n\nHow to contribute: ${goal.type === 'earnings' ? 'work shifts, gigs, and overtime add cash earned' : goal.type === 'cities' ? 'travel or roadtrip to a city you haven\'t visited this week' : 'work shifts add 1 shift each'}\n\nHit the threshold and you receive +$${CHALLENGE_REWARD} at the next week rollover. Community totals and top contributors live on the Leaderboard screen.`,
    };
  }

  // ---- §16 Newspaper ----
  private newsView(rawArgs = ''): GameAction {
    // v0.108.24 item 8: category views from real state only. Bare
    // "news" keeps the .20 paper exactly; a category token filters it.
    const cat = rawArgs.trim().toLowerCase();
    if (cat === 'world' || (NEWS_CATEGORIES as readonly string[]).includes(cat)) {
      const weekKey = weekKeyFromDate(this.time.formatDate());
      const w = getWeather(this.time.currentTime, this.player.city);
      const ctx: any = {
        player: this.player,
        monthKey: this.monthKeyNow(),
        currentCity: this.player.city,
        npcs: this.social.getAllNPCs(),
        cities: Object.keys(WORLD_CITIES),
        events: worldEventsThisWeek(weekKey),
        weatherByCity: { [this.player.city]: { temp: w.temp, condition: w.condition } },
        companies: groupCompanies(ALL_JOBS),
        races: [],
        championship: null,
        gymSessions: this.player.gymSessions ?? 0,
        openings: [],
      };
      const heads = cat === 'world' ? generateAllCategoryHeadlines(ctx) : generateCategoryHeadlines(cat as any, ctx);
      if (heads.length === 0) {
        return { success: true, message: `📰 **${cat === 'world' ? 'World' : cat[0]!.toUpperCase() + cat.slice(1)} News — ${this.time.formatDate()}**\nNo ${cat} news right now. (Empty categories say so plainly — nothing is invented.)\n\nFull paper: "news". Categories: news [celebrity|crime|stocks|sports|politics|city|world].` };
      }
      const lines = heads.map((h) => `• ${h.text}`).join('\n');
      return { success: true, message: `📰 **${cat === 'world' ? 'World' : cat[0]!.toUpperCase() + cat.slice(1)} News — ${this.time.formatDate()}**\n${lines}\n\nFull paper: "news".` };
    }
    if (cat) return { success: false, message: `Unknown news category "${cat}". Categories: celebrity, crime, stocks, sports, politics, city, world — or bare "news" for the full paper.` };
    const weekKey = weekKeyFromDate(this.time.formatDate());
    const events = worldEventsThisWeek(weekKey);
    const eventLines = events.length === 0 ? 'No world events this week.' : events.map((e) => `• ${e.label} — ${cityDisplay(e.city)} (${e.activity})`).join('\n');
    const inv = (this.player.investments ?? []).map((i: any) => `• ${i.name}: $${(i.currentValue ?? 0).toLocaleString()}`).join('\n');
    const journal = (this.player.journalLog ?? []).slice(-5).map((j: any) => `• ${typeof j === 'string' ? j : (j.text ?? j.entry ?? '')}`).join('\n');
    const goal = challengeGoalForWeek(weekKey);
    return {
      success: true,
      message: `📰 **The Open World Daily — ${this.time.formatDate()}**\n\n**This week's world events:**\n${eventLines}\n\n**Market (your investments):**\n${inv || 'No investments yet.'}\n\n**Milestones (recent journal):**\n${journal || 'Nothing recorded yet.'}\n\n**Community challenge this week:** ${goal.label}\n\n(Community top 3 is appended by the client from the leaderboard when reachable — never invented.)`,
    };
  }

  // ---- §21 Workplace ----
  private workplaceView(): GameAction {
    if (!this.player.job) return { success: false, message: 'You\'re unemployed — workplace details come with a job. Type "apply" to see openings.' };
    const event = workplaceEventForDay(String(this.player.job.employer ?? ''), this.time.formatDate());
    const eventText = event.kind === 'team_lunch' ? 'Team lunch (+5 happiness, free)'
      : event.kind === 'deadline' ? 'Deadline week (+15% shift pay, +5 stress)'
      : event.kind === 'review' ? 'Review day (performance 70+ → +$50 bonus; reviews reward, never punish)'
      : 'Quiet day (no effect)';
    const pending = this.player.pendingShift ?? 'morning';
    const preferred = this.player.preferredShift ?? 'morning';
    return {
      success: true,
      message: `🏢 **Workplace — ${this.player.job.title} @ ${this.player.job.employer}**\nToday's event: ${eventText}\nShift chosen for next work: ${pending} (preferred: ${preferred})\n\nShift options (apply to the next "work" only, then reset to morning):\n• shift morning — normal pay, −35 energy\n• shift evening — +10% pay, −40 energy\n• shift night — +20% pay, −45 energy, +5 stress\n• shift weekend — +15% pay, −40 energy, +2 stress (Saturday/Sunday only)\n• shift split — normal pay, −30 energy, +3 happiness\n• shift oncall — +10% pay, −35 energy, +5 stress\n• shift prefer [shift|none] — persistent preference when no one-shot shift is set\n\nWork activities: task | mentor [name] | meeting | breakroom | report | cover [name]\n\nCommands: shift [key] | shift prefer [key|none] | coworkers | lunch [name]`,
    };
  }

  private shiftSet(rawArgs: string): GameAction {
    const args = rawArgs.trim().toLowerCase();
    // v0.108.26: persistent shift preference — used only when no one-shot
    // shift is set; the one-shot always wins.
    if (args === 'prefer') {
      const pref = this.player.preferredShift ?? 'morning';
      return { success: true, message: `📌 Preferred shift: ${pref}. It applies when no one-shot shift is set (a one-shot "shift [key]" always wins). Change with "shift prefer [morning|evening|night|weekend|split|oncall|none]".` };
    }
    if (args.startsWith('prefer ')) {
      const want = args.slice('prefer '.length).trim();
      if (want === 'none') {
        this.player.preferredShift = undefined;
        return { success: true, message: '📌 Preferred shift cleared — work defaults to morning unless a one-shot shift is set.' };
      }
      if (!SHIFTS[want]) return { success: false, message: 'Usage: shift prefer [morning|evening|night|weekend|split|oncall|none].' };
      if (!this.player.job) return { success: false, message: 'You\'re unemployed — shifts come with a job. Type "apply" to see openings.' };
      this.player.preferredShift = want;
      return { success: true, message: `📌 Preferred shift set to ${want}. It applies to every "work" until you set a one-shot shift or clear it.` };
    }
    const key = args;
    if (!SHIFTS[key]) return { success: false, message: 'Usage: shift [morning|evening|night|weekend|split|oncall] or shift prefer [shift|none].' };
    if (!this.player.job) return { success: false, message: 'You\'re unemployed — shifts come with a job. Type "apply" to see openings.' };
    // v0.108.26: weekend shifts are validated ONLY at set time — work()
    // applies whatever pending shift was set, even if midnight crossed.
    if (key === 'weekend') {
      const dow = this.time.currentTime.getDay();
      if (dow !== 0 && dow !== 6) return { success: false, message: 'Weekend shifts run Saturday and Sunday only — today is a weekday. Pick morning, evening, or night instead.' };
    }
    this.player.pendingShift = key;
    const def = SHIFTS[key];
    return { success: true, message: `🌙 Shift set to ${key}: pay ×${def.payMult}, −${def.energy} energy${def.stress ? `, +${def.stress} stress` : ''}${def.happy ? `, +${def.happy} happiness` : ''}. Applies to your next "work" only, then resets to morning.` };
  }

  private coworkersList(): GameAction {
    if (!this.player.job) return { success: false, message: 'You\'re unemployed — coworkers come with a job. Type "apply" to see openings.' };
    // §21: coworkers work WHERE THE PLAYER WORKS — the job's city and
    // district, not the player's current district. The player-district
    // fallback applies only when the job record itself carries no district
    // (fallback JOB_MARKET jobs have none); it must never admit NPCs from
    // a different district than the job's.
    const jobCity = (this.player.job as any).city ?? this.player.city;
    const jobDistrict = (this.player.job as any).district ?? this.player.district;
    const keywords = coworkerKeywords((this.player.job as any).category ?? '', (this.player.job as any).tier ?? '');
    const matches = this.social.getNPCByCity(jobCity).filter((n: any) => {
      if (n.district !== jobDistrict) return false;
      const role = String(n.role ?? '').toLowerCase();
      return keywords.length === 0 ? true : keywords.some((k: string) => role.includes(k));
    });
    if (matches.length === 0) return { success: true, message: `👥 **Coworkers**\nNo roster coworkers match your job's district and role family right now. (Coworkers are never invented — when nobody matches, the list is empty.)` };
    const lines = matches.map((n: any) => `• ${n.name} — ${n.role} (${n.district})`).join('\n');
    return { success: true, message: `👥 **Coworkers at ${this.player.job.employer}**\n${lines}\n\nShare a workday meal with "lunch [name]" (1h, $15, +3 relationship, +5 happiness).` };
  }

  private lunchWith(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Lunch with whom? Usage: lunch [name] — must be a coworker (see "coworkers").' };
    if (!this.player.job) return { success: false, message: 'You\'re unemployed — lunch is a workday meal with a coworker. Type "apply" to see openings.' };
    const jobCity = (this.player.job as any).city ?? this.player.city;
    const jobDistrict = (this.player.job as any).district ?? this.player.district;
    const keywords = coworkerKeywords((this.player.job as any).category ?? '', (this.player.job as any).tier ?? '');
    const pool = this.social.getNPCByCity(jobCity).filter((n: any) => {
      if (n.district !== jobDistrict) return false;
      const role = String(n.role ?? '').toLowerCase();
      return keywords.length === 0 ? true : keywords.some((k: string) => role.includes(k));
    });
    const resolved = resolveNamed(pool, name, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple coworkers match "${name}": ${resolved.ambiguous.join(', ')}. Type "lunch [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `"${name}" isn't one of your coworkers. Type "coworkers" to see who is — lunch is for coworkers only (hangout is the off-duty version).` };
    if ((this.player.money ?? 0) < LUNCH_COST) return { success: false, message: `Lunch costs $${LUNCH_COST}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - LUNCH_COST);
    this.time.advance({ hours: LUNCH_HOURS, minutes: 0 });
    const rel = this.ensureRel(npc);
    rel.value = Math.min(100, (rel.value ?? 0) + LUNCH_REL);
    npc.relationship = rel.value;
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + LUNCH_HAPPY);
    return { success: true, message: `🍱 Lunch with ${npc.name} (1h, $${LUNCH_COST}): +${LUNCH_REL} relationship, +${LUNCH_HAPPY} happiness.` };
  }

  // ---- v0.108.26 — DEEPER WORKING ACTIVITIES ----
  // Shared guards: every activity needs a job and refuses while
  // incarcerated; every activity is once per game-day (activityDates).
  private workActivityGuard(): string | null {
    if (!this.player.job) return 'You don\'t have a job. Type "apply" to see openings.';
    if (this.player.incarcerated) return 'Work activities wait until you\'re out — prison work is the on-duty option while incarcerated.';
    return null;
  }

  private activityDoneToday(key: string): boolean {
    if (!this.player.activityDates) this.player.activityDates = {};
    return this.player.activityDates[key] === this.time.formatDate();
  }

  private markActivityDone(key: string): void {
    if (!this.player.activityDates) this.player.activityDates = {};
    this.player.activityDates[key] = this.time.formatDate();
  }

  // Same roster pool as lunch: job city + district + role family.
  // Coworkers are never invented — an empty pool refuses plainly.
  private coworkerPool(): any[] {
    const jobCity = (this.player.job as any).city ?? this.player.city;
    const jobDistrict = (this.player.job as any).district ?? this.player.district;
    const keywords = coworkerKeywords((this.player.job as any).category ?? '', (this.player.job as any).tier ?? '');
    return this.social.getNPCByCity(jobCity).filter((n: any) => {
      if (n.district !== jobDistrict) return false;
      const role = String(n.role ?? '').toLowerCase();
      return keywords.length === 0 ? true : keywords.some((k: string) => role.includes(k));
    });
  }

  private resolveCoworker(name: string): { npc: any | null; ambiguous: string[] | null } {
    const pool = this.coworkerPool();
    const resolved = resolveNamed(pool, name, (n) => n.name);
    return { npc: resolved.item ?? null, ambiguous: resolved.ambiguous ?? null };
  }

  private taskView(): GameAction {
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    const task = taskForDay(String(this.player.job.employer ?? ''), this.time.formatDate());
    const done = this.activityDoneToday('task');
    return { success: true, message: `📋 **Today's shift task**\n${task}${done ? '\n✅ Done today — a new task arrives tomorrow.' : '\nFinish it with "task complete" (1h, −5 energy, +$25, +10 job-skill XP).'}` };
  }

  private taskComplete(): GameAction {
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    if (this.activityDoneToday('task')) return { success: false, message: 'Today\'s task is already done — a new one arrives tomorrow.' };
    if ((this.player.energy ?? 0) < TASK_ENERGY) return { success: false, message: `Too tired for the task (need ${TASK_ENERGY} energy). Rest first.` };
    const task = taskForDay(String(this.player.job.employer ?? ''), this.time.formatDate());
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - TASK_ENERGY);
    this.time.advance({ hours: TASK_HOURS, minutes: 0 });
    this.player.money = roundCents((this.player.money ?? 0) + TASK_BONUS);
    this.trackTaxIncome(TASK_BONUS);
    const lvlMsg = this.addSkillXP(this.player.job.skill || 'charisma', TASK_SKILL_XP);
    this.markActivityDone('task');
    return { success: true, message: `✅ Task done: ${task} (1h, −${TASK_ENERGY} energy, +$${TASK_BONUS}).${lvlMsg}` };
  }

  private mentorView(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Mentor whom? Usage: mentor [name] — must be a coworker (see "coworkers").' };
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    const { npc, ambiguous } = this.resolveCoworker(name);
    if (ambiguous) return { success: false, message: `Multiple coworkers match "${name}": ${ambiguous.join(', ')}. Type "mentor [full name]".` };
    if (!npc) return { success: false, message: `"${name}" isn't one of your coworkers. Type "coworkers" to see who is.` };
    if (this.activityDoneToday('mentor')) return { success: false, message: 'You already mentored someone today — again tomorrow.' };
    if ((this.player.energy ?? 0) < MENTOR_ENERGY) return { success: false, message: `Too tired to mentor (need ${MENTOR_ENERGY} energy). Rest first.` };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - MENTOR_ENERGY);
    this.time.advance({ hours: MENTOR_HOURS, minutes: 0 });
    const rel = this.ensureRel(npc);
    rel.value = Math.min(100, (rel.value ?? 0) + MENTOR_REL);
    npc.relationship = rel.value;
    this.player.reputation.professional = Math.min(100, (this.player.reputation?.professional ?? 0) + MENTOR_PRO_REP);
    this.markActivityDone('mentor');
    return { success: true, message: `🤝 Mentored ${npc.name} (1h, −${MENTOR_ENERGY} energy): +${MENTOR_REL} relationship, +${MENTOR_PRO_REP} professional reputation.` };
  }

  private meetingView(): GameAction {
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    if (this.activityDoneToday('meeting')) return { success: false, message: 'You already sat in today\'s team meeting — again tomorrow.' };
    if ((this.player.energy ?? 0) < MEETING_ENERGY) return { success: false, message: `Too tired for a meeting (need ${MEETING_ENERGY} energy). Rest first.` };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - MEETING_ENERGY);
    this.time.advance({ hours: MEETING_HOURS, minutes: 0 });
    const lvlMsg = this.addSkillXP(this.player.job.skill || 'charisma', MEETING_SKILL_XP);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + MEETING_HAPPY);
    this.markActivityDone('meeting');
    return { success: true, message: `🗣️ Team meeting (1h, −${MEETING_ENERGY} energy): +${MEETING_SKILL_XP} job-skill XP, +${MEETING_HAPPY} happiness.${lvlMsg}` };
  }

  private breakroomView(): GameAction {
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    if (this.activityDoneToday('breakroom')) return { success: false, message: 'You already took your break today — again tomorrow.' };
    this.time.advance({ hours: BREAKROOM_HOURS, minutes: 0 });
    this.player.energy = Math.min(100, (this.player.energy ?? 0) + BREAKROOM_ENERGY);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + BREAKROOM_HAPPY);
    this.markActivityDone('breakroom');
    return { success: true, message: `☕ Break room (1h): +${BREAKROOM_ENERGY} energy, +${BREAKROOM_HAPPY} happiness.` };
  }

  private reportView(): GameAction {
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    if (this.activityDoneToday('report')) return { success: false, message: 'You already filed today\'s report — again tomorrow.' };
    if ((this.player.energy ?? 0) < REPORT_ENERGY) return { success: false, message: `Too tired to file a report (need ${REPORT_ENERGY} energy). Rest first.` };
    const track = this.emergencyTrack();
    const label = track ? 'Incident report' : 'Shift report';
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - REPORT_ENERGY);
    this.time.advance({ hours: REPORT_HOURS, minutes: 0 });
    this.player.reputation.professional = Math.min(100, (this.player.reputation?.professional ?? 0) + REPORT_PRO_REP);
    const lvlMsg = this.addSkillXP(this.player.job.skill || 'charisma', REPORT_SKILL_XP);
    this.markActivityDone('report');
    return { success: true, message: `📝 ${label} filed (1h, −${REPORT_ENERGY} energy): +${REPORT_PRO_REP} professional reputation, +${REPORT_SKILL_XP} job-skill XP.${lvlMsg}` };
  }

  private coverView(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Cover for whom? Usage: cover [name] — must be a coworker (see "coworkers").' };
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    const { npc, ambiguous } = this.resolveCoworker(name);
    if (ambiguous) return { success: false, message: `Multiple coworkers match "${name}": ${ambiguous.join(', ')}. Type "cover [full name]".` };
    if (!npc) return { success: false, message: `"${name}" isn't one of your coworkers. Type "coworkers" to see who is.` };
    if (this.activityDoneToday('cover')) return { success: false, message: 'You already covered a shift today — again tomorrow.' };
    if ((this.player.energy ?? 0) < COVER_ENERGY) return { success: false, message: `Too tired to cover a shift (need ${COVER_ENERGY} energy). Rest first.` };
    const hourlyRate = (this.player.job as any).hourlyPay || ((this.player.job as any).basePay / 2080);
    const pay = roundCents(hourlyRate * COVER_HOURS);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - COVER_ENERGY);
    this.time.advance({ hours: COVER_HOURS, minutes: 0 });
    this.player.money = roundCents((this.player.money ?? 0) + pay);
    this.trackTaxIncome(pay);
    const rel = this.ensureRel(npc);
    rel.value = Math.min(100, (rel.value ?? 0) + COVER_REL);
    npc.relationship = rel.value;
    this.markActivityDone('cover');
    return { success: true, message: `💪 Covered ${npc.name}'s shift (4h, −${COVER_ENERGY} energy, +$${pay.toFixed(2)} at base rate, +${COVER_REL} relationship). Covering is a bonus activity — it does not count toward tenure or promotion.` };
  }

  // The player's emergency ladder track, if any (Cadet and every rung
  // above it qualify — membership comes from the .24 ladder tables).
  private emergencyTrack(): 'police' | 'fire' | 'ems' | null {
    const jobId = this.jobIdOf();
    for (const t of ['police', 'fire', 'ems'] as const) {
      if (rankFor(t, jobId)) return t;
    }
    return null;
  }

  // Emergency-track activities: generic wording only, no real-department
  // claims, no invented NPCs (ride-along is a solo generic rotation).
  private emergencyActivity(kind: string): GameAction {
    const defs: Record<string, { track: string; label: string; emoji: string; energy: number; cash: number; xp: number; happy: number }> = {
      patrol: { track: 'police', label: 'Patrol', emoji: '🚓', energy: EMERG_ENERGY, cash: EMERG_BONUS, xp: EMERG_SKILL_XP, happy: 0 },
      drill: { track: 'fire', label: 'Station drill', emoji: '🚒', energy: EMERG_ENERGY, cash: EMERG_BONUS, xp: EMERG_SKILL_XP, happy: 0 },
      respond: { track: 'ems', label: 'Call response', emoji: '🚑', energy: EMERG_ENERGY, cash: EMERG_BONUS, xp: EMERG_SKILL_XP, happy: 0 },
      training: { track: 'any', label: 'Training', emoji: '🎓', energy: EMERG_ENERGY, cash: 0, xp: TRAINING_SKILL_XP, happy: 0 },
      ridealong: { track: 'any', label: 'Ride-along', emoji: '🚗', energy: RIDEALONG_ENERGY, cash: 0, xp: RIDEALONG_SKILL_XP, happy: RIDEALONG_HAPPY },
    };
    const def = defs[kind];
    if (!def) return { success: false, message: 'Usage: patrol | drill | respond | training | ridealong.' };
    const g = this.workActivityGuard(); if (g) return { success: false, message: g };
    const track = this.emergencyTrack();
    if (!track) return { success: false, message: 'Emergency activities need an emergency-services job — see "careers [police|fire|ems]" for the ladders.' };
    if (def.track !== 'any' && def.track !== track) {
      const want = def.track === 'ems' ? 'EMS' : def.track;
      const have = track === 'ems' ? 'EMS' : track;
      return { success: false, message: `${def.label} is a ${want} activity — you're on the ${have} track.` };
    }
    if (this.activityDoneToday(kind)) return { success: false, message: `You already did ${def.label.toLowerCase()} today — again tomorrow.` };
    if ((this.player.energy ?? 0) < def.energy) return { success: false, message: `Too tired (need ${def.energy} energy). Rest first.` };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - def.energy);
    this.time.advance({ hours: EMERG_HOURS, minutes: 0 });
    let cashNote = '';
    if (def.cash > 0) {
      this.player.money = roundCents((this.player.money ?? 0) + def.cash);
      this.trackTaxIncome(def.cash);
      cashNote = `, +$${def.cash}`;
    }
    const skill = this.player.job.skill || 'charisma';
    const lvlMsg = this.addSkillXP(skill, def.xp);
    if (def.happy) this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + def.happy);
    this.markActivityDone(kind);
    return { success: true, message: `${def.emoji} ${def.label} (2h, −${def.energy} energy${cashNote}, +${def.xp} ${skill} XP${def.happy ? `, +${def.happy} happiness` : ''}).${lvlMsg}` };
  }

  // ---- §22 Citizens ----
  private citizensView(): GameAction {
    const hour = this.time.getHour();
    const dow = this.time.currentTime.getDay();
    const here = this.social.getNPCByLocation(this.player.district, hour, dow);
    const cityData = (WORLD_CITIES as Record<string, any>)[this.player.city];
    const districtData = (WORLD_DISTRICTS as Record<string, any>)[this.player.district];
    const activity = crowdActivity((districtData as any)?.jobTypes ?? [], this.time.getTimeOfDay());
    const safety = needWordSafety(districtData?.crimeRate ?? 50);
    const prosperity = needWordProsperity(cityData?.economicIndex ?? 50);
    const spirit = needWordSpirit(districtData?.communityRepBonus ?? 0);
    const helped = (this.player.districtHelp ?? {})[this.player.district] ?? 0;
    const sizeWord = here.length === 0 ? 'quiet' : here.length < 3 ? 'a few people' : here.length < 6 ? 'a crowd' : 'a big crowd';
    const lines = here.length === 0 ? 'Nobody from the roster is scheduled here right now.' : here.map((n: any) => `• ${n.name} — ${n.role}`).join('\n');
    return {
      success: true,
      message: `🏙️ **${this.player.district} right now** (${sizeWord} around)\nCrowd activity: ${activity}\nDistrict needs: safety ${safety} · prosperity ${prosperity} · community spirit ${spirit}\nThis district has seen ${helped} volunteer shift${helped === 1 ? '' : 's'}.\n\n${lines}\n\nTalk to anyone here with "talk [name]". Give back with "volunteer" (2h, +5 community rep, +3 happiness, −10 energy).`,
    };
  }

  private volunteerWork(): GameAction {
    if ((this.player.energy ?? 0) < VOLUNTEER_ENERGY) return { success: false, message: `You're too tired to volunteer (need ${VOLUNTEER_ENERGY} energy). Rest first.` };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - VOLUNTEER_ENERGY);
    this.time.advance({ hours: VOLUNTEER_HOURS, minutes: 0 });
    this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + VOLUNTEER_REP);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + VOLUNTEER_HAPPY);
    if (!this.player.districtHelp) this.player.districtHelp = {};
    this.player.districtHelp[this.player.district] = (this.player.districtHelp[this.player.district] ?? 0) + 1;
    return { success: true, message: `🤝 Volunteered in ${this.player.district} (2h): +${VOLUNTEER_REP} community reputation, +${VOLUNTEER_HAPPY} happiness, −${VOLUNTEER_ENERGY} energy. This district has now seen ${this.player.districtHelp[this.player.district]} volunteer shift${this.player.districtHelp[this.player.district] === 1 ? '' : 's'}.` };
  }

  // ---- §23 Fame ----
  // v0.108.25 (§76): studio credit + copyright — same wording as the
  // main menu footer and the About screen.
  private aboutView(): GameAction {
    return {
      success: true,
      message: `🎮 **About THE OPEN WORLD**\n\nTHE OPEN WORLD is a text life simulation game on Reddit — build a life, city by city, choice by choice.\n\nPublished by Avok Interactive.\nCopyright © 2026 Avok Interactive. All Rights Reserved.`,
    };
  }

  private fameView(): GameAction {
    const unlocked = this.achievementEngine.exportSerializable().unlocked.length;
    const score = fameScore(this.player, unlocked);
    const net = specNetWorth(this.player);
    const wTier = wealthTier(net);
    const tierCount = wealthTierCount(net);
    const exec = this.player.job && String((this.player.job as any).tier ?? '').toLowerCase() === 'executive';
    const lines: string[] = [];
    lines.push(`Achievements: +${unlocked * 2} (${unlocked} unlocked)`);
    if (tierCount > 0) lines.push(`Net-worth tiers: +${tierCount * 10} (${tierCount} reached)`);
    if (exec) lines.push('Executive job tier: +10');
    const pmRaw: any = this.player.passportMilestones ?? 0;
    const pmCount = Array.isArray(pmRaw) ? pmRaw.length : pmRaw;
    lines.push(`Passport milestones: +${pmCount * 5}`);
    lines.push(`Challenge payouts: +${(this.player.challengePayouts ?? 0) * 2}`);
    return {
      success: true,
      message: `⭐ **Fame — ${score}/100**\nWealth tier: ${wTier} (net worth $${net.toLocaleString()} — Comfortable $25k · Wealthy $100k · Elite $250k)\nSources:\n${lines.map((l) => `• ${l}`).join('\n')}\n\nUnlocks: 25+ local recognition in "status" · 50+ gala events in "events" · 75+ elite circles line + elite NPC recognition greetings\nFame is displayed, never spent.`,
    };
  }

  // ---- §24 Companies ----
  private companyLookup(name: string): any | null {
    const companies = groupCompanies(ALL_JOBS);
    const q = name.toLowerCase().trim();
    return companies.find((c: any) => c.employer.toLowerCase() === q)
      ?? companies.find((c: any) => c.employer.toLowerCase().includes(q))
      ?? null;
  }

  private companiesList(): GameAction {
    const companies = groupCompanies(ALL_JOBS);
    const monthKey = this.time.getMonthKey();
    const lines = companies.map((c: any) => {
      const perf = companyPerformance(c.employer, monthKey);
      return `• ${c.employer} — ${c.industry}, HQ ${cityDisplay(c.hqCity)}, ${c.size} (${c.employees} listings), this month: ${performanceWord(perf)}`;
    }).join('\n');
    const mine = this.playerCompanies();
    const mineSection = mine.length === 0
      ? 'Your companies: none yet — found one with "found [name]".'
      : `Your companies:\n${mine.map((c: any) => `• ${c.name} — ${c.industry}, HQ ${cityDisplay(c.hqCity)}, ${((c.employees ?? []).length)} employees, status: ${c.status ?? 'active'}`).join('\n')}`;
    return { success: true, message: `🏢 **Companies (${companies.length})** — world entities you observe and climb in, plus companies you found and run yourself\n${mineSection}\n\nWorld companies:\n${lines}\n\nDetail with "company [name]". Size: Small <5 listings · Mid 5–14 · Large 15+. Performance is deterministic per month, not random. Found your own with "found [name]" ($${FOUNDING_COST.toLocaleString()}); see yours with "mycompanies".` };
  }

  // ---- §51 Companies: founding + running (player companies) ----
  private playerCompanies(): any[] {
    if (!Array.isArray(this.player.playerCompanies)) this.player.playerCompanies = [];
    return this.player.playerCompanies;
  }

  private findPlayerCompany(rawArgs: string): { company?: any; rest?: string } {
    const mine = this.playerCompanies();
    const arg = rawArgs.trim();
    // Longest-name-prefix match first (player company names are
    // free-form, so first-token matching alone misfires on them).
    const sorted = [...mine].sort((a, b) => String(b.name).length - String(a.name).length);
    for (const c of sorted) {
      if (arg.toLowerCase().startsWith(String(c.name).toLowerCase())) {
        return { company: c, rest: arg.slice(String(c.name).length).trim() };
      }
    }
    const resolved = resolveNamed(mine, arg, (c: any) => c.name);
    if (resolved.item) return { company: resolved.item, rest: '' };
    // First-token fallback, mirroring findOwnedBusiness.
    const first = arg.split(/\s+/)[0] ?? '';
    const byFirst = mine.find((c: any) => String(c.name).toLowerCase().includes(first.toLowerCase()));
    if (byFirst) return { company: byFirst, rest: arg.split(/\s+/).slice(1).join(' ') };
    return {};
  }

  private foundCompany(rawArgs: string): GameAction {
    const arg = rawArgs.trim();
    if (!arg) return { success: false, message: `Usage: found [company name] or found [company name] in [industry]. Founding costs $${FOUNDING_COST.toLocaleString()} cash. Industries: ${COMPANY_INDUSTRIES.join(', ')}.` };
    let name = arg;
    let industry = 'General Services';
    const inSplit = arg.split(/\s+in\s+/i);
    if (inSplit.length > 1) {
      name = inSplit.slice(0, -1).join(' in ').trim();
      const ind = (inSplit[inSplit.length - 1] ?? '').trim();
      const matched = COMPANY_INDUSTRIES.find((i) => i.toLowerCase() === ind.toLowerCase());
      if (!matched) return { success: false, message: `"${ind}" is not an industry. Industries: ${COMPANY_INDUSTRIES.join(', ')}.` };
      industry = matched;
    }
    if (!/^[A-Za-z][A-Za-z0-9 '&.-]*$/.test(name)) return { success: false, message: 'Company names use letters, numbers, spaces, and & \' . - only, starting with a letter.' };
    if (this.player.incarcerated) return { success: false, message: 'You can\'t found a company while incarcerated.' };
    if (this.playerCompanies().some((c: any) => String(c.name).toLowerCase() === name.toLowerCase())) {
      return { success: false, message: `You already have a company named ${name}. Pick a different name.` };
    }
    if ((this.player.money ?? 0) < FOUNDING_COST) {
      return { success: false, message: `${name} costs $${FOUNDING_COST.toLocaleString()} to found. Down payments and founding costs come from cash on hand only — bank savings do not count. You have $${(this.player.money ?? 0).toLocaleString()} cash (+ $${(this.player.bankBalance ?? 0).toLocaleString()} in bank). Use "withdraw [amount]" to move bank money to cash, then found.` };
    }
    this.player.money = roundCents((this.player.money ?? 0) - FOUNDING_COST);
    const company: any = {
      id: `pco_${Date.now()}`,
      name, industry, hqCity: this.player.city,
      foundedMonthKey: this.time.getMonthKey(),
      status: 'active', employees: [], debt: 0, badMonths: 0,
      lastNet: 0, totalProfit: 0,
    };
    this.playerCompanies().push(company);
    appendJournalLog(this.player, this.time.formatDate(), `Founded ${name} (${industry}) in ${cityDisplay(this.player.city)} for $${FOUNDING_COST.toLocaleString()}.`);
    return { success: true, message: `🏢 You founded ${name} (${industry}, HQ ${cityDisplay(this.player.city)}) for $${FOUNDING_COST.toLocaleString()}! The founding cost is sunk — no refund on closure. Hire with "company hire ${name} [npc]" (up to ${COMPANY_MAX_EMPLOYEES} employees, $${COMPANY_WAGE_PER_EMPLOYEE}/mo each + $${COMPANY_OVERHEAD}/mo overhead). Revenue each month: ($300 + $150 × employees) × performance (Thriving 1.2 · Steady 1.0 · Struggling 0.8). See it with "company ${name}".` };
  }

  private myCompaniesView(): GameAction {
    const mine = this.playerCompanies();
    if (mine.length === 0) return { success: true, message: '🏢 You have founded no companies yet. Found one with "found [name]" ($5,000 cash).' };
    const monthKey = this.time.getMonthKey();
    const lines = mine.map((c: any) => {
      const perf = c.status === 'active' ? performanceWord(companyPerformance(c.id, monthKey)) : '—';
      const emps = (c.employees ?? []).map((e: any) => e.name).join(', ') || 'none';
      return `• ${c.name} — ${c.industry}, HQ ${cityDisplay(c.hqCity)}, status: ${c.status ?? 'active'}\n  Employees (${(c.employees ?? []).length}/${COMPANY_MAX_EMPLOYEES}): ${emps}\n  Last month net: $${(c.lastNet ?? 0).toLocaleString()} · Debt: $${(c.debt ?? 0).toLocaleString()} · Bad months: ${c.badMonths ?? 0} · This month: ${perf}`;
    }).join('\n\n');
    return { success: true, message: `🏢 **Your Companies**\n${lines}\n\nCommands: found [name] | company hire [company] [npc] | company fire [company] [npc] | company close [name] | company [name] for detail.` };
  }

  private playerCompanyDetail(c: any): GameAction {
    const monthKey = this.time.getMonthKey();
    const hist = c.status === 'active' ? [0, 1, 2].map((back) => {
      const k = addMonthsToKey(monthKey, -back);
      const p = companyPerformance(c.id, k);
      return `${k}: ${performanceWord(p)} (${p})`;
    }).join('\n') : 'Closed — no performance history.';
    const emps = (c.employees ?? []).length === 0
      ? 'No employees yet.'
      : (c.employees ?? []).map((e: any) => `• ${e.name} — $${COMPANY_WAGE_PER_EMPLOYEE}/mo`).join('\n');
    return {
      success: true,
      message: `🏢 **${c.name}** (YOUR company)\nIndustry: ${c.industry}\nHQ: ${cityDisplay(c.hqCity)} · Founded: ${c.foundedMonthKey} · Status: ${c.status ?? 'active'}\nEmployees (${(c.employees ?? []).length}/${COMPANY_MAX_EMPLOYEES}):\n${emps}\nLast month net: $${(c.lastNet ?? 0).toLocaleString()} · Total profit: $${(c.totalProfit ?? 0).toLocaleString()} · Debt: $${(c.debt ?? 0).toLocaleString()} · Bad months (debt > $${COMPANY_DEBT_FAILURE_THRESHOLD.toLocaleString()}): ${c.badMonths ?? 0}/2 — two in a row closes the company.\nPerformance history:\n${hist}\n\nCommands: company hire ${c.name} [npc] | company fire ${c.name} [npc]${c.status === 'active' ? ` | company close ${c.name}` : ''}`,
    };
  }

  private companyHire(rawArgs: string): GameAction {
    const found = this.findPlayerCompany(rawArgs);
    if (!found.company) return { success: false, message: `No company of yours matches "${rawArgs}". Type "mycompanies" to see yours.` };
    const c = found.company;
    const npcName = found.rest ?? '';
    if (c.status !== 'active') return { success: false, message: `${c.name} is ${c.status} — closed companies do not hire.` };
    if (!npcName) return { success: false, message: `Usage: company hire ${c.name} [npc name].` };
    if (this.player.incarcerated) return { success: false, message: 'You can\'t hire while incarcerated.' };
    if ((c.employees ?? []).length >= COMPANY_MAX_EMPLOYEES) return { success: false, message: `${c.name} already has ${COMPANY_MAX_EMPLOYEES} employees — the cap.` };
    const resolved = resolveNamed(this.social.getAllNPCs(), npcName, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${npcName}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${npcName}" is on the roster.` };
    for (const other of ownedBusinesses(this.player)) {
      if ((other as any).staff?.some((s: any) => s.npcId === npc.id)) {
        return { success: false, message: `${npc.name} already works at your ${(other as any).name} — one employer per NPC.` };
      }
    }
    for (const other of this.playerCompanies()) {
      if (other !== c && (other.employees ?? []).some((e: any) => e.npcId === npc.id)) {
        return { success: false, message: `${npc.name} already works at your ${other.name} — one employer per NPC.` };
      }
    }
    c.employees.push({ npcId: npc.id, name: npc.name });
    return { success: true, message: `🏢 Hired ${npc.name} at ${c.name} ($${COMPANY_WAGE_PER_EMPLOYEE}/mo wage, charged in the monthly tick). ${c.employees.length}/${COMPANY_MAX_EMPLOYEES} employees.` };
  }

  private companyFire(rawArgs: string): GameAction {
    const found = this.findPlayerCompany(rawArgs);
    if (!found.company) return { success: false, message: `No company of yours matches "${rawArgs}". Type "mycompanies" to see yours.` };
    const c = found.company;
    const npcName = found.rest ?? '';
    if (!npcName) return { success: false, message: `Usage: company fire ${c.name} [npc name].` };
    const emps: any[] = c.employees ?? [];
    const target = emps.find((e: any) => e.name.toLowerCase().includes(npcName.toLowerCase()));
    if (!target) return { success: false, message: `${npcName} doesn't work at ${c.name}. Type "company ${c.name}" to see its employees.` };
    c.employees = emps.filter((e: any) => e !== target);
    return { success: true, message: `🏢 Fired ${target.name} from ${c.name}. Free and immediate — no severance.` };
  }

  private companyClose(rawArgs: string): GameAction {
    const found = this.findPlayerCompany(rawArgs);
    if (!found.company) return { success: false, message: `No company of yours matches "${rawArgs}". Type "mycompanies" to see yours.` };
    const c = found.company;
    if (c.status !== 'active') return { success: false, message: `${c.name} is already ${c.status}.` };
    c.status = 'closed';
    const released = (c.employees ?? []).length;
    c.employees = [];
    appendJournalLog(this.player, this.time.formatDate(), `Closed ${c.name} voluntarily. ${released} employee(s) released.`);
    return { success: true, message: `🏢 Closed ${c.name}. ${released} employee(s) released. No proceeds — the founding cost was sunk. Closed companies stay listed in "mycompanies" as history and are never revived.` };
  }

  private companyTick(month: string): { line: string; totalNet: number } {
    let totalNet = 0;
    const parts: string[] = [];
    for (const c of this.playerCompanies()) {
      if (c.status !== 'active') continue;
      const n = (c.employees ?? []).length;
      const perf = companyPerformance(c.id, month);
      const { revenue, expenses, net } = companyMonthlyTick(n, perf);
      c.lastNet = net;
      if (net > 0) {
        const debtPaid = Math.min(c.debt ?? 0, net);
        c.debt = roundCents((c.debt ?? 0) - debtPaid);
        const toCash = roundCents(net - debtPaid);
        this.player.money = roundCents((this.player.money ?? 0) + toCash);
        if (toCash > 0) this.trackTaxIncome(toCash);
        if (toCash > 0) c.totalProfit = roundCents((c.totalProfit ?? 0) + toCash);
        c.badMonths = 0;
        totalNet += toCash;
        parts.push(`${c.name} +$${toCash.toLocaleString()} net (revenue $${revenue.toLocaleString()}, expenses $${expenses.toLocaleString()}, ${performanceWord(perf)}${debtPaid > 0 ? `, $${debtPaid.toLocaleString()} of debt paid` : ''})`);
      } else {
        const loss = -net;
        const paid = Math.min(this.player.money ?? 0, loss);
        this.player.money = roundCents((this.player.money ?? 0) - paid);
        const short = roundCents(loss - paid);
        c.debt = roundCents((c.debt ?? 0) + short);
        totalNet -= paid;
        if ((c.debt ?? 0) > COMPANY_DEBT_FAILURE_THRESHOLD) {
          c.badMonths = (c.badMonths ?? 0) + 1;
        } else {
          c.badMonths = 0;
        }
        parts.push(`${c.name} -$${paid.toLocaleString()} net (revenue $${revenue.toLocaleString()}, expenses $${expenses.toLocaleString()}, ${performanceWord(perf)}${short > 0 ? `, $${short.toLocaleString()} to company debt (now $${(c.debt ?? 0).toLocaleString()})` : ''})`);
        if ((c.badMonths ?? 0) >= COMPANY_DEBT_FAILURE_MONTHS) {
          const released = (c.employees ?? []).length;
          c.status = 'closed';
          c.employees = [];
          c.debt = 0;
          c.badMonths = 0;
          appendJournalLog(this.player, this.time.formatDate(), `${c.name} FAILED after ${COMPANY_DEBT_FAILURE_MONTHS} consecutive months over $${COMPANY_DEBT_FAILURE_THRESHOLD.toLocaleString()} in debt. ${released} employee(s) released; debt died with the company.`);
          this.postNotice('City Court', `${c.name} has failed`, `${c.name} closed after ${COMPANY_DEBT_FAILURE_MONTHS} consecutive months over $${COMPANY_DEBT_FAILURE_THRESHOLD.toLocaleString()} in company debt. ${released} employee(s) released. The debt dies with the company — no further bill follows you — but the founding cost is lost.`);
          parts.push(`🏚️ ${c.name} FAILED (2 bad months — company closed, employees released)`);
        }
      }
    }
    return { line: parts.length > 0 ? `, 🏢 companies: ${parts.join('; ')}` : '', totalNet };
  }

  private companyDetail(rawArgs: string): GameAction {
    const arg = rawArgs.trim();
    const lower = arg.toLowerCase();
    if (lower.startsWith('hire ')) return this.companyHire(arg.slice(5));
    if (lower.startsWith('fire ')) return this.companyFire(arg.slice(5));
    if (lower.startsWith('close ')) return this.companyClose(arg.slice(6));
    if (!arg) return { success: false, message: 'Usage: company [name]. Type "companies" to see them all, "mycompanies" for yours.' };
    const mine = this.findPlayerCompany(arg);
    if (mine.company && !mine.rest) return this.playerCompanyDetail(mine.company);
    const c = this.companyLookup(arg);
    if (!c) return { success: false, message: `No company named "${arg}". Type "companies" to see them all.` };
    const monthKey = this.time.getMonthKey();
    const hist = [0, 1, 2].map((back) => {
      const k = addMonthsToKey(monthKey, -back);
      const p = companyPerformance(c.employer, k);
      return `${k}: ${performanceWord(p)} (${p})`;
    }).join('\n');
    const revenue = companyRevenue(c, this.time.currentTime.getFullYear());
    const openings = (ALL_JOBS as any[]).filter((j: any) => j.employer === c.employer).map((j: any) => `• ${j.title} — ${cityDisplay(j.city)} (${j.tier ?? 'entry'})`).join('\n');
    return {
      success: true,
      message: `🏢 **${c.employer}**\nIndustry: ${c.industry}\nHQ: ${cityDisplay(c.hqCity)}\nListings (employees proxy): ${c.employees} — size ${c.size}\nRevenue figure (display only): $${revenue.toLocaleString()}\nPerformance history:\n${hist}\n\nOpen jobs here:\n${openings || 'None listed right now.'}\n\nApply with "apply [job]". Reach executive tier here and you earn a monthly profit-share in the tick ($0–$200 by performance). Found your own company with "found [name]".`,
    };
  }

  // ---- §25 Stocks ----
  private stockPriceNow(employer: string): number {
    const companies = groupCompanies(ALL_JOBS);
    const c = companies.find((x: any) => x.employer === employer);
    if (!c) return 0;
    return stockPriceAt(c, this.time.getMonthKey());
  }

  private recomputeStockHoldings(): void {
    for (const inv of this.player.investments ?? []) {
      if ((inv as any).type === 'stock') {
        const price = this.stockPriceNow((inv as any).company);
        if (price > 0) inv.currentValue = roundCents(((inv as any).shares ?? 0) * price);
      }
    }
  }

  // ---- §57 ITEM 9 — INVESTMENT FOLDING ----
  // One line per asset, always. Fold key: stock holdings by company,
  // everything else by type + normalized name. Merging sums invested,
  // shares, and current value — so totals (and P/L) are unchanged by
  // the fold itself. Stock dividend display: same-month payouts sum,
  // otherwise the most recent month's payout is kept (a summed
  // cross-month figure would overstate one month's payout).
  private investmentFoldKey(i: any): string {
    if (i?.type === 'stock') return `stock:${String(i.company ?? i.name ?? '').toLowerCase()}`;
    return `${String(i?.type ?? '').toLowerCase()}:${String(i?.name ?? '').toLowerCase()}`;
  }

  private foldInvestmentPositions(): void {
    const list = this.player.investments ?? [];
    const merged: any[] = [];
    for (const inv of list) {
      const key = this.investmentFoldKey(inv);
      const ex = merged.find((m) => this.investmentFoldKey(m) === key);
      if (!ex) { merged.push(inv); continue; }
      ex.purchasePrice = roundCents((ex.purchasePrice ?? 0) + (inv.purchasePrice ?? 0));
      ex.shares = roundCents((ex.shares ?? 0) + (inv.shares ?? 0));
      // v0.108.22 (F18): a folded line's value is repriced from the
      // current market price x total shares — summing stored
      // currentValues mixed figures computed at different market
      // ticks, so P/L drifted until the next tick. Non-stock assets
      // have no deterministic price function, so they keep the sum
      // (unchanged behavior); stocks reprice here.
      if (ex.type === 'stock') {
        const price = this.stockPriceNow((ex as any).company);
        ex.currentValue = price > 0 ? roundCents((ex.shares ?? 0) * price) : roundCents((ex.currentValue ?? 0) + (inv.currentValue ?? 0));
      } else {
        ex.currentValue = roundCents((ex.currentValue ?? 0) + (inv.currentValue ?? 0));
      }
      if ((inv as any).lastDividend !== undefined) {
        if ((ex as any).dividendMonthKey === (inv as any).dividendMonthKey) {
          (ex as any).lastDividend = roundCents(((ex as any).lastDividend ?? 0) + (inv as any).lastDividend);
        } else if (((inv as any).dividendMonthKey ?? '') > ((ex as any).dividendMonthKey ?? '')) {
          (ex as any).lastDividend = (inv as any).lastDividend;
          (ex as any).dividendMonthKey = (inv as any).dividendMonthKey;
        }
      }
      if (typeof inv.purchasedAt === 'number' && typeof ex.purchasedAt === 'number') {
        ex.purchasedAt = Math.min(ex.purchasedAt, inv.purchasedAt);
      }
    }
    this.player.investments = merged;
  }

  private dividendsView(): GameAction {
    this.recomputeStockHoldings();
    const holdings = (this.player.investments ?? []).filter((i: any) => i.type === 'stock' && ((i as any).shares ?? 0) > 0);
    if (holdings.length === 0) {
      return { success: true, message: `📈 **Dividends**\nYou hold no stock, so no dividends are due. Every stock holding pays ${(DIVIDEND_MONTHLY_RATE * 100).toFixed(2)}% of its current value per game-month in the monthly tick (3% annualized, same rate for every company). Buy with "buy stock [name] [amount]".` };
    }
    const monthKey = this.time.getMonthKey();
    const lines = holdings.map((h: any) => {
      const price = this.stockPriceNow(h.company);
      const div = stockDividend(h.shares ?? 0, price);
      const last = h.lastDividend !== undefined ? `$${Number(h.lastDividend).toLocaleString()} (${h.dividendMonthKey ?? '—'})` : 'none yet';
      return `• ${h.company} — ${h.shares} shares @ $${price.toFixed(2)} = $${(h.currentValue ?? 0).toLocaleString()} → $${div.toLocaleString()}/mo · last payout: ${last}`;
    }).join('\n');
    return { success: true, message: `📈 **Dividends (${monthKey})** — ${(DIVIDEND_MONTHLY_RATE * 100).toFixed(2)}%/month on current value, paid in the monthly tick, taxed like other income.\n${lines}\n\nShares bought mid-month qualify at the next tick (no pro-rating, no back-pay). Sold shares stop paying the month after sale. No margin, no shorting, no leverage.` };
  }

  private voicemailsView(): GameAction {
    const vms = this.comm.getVoicemails();
    if (vms.length === 0) {
      return { success: true, message: '📞 No voicemails yet.' };
    }
    const list = vms.map((v: any) => {
      const listened = v.listened ? '✅' : '🔵';
      return `${listened} **${v.fromName || v.from}**: "${v.transcript}"`;
    }).join('\n');
    for (const v of vms) (v as any).listened = true;
    return { success: true, message: `📞 **Voicemails**\n${'─'.repeat(40)}\n${list}\n\nListed voicemails are marked as listened. Voicemails survive save → quit → reload, like mail.` };
  }

  private repricingView(): GameAction {
    const monthKey = this.time.getMonthKey();
    const props = this.player.properties ?? [];
    const lines = props.length === 0
      ? 'You own no properties yet.'
      : props.map((p: any) => {
        const lr = p.lastReprice;
        const cur = `now $${(p.currentValue ?? 0).toLocaleString()}`;
        if (!lr) return `• ${p.name} (${cityDisplay(p.city)}) — ${cur} · no repricing yet (first monthly tick will reprice it by that month's index move)`;
        if (lr.oldValue === lr.newValue) return `• ${p.name} (${cityDisplay(p.city)}) — ${cur} · last repricing ${lr.month}: no change (index ${lr.oldIndex} → ${lr.newIndex})`;
        return `• ${p.name} (${cityDisplay(p.city)}) — ${cur} · last repricing ${lr.month}: $${Number(lr.oldValue).toLocaleString()} → $${Number(lr.newValue).toLocaleString()} (housing index ${lr.oldIndex} → ${lr.newIndex})`;
      }).join('\n');
    const cityLines = [...new Set<string>(props.map((p: any) => p.city))].map((city: string) => {
      const idx = housingMarketIndex(city, monthKey);
      return `• ${cityDisplay(city)}: index ${idx} (${housingMarketTrend(city, monthKey)}) — a $100,000 catalog listing prices at $${Math.round(100000 * idx).toLocaleString()} here today`;
    }).join('\n');
    const curIdx = housingMarketIndex(this.player.city, monthKey);
    return { success: true, message: `🏠 **Repricing — ${monthKey}**\nOwned properties reprice in the monthly tick by the housing index move for their city (at most ~2%/month); listings on the market price at catalog × today's index. Nothing reprices silently — every change is named in the tick line.\n\n${lines}\n\nIndexes for your property cities:\n${cityLines || '—'}\n\nListings where you stand: ${cityDisplay(this.player.city)} index ${curIdx} — see "real-estate" for adjusted prices.` };
  }

  private stocksList(): GameAction {
    const companies = groupCompanies(ALL_JOBS);
    const monthKey = this.time.getMonthKey();
    const prevKey = addMonthsToKey(monthKey, -1);
    const lines = companies.map((c: any) => {
      const price = stockPriceAt(c, monthKey);
      const prev = stockPriceAt(c, prevKey);
      const chg = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      return `• ${c.employer} — $${price.toFixed(2)} (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% this month, ${performanceWord(companyPerformance(c.employer, monthKey))})`;
    }).join('\n');
    return { success: true, message: `📈 **World Stock Market**\n${lines}\n\nBuy with "buy stock [name] [$amount]" (dollars spent, fractional shares to cents). Sell with "sell stock [name] [shares|all]". Detail with "stock [name]". Indices with "index". Prices are deterministic per month — no stored series, no randomness. Losses are real.` };
  }

  private stockDetail(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Usage: stock [name]. Type "stocks" to see listed companies.' };
    const c = this.companyLookup(name);
    if (!c) return { success: false, message: `No listed company named "${name}". Type "stocks" to see them all.` };
    const monthKey = this.time.getMonthKey();
    const hist = [0, 1, 2].map((back) => {
      const k = addMonthsToKey(monthKey, -back);
      return `${k}: $${stockPriceAt(c, k).toFixed(2)} (${performanceWord(companyPerformance(c.employer, k))})`;
    }).join('\n');
    const held = (this.player.investments ?? []).find((i: any) => i.type === 'stock' && i.company === c.employer);
    const divLine = held
      ? `\nDividend: ${(DIVIDEND_MONTHLY_RATE * 100).toFixed(2)}%/mo on current value → $${stockDividend((held as any).shares ?? 0, stockPriceAt(c, monthKey)).toLocaleString()}/mo at this price${(held as any).lastDividend !== undefined ? ` · last payout $${Number((held as any).lastDividend).toLocaleString()} (${(held as any).dividendMonthKey ?? '—'})` : ' · no payout yet'}.`
      : '';
    return {
      success: true,
      message: `📈 **${c.employer}**\nPrice now: $${stockPriceAt(c, monthKey).toFixed(2)}\nHQ: ${cityDisplay(c.hqCity)} · Size: ${c.size} · Industry: ${c.industry}\nPrice history (last 3 game-months):\n${hist}\n${held ? `Your holding: ${(held as any).shares} shares, worth $${(held.currentValue ?? 0).toLocaleString()}.` : 'You hold no shares here.'}${divLine}`,
    };
  }

  private buyStock(rawArgs: string): GameAction {
    // v0.108.21 (§57): operate on the merged position (fold first, so a
    // legacy duplicate can never strand a second line beside the buy).
    this.foldInvestmentPositions();
    const parts = rawArgs.trim().split(/\s+/);
    const amount = Number(parts[parts.length - 1]);
    const name = parts.slice(0, -1).join(' ');
    if (!name || !amount || amount <= 0) return { success: false, message: 'Usage: buy stock [name] [amount in dollars].' };
    const c = this.companyLookup(name);
    if (!c) return { success: false, message: `No listed company named "${name}". Type "stocks" to see them all.` };
    if ((this.player.money ?? 0) < amount) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} cash — not enough for $${amount.toLocaleString()} of ${c.employer} stock.` };
    const price = stockPriceAt(c, this.time.getMonthKey());
    if (price <= 0) return { success: false, message: `No price available for ${c.employer} right now.` };
    const shares = Math.floor((amount / price) * 100) / 100;
    const spent = roundCents(shares * price);
    this.player.money = roundCents((this.player.money ?? 0) - spent);
    const existing = (this.player.investments ?? []).find((i: any) => i.type === 'stock' && i.company === c.employer);
    if (existing) {
      (existing as any).shares = roundCents(((existing as any).shares ?? 0) + shares);
      existing.purchasePrice = roundCents((existing.purchasePrice ?? 0) + spent);
      existing.currentValue = roundCents((existing as any).shares * price);
    } else {
      if (!Array.isArray(this.player.investments)) this.player.investments = [];
      this.player.investments.push({ name: c.employer, shares, buyPrice: price, purchasePrice: spent, currentValue: spent, type: 'stock', company: c.employer } as any);
    }
    return { success: true, message: `📈 Bought ${shares} shares of ${c.employer} at $${price.toFixed(2)}/share ($${spent.toLocaleString()} spent). Fractional shares to cents; no margin, no leverage.` };
  }

  private sellStock(rawArgs: string): GameAction {
    // v0.108.21 (§57): sells operate on the merged position.
    this.foldInvestmentPositions();
    const parts = rawArgs.trim().split(/\s+/);
    const last = parts[parts.length - 1]!.toLowerCase();
    const name = parts.slice(0, -1).join(' ');
    if (!name || !last) return { success: false, message: 'Usage: sell stock [name] [shares|all].' };
    const c = this.companyLookup(name);
    if (!c) return { success: false, message: `No listed company named "${name}". Type "stocks" to see them all.` };
    const held = (this.player.investments ?? []).find((i: any) => i.type === 'stock' && i.company === c.employer);
    if (!held) return { success: false, message: `You hold no ${c.employer} stock.` };
    const price = stockPriceAt(c, this.time.getMonthKey());
    const shares = last === 'all' ? ((held as any).shares ?? 0) : Number(last);
    if (!shares || shares <= 0) return { success: false, message: 'Usage: sell stock [name] [shares|all].' };
    if (shares > ((held as any).shares ?? 0) + 0.001) return { success: false, message: `You hold only ${(held as any).shares} shares of ${c.employer}.` };
    const proceeds = roundCents(shares * price);
    (held as any).shares = roundCents(((held as any).shares ?? 0) - shares);
    held.purchasePrice = roundCents(Math.max(0, (held.purchasePrice ?? 0) - proceeds));
    held.currentValue = roundCents((held as any).shares * price);
    this.player.money = roundCents((this.player.money ?? 0) + proceeds);
    if ((held as any).shares <= 0) {
      this.player.investments = (this.player.investments ?? []).filter((i: any) => i !== held);
    }
    return { success: true, message: `📈 Sold ${shares} shares of ${c.employer} at $${price.toFixed(2)}/share: +$${proceeds.toLocaleString()} cash. Proceeds come from price movement only — never minted.` };
  }

  private indexView(): GameAction {
    const companies = groupCompanies(ALL_JOBS);
    const monthKey = this.time.getMonthKey();
    const changes = companies.map((c: any) => stockMonthlyChange(c.employer, monthKey, c.hqCity));
    const world = changes.length ? changes.reduce((a: number, b: number) => a + b, 0) / changes.length : 0;
    const mid = companies.filter((c: any) => MID_SOUTH_CITIES.includes(c.hqCity));
    const midChanges = mid.map((c: any) => stockMonthlyChange(c.employer, monthKey, c.hqCity));
    const midAvg = midChanges.length ? midChanges.reduce((a: number, b: number) => a + b, 0) / midChanges.length : 0;
    const word = (v: number) => v >= 0 ? 'rising' : 'falling';
    return {
      success: true,
      message: `📊 **Market Indices (${monthKey})**\nWorld index: ${world >= 0 ? '+' : ''}${(world * 100).toFixed(2)}% avg monthly change (${word(world)}, ${companies.length} companies)\nMid-South index: ${midAvg >= 0 ? '+' : ''}${(midAvg * 100).toFixed(2)}% avg monthly change (${word(midAvg)}, ${mid.length} companies HQ'd in the Mid-South)\n\nIndices are computed averages of listed companies — never invented.`,
    };
  }

  // ---- §26 Business staff ----
  private staffedBusinessTick(monthKey: string): { net: number; wagesPaid: number; detail: string; quits: string[] } {
    // v0.108.20 §38: last month's net per business, for insurance claims.
    this.player.lastBusinessNets = {};
    let net = 0;
    let wagesPaid = 0;
    const parts: string[] = [];
    const quits: string[] = [];
    for (const b of ownedBusinesses(this.player)) {
      const staff: any[] = (b as any).staff ?? [];
      const base = (b as any).monthlyIncome ?? 0;
      if (staff.length === 0) {
        net = roundCents(net + base);
        this.player.lastBusinessNets[(b as any).id ?? b.name] = base;
        continue;
      }
      const startAvg = staff.reduce((sum: number, x: any) => sum + (x.morale ?? STAFF_MORALE_START), 0) / staff.length;
      const wages = staff.reduce((sum: number, x: any) => sum + (x.wage ?? 0), 0);
      let paid = 0;
      if ((this.player.money ?? 0) >= wages) {
        this.player.money = roundCents((this.player.money ?? 0) - wages);
        paid = wages;
        for (const x of staff) x.morale = Math.min(100, (x.morale ?? STAFF_MORALE_START) + STAFF_MORALE_PAID_GAIN);
      } else {
        for (const x of staff) x.morale = Math.max(0, (x.morale ?? STAFF_MORALE_START) - STAFF_MORALE_SHORT_LOSS);
      }
      wagesPaid = roundCents(wagesPaid + paid);
      const bizNet = staffedBusinessIncome(base, staff.length, startAvg, paid);
      this.player.lastBusinessNets[(b as any).id ?? b.name] = bizNet;
      net = roundCents(net + bizNet);
      parts.push(`${b.name}: wages $${paid}${paid < wages ? ' (short — wages unpaid, morale −15)' : ''} · morale mult ×${moraleMultiplier(startAvg)} · net $${bizNet}`);
      const quit = staff.filter((x: any) => (x.morale ?? 0) <= 0);
      for (const q of quit) quits.push(`${q.name} quit ${b.name} (morale 0)`);
      (b as any).staff = staff.filter((x: any) => (x.morale ?? 0) > 0);
    }
    return { net, wagesPaid, detail: parts.length ? ` (${parts.join('; ')})` : '', quits };
  }

  private findOwnedBusiness(rawArgs: string): { biz: any; rest: string } | null {
    const owned = ownedBusinesses(this.player);
    const lower = rawArgs.trim().toLowerCase();
    for (const b of owned) {
      const bn = String(b.name).toLowerCase();
      if (lower === bn) return { biz: b, rest: '' };
      if (lower.startsWith(bn + ' ')) return { biz: b, rest: rawArgs.trim().slice(b.name.length).trim() };
    }
    const first = lower.split(/\s+/)[0]!;
    const biz = owned.find((b: any) => String(b.name).toLowerCase().includes(first));
    if (biz) return { biz, rest: rawArgs.trim().split(/\s+/).slice(1).join(' ') };
    return null;
  }

  private hireStaff(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Usage: hire [business] [npc name].' };
    const owned = ownedBusinesses(this.player);
    const foundBiz = this.findOwnedBusiness(rawArgs);
    if (!foundBiz) return { success: false, message: `You don't own a business matching "${rawArgs}". Type "businesses" to see yours.` };
    const biz = foundBiz.biz;
    const npcName = foundBiz.rest;
    if (!npcName) return { success: false, message: 'Usage: hire [business] [npc name].' };
    if (this.player.incarcerated) return { success: false, message: 'You can\'t hire while incarcerated.' };
    const slots = staffSlotsFor((biz as any).type ?? (biz as any).key ?? biz.name);
    const staff: any[] = (biz as any).staff ?? [];
    if (staff.length >= slots) return { success: false, message: `${biz.name} has ${slots} staff slot${slots === 1 ? '' : 's'} — all filled.` };
    const resolved = resolveNamed(this.social.getAllNPCs(), npcName, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${npcName}": ${resolved.ambiguous.join(', ')}. Type "hire ${biz.name} [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${npcName}" is on the roster.` };
    for (const other of owned) {
      if ((other as any).staff?.some((s: any) => s.npcId === npc.id)) {
        return { success: false, message: `${npc.name} already works at your ${(other as any).name} — one business per NPC.` };
      }
    }
    const wage = staffWageFor((biz as any).monthlyIncome ?? 0);
    staff.push({ npcId: npc.id, name: npc.name, wage, morale: STAFF_MORALE_START, lastRaiseMonth: null });
    (biz as any).staff = staff;
    return { success: true, message: `👥 Hired ${npc.name} at ${biz.name} ($${wage}/mo, morale 50). Wages are deducted in the monthly tick; staffed income = base × (1 + 0.3 × staff) × morale multiplier − wages.` };
  }

  private fireStaff(rawArgs: string): GameAction {
    const foundBiz = this.findOwnedBusiness(rawArgs);
    if (!foundBiz) return { success: false, message: `You don't own a business matching "${rawArgs}".` };
    const biz = foundBiz.biz;
    const npcName = foundBiz.rest;
    if (!npcName) return { success: false, message: 'Usage: fire [business] [npc name].' };
    const staff: any[] = (biz as any).staff ?? [];
    const target = staff.find((s: any) => s.name.toLowerCase().includes(npcName.toLowerCase()));
    if (!target) return { success: false, message: `${npcName} doesn't work at ${biz.name}. Type "staff ${biz.name}" to see its staff.` };
    (biz as any).staff = staff.filter((s: any) => s !== target);
    return { success: true, message: `👥 Fired ${target.name} from ${biz.name}. Free and immediate — no severance.` };
  }

  private staffView(rawArgs: string): GameAction {
    const owned = ownedBusinesses(this.player);
    if (owned.length === 0) return { success: true, message: 'You own no businesses yet. Buy one with "buy business [name]".' };
    const name = rawArgs.trim();
    const list = name
      ? owned.filter((b: any) => b.name.toLowerCase().includes(name.toLowerCase()))
      : owned;
    if (list.length === 0) return { success: false, message: `You don't own a business named "${name}".` };
    const lines = list.map((b: any) => {
      const staff: any[] = b.staff ?? [];
      const slots = staffSlotsFor(b.type ?? b.key ?? b.name);
      const staffLines = staff.length === 0
        ? '  (no staff — pays the catalog base)'
        : staff.map((s: any) => `  • ${s.name} — $${s.wage}/mo, morale ${s.morale}`).join('\n');
      return `🏪 ${b.name} (${staff.length}/${slots} slots)\n${staffLines}`;
    }).join('\n\n');
    return { success: true, message: `👥 **Staff**\n${lines}\n\nCommands: hire [business] [npc] | fire [business] [npc] | raise [business] [npc]` };
  }

  private raiseStaff(rawArgs: string): GameAction {
    const foundBiz = this.findOwnedBusiness(rawArgs);
    if (!foundBiz) return { success: false, message: `You don't own a business matching "${rawArgs}".` };
    const biz = foundBiz.biz;
    const npcName = foundBiz.rest;
    if (!npcName) return { success: false, message: 'Usage: raise [business] [npc name].' };
    const staff: any[] = (biz as any).staff ?? [];
    const target = staff.find((s: any) => s.name.toLowerCase().includes(npcName.toLowerCase()));
    if (!target) return { success: false, message: `${npcName} doesn't work at ${biz.name}.` };
    const monthKey = this.time.getMonthKey();
    if (target.lastRaiseMonth === monthKey) {
      return { success: false, message: `You already raised ${target.name} this game-month. One raise per staff per game-month.` };
    }
    const gain = Math.max(RAISE_MIN_GAIN, Math.round(target.wage * 0.1));
    target.wage = target.wage + gain;
    target.morale = Math.min(100, (target.morale ?? 50) + RAISE_MORALE_GAIN);
    target.lastRaiseMonth = monthKey;
    return { success: true, message: `👥 Raised ${target.name} at ${biz.name}: wage +$${gain} (now $${target.wage}/mo), morale +${RAISE_MORALE_GAIN} (now ${target.morale}).` };
  }

  // ---- §27 Dialogue topics (template-only) ----
  private dialogueMemoryFor(npcId: string): any {
    if (!this.player.dialogueMemory) this.player.dialogueMemory = {};
    if (!this.player.dialogueMemory[npcId]) this.player.dialogueMemory[npcId] = { facts: {}, episodes: [], threads: [] };
    return this.player.dialogueMemory[npcId];
  }

  private memoryCallbackLine(npc: any): string | null {
    const mem = this.player.dialogueMemory?.[npc.id];
    if (!mem) return null;
    const ep = (mem.episodes ?? []).slice(-1)[0];
    if (ep?.kind === 'gift') return `Last time, ${ep.summary.toLowerCase()} — I still owe you one.`;
    if (mem.facts?.['questStarted']) return `Thanks again for the help with ${mem.facts['questStarted']}.`;
    if (mem.facts?.['lastTopic']) return `Last time you asked about my ${mem.facts['lastTopic']}…`;
    return null;
  }

  private topicsView(): GameAction {
    const conv = this.player.currentConversation;
    if (!conv) return { success: false, message: 'You\'re not in a conversation — talk to someone first ("talk [name]").' };
    const npc = this.social.getNPCById(conv.npcId);
    if (!npc) return { success: false, message: 'You\'re not in a conversation — talk to someone first ("talk [name]").' };
    const rel = this.ensureRel(npc);
    const value = rel.value ?? 0;
    const lines = DIALOGUE_TOPICS.map((t: any) => {
      const unlocked = value >= t.minRel;
      const special = t.partnerOnly && !rel.spouse;
      return `• ${t.key}${unlocked && !special ? '' : ` (locked — needs ${t.minRel}+${t.partnerOnly ? ' and Partner/Spouse' : ''})`}`;
    }).join('\n');
    return { success: true, message: `💬 **Topics with ${npc.name}** (relationship ${value})\n${lines}\n\nDiscuss one with "ask [topic]".` };
  }

  private askTopic(rawArgs: string): GameAction {
    const conv = this.player.currentConversation;
    if (!conv) return { success: false, message: 'You\'re not in a conversation — talk to someone first ("talk [name]").' };
    const npc = this.social.getNPCById(conv.npcId);
    if (!npc) return { success: false, message: 'You\'re not in a conversation — talk to someone first ("talk [name]").' };
    const q = rawArgs.trim().toLowerCase().replace(/_/g, ' ');
    if (!q) return { success: false, message: 'Ask about what? Type "topics" to see what this person can discuss.' };
    const matches = DIALOGUE_TOPICS.filter((t: any) => t.key === q || t.key.includes(q) || q.includes(t.key));
    if (matches.length === 0) return { success: false, message: `"${rawArgs}" isn't a topic here. Type "topics" to see what ${npc.name} can discuss.` };
    if (matches.length > 1) return { success: false, message: `Multiple topics match "${rawArgs}": ${matches.map((t: any) => t.key).join(', ')}. Type "ask [full topic]".` };
    const topic = matches[0]!;
    const rel = this.ensureRel(npc);
    const value = rel.value ?? 0;
    if (value < topic.minRel) {
      return { success: false, message: `"${topic.key}" is locked — it needs relationship ${topic.minRel}+ with ${npc.name} (you're at ${value}). Build the relationship first.` };
    }
    if (topic.partnerOnly && !rel.spouse) {
      return { success: false, message: `"future together" is only for your Partner or Spouse — ${npc.name} isn't either. (No fake romance lines here.)` };
    }
    const mood = String((npc as any).mood ?? 'neutral');
    const traits: string[] = (npc as any).personality ?? [];
    let body = '';
    switch (topic.key) {
      case 'greeting': body = (npc as any).greeting ?? `Hey, ${this.player.name}.`; break;
      case 'city': body = `I'm based in ${cityDisplay(npc.city)}, ${npc.district} district. It's home.`; break;
      case 'work': body = `I work as a ${npc.role}. ${npc.description ?? ''}`.trim(); break;
      case 'hometown': body = `Home for me is ${cityDisplay(npc.city)} — ${npc.description ?? 'it shaped who I am.'}`; break;
      case 'news': {
        const ev = worldEventsThisWeek(weekKeyFromDate(this.time.formatDate())).find((e: any) => e.city === npc.city);
        body = ev ? `Have you heard about ${ev.label} here in ${cityDisplay(npc.city)}? ${ev.activity} — that's the talk of the town.` : `Not much stirring in ${cityDisplay(npc.city)} this week, honestly.`;
        break;
      }
      case 'personal': body = `Personally? I'm ${traits.join(', ') || 'just me'}. ${npc.description ?? ''}`.trim(); break;
      case 'advice': {
        const district = (WORLD_DISTRICTS as Record<string, any>)[npc.district];
        const job = getJobsByCategory('entry').find((j: any) => j.location && j.location.includes(cityDisplay(npc.city).split(',')[0]!));
        body = job ? `If you're looking for work, there's a ${job.title} opening at ${job.employer} — worth a look.` : `You should spend time in ${district?.displayName ?? npc.district} — good people there.`;
        break;
      }
      case 'secret': body = `Between us… ${npc.description ?? 'I keep my cards close.'} (That's all I'm sharing — but you earned the confidence.)`; break;
      case 'future': body = `Looking ahead, I want to keep doing what I do as a ${npc.role} — and do it better. ${npc.description ?? ''}`.trim(); break;
      case 'future together': body = `With you? I see us building something steady — the kind of life you make together, day by day.`; break;
      default: body = npc.description ?? '';
    }
    // Mood/trait template variants (deterministic: same inputs → same line).
    if (mood === 'grumpy') body = `${body} (said tersely.)`;
    else if (mood === 'happy') body = `${body} (said warmly.)`;
    if (traits.includes('funny')) body = `${body} 😄`;
    const callback = this.memoryCallbackLine(npc);
    const mem = this.dialogueMemoryFor(npc.id);
    mem.facts['lastTopic'] = topic.key;
    mem.episodes.push({ at: this.time.formatDate(), kind: 'topic', summary: `You discussed ${topic.key}` });
    if (mem.episodes.length > 30) mem.episodes = mem.episodes.slice(-30);
    const convState: any = conv;
    const gained = Math.min(TOPIC_REL_CAP_PER_CONVERSATION - (convState.topicRelGained ?? 0), TOPIC_REL_GAIN);
    let outcomeNote = '';
    if (gained > 0) {
      rel.value = Math.min(100, (rel.value ?? 0) + gained);
      npc.relationship = rel.value;
      convState.topicRelGained = (convState.topicRelGained ?? 0) + gained;
      outcomeNote = ` (+${gained} relationship)`;
    }
    let questNote = '';
    const quests = (npc as any).quests ?? [];
    if (quests.length > 0 && !convState.questHookFired) {
      convState.questHookFired = true;
      questNote = `\n\n📜 ${npc.name} has something for you — type "quests" to see what's on offer.`;
    }
    let hospNote = '';
    if (value >= 75 && !convState.hospitalityFired) {
      convState.hospitalityFired = true;
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + HOSPITALITY_HAPPY);
      hospNote = `\n\n☕ ${npc.name} treats you — +${HOSPITALITY_HAPPY} happiness, on them.`;
    }
    return {
      success: true,
      message: `${callback ? `💭 ${callback}\n\n` : ''}${npc.name}: "${body}"${outcomeNote}${questNote}${hospNote}`,
    };
  }

  // ---- §28 Greeting line builder (deterministic, compositional) ----
  private buildGreetingLine(npc: any, rel: any, style: string, alreadyToday: boolean): string {
    const tod = this.time.getTimeOfDay();
    const timeWord = tod === 'night' ? 'Good evening' : `Good ${tod}`;
    const band = greetingTierBand(rel.value ?? 0, !!rel.spouse);
    const mood = String(npc.mood ?? 'neutral');
    const districtName = (WORLD_DISTRICTS as Record<string, any>)[npc.district]?.displayName ?? npc.district;
    const callback = this.memoryCallbackLine(npc);
    const fameNow = fameScore(this.player, this.achievementEngine.exportSerializable().unlocked.length);
    const eliteNote = fameNow >= 75 && isEliteNpc(npc) ? ` — and, I hear, you're someone around here now.` : '';
    const styleWord = style === 'respectful' ? 'Respectfully, ' : style === 'playful' ? 'Heh, ' : style === 'cool' ? '' : '';
    const base = style === 'cool'
      ? `${npc.name} gives a brief nod.`
      : `${styleWord}${timeWord}, ${this.player.name !== 'Traveler' ? this.player.name : 'stranger'}.`;
    const bandLine = band === 'stranger' ? ` I'm ${npc.name} — ${npc.role} here in ${districtName}.`
      : band === 'acquaintance' ? ` Good to see you around ${districtName}.`
      : band === 'friend' ? ` Always good running into you here.`
      : band === 'close' ? ` Hey, it's really good to see you.`
      : ` My love — good to see you.`;
    const moodLine = mood === 'grumpy' ? ' (They sound a bit gruff today.)' : mood === 'happy' ? ' (They beam.)' : '';
    const callbackLine = callback ? ` ${callback}` : '';
    return `${base}${bandLine}${moodLine}${eliteNote}${callbackLine}`;
  }

  // ---- §29 Mail read (shared by `read` and `email read`) ----
  private readEmail(id: string): GameAction {
    if (!id) return { success: false, message: 'Usage: read [id] — or "emails" to list your inbox.' };
    const email = this.comm.getEmailById(id);
    if (!email) return { success: false, message: 'Email not found.' };
    this.comm.markEmailRead(id);
    const kindLine = (email as any).kind && (email as any).kind !== 'letter' ? `\nKind: ${mailKindIcon((email as any).kind)} ${(email as any).kind}` : '';
    return {
      success: true,
      message: `📧 **${email.subject}**\n${'─'.repeat(40)}\nFrom: ${email.fromName || email.from}\nDate: ${new Date(email.timestamp).toLocaleString()}${kindLine}\n\n${email.body}`,
    };
  }

  private postNotice(fromName: string, subject: string, body: string): void {
    const email: any = this.comm.receiveEmail('city', fromName, subject, body);
    email.kind = 'notice';
  }

  // ---- §30 Mail hub / packages ----
  // v0.108.28: `mail` lists real mail items (id, kind, sender, subject,
  // read/unread), grouped by kind, with accurate unread counts — the
  // old counts-only view gave a player no way to actually check mail.
  // Listing never marks anything read; only opening an item does.
  // `mail [kind]` filters to one kind. Empty mailbox says so plainly.
  private mailView(filterArg = ''): GameAction {
    const all = this.comm.getEmails();
    const kindMap: Record<string, string> = {
      letter: 'letter', letters: 'letter',
      bill: 'bill', bills: 'bill',
      notice: 'notice', notices: 'notice',
      package: 'package', packages: 'package',
    };
    const filter = filterArg.trim().toLowerCase();
    if (filter && !kindMap[filter]) {
      return { success: false, message: 'Usage: mail [letters|bills|notices|packages] — bare "mail" lists all your mail.' };
    }
    const kind = filter ? kindMap[filter]! : null;
    const emails = kind ? all.filter((e: any) => (e.kind ?? 'letter') === kind) : all;
    if (emails.length === 0) {
      return {
        success: true,
        message: kind
          ? `📭 No ${filter} in your mail.`
          : '📭 No mail yet — nothing has arrived. When letters, bills, notices, or packages arrive, "mail" lists them here with their ids.',
      };
    }
    const unread = (list: any[]): number => list.filter((e) => !e.read).length;
    const kindLabel: Record<string, string> = { letter: 'Letters', bill: 'Bills', notice: 'Notices', package: 'Packages' };
    const order = ['letter', 'bill', 'notice', 'package'];
    const groups = (kind ? [kind] : order)
      .map((k) => ({ k, items: emails.filter((e: any) => (e.kind ?? 'letter') === k) }))
      .filter((g) => g.items.length > 0);
    const lines = groups.map((g) => {
      const header = `${mailKindIcon(g.k)} ${kindLabel[g.k]} (${g.items.length}, ${unread(g.items)} unread):`;
      const rows = g.items.map((e: any) => {
        const state = e.read ? '✅ read' : '🔵 unread';
        const extra = e.kind === 'bill'
          ? ` · $${(e.billAmount ?? 0).toLocaleString()} · ${e.paid ? 'paid' : 'unpaid'}`
          : e.kind === 'package'
            ? ` · ${e.package?.itemName ?? 'package'} · ${e.claimed ? 'claimed' : 'unclaimed'}`
            : '';
        return `• ${e.id} — ${e.subject} — From: ${e.fromName || e.from} — ${state}${extra}`;
      });
      return `${header}\n${rows.join('\n')}`;
    });
    return {
      success: true,
      message: `📬 **Mail** (${emails.length} items, ${unread(emails)} unread)${kind ? ` — ${kindLabel[kind]}` : ''}\n${lines.join('\n\n')}\n\nRead one with "mail read [id]" or "mail read [n]" (its number in this list). Also: packages | track [id] | send package [npc] [item] | claim package [id] | deliver [id] | pay bill [id]`,
    };
  }

  // v0.108.29: the mail list in display order — the same order
  // mailView renders (kind groups letter → bill → notice → package,
  // items in arrival order inside each group). `mail read [n]` counts
  // positions against this list, so the number a player sees is the
  // number that opens the item.
  private orderedMailItems(): any[] {
    const all = this.comm.getEmails() as any[];
    const order = ['letter', 'bill', 'notice', 'package'];
    return order.flatMap((k) => all.filter((e: any) => (e.kind ?? 'letter') === k));
  }

  // v0.108.28: mail-side read — the same underlying item the email path
  // reads (`read [id]`), reachable with mail wording. Marks it read.
  // v0.108.29: also by list position — a player asked "Then how do I
  // find the mail id??" (Nov 10) because ids are long machine strings.
  // `mail read 2` opens the 2nd item in the order `mail` lists them.
  // An exact id still wins first, so old behavior is unchanged.
  private mailRead(id: string): GameAction {
    const clean = (id ?? '').trim();
    if (!clean) return { success: false, message: 'Usage: mail read [id] — type "mail" to see your mail with ids. A plain number reads by list position ("mail read 2" opens the 2nd item).' };
    let email = this.comm.getEmailById(clean) as any;
    if (!email && /^\d+$/.test(clean)) {
      const n = parseInt(clean, 10);
      const ordered = this.orderedMailItems();
      if (n >= 1 && n <= ordered.length) email = ordered[n - 1];
      else return { success: false, message: `No mail item at position ${n} — you have ${ordered.length} item${ordered.length === 1 ? '' : 's'}. Type "mail" to see the list.` };
    }
    if (!email) return { success: false, message: `No mail item "${clean}". Type "mail" to see your mail with ids.` };
    this.comm.markEmailRead(email.id);
    const status = email.kind === 'bill'
      ? `\nBill: $${(email.billAmount ?? 0).toLocaleString()} — ${email.paid ? 'paid' : `unpaid (pay with "pay bill ${email.id}")`}`
      : email.kind === 'package'
        ? `\nPackage: ${email.package?.itemName ?? 'package'} — ${email.claimed ? 'claimed' : `unclaimed (claim with "claim package ${email.id}")`}`
        : '';
    return {
      success: true,
      message: `📬 **${email.subject}**\n${'─'.repeat(40)}\nFrom: ${email.fromName || email.from}\nDate: ${new Date(email.timestamp).toLocaleString()}\nKind: ${mailKindIcon(email.kind)} ${email.kind ?? 'letter'}${status}\n\n${email.body}`,
    };
  }

  private checkPackageDeliveries(): void {
    const today = this.time.currentTime;
    for (const pkg of this.player.packages ?? []) {
      if (pkg.kind === 'outgoing' && !pkg.delivered && pkg.arriveISO && new Date(pkg.arriveISO) <= today) {
        pkg.delivered = true;
        pkg.deliveredDate = this.time.formatDate();
        const npc = this.social.getNPCById(pkg.toNpcId);
        if (npc) {
          const rel = this.ensureRel(npc);
          rel.value = Math.min(100, (rel.value ?? 0) + PACKAGE_GIFT_REL);
          npc.relationship = rel.value;
        }
      }
    }
  }

  private packagesView(): GameAction {
    this.checkPackageDeliveries();
    const outgoing = (this.player.packages ?? []).filter((p: any) => p.kind === 'outgoing');
    const outLines = outgoing.length === 0 ? 'None.' : outgoing.map((p: any) => `• ${p.id}: ${p.itemName} → ${p.toName} — ${p.delivered ? `delivered ${p.deliveredDate}` : `in transit, ETA ${p.arriveDate}`}`).join('\n');
    const incoming = this.comm.getEmails().filter((e: any) => e.kind === 'package' && !e.claimed);
    const inLines = incoming.length === 0 ? 'None.' : incoming.map((e: any) => `• ${e.id}: ${e.package?.itemName ?? 'package'} from ${e.fromName} — unclaimed (claim with "claim package ${e.id}")`).join('\n');
    const jobs = courierJobsForDay(this.time.formatDate(), this.player.city, this.social.getNPCByCity(this.player.city).map((n: any) => ({ id: n.id, name: n.name, district: n.district })));
    const active = this.player.activeCourierJob;
    const jobLines = jobs.map((j) => `• ${j.id}: ${j.fromName} → ${j.toName} (${j.fromDistrict} → ${j.toDistrict}) — $${j.pay}, 2h${active?.id === j.id ? ' [ACTIVE — finish with "deliver ' + j.id + '"]' : ''}`).join('\n');
    return {
      success: true,
      message: `📦 **Packages**\n\nOutgoing:\n${outLines}\n\nIncoming (unclaimed):\n${inLines}\n\nCourier jobs today (same jobs for everyone today):\n${jobLines || 'No courier jobs today.'}\n\nCommands: send package [npc] [item] | claim package [id] | deliver [id] | track [id]`,
    };
  }

  private sendPackage(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    if (parts.length < 2) return { success: false, message: 'Usage: send package [npc] [item].' };
    const itemName = parts[parts.length - 1]!;
    const npcName = parts.slice(0, -1).join(' ');
    const resolvedNpc = resolveNamed(this.social.getAllNPCs(), npcName, (n) => n.name);
    if (resolvedNpc.ambiguous) return { success: false, message: `Multiple people match "${npcName}": ${resolvedNpc.ambiguous.join(', ')}. Type "send package [full name] [item]".` };
    const npc = resolvedNpc.item;
    if (!npc) return { success: false, message: `No one named "${npcName}" is on the roster.` };
    const inv = this.player.inventory ?? [];
    const matches = inv.filter((i: any) => String(i.name ?? i).toLowerCase().includes(itemName.toLowerCase()));
    if (matches.length === 0) return { success: false, message: `You don't have an item matching "${itemName}" in your inventory.` };
    if (matches.length > 1) return { success: false, message: `Multiple items match "${itemName}": ${matches.map((i: any) => String(i.name ?? i)).join(', ')}. Be more specific.` };
    const item = matches[0]!;
    if ((this.player.money ?? 0) < POSTAGE) return { success: false, message: `Postage is $${POSTAGE}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - POSTAGE);
    this.player.inventory = inv.filter((i: any) => i !== item);
    const arrive = new Date(this.time.currentTime.getTime() + 86400000);
    if (!Array.isArray(this.player.packages)) this.player.packages = [];
    const pkg = {
      id: `pkg_${Date.now()}`,
      kind: 'outgoing',
      fromName: this.player.name,
      toNpcId: npc.id,
      toName: npc.name,
      itemName: String(item.name ?? item),
      arriveDate: formatGameDate(arrive),
      arriveISO: arrive.toISOString(),
      delivered: false,
    };
    this.player.packages.push(pkg);
    return { success: true, message: `📦 Sent ${pkg.itemName} to ${npc.name} ($${POSTAGE} postage). ETA ${pkg.arriveDate} — relationship +${PACKAGE_GIFT_REL} on delivery. Track with "track ${pkg.id}".` };
  }

  private claimPackage(rawArgs: string): GameAction {
    const id = rawArgs.trim();
    if (!id) return { success: false, message: 'Usage: claim package [id]. Type "packages" to see unclaimed packages.' };
    const email = this.comm.getEmailById(id) as any;
    if (!email || email.kind !== 'package') return { success: false, message: `No unclaimed package "${id}". Type "packages" to see them.` };
    if (email.claimed) return { success: false, message: `Package "${id}" was already claimed.` };
    email.claimed = true;
    if (email.package) email.package.claimed = true;
    const itemName = email.package?.itemName ?? 'package';
    if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
    this.player.inventory.push({ name: itemName, value: email.package?.itemValue ?? 0 });
    return { success: true, message: `📦 Claimed ${itemName} from ${email.fromName} — it's in your inventory now.` };
  }

  private deliverCourier(rawArgs: string): GameAction {
    const id = rawArgs.trim();
    if (!id) return { success: false, message: 'Usage: deliver [id]. Type "packages" to see today\'s courier jobs.' };
    const active = this.player.activeCourierJob;
    const jobs = courierJobsForDay(this.time.formatDate(), this.player.city, this.social.getNPCByCity(this.player.city).map((n: any) => ({ id: n.id, name: n.name, district: n.district })));
    const job = jobs.find((j) => j.id === id);
    if (!job) return { success: false, message: `No courier job "${id}" today. Type "packages" to see today's jobs.` };
    if (active && active.id !== id) {
      return { success: false, message: `You're already on courier job ${active.id} — finish it first ("deliver ${active.id}"). One active job at a time.` };
    }
    this.player.activeCourierJob = null;
    this.player.money = roundCents((this.player.money ?? 0) + job.pay);
    this.trackTaxIncome(job.pay);
    this.time.advance({ hours: COURIER_HOURS, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), `Courier delivery: ${job.fromName} → ${job.toName} (+$${job.pay}).`);
    return {
      success: true,
      message: `📦 Delivered: ${job.fromName} → ${job.toName}. +$${job.pay} (2h).`,
      challengeContributions: { earnings: job.pay },
    };
  }

  private trackPackage(rawArgs: string): GameAction {
    const id = rawArgs.trim();
    if (!id) return { success: false, message: 'Usage: track [id]. Type "packages" to see package ids.' };
    const pkg = (this.player.packages ?? []).find((p: any) => p.id === id);
    if (pkg) {
      return { success: true, message: `📦 **${pkg.id}**\n${pkg.fromName} → ${pkg.toName}\nItem: ${pkg.itemName}\nStatus: ${pkg.delivered ? `Delivered ${pkg.deliveredDate}` : `In transit — ETA ${pkg.arriveDate}`}` };
    }
    const email = this.comm.getEmailById(id) as any;
    if (email && email.kind === 'package') {
      return { success: true, message: `📦 **${email.id}**\n${email.fromName} → you\nItem: ${email.package?.itemName ?? 'package'}\nStatus: ${email.claimed ? 'Claimed' : 'Waiting in your inbox (claim with "claim package ' + email.id + '")'}` };
    }
    const jobs = courierJobsForDay(this.time.formatDate(), this.player.city, this.social.getNPCByCity(this.player.city).map((n: any) => ({ id: n.id, name: n.name, district: n.district })));
    const job = jobs.find((j) => j.id === id);
    if (job) {
      const active = this.player.activeCourierJob?.id === id;
      return { success: true, message: `📦 **${job.id}** (courier job)\n${job.fromName} → ${job.toName} (${job.fromDistrict} → ${job.toDistrict})\nPay: $${job.pay} · Status: ${active ? 'Active — complete with "deliver ' + job.id + '"' : 'Available today'}` };
    }
    return { success: false, message: `No package, mail, or courier job "${id}". Type "packages" to see ids.` };
  }

  private payBill(rawArgs: string): GameAction {
    const id = rawArgs.trim();
    if (!id) return { success: false, message: 'Usage: pay bill [id]. Type "emails" to see bill mail.' };
    const email = this.comm.getEmailById(id) as any;
    if (!email || email.kind !== 'bill') return { success: false, message: `No bill "${id}". Type "emails" to see bill mail.` };
    if (email.paid) return { success: false, message: `Bill "${id}" is already paid.` };
    const amount = email.billAmount ?? 0;
    if ((this.player.money ?? 0) < amount) return { success: false, message: `Bill is $${amount.toLocaleString()}; you have $${(this.player.money ?? 0).toFixed(2)} — cash short, bill unpaid.` };
    this.player.money = roundCents((this.player.money ?? 0) - amount);
    this.player.hardDebt = roundCents(Math.max(0, (this.player.hardDebt ?? 0) - amount));
    this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + amount;
    email.paid = true;
    return { success: true, message: `🧾 Paid bill "${id}" ($${amount.toLocaleString()}). Hard debt now $${(this.player.hardDebt ?? 0).toLocaleString()}. The bill stays in your inbox, marked paid.` };
  }

  private grantTierPackages(): void {
    if (!this.player.packageTiers) this.player.packageTiers = {};
    for (const [npcId, rel] of Object.entries(this.player.relationships ?? {})) {
      const value = (rel as any)?.value ?? 0;
      const granted: number[] = this.player.packageTiers[npcId] ?? [];
      for (const tier of [50, 75, 90]) {
        if (value >= tier && !granted.includes(tier)) {
          granted.push(tier);
          const npc = this.social.getNPCById(npcId);
          if (npc) {
            const good = PACKAGE_GOODS[(value + tier) % PACKAGE_GOODS.length]!;
            const email: any = this.comm.receiveEmail(npc.id, npc.name, `A little something from ${npc.name}`, `${npc.name} sent you ${good.name} (worth $${good.value}) as your friendship grows. Claim it with "claim package" once you have the id — see "packages".`);
            email.kind = 'package';
            email.package = { itemName: good.name, itemValue: good.value, claimed: false };
            email.claimed = false;
          }
        }
      }
      this.player.packageTiers[npcId] = granted;
    }
  }

  // ---- §31 Services ----
  private servicesView(): GameAction {
    const permits: string[] = this.player.permits ?? [];
    const permitLine = permits.length ? permits.map((p) => PERMITS[p]?.name ?? p).join(', ') : 'none';
    const fees = this.player.feesDue ?? 0;
    const cash = this.player.money ?? 0;
    const eligible = !this.player.job || cash < 300;
    const voter = this.player.registeredVoter ? 'Yes' : 'No';
    const vehicles = (this.player.vehicles ?? []).map((v: any) => `${v.name}${v.registered ? ' (registered)' : ' (unregistered)'}`).join(', ') || 'none';
    const props = (this.player.properties ?? []).map((p: any) => p.name).join(', ') || 'none';
    const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
    return {
      success: true,
      message: `🏛️ **Citizen Services — ${cityDisplay(this.player.city)}**\nPermits held: ${permitLine}\nFees due: $${fees.toLocaleString()}${fees > 0 ? ' (see "fees")' : ''}\nBenefits: ${eligible ? 'eligible ($200 once per game-month — "benefits claim")' : 'not eligible right now (employed with $300+ cash)'}\nVoter registration: ${voter}\nVehicles: ${vehicles}\nProperties on record: ${props}\nUtilities: ${this.player.hardMode ? `hard mode — the $120 bill is paid via "bills pay"` : `included (utilities line $${living.utilities.toLocaleString()}/mo, no separate charge)`}\n\nCommands: permits | permit [type] | fees | pay fees [all|amount] | benefits | benefits claim | register voter | records | utilities`,
    };
  }

  private permitsView(): GameAction {
    const held: string[] = this.player.permits ?? [];
    const lines = Object.entries(PERMITS).map(([key, p]) => `• ${p.name} — $${p.cost} ${held.includes(key) ? '(HELD)' : ''} — ${p.effect}`).join('\n');
    return { success: true, message: `📋 **Permits**\n${lines}\n\nBuy with "permit [business|drivers|food]". Permits never gate an existing feature — they add small permanent bonuses.` };
  }

  private permitBuy(rawArgs: string): GameAction {
    const key = rawArgs.trim().toLowerCase();
    const p = PERMITS[key];
    if (!p) return { success: false, message: 'Usage: permit [business|drivers|food]. Type "permits" to see them all.' };
    const held: string[] = this.player.permits ?? [];
    if (held.includes(key)) return { success: false, message: `You already hold the ${p.name}.` };
    if ((this.player.money ?? 0) < p.cost) return { success: false, message: `${p.name} costs $${p.cost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - p.cost);
    if (!Array.isArray(this.player.permits)) this.player.permits = [];
    this.player.permits.push(key);
    return { success: true, message: `📋 Bought the ${p.name} ($${p.cost}). ${p.effect}.` };
  }

  private feesView(): GameAction {
    const due = this.player.feesDue ?? 0;
    const assessed = this.player.feesAssessedMonthKey ?? '—';
    if (due <= 0) {
      return {
        success: true,
        message: `🧾 **Fees Due: $0**\nAssessed: ${assessed} (vehicle $40/registered vehicle/year, property $25/property/year)\nNothing outstanding.`,
      };
    }
    // v0.108.21 (§54): the communication surface — stage, plan,
    // next deadline + consequence in plain words, what would be
    // seized first right now, and the ways out at EVERY stage. The
    // old "No seizure, no arrest" sentence is gone: the ladder is
    // real, and it is always announced before it moves.
    const monthKey = this.time.getMonthKey();
    const base = this.player.feesClockMonthKey ?? this.player.feesAssessedMonthKey ?? monthKey;
    const monthsPast = monthDiff(base, monthKey);
    const stage = this.player.feePlanActive ? 'payment plan active (ladder frozen)'
      : feeLadderStage(monthsPast);
    const nextDeadline = this.player.feePlanActive
      ? `next plan installment $${(this.player.feePlanInstallment ?? 0).toLocaleString()} in the monthly tick (remaining $${(this.player.feePlanRemaining ?? 0).toLocaleString()})`
      : monthsPast >= FEE_SEIZURE_MONTHS
        ? (this.player.feesNextSeizureMonthKey && monthKey < this.player.feesNextSeizureMonthKey
          ? `seizure window — next seizure no earlier than ${this.player.feesNextSeizureMonthKey}`
          : `seizure window NOW — one asset seized next tick if still unpaid, or arrest if no seizable asset remains`)
        : monthsPast >= FEE_WARNING_2_MONTHS
          ? `seizure/arrest ${addMonthsKey(base, FEE_SEIZURE_MONTHS)} if still unpaid`
          : monthsPast >= FEE_WARNING_1_MONTHS
            ? `final warning ${addMonthsKey(base, FEE_WARNING_2_MONTHS)}, then seizure/arrest ${addMonthsKey(base, FEE_SEIZURE_MONTHS)} if still unpaid`
            : `warning 1 ${addMonthsKey(base, FEE_WARNING_1_MONTHS)} (late fee already applied past +2 months)`;
    const asset = firstSeizableAsset(this.player);
    const seizableLine = asset
      ? `Would be seized first right now: ${asset.ref?.name ?? asset.kind} (value $${asset.value.toLocaleString()} — applied to the debt, never more than owed)`
      : `No seizable assets right now — arrest (short 3-day sentence, no criminal record) is the last resort if the debt stays unpaid past the final deadline`;
    const arrestNote = this.player.feeArrestActive
      ? `\nYou are currently serving a FEE arrest (short sentence, no criminal record, no parole tail). Pay the fees in full to release immediately ("pay fees all" works while incarcerated), or serve it, or use "prison work" / "lawyer appeal" to shorten it.`
      : '';
    return {
      success: true,
      message: `🧾 **Fees Due: $${due.toLocaleString()}**\nAssessed: ${assessed} (vehicle $40/registered vehicle/year, property $25/property/year)\nStage: ${stage} (${monthsPast} game-month(s) past the warning clock base ${base})\nNext: ${nextDeadline}\n${seizableLine}${arrestNote}\n\nWays out (shown at every stage):\n• "pay fees all" — clear the debt, ladder resets completely${this.player.feeArrestActive ? ', and a fee arrest releases immediately' : ''}.\n• "pay fees [amount]" — ANY partial payment restarts the warning clock from this month (old deadlines never seize or arrest you once you start paying).\n• "fees plan" — split the debt into 3 monthly installments, auto-deducted; the ladder is frozen while the plan is active, and a missed installment breaks it with NO penalty fee.`,
    };
  }

  // v0.108.21 (§54): clearing the ladder means ALL of it — due,
  // late flag, warning flags, plan, cooldown, arrest flag, clock.
  // (A fee arrest's incarceration itself is released separately by
  // the full-payment path below, or by serving the sentence.)
  private clearFeeLadder(): void {
    this.player.feesDue = 0;
    this.player.feesLateApplied = false;
    this.player.feesAssessedMonthKey = undefined;
    this.player.feesClockMonthKey = undefined;
    this.player.feesWarning1Sent = false;
    this.player.feesWarning2Sent = false;
    this.player.feesNextSeizureMonthKey = undefined;
    this.player.feesArrestFired = false;
    this.player.feePlanActive = false;
    this.player.feePlanRemaining = 0;
    this.player.feePlanInstallment = 0;
  }

  private payFees(rawArgs: string): GameAction {
    const due = this.player.feesDue ?? 0;
    if (due <= 0) return { success: false, message: 'No fees outstanding.' };
    const arg = rawArgs.trim().toLowerCase();
    const amount = arg === 'all' ? due : Number(arg);
    if (!amount || amount <= 0) return { success: false, message: 'Usage: pay fees [all|amount].' };
    const paid = Math.min(amount, due);
    if ((this.player.money ?? 0) < paid) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} cash — not enough to pay $${paid.toLocaleString()} of fees.` };
    this.player.money = roundCents((this.player.money ?? 0) - paid);
    this.player.feesDue = roundCents(due - paid);
    this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + paid;
    if (this.player.feesDue <= 0) {
      // Full payment clears the ladder — and releases a fee arrest
      // immediately (the fee-specific exit; crime incarcerations are
      // untouched by this path because feeArrestActive is false).
      const wasFeeArrest = !!this.player.feeArrestActive;
      this.clearFeeLadder();
      if (wasFeeArrest) {
        this.player.incarcerated = false;
        this.player.sentenceEnd = undefined;
        this.player.feeArrestActive = false;
        this.player.feeArrested = false;
        appendJournalLog(this.player, this.time.formatDate(), 'Fee arrest ended: fees paid in full — released immediately.');
        return { success: true, message: `🧾 Paid $${paid.toLocaleString()} of fees in full. The ladder is clear — and you are RELEASED from the fee arrest immediately.` };
      }
      return { success: true, message: `🧾 Paid $${paid.toLocaleString()} of fees in full. The ladder is clear.` };
    }
    // Partial payment: the debt shrinks AND the warning clock
    // restarts from the payment month with stages reset — a player
    // who starts paying is never seized or arrested on old
    // deadlines. A plan's remaining balance shrinks by the same
    // payment (direct payments while on a plan are allowed).
    this.player.feesClockMonthKey = this.time.getMonthKey();
    this.player.feesWarning1Sent = false;
    this.player.feesWarning2Sent = false;
    this.player.feesNextSeizureMonthKey = undefined;
    if (this.player.feePlanActive) {
      this.player.feePlanRemaining = roundCents(Math.max(0, (this.player.feePlanRemaining ?? 0) - paid));
      if (this.player.feePlanRemaining <= 0) {
        this.player.feePlanActive = false;
        this.player.feePlanInstallment = 0;
      }
    }
    return { success: true, message: `🧾 Paid $${paid.toLocaleString()} of fees. Remaining: $${this.player.feesDue.toLocaleString()}. Escalation halted: the warning clock restarts from this month (warning 1 at +${FEE_WARNING_1_MONTHS} months, final warning at +${FEE_WARNING_2_MONTHS}, seizure/arrest at +${FEE_SEIZURE_MONTHS} if still unpaid).` };
  }

  // v0.108.21 (§54): the payment plan — 3 equal monthly installments
  // (rounded, last takes the remainder), auto-deducted in the tick
  // BEFORE ladder evaluation. While active the ladder is frozen.
  private feesPlan(): GameAction {
    const due = this.player.feesDue ?? 0;
    if (due <= 0) return { success: false, message: 'No fees outstanding — nothing to put on a plan.' };
    if (this.player.feePlanActive) return { success: false, message: `A fee plan is already active ($${(this.player.feePlanRemaining ?? 0).toLocaleString()} remaining, next installment $${(this.player.feePlanInstallment ?? 0).toLocaleString()}).` };
    const inst = roundCents(due / FEE_PLAN_INSTALLMENTS);
    this.player.feePlanActive = true;
    this.player.feePlanRemaining = due;
    this.player.feePlanInstallment = inst;
    const last = roundCents(due - inst * (FEE_PLAN_INSTALLMENTS - 1));
    return { success: true, message: `🧾 Fee plan started: $${due.toLocaleString()} split into ${FEE_PLAN_INSTALLMENTS} monthly installments ($${inst.toLocaleString()}, $${inst.toLocaleString()}, $${last.toLocaleString()}). Each is auto-deducted in the monthly tick BEFORE any ladder step — while the plan is active, no warnings advance, no seizure, no arrest. A missed installment (cash short) breaks the plan with NO penalty fee and restarts the warning sequence from the break month. Direct "pay fees" payments while on a plan are allowed.` };
  }

  private benefitsView(): GameAction {
    const monthKey = this.time.getMonthKey();
    const claimed = this.player.benefitsClaimMonth === monthKey;
    const eligible = !this.player.job || (this.player.money ?? 0) < 300;
    return {
      success: true,
      message: `🤝 **Benefits**\nAmount: $${BENEFIT_AMOUNT} once per game-month\nEligibility: ${eligible ? 'eligible' : 'not eligible (you must be unemployed or hold under $300 cash)'}\nThis month: ${claimed ? 'already claimed' : 'not yet claimed'}\n\nClaim with "benefits claim".`,
    };
  }

  private benefitsClaim(): GameAction {
    const monthKey = this.time.getMonthKey();
    if (this.player.benefitsClaimMonth === monthKey) return { success: false, message: 'You already claimed benefits this game-month. Once per month.' };
    if (this.player.job && (this.player.money ?? 0) >= 300) {
      return { success: false, message: 'Not eligible: benefits require being unemployed or holding under $300 cash.' };
    }
    this.player.benefitsClaimMonth = monthKey;
    this.player.money = roundCents((this.player.money ?? 0) + BENEFIT_AMOUNT);
    appendJournalLog(this.player, this.time.formatDate(), `Benefits claimed: +$${BENEFIT_AMOUNT}.`);
    return { success: true, message: `🤝 Benefits claimed: +$${BENEFIT_AMOUNT}.` };
  }

  private registerVoter(): GameAction {
    if (this.player.registeredVoter) return { success: false, message: 'You\'re already registered to vote.' };
    this.player.registeredVoter = true;
    this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 5);
    return { success: true, message: `🗳️ Registered to vote! +5 community reputation (feeds your civic titles — see "civic").` };
  }

  private recordsView(): GameAction {
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: true, message: '📋 No property ownership records — you own no properties yet.' };
    const lines = props.map((p: any) => `• ${p.name} — ${cityDisplay(p.city)} (${p.district ?? '—'}), value $${(p.currentValue ?? p.purchasePrice ?? 0).toLocaleString()}`).join('\n');
    return { success: true, message: `📋 **Property Records**\n${lines}` };
  }

  private utilitiesView(): GameAction {
    const props = this.player.properties ?? [];
    const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
    if (props.length === 0) {
      return { success: true, message: `💡 **Utilities**\nNo owned properties — no utility accounts.\n${this.player.hardMode ? 'Hard mode is ON: living costs (including utilities) are charged in the tick and paid via "bills pay" when short.' : 'Utilities are included in your living costs (see "living").'}` };
    }
    const lines = props.map((p: any) => `• ${p.name} — power: on, water: on`).join('\n');
    return {
      success: true,
      message: `💡 **Utilities**\n${lines}\nUtilities line: $${living.utilities.toLocaleString()}/mo (base $80 + $20 per extra household member)${this.player.hardMode ? '\nHard mode ON: the $120 hard-mode bill is paid via "bills pay" — no duplicate utility charge.' : '\nHard mode OFF: utilities show as included, no separate charge.'}`,
    };
  }

  // ---- §6 year crossing (tax + age + family + fees + annual stats) ----
  private runYearCrossing(prevYear: number, monthKey: string): string[] {
    const lines: string[] = [];
    const newYear = parseInt(monthKey.split('-')[0]!, 10);
    const prevAge = this.player.ageYears ?? 18;
    this.player.ageYears = prevAge + 1;
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + FAMILY_EVENT_HAPPY);
    appendJournalLog(this.player, this.time.formatDate(), `Birthday! You turned ${this.player.ageYears}.`);
    lines.push(`🎂 Year ${newYear}: happy birthday — you turned ${this.player.ageYears} (${lifeStage(this.player.ageYears)})!`);
    const income = this.player.taxAnnualIncome ?? 0;
    const liability = computeTaxLiability(income);
    if (liability > 0) {
      this.player.taxOwed = roundCents((this.player.taxOwed ?? 0) + liability);
      this.player.taxYearDue = prevYear;
      this.player.taxDueMonthKey = addMonthsToKey(monthKey, TAX_DUE_MONTHS_AFTER_ASSESSMENT);
      this.player.taxPenaltyApplied = false;
      lines.push(`🧾 Tax assessed for ${prevYear}: $${liability.toLocaleString()} owed (income $${income.toLocaleString()}). Due by ${this.player.taxDueMonthKey} — type "tax" for details.`);
      this.postNotice('City Tax Office', `Tax assessment — game-year ${prevYear}`, `You owe $${liability.toLocaleString()} for game-year ${prevYear} (income $${income.toLocaleString()}). Pay in full with "file taxes" or split it with "tax plan".`);
    }
    this.player.taxAnnualIncome = 0;
    this.player.taxYear = newYear;
    const spouseEntry = this.spouseRel();
    if (spouseEntry) {
      const spouseNpc = this.social.getNPCById(spouseEntry[0]);
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + FAMILY_EVENT_HAPPY);
      appendJournalLog(this.player, this.time.formatDate(), `Anniversary with ${spouseNpc?.name ?? 'your spouse'}.`);
      lines.push(`💍 Anniversary with ${spouseNpc?.name ?? 'your spouse'} (+${FAMILY_EVENT_HAPPY} happiness).`);
    }
    for (const c of this.player.children ?? []) {
      const age = newYear - (c.birthYear ?? newYear);
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + FAMILY_EVENT_HAPPY);
      appendJournalLog(this.player, this.time.formatDate(), `${c.name} turned ${age}.`);
      lines.push(`🎂 ${c.name} turned ${age} (+${FAMILY_EVENT_HAPPY} happiness).`);
    }
    // §31 annual asset fees, assessed at the same crossing.
    const registeredVehicles = (this.player.vehicles ?? []).filter((v: any) => v.registered).length;
    const feeTotal = registeredVehicles * VEHICLE_FEE + (this.player.properties ?? []).length * PROPERTY_FEE;
    if (feeTotal > 0) {
      this.player.feesDue = roundCents((this.player.feesDue ?? 0) + feeTotal);
      this.player.feesAssessedMonthKey = monthKey;
      this.player.feesLateApplied = false;
      // v0.108.21 (§54): every fresh annual assessment starts a FRESH
      // ladder — warnings first again, never straight to seizure or
      // arrest, even if a prior ladder ended badly.
      this.player.feesClockMonthKey = monthKey;
      this.player.feesWarning1Sent = false;
      this.player.feesWarning2Sent = false;
      this.player.feesNextSeizureMonthKey = undefined;
      this.player.feesArrestFired = false;
      lines.push(`🧾 Annual fees assessed: $${feeTotal.toLocaleString()} (${registeredVehicles} registered vehicle(s) × $${VEHICLE_FEE} + ${(this.player.properties ?? []).length} propert${(this.player.properties ?? []).length === 1 ? 'y' : 'ies'} × $${PROPERTY_FEE}) — see "fees".`);
    }
    const stats = {
      earned: income,
      spent: this.player.annualSpentAccum ?? 0,
      citiesVisited: (this.player.visitedCities ?? []).length,
      shiftsWorked: this.player.workDaysCompleted ?? 0,
      milestonesHit: this.achievementEngine.exportSerializable().unlocked.length,
    };
    if (!this.player.annualStats) this.player.annualStats = {};
    this.player.annualStats[prevYear] = stats;
    this.player.annualSpentAccum = 0;
    lines.push(`📅 Year ${prevYear} in review: earned $${income.toLocaleString()}, spent $${stats.spent.toLocaleString()}, ${stats.citiesVisited} cities, ${stats.shiftsWorked} shifts, ${stats.milestonesHit} achievements.`);
    return lines;
  }

  // ---- §35 ITEM 33 — ROUTINES ----
  private routineDayReset(): void {
    const today = this.time.formatDate();
    if (this.player.routineDay !== today) {
      this.player.routineDay = today;
      this.player.routinesDone = [];
    }
    if (!Array.isArray(this.player.routinesDone)) this.player.routinesDone = [];
  }
  private routineDoneOnce(key: string): boolean {
    this.routineDayReset();
    if ((this.player.routinesDone as string[]).includes(key)) return true;
    (this.player.routinesDone as string[]).push(key);
    return false;
  }

  private storesView(): GameAction {
    const districts = shoppingDistrictsForCity(this.player.city);
    if (districts.length === 0) {
      return { success: true, message: `🛍️ **Stores — ${cityDisplay(this.player.city)}**\nNo shopping districts here — travel to a shopping district to shop.` };
    }
    const lines = districts.map((d) => `• ${d.displayName} — ${d.description}`).join('\n');
    return { success: true, message: `🛍️ **Stores — ${cityDisplay(this.player.city)}**\n${lines}\n\nShop with "shop [good]". Goods: groceries $40, clothing $60, household goods $50, coffee beans $10, flowers $15, book $20, snacks $25.` };
  }

  private shopView(rawArgs: string): GameAction {
    const districts = shoppingDistrictsForCity(this.player.city);
    if (districts.length === 0) {
      return { success: false, message: `No stores in ${cityDisplay(this.player.city)} — travel to a shopping district.` };
    }
    if (!rawArgs.trim()) {
      const list = SHOP_GOODS.map((g) => `• ${g.name} — $${g.price}${g.inventoried ? ' (goes into inventory)' : ' (used on purchase)'}`).join('\n');
      return { success: true, message: `🛍️ **Shop**\n${list}\n\nBuy with "shop [good]".` };
    }
    const resolved = resolveNamed(SHOP_GOODS, rawArgs, (g) => g.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple goods match "${rawArgs}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const good = resolved.item;
    if (!good) return { success: false, message: `No good matching "${rawArgs}". Type "shop" to list goods.` };
    if ((this.player.money ?? 0) < good.price) return { success: false, message: `${good.name} costs $${good.price}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - good.price);
    if (good.inventoried) {
      if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
      this.player.inventory.push(good.name);
    } else {
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + good.happy);
      this.player.energy = Math.min(100, (this.player.energy ?? 0) + good.energy);
      if (good.condition > 0 && (this.player.properties ?? []).length > 0) {
        const primary = (this.player.properties ?? []).find((p: any) => p.id === this.player.primaryResidenceId) ?? this.player.properties[0];
        if (primary) primary.condition = Math.min(100, (primary.condition ?? 100) + good.condition);
      }
    }
    appendJournalLog(this.player, this.time.formatDate(), `Shopped: ${good.name} ($${good.price}).`);
    return { success: true, message: `🛍️ Bought ${good.name} for $${good.price}.${good.inventoried ? ' It is in your inventory (giftable, tradeable).' : ` Happiness +${good.happy}${good.energy ? `, energy +${good.energy}` : ''}${good.condition > 0 && (this.player.properties ?? []).length > 0 ? `, home condition +${good.condition}` : ''}.`}` };
  }

  private commercialView(): GameAction {
    const districts = shoppingDistrictsForCity(this.player.city);
    if (districts.length === 0) {
      return { success: true, message: `🏬 **Commercial — ${cityDisplay(this.player.city)}**\nNo shopping districts here. Travel to a city with shops to browse.` };
    }
    const schoolsHere = this.schools.getSchoolsByCity(this.player.city);
    const lines = districts.map((d) => {
      const pois: string[] = [];
      for (const s of schoolsHere) if (s.district === d.id) pois.push(`school: ${s.name} ("schools")`);
      const jobs = getJobsByCity(this.player.city).filter((j: any) => j.district === d.id);
      if (jobs.length > 0) pois.push(`${jobs.length} job listing${jobs.length === 1 ? '' : 's'} ("apply [job]")`);
      return `• ${d.displayName} — stores ("shop")${pois.length ? ` · ${pois.join(' · ')}` : ''}`;
    }).join('\n');
    return { success: true, message: `🏬 **Commercial — ${cityDisplay(this.player.city)}**\n${lines}\n\nStroll a district with "stroll [district]".` };
  }

  private strollView(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Usage: stroll [district] — a real district in your current city.' };
    const districts = Object.entries(WORLD_DISTRICTS as Record<string, any>).filter(([, d]) => d.city === this.player.city);
    const resolved = resolveNamed(districts.map(([id, d]) => ({ id, name: d.displayName ?? id })), name, (d) => d.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple districts match "${name}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const hit = resolved.item;
    if (!hit) return { success: false, message: `"${name}" is not a district in ${cityDisplay(this.player.city)}. Type "districts" to list this city's districts.` };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - 5);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + 3);
    this.time.advance({ hours: 1, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), `Strolled ${hit.name}.`);
    return { success: true, message: `🚶 Strolled ${hit.name} (1h, energy −5, happiness +3).` };
  }

  private errandsView(): GameAction {
    if (this.routineDoneOnce('errands')) return { success: false, message: 'Errands are done for today — once per game-day. Come back tomorrow.' };
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - 10);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + 2);
    this.player.stress = Math.max(0, (this.player.stress ?? 0) - 3);
    this.time.advance({ hours: 2, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), 'Ran errands.');
    return { success: true, message: '🧹 Errands done (2h, energy −10, happiness +2, stress −3).' };
  }

  private choresView(): GameAction {
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: false, message: 'Chores need a home — you own no property yet. Type "real-estate" to browse.' };
    if (this.routineDoneOnce('chores')) return { success: false, message: 'Chores are done for today — once per game-day. Come back tomorrow.' };
    const primary = props.find((p: any) => p.id === this.player.primaryResidenceId) ?? props[0];
    primary.condition = Math.min(100, (primary.condition ?? 100) + 3);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - 5);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + 1);
    this.time.advance({ hours: 1, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), `Did chores at ${primary.name}.`);
    return { success: true, message: `🧹 Chores done at ${primary.name} (1h, energy −5, condition +3, happiness +1).` };
  }

  private selfcareView(): GameAction {
    if ((this.player.money ?? 0) < 20) return { success: false, message: `Self-care costs $20. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    if (this.routineDoneOnce('selfcare')) return { success: false, message: 'Self-care is done for today — once per game-day. Come back tomorrow.' };
    this.player.money = roundCents((this.player.money ?? 0) - 20);
    this.player.energy = Math.min(100, (this.player.energy ?? 0) + 15);
    this.player.stress = Math.max(0, (this.player.stress ?? 0) - 8);
    this.player.health = Math.min(100, (this.player.health ?? 100) + 2);
    this.time.advance({ hours: 2, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), 'Took time for self-care.');
    return { success: true, message: '🛁 Self-care done ($20, 2h, energy +15, stress −8, health +2).' };
  }

  private routinesView(): GameAction {
    this.routineDayReset();
    const done = (this.player.routinesDone as string[]).join(', ') || 'none yet';
    return { success: true, message: `📋 **Today's routines (${this.player.routineDay})**\nDone: ${done}\n\n• errands — 2h, energy −10, happiness +2, stress −3 (once/day)\n• chores — needs a property: 1h, energy −5, home condition +3, happiness +1 (once/day)\n• selfcare — $20, 2h, energy +15, stress −8, health +2 (once/day)\n• morning — needs a property where you are: 1h, energy +5, happiness +2 (once/day)\n• evening — needs a property where you are: 2h, happiness +4, energy −5 (once/day)` };
  }

  // ---- §36 ITEM 34 — HOUSING ----
  private primaryProperty(): any | null {
    const props = this.player.properties ?? [];
    if (props.length === 0) return null;
    return props.find((p: any) => p.id === this.player.primaryResidenceId) ?? props[0];
  }

  private housingView(): GameAction {
    const props = this.player.properties ?? [];
    const spouseEntry = Object.entries(this.player.relationships ?? {}).find(([, r]: any) => r.spouse);
    const spouseName = spouseEntry ? (this.social.getNPCById(spouseEntry[0])?.name ?? 'spouse') : null;
    const household = [spouseName, ...((this.player.children ?? []).map((c: any) => c.name))].filter(Boolean);
    const who = household.length > 0 ? `Lives with you: ${household.join(', ')}.` : 'No family household here.';
    if (props.length === 0) {
      return { success: true, message: `🏠 **Housing**\nRenting (the §32 basic rent line: $300/mo before the city multiplier). No property owned.\n${who}\n\nCommands: housing market [city?] | set home [property] | move [property]` };
    }
    const lines = props.map((p: any) => {
      const tenure = p.mortgageRemaining > 0
        ? `mortgaged — $${p.mortgageRemaining.toLocaleString()} remaining, $${p.mortgagePayment}/mo, ${Math.ceil(p.mortgageRemaining / Math.max(1, p.mortgagePayment))} months left, arrears $${p.mortgageArrears ?? 0} (${p.missedMortgagePayments ?? 0} missed)`
        : 'owned outright';
      const primary = p.id === this.player.primaryResidenceId ? ' (primary residence)' : '';
      return `• ${p.name} — ${cityDisplay(p.city)} — ${tenure}${primary}`;
    }).join('\n');
    return { success: true, message: `🏠 **Housing**\n${lines}\n${who}\n\nCommands: mortgage [property] | pay mortgage [property] [amount] | set home [property] | set home none | move [property] | housing market [city?]` };
  }

  private mortgageView(rawArgs: string): GameAction {
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: false, message: 'You own no property. Type "real-estate" to browse.' };
    const resolved = resolveNamed(props, rawArgs, (p: any) => p.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple properties match "${rawArgs}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const p = resolved.item ?? this.primaryProperty();
    if (!p) return { success: false, message: `No property matching "${rawArgs}". Type "housing" to list yours.` };
    const payoff = (p.mortgageRemaining ?? 0) + (p.mortgageArrears ?? 0);
    const term = p.mortgageRemaining > 0 ? Math.ceil(p.mortgageRemaining / Math.max(1, p.mortgagePayment)) : 0;
    return { success: true, message: `🏠 **Mortgage — ${p.name}**\nPayment: $${p.mortgagePayment}/mo\nRemaining: $${(p.mortgageRemaining ?? 0).toLocaleString()}\nTerm: ${term} month${term === 1 ? '' : 's'}\nArrears: $${(p.mortgageArrears ?? 0).toLocaleString()} (${p.missedMortgagePayments ?? 0} consecutive missed)\nPayoff: $${payoff.toLocaleString()}\n\nExtra payments of $100+ reduce the balance and term; paying the full payoff clears the loan. "pay mortgage ${p.name} [amount]".` };
  }

  private payMortgageView(rawArgs: string): GameAction {
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: false, message: 'You own no property.' };
    const parts = rawArgs.trim().split(/\s+/);
    const amount = parseFloat(parts[parts.length - 1]!);
    if (Number.isNaN(amount) || amount <= 0) return { success: false, message: 'Usage: pay mortgage [property] [amount].' };
    const namePart = parts.slice(0, -1).join(' ');
    const resolved = resolveNamed(props, namePart, (p: any) => p.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple properties match "${namePart}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const p = resolved.item;
    if (!p) return { success: false, message: `No property matching "${namePart}". Type "housing" to list yours.` };
    if ((p.mortgageRemaining ?? 0) <= 0) return { success: false, message: `${p.name} has no mortgage — it is owned outright.` };
    if ((this.player.money ?? 0) < amount) return { success: false, message: `You have $${(this.player.money ?? 0).toFixed(2)} — $${amount.toLocaleString()} is more than your cash.` };
    const payoff = (p.mortgageRemaining ?? 0) + (p.mortgageArrears ?? 0);
    const paid = Math.min(amount, payoff);
    this.player.money = roundCents((this.player.money ?? 0) - paid);
    // Arrears clear first, then principal.
    const arrearsPaid = Math.min(paid, p.mortgageArrears ?? 0);
    p.mortgageArrears = roundCents((p.mortgageArrears ?? 0) - arrearsPaid);
    p.mortgageRemaining = roundCents((p.mortgageRemaining ?? 0) - (paid - arrearsPaid));
    p.missedMortgagePayments = 0; // any successful payment resets the streak
    if (p.mortgageRemaining <= 0) {
      p.mortgageRemaining = 0; p.mortgagePayment = 0; p.mortgageArrears = 0;
      appendJournalLog(this.player, this.time.formatDate(), `Mortgage cleared on ${p.name}.`);
      return { success: true, message: `🏠 Paid $${paid.toLocaleString()} on ${p.name} — the mortgage is CLEARED. You own it outright.` };
    }
    const term = Math.ceil(p.mortgageRemaining / Math.max(1, p.mortgagePayment));
    return { success: true, message: `🏠 Paid $${paid.toLocaleString()} on ${p.name}. Remaining: $${p.mortgageRemaining.toLocaleString()} (${term} months left).` };
  }

  private setHomeView(rawArgs: string): GameAction {
    const arg = rawArgs.trim().toLowerCase();
    if (arg === 'none') {
      this.player.primaryResidenceId = null;
      return { success: true, message: '🏠 Primary residence cleared — go home now uses your first owned property, then your starting city.' };
    }
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: false, message: 'You own no property. Type "real-estate" to browse.' };
    const resolved = resolveNamed(props, rawArgs, (p: any) => p.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple properties match "${rawArgs}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const p = resolved.item;
    if (!p) return { success: false, message: `You don't own a property matching "${rawArgs}". "set home" only works on property you own.` };
    this.player.primaryResidenceId = p.id;
    return { success: true, message: `🏠 Primary residence set to ${p.name} (${cityDisplay(p.city)}). "go home" now heads here first.` };
  }

  private moveView(rawArgs: string): GameAction {
    const props = this.player.properties ?? [];
    if (props.length === 0) return { success: false, message: 'You own no property to move to.' };
    const resolved = resolveNamed(props, rawArgs, (p: any) => p.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple properties match "${rawArgs}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const p = resolved.item;
    if (!p) return { success: false, message: `You don't own a property matching "${rawArgs}".` };
    this.player.primaryResidenceId = p.id;
    const result = this.travelTo(p.city);
    if (result.success && p.district) this.player.district = p.district;
    return { success: true, message: `🏠 Moved home to ${p.name} (${cityDisplay(p.city)}).${result.success ? `\n\n${result.message}` : ''}` };
  }

  private housingMarketView(rawArgs: string): GameAction {
    const cityId = rawArgs.trim().toLowerCase();
    const city = cityId && (WORLD_CITIES as Record<string, any>)[cityId] ? cityId : this.player.city;
    const monthKey = this.time.getMonthKey();
    const idx = housingMarketIndex(city, monthKey);
    const trend = housingMarketTrend(city, monthKey);
    return { success: true, message: `📈 **Housing market — ${cityDisplay(city)} (${monthKey})**\nIndex: ${idx.toFixed(2)} (${trend})\nMeaning: a listing with a $100,000 base price prices at $${Math.round(100000 * idx).toLocaleString()} under today's index.\n\nSince v0.108.21 (§52) the index DOES reprice: in-flight listings show index-adjusted prices on the real-estate screen (and buys charge exactly that price), and owned properties reprice each monthly tick by the index ratio — every owned move gets its own tick line (old price, new price, index move). See "repricing" for your properties' last moves.` };
  }
  // ---- §37 ITEM 35a — WILL / ESTATE (no death mechanic: executes only on §14 retirement) ----
  private willView(): GameAction {
    const will = this.player.will ?? {};
    const heir = will.heir ?? 'none set';
    const bequests = will.bequests ?? {};
    const lines = Object.keys(bequests).length === 0
      ? 'No bequests recorded.'
      : Object.entries(bequests).map(([cls, h]) => `• ${cls}: ${h}`).join('\n');
    return { success: true, message: `📜 **Your will**\nPrimary heir: ${heir}\n${lines}\n\n"will heir [npc|community]" sets the heir. "will bequeath [cash|properties|businesses|vehicles] [heir]" records a bequest (re-bequest replaces). The will executes ONLY when you retire ("retire confirm") — there is no death mechanic in this game.` };
  }

  private willHeirView(rawArgs: string): GameAction {
    const arg = rawArgs.trim();
    if (!arg) return { success: false, message: 'Usage: will heir [npc name] or will heir community.' };
    if (arg.toLowerCase() === 'community') {
      if (!this.player.will) this.player.will = {};
      this.player.will.heir = 'community';
      return { success: true, message: '📜 Primary heir set to the city community fund.' };
    }
    const resolved = resolveNamed(this.social.getAllNPCs(), arg, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${arg}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${arg}" is on the roster.` };
    if (!this.player.will) this.player.will = {};
    this.player.will.heir = npc.name;
    this.player.will.heirNpcId = npc.id;
    return { success: true, message: `📜 Primary heir set to ${npc.name}.` };
  }

  private willBequeathView(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    const cls = (parts[0] ?? '').toLowerCase();
    const heirArg = parts.slice(1).join(' ');
    const classes = ['cash', 'properties', 'businesses', 'vehicles'];
    if (!classes.includes(cls) || !heirArg) return { success: false, message: 'Usage: will bequeath [cash|properties|businesses|vehicles] [npc name|community].' };
    let heirName: string;
    if (heirArg.toLowerCase() === 'community') {
      heirName = 'community';
    } else {
      const resolved = resolveNamed(this.social.getAllNPCs(), heirArg, (n) => n.name);
      if (resolved.ambiguous) return { success: false, message: `Multiple people match "${heirArg}": ${resolved.ambiguous.join(', ')}. Be more specific.` };
      if (!resolved.item) return { success: false, message: `No one named "${heirArg}" is on the roster.` };
      heirName = resolved.item.name;
    }
    if (!this.player.will) this.player.will = {};
    if (!this.player.will.bequests) this.player.will.bequests = {};
    this.player.will.bequests[cls] = heirName;
    return { success: true, message: `📜 Bequest recorded: ${cls} → ${heirName}. (Re-bequeathing ${cls} replaces it.)` };
  }

  private willHeirIsFamily(): boolean {
    const will = this.player.will ?? {};
    if (!will.heirNpcId) return false;
    const spouseEntry = Object.entries(this.player.relationships ?? {}).find(([, r]: any) => r.spouse);
    if (spouseEntry && spouseEntry[0] === will.heirNpcId) return true;
    return false;
  }

  private estateDistribution(): { total: number; lines: string[]; perBusiness: { name: string; value: number; source: string }[] } {
    const bank = this.player.bankBalance ?? 0;
    const props = (this.player.properties ?? []).map((p: any) => ({ name: p.name, value: p.currentValue ?? 0 }));
    const bizs = ownedBusinesses(this.player).map((b: any) => {
      if (b.purchasePrice !== undefined && b.purchasePrice !== null) return { name: b.name, value: b.purchasePrice, source: 'stored buy price' };
      return { name: b.name, value: roundCents((b.monthlyIncome ?? 0) * 12), source: '12× monthly income (no stored buy price)' };
    });
    const vehicles = (this.player.vehicles ?? []).map((v: any) => ({ name: v.name, value: v.value ?? v.purchasePrice ?? 0 }));
    const total = roundCents(bank + props.reduce((s: number, p: any) => s + p.value, 0) + bizs.reduce((s: number, b: any) => s + b.value, 0) + vehicles.reduce((s: number, v: any) => s + v.value, 0));
    const will = this.player.will ?? {};
    const bequests = will.bequests ?? {};
    const lines: string[] = [];
    lines.push(`Bank $${bank.toLocaleString()} → ${bequests.cash ?? will.heir ?? 'estate'}`);
    for (const p of props) lines.push(`Property ${p.name} ($${p.value.toLocaleString()}) → ${bequests.properties ?? will.heir ?? 'estate'}`);
    for (const b of bizs) lines.push(`Business ${b.name} ($${b.value.toLocaleString()}) → ${bequests.businesses ?? will.heir ?? 'estate'}`);
    for (const v of vehicles) lines.push(`Vehicle ${v.name} ($${v.value.toLocaleString()}) → ${bequests.vehicles ?? will.heir ?? 'estate'}`);
    return { total, lines, perBusiness: bizs };
  }

  // ---- §38 ITEM 35b — INSURANCE ----
  private insurancePolicies(): Record<string, true> {
    if (!this.player.insurance || typeof this.player.insurance !== 'object') this.player.insurance = {};
    return this.player.insurance;
  }

  private insuranceView(): GameAction {
    const policies = this.insurancePolicies();
    const keys = Object.keys(policies);
    const lines = keys.length === 0
      ? 'No active policies.'
      : keys.map((k) => {
          const [type, target] = k.split(':');
          const prem = type === 'health' ? INSURANCE_PREMIUMS.health : type === 'property' ? INSURANCE_PREMIUMS.property : type === 'vehicle' ? INSURANCE_PREMIUMS.vehicle : INSURANCE_PREMIUMS.business;
          return `• ${type}${target ? ` (${target})` : ''} — $${prem}/mo, current`;
        }).join('\n');
    return { success: true, message: `🛡️ **Insurance**\n${lines}\n\nPremiums: health $30/mo, property $25/mo/property, vehicle $20/mo/vehicle, business $40/mo/business. A missed premium lapses the policy + notice; re-insure anytime.\n\nClaims (1 per policy per game-month, verified losses only): property 80% of a repair paid this month (cap $500), vehicle 80% (cap $300), business 80% of a tick-recorded negative monthly net (cap $400), health flat $150 benefit + health +10 when health < 50 (a benefit, not a reimbursement — no cash-cost health event exists in the game).\n\nCommands: insure [type] [target?] | uninsure [type] [target?] | claim [type] [target?]` };
  }

  private insureView(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    const type = (parts[0] ?? '').toLowerCase();
    const targetArg = parts.slice(1).join(' ');
    if (!['health', 'property', 'vehicle', 'business'].includes(type)) return { success: false, message: 'Usage: insure [health|property|vehicle|business] [target?].' };
    let key: string;
    if (type === 'health') {
      key = 'health';
    } else if (type === 'property') {
      const resolved = resolveNamed(this.player.properties ?? [], targetArg, (p: any) => p.name);
      if (!resolved.item) return { success: false, message: `You don't own a property matching "${targetArg}".` };
      key = `property:${resolved.item.id}`;
    } else if (type === 'vehicle') {
      const resolved = resolveNamed(this.player.vehicles ?? [], targetArg, (v: any) => v.name);
      if (!resolved.item) return { success: false, message: `You don't own a vehicle matching "${targetArg}".` };
      key = `vehicle:${resolved.item.id}`;
    } else {
      const resolved = resolveNamed(ownedBusinesses(this.player), targetArg, (b: any) => b.name);
      if (!resolved.item) return { success: false, message: `You don't own a business matching "${targetArg}".` };
      key = `business:${resolved.item.id}`;
    }
    const policies = this.insurancePolicies();
    if (policies[key]) return { success: false, message: `That policy is already active.` };
    policies[key] = true;
    return { success: true, message: `🛡️ Insured: ${key.replace(':', ' ')}. Premium charged on the monthly tick.` };
  }

  private uninsureView(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    const type = (parts[0] ?? '').toLowerCase();
    const targetArg = parts.slice(1).join(' ');
    if (!['health', 'property', 'vehicle', 'business'].includes(type)) return { success: false, message: 'Usage: uninsure [health|property|vehicle|business] [target?].' };
    const policies = this.insurancePolicies();
    if (type === 'health') {
      if (!policies['health']) return { success: false, message: 'No active health policy.' };
      delete policies['health'];
      return { success: true, message: '🛡️ Health policy cancelled.' };
    }
    const pool = type === 'property' ? (this.player.properties ?? []) : type === 'vehicle' ? (this.player.vehicles ?? []) : ownedBusinesses(this.player);
    const resolved = resolveNamed(pool, targetArg, (x: any) => x.name);
    if (!resolved.item) return { success: false, message: `No ${type} matching "${targetArg}".` };
    const key = `${type}:${resolved.item.id}`;
    if (!policies[key]) return { success: false, message: `No active policy on ${resolved.item.name}.` };
    delete policies[key];
    return { success: true, message: `🛡️ Policy on ${resolved.item.name} cancelled.` };
  }

  private claimView(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/);
    const type = (parts[0] ?? '').toLowerCase();
    const targetArg = parts.slice(1).join(' ');
    if (!['health', 'property', 'vehicle', 'business'].includes(type)) return { success: false, message: 'Usage: claim [health|property|vehicle|business] [target?].' };
    const monthKey = this.time.getMonthKey();
    const policies = this.insurancePolicies();
    if (!this.player.insuranceClaims) this.player.insuranceClaims = {};
    let key: string;
    let target: any = null;
    if (type === 'health') {
      key = 'health';
    } else {
      const pool = type === 'property' ? (this.player.properties ?? []) : type === 'vehicle' ? (this.player.vehicles ?? []) : ownedBusinesses(this.player);
      const resolved = resolveNamed(pool, targetArg, (x: any) => x.name);
      if (!resolved.item) return { success: false, message: `No ${type} matching "${targetArg}" — uncovered target.` };
      target = resolved.item;
      key = `${type}:${target.id}`;
    }
    if (!policies[key]) return { success: false, message: `No active policy for that ${type} — claims need a current policy.` };
    if (this.player.insuranceClaims[key] === monthKey) return { success: false, message: `That policy already paid a claim this game-month (1 per policy per month).` };
    if (type === 'health') {
      if ((this.player.health ?? 100) >= 50) return { success: false, message: `Health claims pay when measured health is below 50 (yours is ${this.player.health ?? 100}).` };
      this.player.money = roundCents((this.player.money ?? 0) + INSURANCE_CLAIM_CAPS.health);
      this.player.health = Math.min(100, (this.player.health ?? 0) + 10);
      this.player.insuranceClaims[key] = monthKey;
      return { success: true, message: `🛡️ Health benefit paid: $150 + health +10 (flat benefit, not a reimbursement).` };
    }
    if (type === 'property' || type === 'vehicle') {
      const receipts = (this.player.repairPayments ?? {})[type] ?? {};
      const receipt = receipts[target.id];
      if (!receipt || receipt.month !== monthKey || !(receipt.amount > 0)) {
        return { success: false, message: `No verified loss: no ${type} repair was actually paid this game-month for ${target.name}. Repair first with cash, then claim.` };
      }
      const payout = Math.min(INSURANCE_CLAIM_CAPS[type], roundCents(receipt.amount * 0.8));
      this.player.money = roundCents((this.player.money ?? 0) + payout);
      this.player.insuranceClaims[key] = monthKey;
      return { success: true, message: `🛡️ Claim paid: $${payout.toLocaleString()} (80% of the $${receipt.amount.toLocaleString()} repair, capped at $${INSURANCE_CLAIM_CAPS[type]}).` };
    }
    // business: verified loss = a tick-recorded negative monthly net
    const nets = this.player.lastBusinessNets ?? {};
    const net = nets[target.id];
    if (!(net < 0)) {
      return { success: false, message: `No verified loss: ${target.name} did not post a negative monthly net last tick.` };
    }
    const payout = Math.min(INSURANCE_CLAIM_CAPS.business, roundCents(Math.abs(net) * 0.8));
    this.player.money = roundCents((this.player.money ?? 0) + payout);
    this.player.insuranceClaims[key] = monthKey;
    return { success: true, message: `🛡️ Claim paid: $${payout.toLocaleString()} (80% of the $${Math.abs(net).toLocaleString()} negative monthly net, capped at $400).` };
  }

  // ---- §39 ITEM 36 — HOURLY OVERTIME (distinct from the §7 full-shift overtime) ----
  private overtimeHoursView(rawArgs: string): GameAction {
    const hours = parseInt(rawArgs.trim(), 10);
    if (Number.isNaN(hours) || hours < 1 || hours > 4) return { success: false, message: 'Usage: overtime [hours] — 1 to 4 hours per call.' };
    if (!this.player.job) return { success: false, message: 'No job — overtime needs employment. Type "apply" to see openings.' };
    const today = this.time.formatDate();
    const weekKey = weekKeyFromDate(today);
    if (this.player.overtimeDayDate !== today) { this.player.overtimeDayDate = today; this.player.overtimeDayHours = 0; }
    if (this.player.overtimeWeekKey !== weekKey) { this.player.overtimeWeekKey = weekKey; this.player.overtimeWeekHours = 0; }
    const dayUsed = this.player.overtimeDayHours ?? 0;
    const weekUsed = this.player.overtimeWeekHours ?? 0;
    if (dayUsed + hours > 4) return { success: false, message: `Daily overtime cap: 4 hrs/day. You have ${4 - dayUsed} hr${4 - dayUsed === 1 ? '' : 's'} left today.` };
    if (weekUsed + hours > 12) return { success: false, message: `Weekly overtime cap: 12 hrs/week. You have ${12 - weekUsed} hr${12 - weekUsed === 1 ? '' : 's'} left this week.` };
    if ((this.player.energy ?? 0) < 5 * hours) return { success: false, message: `Not enough energy: overtime costs 5 energy/hr (${5 * hours} needed, you have ${this.player.energy ?? 0}).` };
    const hourlyRate = (this.player.job as any).hourlyPay || ((this.player.job as any).basePay / 2080);
    const pay = roundCents(hourlyRate * 1.5 * hours);
    this.player.money = roundCents((this.player.money ?? 0) + pay);
    this.trackTaxIncome(pay);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - 5 * hours);
    this.player.stress = Math.min(100, (this.player.stress ?? 0) + 2 * hours);
    this.time.advance({ hours, minutes: 0 });
    let exhaustNote = '';
    if (this.player.energy === 0) {
      this.player.health = Math.max(0, (this.player.health ?? 100) - 3);
      exhaustNote = ' ⚠️ Worked to exhaustion — health −3.';
    }
    this.player.overtimeDayHours = dayUsed + hours;
    this.player.overtimeWeekHours = weekUsed + hours;
    return { success: true, message: `💼 Overtime: ${hours} hr${hours === 1 ? '' : 's'} at 1.5× ($${hourlyRate.toFixed(2)}/hr) = $${pay.toFixed(2)}. Energy −${5 * hours}, stress +${2 * hours}.${exhaustNote}`, challengeContributions: { earnings: pay } };
  }
  // ---- §§40-41 ITEM 37 — OFFICES (real institutions, real process, roster people only) ----
  private officeJurisdiction(officeKey: string): string {
    if (officeKey === 'mayor') return cityDisplay(this.player.city);
    if (officeKey === 'governor') return stateNameForCity(this.player.city);
    return countryNameForCity(this.player.city);
  }

  private officeScopeNpcs(officeKey: string): any[] {
    const all = this.social.getAllNPCs();
    if (officeKey === 'mayor') return all.filter((n: any) => n.city === this.player.city);
    if (officeKey === 'governor') {
      const code = stateCodeForCity(this.player.city);
      if (!code) return [];
      return all.filter((n: any) => stateCodeForCity(n.city) === code);
    }
    const country = (WORLD_CITIES as Record<string, any>)[this.player.city]?.country;
    return all.filter((n: any) => (WORLD_CITIES as Record<string, any>)[n.city]?.country === country);
  }

  private pickIncumbent(officeKey: string): any | null {
    const scope = this.officeScopeNpcs(officeKey);
    const gov = scope.filter((n: any) => GOV_ROLE_SET.has(n.role));
    const pool = gov.length > 0 ? gov : scope;
    if (pool.length === 0) return null;
    let best = pool[0];
    for (const n of pool) {
      if (roleTierRank(n.role) > roleTierRank(best.role)) best = n;
    }
    return best;
  }

  private pickRivals(officeKey: string): any[] {
    const scope = this.officeScopeNpcs(officeKey);
    const gov = scope.filter((n: any) => GOV_ROLE_SET.has(n.role));
    const rest = scope.filter((n: any) => !GOV_ROLE_SET.has(n.role));
    return [...gov, ...rest].slice(0, 2);
  }

  private officesView(): GameAction {
    const lines = (['mayor', 'governor', 'president'] as const).map((key) => {
      const def = OFFICE_DEFS[key]!;
      const inc = this.pickIncumbent(key);
      const incName = inc ? `${inc.name} (${inc.role.replace(/_/g, ' ')})` : 'Vacant (no candidate filed)';
      return `• ${def.title} — ${this.officeJurisdiction(key)} — incumbent: ${incName} — filing $${def.fee}, salary $${def.salary}/mo, 48-month term`;
    }).join('\n');
    const office = this.player.office;
    const officeLine = office
      ? `\n\nYou hold office: ${OFFICE_DEFS[office.key]?.title} of ${office.jurisdiction} (term ends ${office.endMonthKey}).`
      : '';
    const cand = this.player.candidacy;
    const candLine = cand
      ? `\n\nYour candidacy: ${OFFICE_DEFS[cand.office]?.title} of ${cand.jurisdiction} — ${cand.events} campaign event${cand.events === 1 ? '' : 's'}, score ${cand.campaignScore}.`
      : '';
    return { success: true, message: `🏛️ **Offices**\n${lines}${officeLine}${candLine}\n\nOffices are earned through their own full cycle — filing, campaigning, election, term — no shortcuts, no skipping steps. Holding office replaces your job slot; vacating leaves you unemployed until you re-apply.\n\nCommands: file [office] | campaign [rally|canvass|ad] | election | office | decide [option] | resign | gov jobs` };
  }

  private fileOfficeView(rawArgs: string): GameAction {
    const key = rawArgs.trim().toLowerCase();
    const def = OFFICE_DEFS[key];
    if (!def) return { success: false, message: 'Usage: file [mayor|governor|president].' };
    if (this.player.office) return { success: false, message: `You already hold office (${OFFICE_DEFS[this.player.office.key]?.title}) — finish or resign that term before filing for another.` };
    if (this.player.candidacy) return { success: false, message: `You are already running for ${OFFICE_DEFS[this.player.candidacy.office]?.title} — finish that election first.` };
    const rep = this.player.reputation?.community ?? 0;
    if ((this.player.ageYears ?? 18) < 18) return { success: false, message: `Eligibility failed: Mayor requires age 18+ (you are ${this.player.ageYears ?? 18}).` };
    if (rep < def.repGate) return { success: false, message: `Eligibility failed: ${def.title} requires community reputation ${def.repGate}+ (${civicTitle(rep)} — you have ${rep}).` };
    if (key === 'governor') {
      if (!stateCodeForCity(this.player.city)) return { success: false, message: 'Eligibility failed: Governor requires a US state jurisdiction — your current city has none.' };
      if (!((this.player.completedTerms ?? {}).mayor > 0)) return { success: false, message: 'Eligibility failed: Governor requires a COMPLETED Mayor term (resigning mid-term earns no credit).' };
    }
    if (key === 'president') {
      if (!((this.player.completedTerms ?? {}).governor > 0)) return { success: false, message: 'Eligibility failed: President requires a COMPLETED Governor term (resigning mid-term earns no credit).' };
    }
    const monthKey = this.time.getMonthKey();
    const cooldown = (this.player.officeCooldowns ?? {})[key];
    if (cooldown && monthKey < cooldown) return { success: false, message: `Cooldown: you lost the ${def.title} election recently — you may re-file after ${cooldown} (3 game-months).` };
    if ((this.player.money ?? 0) < def.fee) return { success: false, message: `Filing for ${def.title} costs $${def.fee}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - def.fee);
    this.player.candidacy = { office: key, jurisdiction: this.officeJurisdiction(key), filedMonthKey: monthKey, campaignScore: 0, events: 0 };
    appendJournalLog(this.player, this.time.formatDate(), `Filed for ${def.title} of ${this.player.candidacy.jurisdiction} ($${def.fee}).`);
    return { success: true, message: `🏛️ Filed for ${def.title} of ${this.player.candidacy.jurisdiction} ($${def.fee}). Now campaign: "campaign rally" ($200, +8), "campaign canvass" (+5), "campaign ad" ($500, +12). You need at least ${def.minEvents} campaign events before "election".` };
  }

  private campaignView(rawArgs: string): GameAction {
    const cand = this.player.candidacy;
    if (!cand) return { success: false, message: 'You are not running for office. File first: "file [mayor|governor|president]".' };
    const kind = rawArgs.trim().toLowerCase();
    if (kind === 'rally') {
      if ((this.player.money ?? 0) < 200) return { success: false, message: `A rally costs $200. You have $${(this.player.money ?? 0).toFixed(2)}.` };
      if ((this.player.energy ?? 0) < 10) return { success: false, message: `A rally costs 10 energy. You have ${this.player.energy ?? 0}.` };
      this.player.money = roundCents((this.player.money ?? 0) - 200);
      this.player.energy = (this.player.energy ?? 0) - 10;
      cand.campaignScore += 8; cand.events += 1;
      return { success: true, message: `📣 Rally held! Campaign score +8 (now ${cand.campaignScore}), events ${cand.events}.` };
    }
    if (kind === 'canvass') {
      if ((this.player.energy ?? 0) < 5) return { success: false, message: `Canvassing costs 5 energy. You have ${this.player.energy ?? 0}.` };
      this.player.energy = (this.player.energy ?? 0) - 5;
      cand.campaignScore += 5; cand.events += 1;
      return { success: true, message: `🚪 Canvassed! Campaign score +5 (now ${cand.campaignScore}), events ${cand.events}.` };
    }
    if (kind === 'ad') {
      if ((this.player.money ?? 0) < 500) return { success: false, message: `An ad costs $500. You have $${(this.player.money ?? 0).toFixed(2)}.` };
      this.player.money = roundCents((this.player.money ?? 0) - 500);
      cand.campaignScore += 12; cand.events += 1;
      return { success: true, message: `📺 Ad run! Campaign score +12 (now ${cand.campaignScore}), events ${cand.events}.` };
    }
    return { success: false, message: 'Usage: campaign [rally|canvass|ad].' };
  }

  private electionView(): GameAction {
    const cand = this.player.candidacy;
    if (!cand) return { success: false, message: 'You are not running for office. File first: "file [mayor|governor|president]".' };
    const def = OFFICE_DEFS[cand.office]!;
    if (cand.events < def.minEvents) return { success: false, message: `Election refused: ${def.title} needs at least ${def.minEvents} campaign events (you have ${cand.events}). Campaign more first.` };
    const terms = this.player.completedTerms ?? {};
    const totalTerms = (terms.mayor ?? 0) + (terms.governor ?? 0) + (terms.president ?? 0);
    const incumbency = (terms[cand.office] ?? 0) > 0 ? 5 : 0;
    const playerScore = (this.player.reputation?.community ?? 0) + cand.campaignScore + 10 * totalTerms + incumbency;
    const rivals = this.pickRivals(cand.office);
    const rivalLines = rivals.map((r) => {
      const s = rivalScore(r, cand.office);
      return `• ${r.name} (${r.role.replace(/_/g, ' ')}) — ${s}`;
    });
    const rivalScores = rivals.map((r) => rivalScore(r, cand.office));
    const won = rivalScores.every((s) => playerScore > s);
    if (!won) {
      this.player.candidacy = null;
      this.player.officeCooldowns = { ...(this.player.officeCooldowns ?? {}), [cand.office]: addMonths(this.time.getMonthKey(), 3) };
      appendJournalLog(this.player, this.time.formatDate(), `Lost the ${def.title} election.`);
      return { success: true, message: `🗳️ **Election — ${def.title} of ${cand.jurisdiction}**\nYour score: ${playerScore} (rep ${this.player.reputation?.community ?? 0} + campaign ${cand.campaignScore} + terms ${10 * totalTerms}${incumbency ? ' + incumbency 5' : ''})\nRivals:\n${rivalLines.join('\n') || '• Vacant (no candidate filed)'}\n\nYou LOST — a win needs a score strictly above both rivals (ties lose). You may re-file after a 3-game-month cooldown (plus a new fee).` };
    }
    const startMonthKey = this.time.getMonthKey();
    this.player.candidacy = null;
    this.player.office = { key: cand.office, jurisdiction: cand.jurisdiction, startMonthKey, endMonthKey: addMonths(startMonthKey, OFFICE_TERM_MONTHS) };
    const prevJob = this.player.job ? `${this.player.job.title} @ ${this.player.job.employer}` : null;
    this.player.job = null;
    this.player.jobTenure = 0;
    this.player.promotions = 0;
    appendJournalLog(this.player, this.time.formatDate(), `Won the ${def.title} election for ${cand.jurisdiction}.`);
    return { success: true, message: `🗳️ **Election — ${def.title} of ${cand.jurisdiction}**\nYour score: ${playerScore}\nRivals:\n${rivalLines.join('\n') || '• Vacant (no candidate filed)'}\n\n🎉 You WON! You are now ${def.title} of ${cand.jurisdiction} for 48 game-months (salary $${def.salary}/mo, taxed as income).${prevJob ? `\n\nOffice replaces your job slot: your job as ${prevJob} is vacated. When the term ends you will be unemployed until you re-apply.` : ''}\n\nServe with "decide [infrastructure|event|tax]" once per game-month.` };
  }

  private officeView(): GameAction {
    const office = this.player.office;
    if (!office) {
      const cand = this.player.candidacy;
      if (cand) return { success: true, message: `🏛️ You hold no office. You are running for ${OFFICE_DEFS[cand.office]?.title} of ${cand.jurisdiction} (${cand.events} events, score ${cand.campaignScore}). Type "election" when ready.` };
      return { success: true, message: '🏛️ You hold no office. Type "offices" to see the offices and "file [office]" to run.' };
    }
    const def = OFFICE_DEFS[office.key]!;
    const monthKey = this.time.getMonthKey();
    const dutyDone = this.player.dutyDoneMonth === monthKey;
    return { success: true, message: `🏛️ **Your office — ${def.title} of ${office.jurisdiction}**\nTerm: ${office.startMonthKey} → ${office.endMonthKey} (48 months)\nSalary: $${def.salary}/mo (taxed as income)\nThis month's duty: ${dutyDone ? 'done' : 'NOT done — "decide [infrastructure|event|tax]" (missed month: rep −2)'}` };
  }

  private decideView(rawArgs: string): GameAction {
    const office = this.player.office;
    if (!office) return { success: false, message: 'You hold no office — duties come with office. Type "offices" to run.' };
    const monthKey = this.time.getMonthKey();
    if (this.player.dutyDoneMonth === monthKey) return { success: false, message: 'You already decided this game-month — one decision per month.' };
    const opt = rawArgs.trim().toLowerCase();
    if (opt === 'infrastructure') {
      this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 5);
      this.player.dutyDoneMonth = monthKey;
      return { success: true, message: '🏗️ Decision: infrastructure investment. Community reputation +5.' };
    }
    if (opt === 'event') {
      this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + 5);
      this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 3);
      this.player.dutyDoneMonth = monthKey;
      return { success: true, message: '🎉 Decision: community event. Happiness +5, community reputation +3.' };
    }
    if (opt === 'tax') {
      this.player.taxReliefPending = true;
      this.player.dutyDoneMonth = monthKey;
      return { success: true, message: '🧾 Decision: tax relief. Your next tax bill is reduced by 10% (applied when you file).' };
    }
    return { success: false, message: 'Usage: decide [infrastructure|event|tax] — one decision per game-month.' };
  }

  private resignView(): GameAction {
    const office = this.player.office;
    if (!office) return { success: false, message: 'You hold no office to resign from.' };
    const def = OFFICE_DEFS[office.key]!;
    this.player.office = null;
    appendJournalLog(this.player, this.time.formatDate(), `Resigned as ${def.title} of ${office.jurisdiction} (no completed-term credit).`);
    return { success: true, message: `🏛️ Resigned as ${def.title} of ${office.jurisdiction}. No completed-term credit — a resigned term does not count toward the next office's ladder. You are unemployed until you re-apply for a job.` };
  }

  private govJobsView(): GameAction {
    const cats = ['government', 'federal', 'political', 'emergency'];
    const jobs = ALL_JOBS.filter((j: any) => cats.includes(j.category));
    const groups: Record<string, any[]> = { 'City Hall': [], 'State Capitol': [], 'Federal Agency': [], 'Courts': [], 'Legislature': [] };
    for (const j of jobs) groups[govEntityForJob(j)]!.push(j);
    const sections = Object.entries(groups).map(([entity, list]) => {
      if (list.length === 0) return `**${entity}**\nNo current openings in the jobs database.`;
      const lines = list.map((j: any) => `• ${j.title} @ ${j.employer} — ${cityDisplay(j.city)} — $${j.hourlyPay}/hr`).join('\n');
      return `**${entity}**\n${lines}`;
    }).join('\n\n');
    return { success: true, message: `🏛️ **Government entity jobs** (from the jobs database — every listing below is holdable via "apply [job]" while you are in its city)\n\n${sections}\n\nApply with "apply [job title]".` };
  }
  // ---- §42 ITEM 38 — CAREERS ----
  private careersView(): GameAction {
    const held = this.player.certifications ?? [];
    const gpa = careerGPA(this.player);
    const sections = CAREER_PATHS.map((p) => {
      const lines = p.rungs.map((r, i) => {
        const job = ALL_JOBS.find((j: any) => j.id === r.jobId);
        const title = job ? `${job.title} @ ${job.employer}` : r.jobId;
        const certNote = r.cert ? (held.includes(r.cert) ? `cert ${r.cert} ✓` : `needs cert ${r.cert}`) : 'no cert required';
        const gpaNote = r.gpaBar ? `, GPA ≥ ${r.gpaBar} (yours ${gpa})` : '';
        return `  ${i + 1}. ${title} — ${certNote}${gpaNote}`;
      }).join('\n');
      return `**${p.path}**\n${lines}`;
    }).join('\n\n');
    return { success: true, message: `💼 **Career paths** (your GPA for gates: ${gpa}; old saves without GPA read as 2.5)\n\n${sections}\n\nApply for a rung with "apply [job title]". A mapped rung refuses without its cert, naming the course and school.` };
  }

  // ---- §44 ITEM 40 — GPA / EXAMS / GRADUATION ----

  // ================================================================
  // v0.108.24 — expansion methods (helpers first, then one block per
  // item; all money in whole cents, all perks discount-only).
  // ================================================================
  private monthKeyNow(): string {
    const d = this.time.currentTime;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private gameDateISO(): string {
    const d = this.time.currentTime;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private resolveCityId(dest: string): { id: string } | { error: string } {
    const q = dest.trim().toLowerCase();
    const cityIds = Object.keys(WORLD_CITIES) as string[];
    const exact = cityIds.find((id) => id === q);
    if (exact) return { id: exact };
    const resolved = resolveNamed(
      cityIds.map((id) => ({ id, name: WORLD_CITIES[id as keyof typeof WORLD_CITIES]?.displayName ?? id })),
      dest,
      (c) => c.name,
    );
    if (resolved.ambiguous) return { error: `Multiple cities match "${dest}": ${resolved.ambiguous.join(', ')}. Type the full city name.` };
    if (resolved.item) return { id: resolved.item.id };
    return { error: `City "${dest}" not found. Try: Memphis, Little Rock, Southaven, Nashville, Atlanta, Chicago, etc.` };
  }

  private jobIdOf(): string {
    const j: any = this.player.job;
    return j?.id ?? j?.jobId ?? '';
  }

  // Engine-consistent work-pay weather modifier. v0.108.24 adds the two
  // NEW conditions that actually change pay (snowy, humid) and leaves
  // every pre-existing condition's modifier exactly as it was — the
  // .24 world module's table differs on rainy/stormy, and silently
  // repricing old weather would change live shift pay.
  private engineWorkModifier(condition: string): number {
    if (condition === 'stormy' || condition === 'rainy') return 0.85;
    if (condition === 'hot') return 0.95;
    if (condition === 'snowy') return 0.90;
    if (condition === 'humid') return 0.95;
    return 1.0;
  }

  // ---- v0.108.24 item 2 — IDENTIFICATION ----
  private idView(rawArgs: string): GameAction {
    const monthKey = this.monthKeyNow();
    const docs = this.player.identityDocs ?? [];
    const parts = rawArgs.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const typeOf = (w: string): 'state_id' | 'drivers_license' | 'passport' | null =>
      w === 'card' || w === 'state' || w === 'id' ? 'state_id'
      : w === 'license' || w === 'drivers' ? 'drivers_license'
      : w === 'passport' ? 'passport' : null;
    if (parts[0] === 'renew') {
      const type = typeOf(parts[1] ?? '');
      if (!type) return { success: false, message: 'Usage: id renew [card|license|passport].' };
      const def = ID_DEFS[type];
      const st = idStatus(docs, monthKey)[type];
      if (st.status === 'none') return { success: false, message: `You don't hold a ${def.label} yet. Get one with "id ${type === 'state_id' ? 'card' : type === 'drivers_license' ? 'license' : 'passport'}" ($${def.cost}).` };
      if ((this.player.money ?? 0) < def.renewalCost) return { success: false, message: `Renewing your ${def.label} costs $${def.renewalCost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
      this.player.money = roundCents((this.player.money ?? 0) - def.renewalCost);
      this.player.identityDocs = renewId(docs, type, monthKey);
      const after = idStatus(this.player.identityDocs, monthKey)[type];
      return { success: true, message: `🪪 ${def.label} renewed for $${def.renewalCost}. Valid through ${after.expiresAt}. Perk: ${def.perkLabel}.` };
    }
    if (parts.length === 0) {
      const st = idStatus(docs, monthKey);
      const lines = (Object.keys(ID_DEFS) as (keyof typeof ID_DEFS)[]).map((t) => {
        const def = ID_DEFS[t];
        const s = st[t];
        const state = s.status === 'valid' ? `✅ Valid through ${s.expiresAt}` : s.status === 'expired' ? `⌛ Expired ${s.expiresAt} — renew with "id renew ${t === 'state_id' ? 'card' : t === 'drivers_license' ? 'license' : 'passport'}" ($${def.renewalCost})` : `— Not held — get one with "id ${t === 'state_id' ? 'card' : t === 'drivers_license' ? 'license' : 'passport'}" ($${def.cost})`;
        return `• ${def.label}: ${state} (perk: ${def.perkLabel})`;
      }).join('\n');
      return { success: true, message: `🪪 **Identification**\n${'─'.repeat(40)}\n${lines}\n\nIDs are perks only — a missing or expired ID never blocks an action; it just pays full price.` };
    }
    const type = typeOf(parts[0]!);
    if (!type) return { success: false, message: 'Usage: id [card|license|passport] — or bare "id" to see what you hold.' };
    const def = ID_DEFS[type];
    const st = idStatus(docs, monthKey)[type];
    if (st.status === 'valid') return { success: false, message: `Your ${def.label} is already valid through ${st.expiresAt}. Renew it with "id renew ${parts[0]}" ($${def.renewalCost}) when it nears expiry.` };
    if ((this.player.money ?? 0) < def.cost) return { success: false, message: `A ${def.label} costs $${def.cost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - def.cost);
    this.player.identityDocs = issueId(docs, type, monthKey);
    const after = idStatus(this.player.identityDocs, monthKey)[type];
    return { success: true, message: `🪪 ${def.label} issued for $${def.cost}. Valid through ${after.expiresAt}. Perk: ${def.perkLabel}.` };
  }

  private idDiscount(action: 'roadtrip_fuel' | 'international_fare' | 'services'): number {
    return idPerkFor(action, this.player.identityDocs ?? [], this.monthKeyNow());
  }

  // ---- v0.108.24 item 3 — CRIMINAL RECORDS (computed view + expunge) ----
  private recordView(): GameAction {
    const summary = buildCriminalRecord(this.player as any);
    const arrests = this.player.prisonRecord?.arrests || 0;
    const parole = this.player.prisonRecord?.paroleEligible ? 'Yes' : 'No';
    if (summary.totalEntries === 0 && arrests === 0) {
      return { success: true, message: '✅ You have a clean record. Stay that way.' };
    }
    const entryLines = summary.entries.map((e, i) =>
      `  ${i + 1}. ${e.offense} (${e.severity}${e.date ? `, ${e.date}` : ', date unknown — legacy entry, cannot be expunged'})`).join('\n');
    const cons = summary.consequences.length > 0 ? `\n\n**What this means for NEW applications:**\n${summary.consequences.map((c) => `• ${c}`).join('\n')}` : '';
    return {
      success: true,
      message: `📋 **CRIMINAL RECORD**\n${'─'.repeat(40)}\nTier: ${summary.tier}\nArrests: ${arrests}\nParole: ${parole}\nHeat: ${this.player.heat || 0}/100\nOffenses (${summary.totalEntries}):\n${entryLines || '  None'}\nOutstanding fines: $${(summary.outstandingFines ?? 0).toLocaleString()} | Open cases: ${summary.openCases}${cons}\n\nTip: Use "laylow" to let heat cool down. Expunge a minor entry with "lawyer expunge [number]" ($${EXPUNGE_COST}, needs ${EXPUNGE_CLEAN_MONTHS} clean game-months and no newer offense).`,
    };
  }

  private expungeEntry(rawArgs: string): GameAction {
    const n = parseInt(rawArgs.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return { success: false, message: 'Usage: lawyer expunge [number] — type "record" to see numbered entries.' };
    const summary = buildCriminalRecord(this.player as any);
    const entry = summary.entries[n - 1];
    if (!entry) return { success: false, message: `No record entry #${n}. Type "record" to see numbered entries.` };
    const result = expungeRecord(this.player as any, entry, this.monthKeyNow());
    if (!result.success) return { success: false, message: `⚖️ Cannot expunge entry #${n} (${entry.offense}): ${result.reason}` };
    if ((this.player.money ?? 0) < result.cost) return { success: false, message: `Expunging entry #${n} costs $${result.cost}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - result.cost);
    this.player.criminalRecord = result.remaining as any;
    return { success: true, message: `⚖️ Entry #${n} (${entry.offense}) expunged for $${result.cost}. It no longer counts against new applications. Fines, open cases, and arrest counts are untouched.` };
  }

  // ---- v0.108.24 item 4 — TRANSIT ----
  private transitRouteInput(toCity: string): { route: { fromCity: string; toCity: string; baseCost: number; baseHours: number }; routed: boolean } {
    const route = TRAVEL_ROUTES.find((r) => r.from === this.player.city && r.to === toCity);
    return route
      ? { route: { fromCity: this.player.city, toCity, baseCost: route.cost, baseHours: route.timeHours }, routed: true }
      : { route: { fromCity: this.player.city, toCity, baseCost: 50, baseHours: 3 }, routed: false };
  }

  private transitView(rawArgs: string): GameAction {
    const arg = rawArgs.trim();
    if (arg.toLowerCase() === 'pass') {
      const week = weekKeyFromDate(this.time.formatDate());
      if (this.player.transitPassWeek === week) return { success: false, message: `You already hold a transit pass for this game-week.` };
      if ((this.player.money ?? 0) < 30) return { success: false, message: `A transit pass costs $30. You have $${(this.player.money ?? 0).toFixed(2)}.` };
      this.player.money = roundCents((this.player.money ?? 0) - 30);
      this.player.transitPassWeek = week;
      return { success: true, message: `🎫 Transit pass bought for $30 — 20% off routed bus/drive fares for this game-week. Flights and the $50 fallback connection are excluded.` };
    }
    if (!arg) {
      const city = this.player.city;
      const stations = [
        `• ${cityShortName(city)} Bus Station — bus service to every city.`,
        `• ${cityShortName(city)} Train Station — train service to every city.`,
        hasAirport(city)
          ? `• ${cityShortName(city)} Airport — flights to the 15 airport cities.`
          : `• No airport in ${cityShortName(city)} — flights run only between airport cities (type "stations" elsewhere or "transit [city]" to check a route).`,
      ].join('\n');
      const passNote = this.player.transitPassWeek === weekKeyFromDate(this.time.formatDate())
        ? '🎫 You hold a transit pass this week (20% off routed bus/drive fares).'
        : '🎫 No pass this week — "transit pass" buys one for $30.';
      return { success: true, message: `🚉 **Stations — ${cityShortName(city)}**\n${stations}\n\n${passNote}\nCompare fares for a trip with "transit [city]", then book with "travel [city] by [bus|train|airport]".` };
    }
    const dest = arg.replace(/^to\s+(the\s+)?/i, '');
    const resolved = this.resolveCityId(dest);
    if ('error' in resolved) return { success: false, message: resolved.error };
    const toCity = resolved.id;
    if (toCity === this.player.city) return { success: false, message: `You're already in ${cityShortName(toCity)}.` };
    const { route, routed } = this.transitRouteInput(toCity);
    const options = TRANSIT_MODES.map((m) => transitOption(route, m));
    const lines = options.map((o) => {
      const fare = (o.fareCents / 100).toFixed(2);
      return o.available
        ? `• ${o.mode.toUpperCase()} — $${fare}, ${o.timeHours}h — ${o.fromStation} → ${o.toStation}. ${o.note}`
        : `• ${o.mode.toUpperCase()} — unavailable. ${o.note}`;
    }).join('\n');
    return {
      success: true,
      message: `🚉 **Transit — ${cityShortName(this.player.city)} → ${cityShortName(toCity)}**${routed ? '' : ' (no direct route data — fares derive from the $50 / 3h fallback connection)'}\n${lines}\n\nBook with "travel ${cityShortName(toCity)} by [bus|train|airport]".`,
    };
  }

  private stationsView(): GameAction {
    return this.transitView('');
  }

  // ---- v0.108.24 item 5 — WEATHER ----
  private weatherView(): GameAction {
    const w = getWeather(this.time.currentTime, this.player.city);
    const eff = weatherEffects(w.condition as any);
    const mod = this.engineWorkModifier(w.condition);
    const workLine = mod === 1.0 ? 'Work pay: no weather change.' : `Work pay: ×${mod} today.`;
    const severe = w.condition === 'stormy' || w.condition === 'snowy';
    const severeLine = severe ? '\n⚠️ Severe weather: routed travel takes +1h, and traveling today costs −2 happiness once and −1 condition on your properties here (floored at 0).' : '';
    return {
      success: true,
      message: `🌤️ **Weather — ${cityShortName(this.player.city)}**\n${w.condition}, ${w.temp}°F, humidity ${w.humidity}%\n${workLine}\nTravel: ${eff.travelDelayNote}\nMood: ${eff.moodNote}\nEvents: ${eff.eventNote}${severeLine}\n\nSee the 3-day outlook with "forecast" (today exact, next days as chance bands).`,
    };
  }

  private forecastView(): GameAction {
    const city = this.player.city;
    const fc = forecastFor(city, this.gameDateISO());
    const today = getWeather(this.time.currentTime, city);
    const lines = fc.days.map((d, i) => {
      if (i === 0) return `• ${d.dateISO} (today): ${today.condition}, ${today.temp}°F — current conditions.`;
      return `• ${d.dateISO}: ${d.outlook}`;
    }).join('\n');
    return { success: true, message: `🔮 **3-Day Forecast — ${fc.cityDisplayName}**\n${lines}\n\nOutlook days are chance bands, never guarantees — check "weather" for today's exact conditions.` };
  }

  // ---- v0.108.24 item 7 — TIME & 24-HOUR ----
  private timeView(): GameAction {
    const d = this.time.currentTime;
    const period = periodOfHour(d.getHours());
    const dayName = this.time.formatDate().split(',')[0] ?? '';
    return {
      success: true,
      message: `🕐 **Time — ${this.time.formatDate()} ${this.time.formatTime()}**\nPeriod: ${period} (${periodOfHour(d.getHours()) === 'night' ? '9 PM–5 AM' : period === 'morning' ? '5 AM–12 PM' : period === 'afternoon' ? '12 PM–5 PM' : '5 PM–9 PM'})\n${dayScheduleSummary(d.getHours(), this.player.city, dayName)}\n\nPass time with "wait [hours]" (1–8h, no stat change) or rest with "sleep".`,
    };
  }

  private dayView(): GameAction {
    const d = this.time.currentTime;
    const period = periodOfHour(d.getHours());
    const w = getWeather(d, this.player.city);
    const season = seasonFromMonth(d.getMonth() + 1);
    return {
      success: true,
      message: `📅 **Today — ${this.time.formatDate()}**\nSeason: ${season} · Time: ${this.time.formatTime()} (${period}) · Weather in ${cityShortName(this.player.city)}: ${w.condition}, ${w.temp}°F\n${dayScheduleSummary(d.getHours(), this.player.city, this.time.formatDate().split(',')[0] ?? '')}\n\nCommands: time | wait [hours] | calendar | weather | forecast`,
    };
  }

  private waitView(rawArgs: string): GameAction {
    const hours = parseInt(rawArgs.trim(), 10);
    if (!Number.isFinite(hours) || hours < 1 || hours > 8) return { success: false, message: 'Usage: wait [hours] — 1 to 8 hours. Passing time changes no stats; a month crossing fires the normal monthly tick.' };
    this.time.advance({ hours, minutes: 0 });
    return { success: true, message: `⏳ You pass ${hours} hour${hours === 1 ? '' : 's'}. It is now ${this.time.formatDate()} ${this.time.formatTime()}.` };
  }

  // ---- v0.108.24 item 6 — POLICE / FIRE / EMS LADDERS ----
  private careersTrackView(track: string): GameAction {
    const t = track.toLowerCase();
    if (t !== 'police' && t !== 'fire' && t !== 'ems') {
      return { success: false, message: 'Usage: careers [police|fire|ems] — or bare "careers" for the .20 career paths.' };
    }
    const ladder = EMS_LADDERS[t as 'police' | 'fire' | 'ems'];
    const current = rankFor(t as 'police' | 'fire' | 'ems', this.jobIdOf());
    const lines = ladder.ranks.map((r) => {
      const job = ALL_JOBS.find((j: any) => j.id === r.jobId);
      const title = job ? `${job.title} @ ${job.employer}` : r.jobId;
      const cityNote = job ? ` (${cityShortName(job.city)})` : '';
      const req = r.requirements;
      const reqParts = [
        req.certification ? `cert ${req.certification}` : 'no cert',
        `${req.skill} lvl ${req.minSkillLevel}`,
        `${req.minShifts} shifts`,
        req.minGPA ? `GPA ≥ ${req.minGPA}` : '',
      ].filter(Boolean).join(', ');
      const mark = current?.id === r.id ? ' ← YOU' : '';
      const pay = job ? `$${(job.hourlyPay ?? 0).toFixed(2)}/hr` : `×${r.payMultiplier} base`;
      return `  ${r.title} — ${title}${cityNote} — ${pay} — needs: ${reqParts}${mark}`;
    }).join('\n');
    const next = current ? nextRank(t as 'police' | 'fire' | 'ems', current.id) : null;
    const nextLine = current
      ? next
        ? (() => { const e = isEligibleForRank(this.player as any, t as 'police' | 'fire' | 'ems', next.id); return `\n\nNext: ${next.title} — ${e.eligible ? 'READY — type "advance"!' : `not yet: ${e.missing.join('; ')}`}`; })()
        : '\n\nYou hold the top rung of this ladder.'
      : '\n\nApply for the entry rung with "apply [job title]" — entry rungs are open hires.';
    return { success: true, message: `🚓 **${ladder.title} ladder** (base $${ladder.baseHourlyPay.toFixed(2)}/hr)\n${lines}${nextLine}\n\nShifts: morning / evening / night (top admin ranks: morning / evening only). Advancing changes your job to the next rung and restarts tenure (15 shifts per rung). Entry rungs hire in their listing city — travel there to apply.` };
  }

  private advanceLadder(): GameAction {
    if (!this.player.job) return { success: false, message: `You don't have a job. Ladder advancement needs a ladder job — see "careers [police|fire|ems]", "sports", or "college".` };
    const jobId = this.jobIdOf();
    // Emergency-service ladders first.
    for (const t of ['police', 'fire', 'ems'] as const) {
      const current = rankFor(t, jobId);
      if (!current) continue;
      const next = nextRank(t, current.id);
      if (!next) return { success: true, message: `You already hold the top rung of the ${t} ladder (${current.title}).` };
      const e = isEligibleForRank(this.player as any, t, next.id);
      if (!e.eligible) return { success: false, message: `Not yet eligible for ${next.title}: ${e.missing.join('; ')}.` };
      const listing = ALL_JOBS.find((j: any) => j.id === next.jobId);
      if (!listing) return { success: false, message: `Next rung ${next.title} has no listing — this is a data gap, not a refusal.` };
      this.player.job = { ...listing } as any;
      this.player.jobTenure = 0;
      return { success: true, message: `⬆️ Advanced to ${next.title} @ ${listing.employer} ($${(listing.hourlyPay ?? 0).toFixed(2)}/hr). Tenure restarts at this rung — 15 shifts to the next one.` };
    }
    // Pro-sports ladders.
    for (const track of SPORTS_TRACKS) {
      const current = track.ranks.find((r) => r.jobId === jobId);
      if (!current) continue;
      const idx = track.ranks.indexOf(current);
      const next = track.ranks[idx + 1];
      if (!next) return { success: true, message: `You already hold the top rung of the ${track.sport} ladder (${current.title}).` };
      const e = tryoutEligibility(this.player as any, track.id);
      // Advancement gates on the NEXT rung's gates, not the entry tryout.
      const missing: string[] = [];
      const lvl = (this.player.skills as any)?.['fitness']?.level ?? 1;
      if (lvl < next.minFitnessLevel) missing.push(`fitness level ${next.minFitnessLevel} required (have ${lvl})`);
      const stat = this.player.fitness ?? null;
      if (stat !== null && stat < next.minFitnessStat) missing.push(`fitness ${next.minFitnessStat} required (have ${stat})`);
      if (next.minCharismaLevel !== null) {
        const cha = (this.player.skills as any)?.['charisma']?.level ?? 1;
        if (cha < next.minCharismaLevel) missing.push(`charisma level ${next.minCharismaLevel} required (have ${cha})`);
      }
      if (missing.length > 0) return { success: false, message: `Not yet eligible for ${next.title}: ${missing.join('; ')}.` };
      void e;
      const listing = ALL_JOBS.find((j: any) => j.id === next.jobId);
      if (!listing) return { success: false, message: `Next rung ${next.title} has no listing — this is a data gap, not a refusal.` };
      this.player.job = { ...listing } as any;
      this.player.jobTenure = 0;
      return { success: true, message: `⬆️ Advanced to ${next.title} (${track.sport}, ${track.league}) at $${(listing.hourlyPay ?? 0).toFixed(2)}/hr. Tenure restarts at this rung.` };
    }
    // College ladders.
    for (const track of COLLEGE_CAREER_TRACKS) {
      const current = track.rungs.find((r) => r.jobId === jobId);
      if (!current) continue;
      const idx = track.rungs.indexOf(current);
      const next = track.rungs[idx + 1];
      if (!next) return { success: true, message: `You already hold the top rung of the ${track.title} track (${current.title}).` };
      const progress = collegeTrackProgress(this.player as any, track.id);
      const nextProg = progress.find((p) => p.rungId === next.id);
      const missing = nextProg?.missing ?? [];
      if (missing.length > 0) return { success: false, message: `Not yet eligible for ${next.title}: ${missing.join('; ')}.` };
      const listing = ALL_JOBS.find((j: any) => j.id === next.jobId);
      if (!listing) return { success: false, message: `Next rung ${next.title} has no listing — this is a data gap, not a refusal.` };
      this.player.job = { ...listing } as any;
      this.player.jobTenure = 0;
      return { success: true, message: `⬆️ Advanced to ${next.title} (${track.title}) at $${(listing.hourlyPay ?? 0).toFixed(2)}/hr. Tenure restarts at this rung.` };
    }
    return { success: false, message: `Your job (${this.player.job.title}) is not on a .24 ladder. Ladders: "careers [police|fire|ems]", "sports", "college".` };
  }

  private ladderLineForJob(): string {
    const jobId = this.jobIdOf();
    if (!jobId) return '';
    for (const t of ['police', 'fire', 'ems'] as const) {
      const current = rankFor(t, jobId);
      if (current) {
        const next = nextRank(t, current.id);
        if (!next) return `🪜 Ladder: ${current.title} (${t}) — top rung.`;
        const e = isEligibleForRank(this.player as any, t, next.id);
        return `🪜 Ladder: ${current.title} (${t}) — next: ${next.title} (${e.eligible ? 'READY — type "advance"!' : e.missing.join('; ')})`;
      }
    }
    for (const track of SPORTS_TRACKS) {
      const current = track.ranks.find((r) => r.jobId === jobId);
      if (current) {
        const idx = track.ranks.indexOf(current);
        const next = track.ranks[idx + 1];
        return next ? `🪜 Ladder: ${current.title} (${track.sport}) — next: ${next.title} (type "advance" when you meet its gates).` : `🪜 Ladder: ${current.title} (${track.sport}) — top rung.`;
      }
    }
    for (const track of COLLEGE_CAREER_TRACKS) {
      const current = track.rungs.find((r) => r.jobId === jobId);
      if (current) {
        const idx = track.rungs.indexOf(current);
        const next = track.rungs[idx + 1];
        return next ? `🪜 Ladder: ${current.title} (${track.title}) — next: ${next.title} (type "advance" when you meet its gates).` : `🪜 Ladder: ${current.title} (${track.title}) — top rung.`;
      }
    }
    return '';
  }

  // ---- v0.108.24 item 11 — PRO SPORTS + COLLEGE ----
  private sportsView(rawArgs: string): GameAction {
    const sport = rawArgs.trim().toLowerCase();
    if (!sport) {
      const lines = SPORTS_TRACKS.map((t) => `• ${t.sport} — ${t.league} (home team: ${SPORTS_TEAMS.find((tm) => tm.id === t.homeTeamId)?.name ?? t.homeTeamId}) — tryout gates: fitness level ${t.minFitnessLevel}, fitness ${t.minFitnessStat}`).join('\n');
      return { success: true, message: `🏆 **Pro Sports — fictional leagues only**\n${lines}\n\nSee a track with "sports [basketball|football|soccer|baseball]", try out with "tryout [sport]", or try out for a college team with "tryout college [sport]" (requires enrollment + GPA ≥ 2.0).` };
    }
    const track = SPORTS_TRACKS.find((t) => t.id === sport);
    if (!track) return { success: false, message: `Unknown sport "${sport}". Leagues: basketball, football, soccer, baseball.` };
    const e = tryoutEligibility(this.player as any, track.id);
    const lines = track.ranks.map((r) => `  ${r.title} — $${r.annualSalaryDollars.toLocaleString()}/yr, ${r.termMonths}-month term, renew at season score ≥ ${r.renewalScoreThreshold} (gates: fitness lvl ${r.minFitnessLevel}, fitness ${r.minFitnessStat}${r.minCharismaLevel ? `, charisma lvl ${r.minCharismaLevel}` : ''})`).join('\n');
    const teams = teamsForSport(track.id).map((tm) => tm.name).join(', ');
    return {
      success: true,
      message: `🏆 **${track.sport} — ${track.league}**\nTeams: ${teams}\n${lines}\n\nTryout: ${e.eligible ? 'ELIGIBLE — type "tryout ' + track.id + '" to sign the rookie deal!' : `not yet: ${e.missing.join('; ')}`}`,
    };
  }

  private tryoutView(rawArgs: string): GameAction {
    const parts = rawArgs.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const college = parts[0] === 'college';
    const sport = college ? (parts[1] ?? '') : (parts[0] ?? '');
    const track = SPORTS_TRACKS.find((t) => t.id === sport);
    if (!track) return { success: false, message: 'Usage: tryout [basketball|football|soccer|baseball] — or "tryout college [sport]" for a college team (requires enrollment + GPA ≥ 2.0).' };
    if (college) {
      const e = collegeTryoutEligibility(this.player as any, track.id);
      if (!e.eligible) return { success: false, message: `College tryout not yet: ${e.missing.join('; ')}.` };
      const team = teamsForSport(track.id).find((tm) => tm.city === this.player.city) ?? teamsForSport(track.id)[0]!;
      (this.player as any).collegeTeam = { sport: track.id, team: team.name };
      return { success: true, message: `🎓 You made the college ${track.sport} team — the ${team.name}! (College teams pay no salary; keep your GPA ≥ 2.0 to stay eligible. Your pro path stays open with "tryout ${track.id}".)` };
    }
    const e = tryoutEligibility(this.player as any, track.id);
    if (!e.eligible) return { success: false, message: `Tryout not yet: ${e.missing.join('; ')}.` };
    const rookie = track.ranks[0]!;
    const offer = contractOffer(track.id, rookie.id);
    const listing = ALL_JOBS.find((j: any) => j.id === rookie.jobId);
    if (!listing || !offer) return { success: false, message: `Tryout passed, but the rookie deal has no listing — this is a data gap, not a refusal.` };
    this.player.job = { ...listing } as any;
    this.player.jobTenure = 0;
    return { success: true, message: `🏆 You made the team! Signed as ${rookie.title} (${track.league}) — $${offer.annualSalaryDollars.toLocaleString()}/yr, ${offer.termMonths}-month term, renew at season score ≥ ${offer.renewalScoreThreshold}. Work shifts to play games; check "season" and "contract" to track your year.` };
  }

  private contractView(): GameAction {
    const jobId = this.jobIdOf();
    for (const track of SPORTS_TRACKS) {
      const current = track.ranks.find((r) => r.jobId === jobId);
      if (!current) continue;
      const offer = contractOffer(track.id, current.id);
      const perf = seasonPerformance(this.player as any, this.player.jobTenure ?? 0);
      const renew = perf.score >= (offer?.renewalScoreThreshold ?? 0) ? 'on track to renew' : 'below the renewal bar';
      return {
        success: true,
        message: `📝 **Contract — ${current.title} (${track.sport}, ${track.league})**\nSalary: $${(offer?.annualSalaryDollars ?? 0).toLocaleString()}/yr · Term: ${offer?.termMonths ?? 0} game-months · Renewal bar: season score ≥ ${offer?.renewalScoreThreshold ?? 0}\nThis season: ${perf.gamesPlayed} appearances (shifts at this job), score ${perf.score} (${perf.rating}) — ${renew}.\nPerformance bonus at score ≥ 85: ${Math.round(current.performanceBonusPct * 100)}% of salary.`,
      };
    }
    return { success: false, message: `You hold no pro-sports contract. Try out with "tryout [basketball|football|soccer|baseball]".` };
  }

  private seasonView(): GameAction {
    const jobId = this.jobIdOf();
    const track = SPORTS_TRACKS.find((t) => t.ranks.some((r) => r.jobId === jobId));
    if (!track) return { success: false, message: `You're not on a pro team. Try out with "tryout [basketball|football|soccer|baseball]".` };
    const current = track.ranks.find((r) => r.jobId === jobId)!;
    const perf = seasonPerformance(this.player as any, this.player.jobTenure ?? 0);
    return {
      success: true,
      message: `🏆 **Season — ${current.title} (${track.sport})**\nAppearances (shifts at this job): ${perf.gamesPlayed} · Record: ${perf.wins}–${perf.losses} · Score: ${perf.score} (${perf.rating})\nRenewal bar for this rank: score ≥ ${current.renewalScoreThreshold}. Score comes from fitness level + fitness stat — train at the gym to lift it.`,
    };
  }

  private collegeView(rawArgs: string): GameAction {
    const id = rawArgs.trim().toLowerCase();
    const teamLine = (this.player as any).collegeTeam
      ? `\n\n🎓 Your college team: ${(this.player as any).collegeTeam.team} (${(this.player as any).collegeTeam.sport}).`
      : '';
    if (!id) {
      const lines = COLLEGE_CAREER_TRACKS.map((t) => `• ${t.title} (${t.kind}) @ ${t.employer} — entry: ${t.rungs[0]!.requirements.requiresEnrollment ? 'current enrollment' : 'open'}${t.rungs[0]!.requirements.enrolledSchoolId ? ` at ${t.rungs[0]!.requirements.enrolledSchoolId}` : ''}, ${t.rungs[0]!.requirements.skill} lvl ${t.rungs[0]!.requirements.minSkillLevel}`).join('\n');
      return { success: true, message: `🎓 **College Careers**\n${lines}${teamLine}\n\nSee a track with "college [tutoring|research|student_activities|campus_wellness]". Entry rungs hire via "apply [job title]"; climb with "advance".` };
    }
    const track = COLLEGE_CAREER_TRACKS.find((t) => t.id === id);
    if (!track) return { success: false, message: `Unknown college track "${id}". Tracks: tutoring, research, student_activities, campus_wellness.` };
    const entry = collegeCareerEligibility(this.player as any, track.id);
    const progress = collegeTrackProgress(this.player as any, track.id);
    const lines = track.rungs.map((r) => {
      const job = ALL_JOBS.find((j: any) => j.id === r.jobId);
      const req = r.requirements;
      const reqParts = [
        req.cert ? `cert ${req.cert}` : 'no cert',
        `${req.skill} lvl ${req.minSkillLevel}`,
        req.minGPA ? `GPA ≥ ${req.minGPA}` : '',
        req.requiresEnrollment ? 'enrollment' : '',
        req.enrolledSchoolId ? `at ${req.enrolledSchoolId}` : '',
      ].filter(Boolean).join(', ');
      const prog = progress.find((p) => p.rungId === r.id);
      const mark = r.jobId === this.jobIdOf() ? ' ← YOU' : prog && prog.missing.length === 0 ? ' ✓ eligible' : '';
      return `  ${r.title} — ${job ? `${job.title} @ ${job.employer}` : r.jobId} — needs: ${reqParts}${mark}`;
    }).join('\n');
    return { success: true, message: `🎓 **${track.title}** (${track.kind}) @ ${track.employer}\n${lines}\n\nEntry: ${entry.eligible ? 'ELIGIBLE — apply for the entry rung with "apply [job title]".' : `not yet: ${entry.missing.join('; ')}`}${teamLine}` };
  }

  // ---- v0.108.24 item 9 — SOCIAL MEDIA ----
  private postView(rawArgs: string): GameAction {
    const kind = rawArgs.trim().toLowerCase();
    const templates: Record<string, () => string> = {
      visit: () => `Checking in from ${cityShortName(this.player.city)}!`,
      work: () => this.player.job ? `Another shift in the books at ${this.player.job.employer}.` : `Grinding — looking for the next opportunity.`,
      milestone: () => {
        const last = (this.player.journalLog ?? []).slice(-1)[0];
        return last ? `Milestone: ${typeof last === 'string' ? last : (last.text ?? '')}`.slice(0, 280) : `Living the journey, one day at a time.`;
      },
      home: () => `Home sweet home in ${cityShortName(this.player.city)}.`,
    };
    const make = templates[kind];
    if (!make) return { success: false, message: 'Usage: post [visit|work|milestone|home] — template posts only (no free text). Posts start at 0 likes.' };
    const next = createPost(this.player as any, make(), Date.now());
    this.player.social = next.social;
    const post = (this.player.social?.posts ?? []).slice(-1)[0]!;
    return { success: true, message: `📱 Posted: "${post.text}" (0 likes — honest start, no invented engagement). See it with "social".` };
  }

  private resolveNpcByName(name: string): { npc: any } | { error: string } {
    const q = name.trim().toLowerCase();
    const npcs = this.social.getAllNPCs();
    const exact = npcs.find((n: any) => n.name.toLowerCase() === q);
    if (exact) return { npc: exact };
    const hits = npcs.filter((n: any) => n.name.toLowerCase().includes(q));
    if (hits.length === 1) return { npc: hits[0] };
    if (hits.length > 1) return { error: `Multiple contacts match "${name}": ${hits.map((n: any) => n.name).join(', ')}. Be more specific.` };
    return { error: `No contact named "${name}" found.` };
  }

  private followView(rawArgs: string, follow: boolean): GameAction {
    const resolved = this.resolveNpcByName(rawArgs);
    if ('error' in resolved) return { success: false, message: resolved.error };
    const npc = resolved.npc;
    const list = this.player.socialFollowing ?? [];
    if (follow) {
      if (list.includes(npc.id)) return { success: false, message: `You're already following ${npc.name}.` };
      this.player.socialFollowing = [...list, npc.id];
      return { success: true, message: `✅ Following ${npc.name}. Their posts now appear in "social".` };
    }
    if (!list.includes(npc.id)) return { success: false, message: `You're not following ${npc.name}.` };
    this.player.socialFollowing = list.filter((id: string) => id !== npc.id);
    return { success: true, message: `✅ Unfollowed ${npc.name}.` };
  }

  private followingView(): GameAction {
    const npcs = this.social.getAllNPCs();
    const followed = (this.player.socialFollowing ?? []).map((id: string) => npcs.find((n: any) => n.id === id)).filter(Boolean);
    const names = followed.length > 0 ? followed.map((n: any) => `• ${n.name} (${n.role ?? 'roster'})`).join('\n') : 'Nobody yet — follow a roster contact with "follow [name]".';
    const count = followerCount(this.player as any);
    return { success: true, message: `👥 **Following**\n${names}\n\nFollowers: ${count} (from fame, close relationships, and your posts — a count only, never invented follower names).` };
  }

  // ---- v0.108.24 item 10 — PHONE MESSAGES (read-state fix + threads) ----
  private messagesView(): GameAction {
    const sms = this.comm.getMessages();
    if (sms.length === 0) return { success: true, message: '💬 No messages yet.' };
    // v0.108.24 fix: viewing marks the shown messages read, like mail.
    for (const s of sms) this.comm.markSMSRead(s.id);
    const list = sms.map((s) => `✅ [${s.id}] **${s.fromName || s.from}**: "${(s.message ?? s.content ?? '').substring(0, 60)}${(s.message ?? s.content ?? '').length > 60 ? '...' : ''}"`).join('\n');
    return { success: true, message: `💬 **Messages (${sms.length}) — viewing marked them read**\n${'─'.repeat(40)}\n${list}\n\nOpen one in full with "read message [id]" or "message [id]". Conversations: "threads". Delete: "delete message [id]".` };
  }

  private readSmsView(rawArgs: string): GameAction {
    const id = rawArgs.trim().split(/\s+/)[0] ?? '';
    if (!id) return { success: false, message: 'Usage: read message [id] — or "messages" to list texts.' };
    const sms = this.comm.getSMSById(id);
    if (!sms) return { success: false, message: 'Message not found.' };
    this.comm.markSMSRead(id);
    return {
      success: true,
      message: `💬 **Message from ${sms.fromName || sms.from}**\n${'─'.repeat(40)}\nDate: ${new Date(sms.timestamp).toLocaleString()}\n\n${sms.message ?? sms.content ?? ''}`,
    };
  }

  private threadsView(): GameAction {
    const sms = this.comm.getMessages();
    if (sms.length === 0) return { success: true, message: '💬 No conversations yet.' };
    const groups = new Map<string, { name: string; count: number; unread: number; latest: number; snippet: string }>();
    for (const s of sms) {
      const key = s.from;
      const cur = groups.get(key) ?? { name: s.fromName || s.from, count: 0, unread: 0, latest: 0, snippet: '' };
      cur.count += 1;
      if (!s.read) cur.unread += 1;
      if (s.timestamp >= cur.latest) { cur.latest = s.timestamp; cur.snippet = (s.message ?? s.content ?? '').substring(0, 40); }
      groups.set(key, cur);
    }
    const list = [...groups.values()].sort((a, b) => b.latest - a.latest).map((g) =>
      `• ${g.name} — ${g.count} message${g.count === 1 ? '' : 's'}${g.unread > 0 ? `, ${g.unread} unread` : ''} — "${g.snippet}${g.snippet.length >= 40 ? '...' : ''}"`).join('\n');
    return { success: true, message: `💬 **Conversations**\n${list}\n\nOpen one with "thread [name]" (marks its messages read).` };
  }

  private threadView(rawArgs: string): GameAction {
    const name = rawArgs.trim();
    if (!name) return { success: false, message: 'Usage: thread [name] — or "threads" to list conversations.' };
    const sms = this.comm.getMessages();
    const q = name.toLowerCase();
    const mine = sms.filter((s) => (s.fromName || s.from).toLowerCase().includes(q));
    if (mine.length === 0) return { success: false, message: `No conversation with "${name}" found.` };
    const contact = mine[0]!.fromName || mine[0]!.from;
    const ordered = [...mine].sort((a, b) => a.timestamp - b.timestamp);
    for (const s of ordered) this.comm.markSMSRead(s.id);
    const body = ordered.map((s) => `[${new Date(s.timestamp).toLocaleString()}] ${s.message ?? s.content ?? ''}`).join('\n');
    return { success: true, message: `💬 **Conversation — ${contact}** (${ordered.length} messages, now read)\n${'─'.repeat(40)}\n${body}` };
  }

  private deleteMessageView(rawArgs: string): GameAction {
    const id = rawArgs.trim().split(/\s+/)[0] ?? '';
    if (!id) return { success: false, message: 'Usage: delete message [id] — or "messages" to list texts.' };
    const ok = this.comm.deleteSMS(id);
    return ok
      ? { success: true, message: `🗑️ Message ${id} deleted.` }
      : { success: false, message: 'Message not found.' };
  }

  private courseGpa(): number {

    return this.player.enrolledCourse?.gpa ?? 3.0;
  }

  private gpaView(): GameAction {
    const ec = this.player.enrolledCourse;
    if (!ec) {
      const last = this.player.lastGPA;
      return { success: true, message: last !== undefined ? `🎓 **GPA**\nNot currently enrolled. Your last graduation GPA: ${last.toFixed(2)}.\n\nGPA ≥ 3.0 opens elite career rungs; below 2.0 blocks new enrollments until library study lifts it back to 2.0.` : '🎓 **GPA**\nNot currently enrolled. Enroll in a course to start building a GPA (starts at 3.0).' };
    }
    const course = this.schools.getCourse(ec.schoolId, ec.courseId);
    const days = (() => {
      if (!ec.enrolledDate) return 0;
      const a = new Date(ec.enrolledDate).getTime();
      const b = new Date(this.time.formatDate()).getTime();
      if (Number.isNaN(a) || Number.isNaN(b)) return 0;
      return Math.max(0, Math.floor((b - a) / 86400000));
    })();
    const att = attendancePct(ec.studySessions ?? 0, days);
    const eligible = ec.hoursCompleted >= ec.totalHours + 10 * (ec.examFails ?? 0);
    return { success: true, message: `🎓 **GPA — ${course?.name ?? ec.courseId}**\nGPA: ${this.courseGpa().toFixed(2)} / 4.0\nAttendance: ${att}% (${ec.studySessions ?? 0} sessions over ${days} game-days since enrollment)\nProgress: ${ec.hoursCompleted}/${ec.totalHours} hrs${(ec.examFails ?? 0) > 0 ? ` (+${10 * (ec.examFails ?? 0)} remediation hrs after ${ec.examFails} failed exam${(ec.examFails ?? 0) === 1 ? '' : 's'})` : ''}\nExam: ${eligible ? 'READY — type "exam"' : 'not yet eligible (finish coursework first)'}\n\nStudy moves GPA by energy: 50+ → +0.05, 20–49 → +0.02, below 20 → −0.05. Library study (+0.02) is the recovery path.` };
  }

  private examView(): GameAction {
    const ec = this.player.enrolledCourse;
    if (!ec) return { success: false, message: 'You are not enrolled in a course. Type "schools" to browse.' };
    const course = this.schools.getCourse(ec.schoolId, ec.courseId);
    if (!course) return { success: false, message: 'Course data error.' };
    if (ec.hoursCompleted < ec.totalHours + 10 * (ec.examFails ?? 0)) {
      return { success: false, message: `Exam not yet available: you need ${ec.totalHours + 10 * (ec.examFails ?? 0)} hrs (you have ${ec.hoursCompleted}). Study more first.` };
    }
    const days = (() => {
      if (!ec.enrolledDate) return 0;
      const a = new Date(ec.enrolledDate).getTime();
      const b = new Date(this.time.formatDate()).getTime();
      if (Number.isNaN(a) || Number.isNaN(b)) return 0;
      return Math.max(0, Math.floor((b - a) / 86400000));
    })();
    const att = attendancePct(ec.studySessions ?? 0, days);
    const skillLevel = course.requirement ? ((this.player.skills[course.requirement.skill]?.level ?? 0)) : 0;
    const gpa = this.courseGpa();
    const score = examScore(gpa, skillLevel, att);
    if (score < 60) {
      ec.gpa = Math.max(0, roundCents(gpa - 0.1));
      ec.examFails = (ec.examFails ?? 0) + 1;
      appendJournalLog(this.player, this.time.formatDate(), `Failed the ${course.name} exam (${score}).`);
      return {
        success: true,
        message: `📝 Exam: ${course.name} — score ${score} (GPA ${gpa.toFixed(2)} × 10 + skill ${skillLevel} × 5 + base 40${att < 50 ? ' − attendance penalty 10' : ''}). FAILED (pass is 60). GPA −0.1 (now ${ec.gpa.toFixed(2)}). Study 10 more hours, then re-take the exam.`,
        outcomeLog: `exam failed ${ec.schoolId}/${ec.courseId} score ${score} (GPA ${ec.gpa.toFixed(2)}, fails ${ec.examFails})`,
      };
    }
    // Pass: graduation fee flow.
    const cert = course.rewardCertification;
    if ((this.player.money ?? 0) >= 100) {
      this.player.money = roundCents((this.player.money ?? 0) - 100);
      return this.awardGraduation(course, cert, gpa, score);
    }
    this.player.pendingCredential = { schoolId: ec.schoolId, courseId: ec.courseId, cert, gpa };
    appendJournalLog(this.player, this.time.formatDate(), `Passed the ${course.name} exam (${score}) — credential pending $100 fee.`);
    return {
      success: true,
      message: `📝 Exam: ${course.name} — score ${score}. PASSED! But the $100 graduation fee cannot be paid (you have $${(this.player.money ?? 0).toFixed(2)}). Credential HELD: "credential pending — $100 fee due". Type "graduate" once you have the cash.`,
      outcomeLog: `exam passed ${ec.schoolId}/${ec.courseId} score ${score} (credential pending $100 fee)`,
    };
  }

  private awardGraduation(course: any, cert: string, gpa: number, score: number): GameAction {
    if (!this.player.certifications) this.player.certifications = [];
    const alreadyHeld = this.player.certifications.includes(cert);
    if (!alreadyHeld) this.player.certifications.push(cert);
    this.player.lastGPA = gpa;
    this.player.enrolledCourse = undefined;
    this.player.pendingCredential = undefined;
    this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 2);
    let honors = '';
    if (gpa >= 3.8) {
      this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 5);
      honors = ' 🌟 Honors (GPA 3.8+)! Community reputation +5.';
    }
    if (course.id === 'ai_software_eng') {
      this.player.specialization = 'AI Software Engineer';
    }
    appendJournalLog(this.player, this.time.formatDate(), `Graduated: ${course.name} (exam ${score}, GPA ${gpa.toFixed(2)}).`);
    return {
      success: true,
      message: `🎓 **GRADUATION!** You passed ${course.name} (exam ${score}) and earned your **${cert.replace(/_/g, ' ')}**! Community reputation +2.${honors}${alreadyHeld ? ' (You already held this certification, so no duplicate was awarded.)' : ''}${course.id === 'ai_software_eng' ? '\n🌟 Your specialization is now: **AI Software Engineer**' : ''}`,
      outcomeLog: `graduated ${course.id} cert ${cert} (exam ${score}, GPA ${gpa.toFixed(2)})${gpa >= 3.8 ? ' honors' : ''}`,
    };
  }

  private graduateView(): GameAction {
    const pending = this.player.pendingCredential;
    if (!pending) return { success: false, message: 'No credential is pending. Finish a course and pass its exam first.' };
    if ((this.player.money ?? 0) < 100) return { success: false, message: `The graduation fee is $100. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    const course = this.schools.getCourse(pending.schoolId, pending.courseId);
    if (!course) return { success: false, message: 'Course data error.' };
    this.player.money = roundCents((this.player.money ?? 0) - 100);
    const result = this.awardGraduation(course, pending.cert, pending.gpa ?? 3.0, 60);
    // v0.108.29: the 60 passed above is a placeholder — the real exam
    // score was already outcome-logged when the exam passed. The
    // graduation line names the fee payment, not a fake score.
    result.outcomeLog = `graduated ${pending.schoolId}/${pending.courseId} cert ${pending.cert} (fee paid, GPA ${(pending.gpa ?? 3.0).toFixed(2)})`;
    return result;
  }

  // ---- §46 ITEM 42 — TICKER (redesigned in .21, §55) ----
  private tickerView(rawArgs: string): GameAction {
    const arg = rawArgs.trim().toLowerCase();
    if (!arg) {
      const mode = this.player.tickerMode ?? 'local';
      // v0.108.21 label fix (Dre): the mode label reads "Local news" /
      // "World news" — capitalized, full phrase — never bare "local" /
      // "world". The stored mode value is unchanged.
      const label = mode === 'local' ? 'Local news' : mode === 'world' ? 'World news' : 'off';
      return { success: true, message: `📰 **News ticker: ${label}**\nUsage: ticker local | ticker world | ticker off. The strip sits between the chat area and the stats HUD and SCROLLS the full headline pool continuously (news-style headlines from real game state — city events, markets, your activity, weather, seasons, challenges). Local = your city + your activity; world = everything.` };
    }
    if (arg === 'local' || arg === 'world') {
      this.player.tickerMode = arg;
      return { success: true, message: `📰 News ticker set to ${arg === 'world' ? 'World news' : 'Local news'} (scrolling marquee).` };
    }
    if (arg === 'off') {
      this.player.tickerMode = 'off';
      return { success: true, message: '📰 News ticker turned off (the strip is hidden). Type "ticker local" to bring it back.' };
    }
    return { success: false, message: 'Usage: ticker local | ticker world | ticker off.' };
  }

  // Payload for GET /api/ticker: v0.108.21 (§55) scrolling pool —
  // generateTickerHeadlines over real state, filtered by mode.
  // Leaderboard headlines are appended by the index.ts handler, which
  // alone can see the Redis community store.
  public tickerPayload(): { mode: string; headlines: string[] } {
    const mode = this.player.tickerMode ?? 'local';
    if (mode === 'off') return { mode, headlines: [] };
    const weekKey = weekKeyFromDate(this.time.formatDate());
    const now = this.time.currentTime;
    const month0 = now.getMonth();
    const weather = getWeather(now, this.player.city);
    const nh = nextHoliday(now.getFullYear(), month0, now.getDate());
    const headlines = generateTickerHeadlines({
      player: this.player,
      city: this.player.city,
      monthKey: this.time.getMonthKey(),
      events: worldEventsThisWeek(weekKey),
      season: seasonFromMonth(month0),
      nextHoliday: { name: nh.holiday.name, daysAway: nh.daysAway },
      challenge: challengeGoalForWeek(weekKey),
      weather: { temp: weather.temp, condition: weather.condition },
      achievementsUnlocked: this.achievementEngine.exportSerializable().unlocked.length,
    });
    const filtered = filterTickerHeadlines(headlines, mode, this.player.city);
    if (filtered.length === 0) {
      return mode === 'world'
        ? { mode, headlines: ['No news across the world right now.'] }
        : { mode, headlines: [`No news right now in ${cityDisplay(this.player.city)}.`] };
    }
    return { mode, headlines: filtered };
  }

  // ---- §48 ITEM 44 — `view` VERB (existing screens only) ----
  private viewView(rawArgs: string): GameAction {
    const arg = rawArgs.trim().toLowerCase();
    const usage = 'View what? inbox, properties, vehicles, investments, status, schools, real-estate, bank, or government.';
    if (!arg) return { success: false, message: usage };
    const map: [string, () => GameAction][] = [
      ['inbox', () => this.emails()],
      ['emails', () => this.emails()],
      ['properties', () => this.properties()],
      ['vehicles', () => this.vehicles()],
      ['investments', () => this.investments()],
      ['status', () => this.status()],
      ['schools', () => this.listSchools()],
      ['real-estate', () => this.realEstate()],
      ['realestate', () => this.realEstate()],
      ['bank', () => this.bank()],
      ['government', () => this.governmentView('')],
    ];
    const resolved = resolveNamed(map, arg, ([key]) => key);
    if (resolved.ambiguous) return { success: false, message: `Multiple matches for "${arg}": ${resolved.ambiguous.join(', ')}. ${usage}` };
    if (!resolved.item) return { success: false, message: `"${arg}" cannot be viewed. ${usage}` };
    return resolved.item[1]();
  }

  // v0.108.21 (§58): help reorganized into 12 system sections
  // with a section index, per-section drill-down, and a filter.
  // The full text is the single source of truth; drill-down and
  // filter parse it at runtime, so no bullet can drift between
  // views. Bullet text is verbatim from the pre-.21 help — the
  // .20 coverage audit parses `• ` lines and still passes.
  private fullHelpText(): string {
    return `🎮 **THE OPEN WORLD — Commands**
${'—'.repeat(50)}

Find one command without scrolling the wall: 'help [section]' shows just one section, 'help [word]' filters to matching commands. Bare 'help' shows everything below.

**📖 Sections — jump with 'help [section]'**
1. Getting Started — help getting started
2. Money & Bank — help money
3. Work & Careers — help work
4. Home & Property — help home
5. Life & Family — help life
6. World & Travel — help world
7. Government & Law — help government
8. Business & Companies — help business
9. Education & Self — help education
10. Community & Social — help community
11. Info & Time — help info
12. Dialogue — help dialogue

**1. Getting Started**
• travel [city] — Move to another city
• travel to [city] — Same as "travel [city]" (the word "to" is optional)
• travel [city] by [bus|train|airport] — Pick a transit mode (fares/times from transit; airport needs both cities served)
• explore — Look around your current area
• goto [district] — Move to a city district
• go home — Return to your home city: your primary residence's city if you set one, else your first property's city, else your start city, else West Memphis. Same-city home costs nothing; other cities use normal travel fares
• home — Same as "go home"
• districts — List your current city's districts/neighborhoods (alias: district)
• where — See where you are right now (city + district) (alias: location)
• explore [district] — Move to a district and look around there
• nearby — People and places nearby, with what you can do at each (alias: places)
🧭 Getting around: travel to a city → "districts" to see its neighborhoods → "goto [district]" to move → "explore" to look around → "go home" to return.

**⚡ Quick Bar**
• One-tap shortcuts above the conversation, in this order: Status, Home, Work, Sleep, Explore, Talk, Goals, Journal, Quests, Skills, Achievements, Bank, Property, Businesses, Investments, Vehicles, People, Phone, Mail, Factions, Help.
• In full-screen view the bar scrolls horizontally (swipe, trackpad, or mouse wheel) so the last shortcuts are never cut off.
• Shortcuts run as game commands even mid-conversation — they never send chat text to an NPC.

**⏸️ Pause Menu**
• Game Menu (☰): Resume, Save Game, Settings, What's New, Quit to Menu.
• Shortcuts live in the quick bar only.

• backgrounds — All backgrounds + bonuses + traits list
• name [first name] — Rename your character (letters/spaces only)

• view [inbox|properties|vehicles|investments|status|schools|real-estate|bank|government] — Open an existing screen by name (view inbox / view emails → the inbox). Bare view or an unknown thing lists what can be viewed — never a bare unknown-command answer.

• Weather affects how much certain jobs pay.
• Sleep restores energy.
• Explore to find new NPCs and random events.
• If a property is confusing: try "buy property Wicker Park Duplex".

**2. Money & Bank**
• savings — Savings goals view (goals, progress, bank balance)
• savings goal [name] [amount] — Create a savings goal (max 5 open goals)
• savings deposit [amount] — Cash → bank, credited to the most-recent open goal
• savings deposit [goal] [amount] — Cash → bank, credited to the named goal
• loans — Outstanding balance, credit standing, monthly payment, next due tick
• loan [amount] — Borrow up to your credit limit ($1,000 + credit × $50, never above $6,000; 2%/month interest)
• loan pay [amount] — Repay from cash (oldest balance first, partial payments allowed)

• hardmode — Status + rules + how to toggle
• hardmode on — Enable (prints the full rules on enable)
• hardmode off — Disable future bills (existing hard debt remains until paid)
• bills — Bills due, hard debt, payment status
• bills pay [amount|all] — Pay hard debt from cash (never overpays into a void)

**3. Work & Careers**
• apply — See job listings (entry jobs first, with per-shift pay)
• apply [job] — Apply for a specific job
• work — Work a shift
• career — Your job, tenure, next promotion requirements, and work-milestone titles (ladder rank + next rung when on a .24 ladder)
• promote — Ask for a promotion (+15% pay; 15 shifts + skill level 3, max 3 per job) (alias: promotion)

• gigs — Side-gig catalog
• gig [delivery|rideshare|freelance] — Side work, no employer (delivery $60/2h; rideshare $75/3h needs a car 30%+; freelance $90/3h needs tech or craftsmanship 3+; −15 energy each; Hustle trait +20% gig pay)
• overtime — One extra 8h shift at 1.5× pay (employed only, −35 energy, counts for tenure/promotion)
• overtime [hours] — Hourly overtime, 1–4 hrs per call at 1.5× your hourly rate (hourlyPay or basePay/2080), −5 energy/hr, +2 stress/hr, hard caps 4 hrs/day and 12 hrs/week; pay is taxed like work pay

• workplace — Job, employer, today's workplace event, shift options, coworkers
• shift [morning|evening|night|weekend|split|oncall] — Choose today's shift before working (morning base / evening +10% pay −40 energy / night +20% pay −45 energy +5 stress / weekend +15% pay −40 energy +2 stress, Sat/Sun only / split normal pay −30 energy +3 happiness / on-call +10% pay −35 energy +5 stress; applies to the next work only, then resets)
• shift prefer [morning|evening|night|weekend|split|oncall|none] — Persistent shift preference, used when no one-shot shift is set (one-shot always wins)
• coworkers — Roster NPCs who work where you work (district + role family; plain "none" when no match)
• lunch [name] — A workday meal with a coworker only (1h, $15, +3 relationship, +5 happiness)
• task — Today's assigned shift task (one per game-day, deterministic)
• task complete — Finish today's task (1h, −5 energy, +$25, +10 job-skill XP, once per game-day)
• mentor [name] — Mentor a coworker (1h, −5 energy, +4 relationship, +3 professional reputation, once per game-day)
• meeting — Team meeting (1h, −5 energy, +5 job-skill XP, +2 happiness, once per game-day)
• breakroom — Break-room recovery (1h, +10 energy, +2 happiness, once per game-day)
• report — File a shift report, or an incident report on emergency tracks (1h, −5 energy, +3 professional reputation, +5 job-skill XP, once per game-day)
• cover [name] — Cover a coworker's shift (4h, −20 energy, 4h base pay, +3 relationship, once per game-day; not a tenure shift)
• patrol — Police patrol activity (2h, −10 energy, +$30, +10 fitness XP, once per game-day; police track only)
• drill — Fire station drill (2h, −10 energy, +$30, +10 fitness XP, once per game-day; fire track only)
• respond — EMS call response (2h, −10 energy, +$30, +10 job-skill XP, once per game-day; EMS track only)
• training — Emergency-track training (2h, −10 energy, +15 job-skill XP, once per game-day; emergency tracks only)
• ridealong — Ride along on a routine rotation (2h, −5 energy, +5 job-skill XP, +2 happiness, once per game-day; emergency tracks only)

• careers — Career paths (Retail, Trades, Healthcare support, Tech, Services/hospitality, Finance): entry → skilled → career (→ elite), each rung's required cert, GPA bar, and what's missing. Mapped rungs refuse without their cert, naming the course + school; the mapping wins over keyword matching. Elite rungs need GPA ≥ 3.0; old saves without GPA read as 2.5.
• careers [police|fire|ems] — That service's ladder (ranks, requirements, pay, your eligibility)
• advance — Move to the next ladder rung when you meet its requirements (job changes, tenure restarts)
• sports — Pro sports leagues + tracks (fictional teams only)
• sports [basketball|football|soccer|baseball] — That league's ranks, salaries, terms, and your tryout standing
• tryout [sport] — Try out for a pro team (fitness gates); a pass signs the rookie deal
• tryout college [sport] — Try out for a college team (requires enrollment + GPA ≥ 2.0; no salary)
• contract — Your pro contract: salary, term, renewal bar, this season's score
• season — Your season: appearances (shifts at this job), record, score, renewal bar
• college — College career tracks (academic + campus)
• college [tutoring|research|student_activities|campus_wellness] — That track's rungs, requirements, and your progress

**4. Home & Property**
• real-estate — View listings in your city (aliases: realestate, properties_list)
• buy property Broadway Starter Home mortgage — Buy a property (example first; pattern: buy property [name] [cash|mortgage])
   • If you have the full price, it pays cash automatically.
   • Add "cash" to pay outright. Add "mortgage" to finance with 20% down.
• sell property [name] — Sell a property
• properties — View your owned properties
• renovate property [name] — Upgrade a property (costs money)
• upgrade property [name] — Same as renovate (5 levels, each raises rent)
• repair property [name] — Repair a property
• businesses — Buy and run businesses for monthly income (alias: business) (staff: see "staff", "hire")
• buy business [name] — Buy a business ($2,500–$12,000, $180–$750/mo net)
• sell business [name] — Sell a business (70% of purchase price)
• sell investment [name] — Sell an investment
• sell investment [name] [amount] — Sell part of an investment in dollars at current value (invested/shares scale down proportionally; selling the full value removes the line)
• invest — See investment options (plus a stocks pointer)
• invest [name] [amount] — Buy an investment (buying more of an asset you already own ADDS to that position — one line per asset, never a duplicate). "all" invests all your cash: "invest all into [name]" or "invest [name] all"
• investments — View your portfolio (stock holdings shown with recomputed values; duplicate legacy positions fold into one line automatically)

• living — Full breakdown: each line, city multiplier, household size, next-month estimate, warnings (alias: expenses)
• expenses — Same as living

• housing — Tenure per property (outright / mortgaged with payment, term, arrears / renting) + who lives with you. How the housing pieces fit: upgrades are actions, furnishing is interior + comfort, living is the monthly housing cost line — housing itself adds no new monthly charge, only tenure, mortgage depth, primary residence, household effects, and the market index.
• mortgage [property] — Payment, remaining, term (ceil of remaining/payment), arrears, payoff
• pay mortgage [property] [amount] — Extra payment ($100+ reduces balance and term; paying the full payoff clears the loan). Missed payments count CONSECUTIVELY (any successful payment resets the streak): 3 missed → warning notice, 5 → final warning, 6 → foreclosure (property removed, mortgage cleared, equity lost)
• set home [property] — Set your primary residence (must be owned); set home none clears it
• move [property] — Set home + travel to its city/district
• housing market [city?] — Per-city market index (deterministic from economic index + month key, ±2%/mo) + trend. The index reprices in-flight listings (shown + charged adjusted) and owned properties (monthly tick, one transparent line per move — see "repricing").
• tenants — Occupancy, tenant names, rent, and lease status for every property you own (tenant names are display-only, never NPCs)
• open house [property] — Host an open house ($50, 2h, guarantees next month occupied at full rent)
• lease [property] — Sign a 3-month lease starting next month (guaranteed occupied at 90% rent)
• break lease [property] — End a lease early ($100 fee, returns to the monthly roll)

• will — Your current will (no death mechanic in this game — the will executes ONLY on retirement)
• will heir [npc|community] — Designate the primary heir (roster NPC or the city community fund)
• will bequeath [cash|properties|businesses|vehicles] [heir] — Record a bequest per asset class (re-bequest replaces)
• retire — Preview now shows the estate total and the will bonus; retire confirm distributes the estate (bank + property values + business buy prices, or 12× monthly income where no buy price is stored + vehicle values) and records the distribution in the legacy record. Bonus within the $500 global legacy cap, non-compounding: base + $50 per asset class bequeathed (max 4) + $50 when the primary heir is family (spouse/child).

• insurance — Policies + status
• insure [health|property|vehicle|business] [target?] — Buy a policy (health $30/mo; property $25/mo/property; vehicle $20/mo/vehicle; business $40/mo/business). Missed premium lapses the policy + notice; re-insure anytime.
• uninsure [type] [target?] — Cancel a policy
• claim [health|property|vehicle|business] [target?] — 1 claim per policy per game-month, verified losses only, premium current. Property: 80% of a repair actually paid this month (cap $500). Vehicle: 80% (cap $300). Business: 80% of a tick-recorded negative monthly net (cap $400). Health: flat $150 benefit + health +10 when health is below 50 — a benefit, NOT a reimbursement (no cash-cost health event exists in the game).

**5. Life & Family**
• people — See who's nearby
• talk [name] — Chat with an NPC
• greet [name] — Greet an NPC
• greet [name] [warm|respectful|playful|cool] — Greet with a style (default warm); greeting effects apply once per NPC per game-day
• leave — Step away from the current conversation (also: bye, end, exit, goodbye)
• contacts — View saved contacts
• phone — Open your phone (emails, messages, voicemails, contacts)
• assist [name] — Help an NPC
• factions — View your factions
• influence — View faction power
• support [id] — Help your faction
• sabotage [id] — Attack a rival faction
• chat [id] — Enter a group chat
• emails — List your inbox
• inbox — Same as emails
• email read [id] — Read a message
• read [id] — Same as email read
• email compose [name] [subject] [body] — Send a message
• email delete [id] — Delete a message
• text [name] [message] — Send an SMS
• messages — View texts with ids (viewing marks shown messages read; texts persist across save → quit → reload, like mail)
• read message [id] — Open one text in full (marks only it read)
• message [id] — Same as read message [id]
• threads — Conversations by contact, with unread counts
• thread [name] — One conversation in full (marks its messages read)
• delete message [id] — Delete one text
• voicemails — List voicemails (listening marks them listened — the list IS the listen action; voicemails persist across save → quit → reload)
• search [query] — Search all comms
• social — Your feed: your posts + followed roster posts + community posts
• post [visit|work|milestone|home] — Post a template update (no free text; starts at 0 likes)
• follow [name] — Follow a roster contact (their posts join your feed)
• unfollow [name] — Unfollow a contact
• following — Who you follow + your follower count
• quests — View active quests (alias: quest)
• gift [name] [coffee|flowers|meal|gift] — Give an NPC a gift ($15–$100, raises relationship)
• hangout [name] — Spend 2 hours with an NPC ($25, raises relationship)
• friends — Your relationships, levels, and unlocked perks (alias: relationships)
• profile [name] — A full NPC profile: role, schedule, relationship, quests (bare "profile" shows your own status: age, life stage, background, trait, start city)

• propose [name] — Propose to a Partner-tier (90+) friend ($200 ring; one spouse at a time)
• family — Spouse, children, household size, next family dates
• welcome child [name] — Welcome a child ($300; needs a spouse + an owned property)
• family activity [movie|picnic|dinner] — 2h family outing ($25–$60, +5 happiness per household member capped at +15, +2 with your spouse)

• retire — Preview your retired-life summary + the next life's legacy bonus (nothing changes on preview)
• retire confirm — Archive this life and begin a fresh one (keeps only legacy + legacy count)
• legacy — Past lives + current legacy bonus

• fame — Fame score, tier, sources, wealth tier + net worth, what is unlocked

• stores — Shopping districts in your current city (derived from district data — a city with none has no stores, honestly)
• shop [good] — Buy: groceries $40 (happy +3, energy +5), clothing $60 (happy +4), household goods $50 (happy +3, home condition +2 when owning), coffee beans $10, flowers $15, book $20, snacks $25 (package goods go into inventory)
• commercial — Your city's commercial directory: shopping districts + their real POIs
• stroll [district] — Visit a real district in your city (1h, energy −5, happy +3)
• errands — 2h, energy −10, happy +2, stress −3 (once per game-day)
• chores — Needs a property: 1h, energy −5, primary home condition +3, happy +1 (once per game-day)
• selfcare — $20, 2h, energy +15, stress −8, health +2 (once per game-day)
• routines — Today's routines done + effects
• myhome — Your home screen: primary residence, comfort, household, last sleep, today's home routines ("home" still travels home)
• morning — Morning routine at home (needs a property where you are: 1h, energy +5, happiness +2, once per game-day)
• evening — Evening at home (needs a property where you are: 2h, happiness +4, energy −5, once per game-day)
• household — Who lives with you, household size, and the effects that follow from it

**6. World & Travel**
• vehicles — Your garage
• buy vehicle [type] — Purchase a vehicle
• sell vehicle [name] — Sell a vehicle
• inspect [name] — Check vehicle condition
• fuel [name] — Refuel vehicle (alias: refuel)
• register [name] — Register and inspect vehicle (annual $40 fee while registered — see "fees")
• register voter — Register to vote (one-time, +5 community reputation)
• maintain [name] — Basic maintenance
• service [vehicle] [service] — Vehicle service (oil, tires, brakes, tuneup, wash)
• repair vehicle [name] — Full repair
• customize [name] [mod] — Install mods (tint, paint, rims, spoiler, stereo, exhaust, suspension, turbo)
• upgrade vehicle [name] [engine|transmission|aero] — Performance tiers (3 levels per part, priced off vehicle value)
• tow [name] — Emergency tow for immobilized vehicle (alias: emergency)
• race — List race tracks (alias: races)
• race [track] — Enter a race
• race season — Start the World Street Series
• race standings — Championship standings

• milestones — Every relationship's tier and how far the next tier is (Acquaintance 25 · Friend 50 · Close Friend 75 · Partner 90)
• celebrate [name] — Spend an evening with someone you know ($50, 2 hours, +8 relationship)
• furnish — Furniture catalog and what's in your homes
• furnish [property] [item] — Furnish a property you own (chair $150 · bed $300 · desk $400 · kitchen $600 · tv $900 · art $1,500); comfort improves sleep recovery at home
• cook — Home-cooked meals and their requirements
• cook [meal] — Cook soup, pasta, roast, or feast (cash for ingredients, +energy, +happiness, +cooking XP)
• events — This game-week's world events across all cities (gala events appear at fame 50+)
• attend [event] — Attend an event in your current city ($10 entry, 2 hours, +happiness, appearance pay; holiday weeks add +5 happiness and +$25)
• attend gala — Attend a gala (fame 50+, $10 entry, 2 hours, +10 happiness, +$100 appearance pay, once per game-week)
• roadtrip [city] — Drive your own car to another city ($15 fuel, needs condition 30%+, +driving XP)
• passport — Cities you've visited, milestone rewards (5/10/15/20/27 cities), and your next stop idea
• trips — Your travel journal: total trips, fares paid, visits per city, most-visited city
• journey [city] — Preview a trip before paying: fare, time, method, districts, this week's events, listings (preview only, never books)
• souvenirs — Your souvenir collection (one per city, out of 27)
• souvenir [city] — Buy a souvenir where you stand ($25, once per city, +2 happiness; you must be in that city)


• news — Dated daily feed built only from real state (world events, your investments, milestones, this week's challenge)
• news [celebrity|crime|stocks|sports|politics|city|world] — That category's headlines from real state only (empty categories say so; celebrity = the game's notable/elite roster, politics = the game's offices)

• calendar — Shows the current season, next holiday, and days away (holiday weeks add a label to events; attending in a holiday week pays +5 happiness and +$25)

• ticker — Ticker status + usage
• ticker local — City headlines only (default)
• ticker world — Headlines across all cities
• ticker off — Hide the strip. The strip sits between the stats HUD above and the chat/conversation area below and SCROLLS continuously (a marquee loop of the full headline pool, hover to pause) — never one static headline. The pool (100+ generated headlines) covers world events, per-city economy + patrol, stock moves, market indices, your businesses/properties/holdings/job/office/court activity, milestones, season + next holiday, the weekly challenge goal, current-city weather, and the community top 3 — every headline traces to a real game-state fact, never invented. Empty states are literal: "No news right now in [city]." / "No news across the world right now."
• transit [city] — Compare bus/train/airport fares, times, and stations for a trip
• transit pass — $30 weekly pass (20% off routed bus/drive fares; flights + fallback excluded)
• stations — Your city's stations + service notes
• weather — Current weather + what it does to work, travel, mood, and events
• forecast — 3-day outlook (today exact, next days as chance bands, never guarantees)

**7. Government & Law**
• laws — Your city's laws and fine schedule (alias: law)
• court — Your standing: heat, arrests, record, outstanding fines, open cases, investigations
• pay fine [all|amount] — Settle court fines (each settled fine cools heat by 10)
• government — Local officials, government openings, civic standing (alias: gov)
• gov jobs — Government entity job catalog by entity (City Hall, State Capitol, Federal Agency, Courts, Legislature) — every listing holdable via apply in its city
• id — Your identification documents + status (card, license, passport)
• id [card|license|passport] — Get a document (card $35, license $75, passport $150; perks only, never gates)
• id renew [type] — Renew an expired document (card $25, license $50, passport $110)
• government state — Your state's government + political openings
• government federal — Federal government + federal openings
• bank — Check your bank balance (see also: savings, loans)
• deposit [amount|all] — Move cash to the bank
• withdraw [amount|all] — Take cash from the bank
• lawyer [clean|appeal|defend case-<n>|expunge <n>] — Legal services: scrub heat (+$200 per open investigation), appeal while incarcerated, defend a case ($250), or expunge a minor record entry ($500, 12 clean months, newer offenses block)
• record — Your criminal record (tier, numbered entries, fines, cases, consequences for new applications)
• laylow — Lay low for a few hours to cool heat (alias: lay)
• crime — Crime options and risk levels
• crime [type] — Commit a crime (pickpocket, shoplift, scam, robbery, grand_theft_auto, heist)
• rob — Commit a robbery
• scam — Run a scam
• prison — Your sentence status (while incarcerated)
• prison work — Work in the laundry, reduces sentence by 1 day

• tax — Your tax standing: income, liability estimate, balance, deadline
• file taxes — Pay your full tax balance (refuses cleanly if nothing owed or cash short)
• tax plan — Split your balance into 3 monthly installments (auto-deducted, no interest; a missed installment breaks the plan with a 5% penalty)

• cases — Open + resolved court cases
• case [id] — One case in full
• police — Heat, investigations, patrol level, what cools heat
• lawyer defend [id] — Contest an open case ($250; dismissed, reduced, or upheld)

• government state — Your state's government + political openings
• government federal — Federal government + federal openings
• civic — Your civic title (Resident / Active Citizen / Community Leader / Public Servant / Office Holder) and which tier jobs are open

**📬 Mail — your postal mail (letters, bills, notices, packages)**
• mail — List your mail: id, kind, sender, subject, and read/unread state, grouped by kind, with unread counts (an empty mailbox says so plainly)
• mail [letters|bills|notices|packages] — List only one kind of mail
• mail read [id] — Open one mail item in full (marks it read)
• mail read [n] — Same, by list position (1 = the first item "mail" lists)
• read mail [id] — Same as "mail read [id]"
• read mail [n] — Same as "mail read [n]"
• packages — Outgoing, incoming, and today's courier jobs
• track [id] — Any package: status, sender → recipient, ETA or delivered date
• send package [npc] [item] — Send an inventory item to a roster NPC ($5 postage, 1 game-day delivery)
• claim package [id] — Claim an incoming package into your inventory (exactly once)
• deliver [id] — Complete a courier job (pay + journal line)
• pay bill [id] — Pay a bill from your mail from cash against hard debt (refuses when cash short or already paid)

• services — Citizen services directory: permits held, fees due, benefit eligibility, registrations, utility accounts
• permits — Permits held + available
• permit [business|drivers|food] — Buy a permit (business license $200 → +5% business income; driver's license $50 → roadtrip fuel $10; food handler permit $75 → cooked meals +2 energy)
• fees — Outstanding annual fees: amount, stage, next deadline + consequence in plain words, what would be seized first, and the ways out (shown at every stage)
• pay fees [all|amount] — Settle fees oldest first (+$10 late fee if unpaid past 2 game-months). ANY partial payment restarts the warning clock from the payment month; paying in full releases a fee arrest immediately (works while incarcerated for fees)
• fees plan — Split the debt into 3 monthly installments, auto-deducted in the tick before any ladder step; while active the ladder is frozen, and a missed installment breaks it with NO penalty fee
• repricing — Your owned properties' last repricings (old → new, index move, month) + current index per owned city + listing adjustment for your current city
• benefits — Benefit eligibility + status
• benefits claim — $200 once per game-month (requires unemployed or cash under $300)
• register voter — Register to vote (one-time, +5 community reputation)
• records — Property ownership records (display only)
• utilities — Utility accounts per owned property (hard mode ON → paid via bills pay; OFF → included, no charge)

• offices — The real offices (Mayor, Governor, President) with their real process and their current incumbents — filled by the game's own roster people, never real politicians' names
• file [mayor|governor|president] — File for office (Mayor $250, Governor $1,000, President $5,000). Each failed gate is named: Mayor needs age 18+, current-city residence, rep 25+ (Active Citizen), no office held; Governor needs state residence, rep 50+, a COMPLETED Mayor term; President needs rep 75+, a COMPLETED Governor term. Resigning mid-term earns NO completion credit.
• campaign [rally|canvass|ad] — Rally $200/+8/energy −10, canvass +5/energy −5, ad $500/+12. Minimums before an election: Mayor 2, Governor 3, President 4 events.
• election — Deterministic: your score (rep + campaign + 10× completed terms + 5 same-office incumbency) must STRICTLY EXCEED both rivals (ties lose). Loss → 3-game-month cooldown + new fee.
• office — Your current office, term, salary, duty status
• decide [infrastructure|event|tax] — One decision per game-month: infrastructure (rep +5), event (happy +5, rep +3), tax relief (next tax bill −10%). Missed month → rep −2.
• resign — End a term early with NO completed-term credit. Terms are 48 game-months; salaries (Mayor $5,000, Governor $8,000, President $15,000/mo) are taxed as income. Office REPLACES your job slot — vacating leaves you unemployed until you re-apply. Reelection is a full new cycle, never automatic.

**8. Business & Companies**
• companies — All companies: name, industry, HQ city, size, this month's performance word (your founded companies listed first under "Your companies")
• company [name] — One company in full: industry, HQ, listings, size, revenue figure, last 3 months' performance, open jobs (for a company YOU founded: industry, HQ, employees + wages, last net, debt, bad months, performance)
• found [name] — Found your own company ($5,000 cash-only; HQ is your current city)
• found [name] in [industry] — Found in a closed industry list (Logistics, Banking & Finance, Healthcare, Public Safety, Education, Government, Retail, Technology, Hospitality & Food, General Services)
• mycompanies — Your founded companies only: status, HQ, employees, last net, debt, performance word
• company hire [company] [npc] — Hire a roster NPC at your company (max 5 employees; $100/mo wage each in the tick)
• company fire [company] [npc] — Release an employee immediately (free, no severance)
• company close [name] — Close your company voluntarily (employees released, no penalty, no proceeds; debt dies with a failed company too — two consecutive months over $2,000 in debt closes it)

• stocks — Listed companies: price, monthly change, performance word
• stock [name] — One company: price history (last 3 game-months), performance, HQ, size, plus your dividend terms when you hold it
• buy stock [name] [amount] — Spend cash for shares at the current computed price (fractional shares to cents; buying more of a stock you hold adds to that position)
• sell stock [name] [amount|all] — Sell shares at the current computed price
• dividends — Your stock holdings with monthly dividend at 0.25%/mo, last payout + month, next-payout note
• index — Market indices as computed averages (World + Mid-South)

• hire [business] [npc] — Hire a roster NPC at one of your businesses (slots by type; one business per NPC)
• fire [business] [npc] — Fire staff immediately (free, no severance)
• staff — All businesses with staff, wages, morale
• staff [business] — One business's staff in full
• raise [business] [npc] — +10% wage (min +$10), +10 morale, once per game-month per staff

**9. Education & Self**
• schools — List every school and course (with ids, including the new courses)
• degrees — Your completed credentials + in-progress course + next credential
• campus — School life at your enrolled school
• campus study — Study group (free, 2h, +10 intelligence XP)
• campus club — Club social (free, 2h, +5 happiness, +3 with a classmate)
• enroll [school_id] [course_id] — Start a course
• study — List schools in your city
• study library — Study at the local library ($25, INT +2)
• study hours [n] — Study for N hours
• gym — Work out ($15)
• skills — Your skill levels and XP

• schools — Every school with tier (university / community college), transfer lines, and "leads to" career lines per course
• enroll [school_id] [course_id] — Enroll (holding a mapped associate enrolls its university program at −25% hours and cost; GPA below 2.0 blocks new enrollments — recover with library study)
• degrees — Your completed credentials + in-progress course + next credential
• campus — School life at your enrolled school
• campus study — Study group (free, 2h, +10 intelligence XP)
• campus club — Club social (free, 2h, +5 happiness, +3 with a classmate)

• gpa — GPA, attendance (sessions vs game-days since enrollment; 0 days → 100%), exam status
• exam — Only when coursework is done (hours ≥ total + 10× fails). Score = 40 + GPA×10 + skill level×5, minus 10 below 50% attendance; pass ≥ 60. Fail → GPA −0.1 + 10 more study hours before re-exam.
• graduate — Pay a held $100 graduation fee and receive the credential. Graduation: journal + message + rep +2; GPA ≥ 3.8 → honors + rep +5. Study moves GPA by energy at session start (50+ → +0.05, 20–49 → +0.02, below 20 → −0.05); library study (+0.02) is the recovery path. Coursework completion no longer auto-graduates — the exam gates graduation.

**10. Community & Social**
• leaderboard [weekly|monthly|wealth|fame] — Top 10 players + your own rank on that board (bare leaderboard = lifetime XP; also on the main menu)
• about — About the game: publisher credit + copyright notice (also on the main menu)

• challenge — This week's community goal, your contribution, the participation threshold, how to contribute

• trade offer [username] [item name] [price] — Offer an inventory item (price 0 = gift; max 3 open offers)
• trade list — Offers addressed to you + your open offers
• trade accept [offer id] — Accept an offer (item + cash move atomically; offer deleted first)
• trade decline [offer id] — Decline an offer addressed to you
• trade cancel [offer id] — Cancel one of your own offers

• citizens — The living population of your current district right now (roster NPCs on schedule here, crowd activity, district needs as words)
• volunteer — A 2h community shift (+5 community reputation, +3 happiness, −10 energy; district helped counter)

**11. Info & Time**
• status — Your full life snapshot (age + life stage + wealth tier; community rank is appended when the board is reachable)
• help — Show this list
• sleep — Rest 8 hours (alias: rest); night-band sleep (9 PM–5 AM start) recovers better (+5 happiness)
• event — See active events
• event choice [id] — Choose an event option
• goals — Today's daily goals and rewards (alias: goal)
• journal — Your quest log, story arcs, and journal entries (alias: story)
• achievements — Your unlocked achievements and progress (alias: achievement)
• clear_conv — Clear the current conversation

• calendar — Current game date, season, day-of-year progress, days until year end, age + stage, upcoming markers
• time — Clock, period of day, and what's open/active now
• day — Today at a glance (date, season, time, weather, period)
• wait [hours] — Pass 1–8 hours (no stat change; a month crossing fires the normal monthly tick)
• years — Year-by-year summary (years with no data show as such)

**12. Dialogue**
• topics — This NPC's available topics right now, each with its tier requirement and locked/unlocked state (in conversation only)
• ask [topic] — Discuss a topic (unique-substring matching; +2 relationship per topic, capped at +10 per conversation)

• greet [name] [warm|respectful|playful|cool] — Greet with a style (default warm); greeting effects apply at most once per NPC per game-day`;
  }

  // Section headers in fullHelpText: `**N. Name**` lines.
  private helpSections(): { num: number; name: string; body: string }[] {
    const text = this.fullHelpText();
    const lines = text.split('\n');
    const sections: { num: number; name: string; body: string }[] = [];
    let cur: { num: number; name: string; lines: string[] } | null = null;
    for (const ln of lines) {
      const m = ln.match(/^\*\*(\d+)\. (.+?)\*\*$/);
      if (m) {
        if (cur) sections.push({ num: cur.num, name: cur.name, body: cur.lines.join('\n').trim() });
        cur = { num: Number(m[1]), name: m[2] ?? '', lines: [] };
      } else if (cur) {
        cur.lines.push(ln);
      }
    }
    if (cur) sections.push({ num: cur.num, name: cur.name, body: cur.lines.join('\n').trim() });
    return sections;
  }

  private helpIndexText(): string {
    const sections = this.helpSections();
    const lines = sections.map((s) => `${s.num}. ${s.name} — help ${HELP_JUMP_TOKENS[s.name] ?? s.name.toLowerCase()}`);
    return `**📖 Sections — jump with \`help [section]\`**\n${lines.join('\n')}`;
  }

  help(query = ''): GameAction {
    const q = query.trim().toLowerCase();
    if (!q) return { success: true, message: this.fullHelpText() };
    const sections = this.helpSections();
    // Drill-down: section number, exact name, alias, or name substring.
    const byNum = sections.find((s) => String(s.num) === q);
    const byAlias = sections.find((s) => (HELP_SECTION_ALIASES[s.name] ?? []).includes(q));
    const byName = sections.find((s) => s.name.toLowerCase() === q || s.name.toLowerCase().includes(q));
    const section = byNum ?? byAlias ?? byName;
    if (section) {
      return { success: true, message: `🎮 **THE OPEN WORLD — Commands: ${section.num}. ${section.name}**\n\n${section.body}\n\nBack to everything: help` };
    }
    // Filter: bullets containing the word, grouped by section.
    const hits: string[] = [];
    for (const s of sections) {
      const bullets = s.body.split('\n').filter((l) => l.startsWith('• ') && l.toLowerCase().includes(q));
      if (bullets.length > 0) hits.push(`**${s.num}. ${s.name}**\n${bullets.join('\n')}`);
    }
    if (hits.length > 0) {
      return { success: true, message: `🔍 Commands matching "${query.trim()}":\n\n${hits.join('\n\n')}\n\nBack to everything: help` };
    }
    return { success: true, message: `No commands match "${query.trim()}".\n\n${this.helpIndexText()}` };
  }

  // === v0.108.23 §60 — TRAVEL EXPANSION ===
  private resolveCityArg(rawArgs: string): { id?: string; ambiguous?: string[]; display?: string } {
    const dest = rawArgs.trim().replace(/^to\s+(the\s+)?/i, '');
    const cityIds = Object.keys(WORLD_CITIES) as string[];
    const q = dest.toLowerCase();
    const exact = cityIds.find((id) => id === q);
    if (exact) return { id: exact, display: (WORLD_CITIES as Record<string, any>)[exact]?.displayName ?? exact };
    const resolved = resolveNamed(
      cityIds.map((id) => ({ id, name: (WORLD_CITIES as Record<string, any>)[id]?.displayName ?? id })),
      dest,
      (c) => c.name,
    );
    if (resolved.ambiguous) return { ambiguous: resolved.ambiguous };
    if (resolved.item) return { id: resolved.item.id, display: resolved.item.name };
    return {};
  }

  private tripsView(): GameAction {
    const stats = this.player.travelStats;
    if (!stats || stats.trips === 0) {
      return { success: true, message: `🧳 **Travel Journal**\nNo trips yet — travel to start your journal. Try "travel Memphis" or "roadtrip Memphis".` };
    }
    const visited = this.player.visitedCities ?? [];
    const lines = visited.map((c: string) => {
      const n = stats.visitsByCity[c] ?? 0;
      const name = (WORLD_CITIES as Record<string, any>)[c]?.displayName ?? c;
      return `• ${name} — ${n} visit${n === 1 ? '' : 's'}`;
    }).join('\n');
    const fav = mostVisitedCity(stats);
    const favLine = fav ? `\n\n🏠 Home away from home: ${(WORLD_CITIES as Record<string, any>)[fav]?.displayName ?? fav} (${stats.visitsByCity[fav]} visits).` : '';
    return { success: true, message: `🧳 **Travel Journal**\n${stats.trips} trips · $${stats.faresPaid.toLocaleString()} in fares paid\n\n${lines}${favLine}` };
  }

  private journeyView(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Journey where? Usage: journey [city] — a preview, never a booking.' };
    const r = this.resolveCityArg(rawArgs);
    if (r.ambiguous) return { success: false, message: `Multiple cities match: ${r.ambiguous.join(', ')}. Type "journey [full city name]".` };
    if (!r.id) return { success: false, message: `City "${rawArgs.trim()}" not found. Try: Memphis, Little Rock, Southaven, Nashville, Atlanta, Chicago, etc.` };
    if (r.id === this.player.city) return { success: false, message: `You're already in ${r.display}. Journey previews other cities.` };
    const route = TRAVEL_ROUTES.find((x) => x.from === this.player.city && x.to === r.id);
    const fare = route ? route.cost : 50;
    const hours = route ? route.timeHours : 3;
    const method = route ? route.method : 'bus';
    const routeNote = route ? 'direct route' : 'no direct route — generic bus connection';
    const districts = Object.entries(WORLD_DISTRICTS as Record<string, any>)
      .filter(([, d]) => d.city === r.id)
      .map(([, d]) => d.displayName ?? '')
      .filter(Boolean);
    const weekKey = weekKeyFromDate(this.time.formatDate());
    const events = worldEventsThisWeek(weekKey).filter((e: any) => e.city === r.id);
    const eventLines = events.length === 0 ? 'No world events there this week.' : events.map((e: any) => `• ${e.label} (${e.activity})`).join('\n');
    const listings = this.property.getAllListings().filter((l: any) => l.city === r.id).length;
    return { success: true, message: `🗺️ **Journey preview — ${r.display}**\nFare: $${fare} by ${method} (${hours}h, ${routeNote})\nDistricts: ${districts.length ? districts.join(', ') : 'downtown'}\nProperty listings on the market: ${listings}\n\nThis week's events there:\n${eventLines}\n\nThis is a preview only — nothing charged, nothing booked. Travel with "travel ${r.display}".` };
  }

  private souvenirsView(): GameAction {
    const owned = this.player.souvenirs ?? [];
    if (owned.length === 0) {
      return { success: true, message: `🎁 **Souvenirs**\nNone yet. Buy one where you stand with "souvenir [city]" ($25, once per city) — you must be in that city.` };
    }
    const lines = owned.map((c: string) => `• ${(WORLD_CITIES as Record<string, any>)[c]?.displayName ?? c}`).join('\n');
    const visited = this.player.visitedCities ?? [];
    const next = visited.find((c: string) => !owned.includes(c));
    const nextLine = next ? `\n\nNext stop idea: ${(WORLD_CITIES as Record<string, any>)[next]?.displayName ?? next}.` : '';
    return { success: true, message: `🎁 **Souvenirs — ${owned.length} of 27 cities**\n${lines}${nextLine}` };
  }

  private souvenirView(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Souvenir from where? Usage: souvenir [city] — you must be in that city ($25, once per city).' };
    const r = this.resolveCityArg(rawArgs);
    if (r.ambiguous) return { success: false, message: `Multiple cities match: ${r.ambiguous.join(', ')}. Type "souvenir [full city name]".` };
    if (!r.id) return { success: false, message: `City "${rawArgs.trim()}" not found.` };
    if (r.id !== this.player.city) return { success: false, message: `You must be in ${r.display} to buy its souvenir — you're in ${(WORLD_CITIES as Record<string, any>)[this.player.city]?.displayName ?? this.player.city}. Travel there first.` };
    const owned = this.player.souvenirs ?? [];
    if (owned.includes(r.id)) return { success: false, message: `You already have a ${r.display} souvenir — one per city.` };
    if ((this.player.money ?? 0) < SOUVENIR_PRICE) return { success: false, message: `A souvenir costs $${SOUVENIR_PRICE}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - SOUVENIR_PRICE);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + SOUVENIR_HAPPINESS);
    owned.push(r.id);
    this.player.souvenirs = owned;
    appendJournalLog(this.player, this.time.formatDate(), `Bought a ${r.display} souvenir.`);
    return { success: true, message: `🎁 You bought a ${r.display} souvenir ($${SOUVENIR_PRICE}, happiness +${SOUVENIR_HAPPINESS}). ${owned.length} of 27 cities collected.` };
  }

  // === v0.108.23 §61 — PROPERTIES EXPANSION ===
  private resolveOwnedProperty(rawArgs: string): { prop?: any; ambiguous?: string[] } {
    const owned = (this.player.properties ?? []) as any[];
    const resolved = resolveNamed<{ id: string; name: string; prop: any }>(
      owned.map((p) => ({ id: p.id, name: p.name, prop: p })), rawArgs.trim(), (c) => c.name,
    );
    if (resolved.ambiguous) return { ambiguous: resolved.ambiguous };
    if (!resolved.item) return {};
    return { prop: resolved.item.prop };
  }

  private tenantsView(): GameAction {
    const props = (this.player.properties ?? []) as any[];
    if (props.length === 0) return { success: true, message: `👥 **Tenants**\nYou own no properties yet. Browse with "real-estate".` };
    const monthKey = this.time.getMonthKey();
    const lines = props.map((p) => {
      const country = (WORLD_CITIES as Record<string, any>)[p.city]?.country ?? 'USA';
      const tenant = tenantNameFor(p.name, country, monthKey);
      const leased = leaseActive(p.leaseUntil, monthKey);
      const openHouse = openHouseActive(p.openHouseMonth, monthKey);
      const state = leased ? `leased through ${p.leaseUntil} (90% rent)` : openHouse ? 'open house this month (guaranteed occupied)' : 'on the monthly roll (85% occupied)';
      const rent = leased ? leaseRent(p.rentalIncome) : p.rentalIncome;
      return `• ${p.name} (${(WORLD_CITIES as Record<string, any>)[p.city]?.displayName ?? p.city}) — tenant ${tenant} · ${state} · rent $${rent.toLocaleString()}/mo`;
    }).join('\n');
    return { success: true, message: `👥 **Tenants — ${monthKey}**\n${lines}\n\nManage with "open house [property]", "lease [property]", "break lease [property]". Tenant names are display-only and change with the month — they are not NPCs.` };
  }

  private openHouseView(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Open house where? Usage: open house [property] ($50, guarantees next month occupied).' };
    const { prop, ambiguous } = this.resolveOwnedProperty(rawArgs);
    if (ambiguous) return { success: false, message: `Multiple properties match: ${ambiguous.join(', ')}. Be more specific.` };
    if (!prop) return { success: false, message: `You don't own a property matching "${rawArgs.trim()}". Type "properties" to list yours.` };
    const nextMonth = addMonthsKey(this.time.getMonthKey(), 1);
    if (prop.openHouseMonth === nextMonth) return { success: false, message: `An open house is already scheduled for ${prop.name} next month (${nextMonth}).` };
    if ((this.player.money ?? 0) < OPEN_HOUSE_PRICE) return { success: false, message: `An open house costs $${OPEN_HOUSE_PRICE}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - OPEN_HOUSE_PRICE);
    prop.openHouseMonth = nextMonth;
    this.time.advance({ hours: 2, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), `Hosted an open house at ${prop.name}.`);
    return { success: true, message: `🏡 Open house hosted at ${prop.name} ($${OPEN_HOUSE_PRICE}, 2h). It is guaranteed occupied next month (${nextMonth}) at full rent.` };
  }

  private leaseView(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Lease what? Usage: lease [property] — a 3-month lease at 90% rent, guaranteed occupied.' };
    const { prop, ambiguous } = this.resolveOwnedProperty(rawArgs);
    if (ambiguous) return { success: false, message: `Multiple properties match: ${ambiguous.join(', ')}. Be more specific.` };
    if (!prop) return { success: false, message: `You don't own a property matching "${rawArgs.trim()}". Type "properties" to list yours.` };
    const monthKey = this.time.getMonthKey();
    if (leaseActive(prop.leaseUntil, monthKey)) return { success: false, message: `${prop.name} is already leased through ${prop.leaseUntil}. Break it first with "break lease ${prop.name}".` };
    prop.leaseUntil = leaseUntilFor(monthKey);
    appendJournalLog(this.player, this.time.formatDate(), `Signed a 3-month lease on ${prop.name}.`);
    return { success: true, message: `📋 Lease signed on ${prop.name}: 3 months starting ${addMonthsKey(monthKey, 1)} through ${prop.leaseUntil}, guaranteed occupied at 90% rent ($${leaseRent(prop.rentalIncome).toLocaleString()}/mo instead of $${prop.rentalIncome.toLocaleString()}).` };
  }

  private breakLeaseView(rawArgs: string): GameAction {
    if (!rawArgs.trim()) return { success: false, message: 'Break whose lease? Usage: break lease [property] ($100 fee).' };
    const { prop, ambiguous } = this.resolveOwnedProperty(rawArgs);
    if (ambiguous) return { success: false, message: `Multiple properties match: ${ambiguous.join(', ')}. Be more specific.` };
    if (!prop) return { success: false, message: `You don't own a property matching "${rawArgs.trim()}". Type "properties" to list yours.` };
    const monthKey = this.time.getMonthKey();
    if (!leaseActive(prop.leaseUntil, monthKey)) return { success: false, message: `${prop.name} is not leased right now — nothing to break.` };
    if ((this.player.money ?? 0) < BREAK_LEASE_FEE) return { success: false, message: `Breaking a lease costs $${BREAK_LEASE_FEE}. You have $${(this.player.money ?? 0).toFixed(2)}.` };
    this.player.money = roundCents((this.player.money ?? 0) - BREAK_LEASE_FEE);
    prop.leaseUntil = undefined;
    appendJournalLog(this.player, this.time.formatDate(), `Broke the lease on ${prop.name}.`);
    return { success: true, message: `📋 Lease on ${prop.name} broken ($${BREAK_LEASE_FEE} fee). It returns to the monthly occupancy roll.` };
  }

  // === v0.108.23 §62 — LIVING YOUR HOME EXPANSION ===
  private homePropertyInCity(): any | null {
    const props = (this.player.properties ?? []) as any[];
    return props.find((p) => p.id === this.player.primaryResidenceId && p.city === this.player.city)
      ?? props.find((p) => p.city === this.player.city)
      ?? null;
  }

  private householdLines(): { names: string; size: number } {
    const spouse = Object.values(this.player.relationships ?? {}).find((r: any) => r.spouse) as any;
    const spouseName = spouse ? (spouse.npcName ?? spouse.name ?? 'your spouse') : null;
    const children = (this.player as any).children ?? [];
    const names: string[] = [];
    if (spouseName) names.push(`${spouseName} (spouse)`);
    for (const c of children) names.push(`${typeof c === 'string' ? c : (c.name ?? 'child')} (child)`);
    return { names: names.join(', '), size: 1 + (spouseName ? 1 : 0) + children.length };
  }

  private myHomeView(): GameAction {
    const props = (this.player.properties ?? []) as any[];
    if (props.length === 0) {
      return { success: true, message: `🏠 **My Home**\nYou own no property yet — no home to live in. Browse with "real-estate", then "set home [property]" to pick your primary residence.` };
    }
    const primary = props.find((p: any) => p.id === this.player.primaryResidenceId) ?? props[0];
    const furn = primary.furniture ?? [];
    const tier = comfortTier(furn.length);
    const hh = this.householdLines();
    const ls = this.player.lastSleep;
    const sleepLine = ls
      ? `Last restful sleep: +${ls.energy} energy, +${ls.health} health, +${ls.happy} happiness (home comfort tier ${ls.comfort}).`
      : 'No restful sleep recorded yet — sleep to record one.';
    this.routineDayReset();
    const done = this.player.routinesDone as string[];
    const morningLine = done.includes('morning') ? 'done' : 'not yet';
    const eveningLine = done.includes('evening') ? 'done' : 'not yet';
    return { success: true, message: `🏠 **My Home — ${primary.name}**\n${(WORLD_CITIES as Record<string, any>)[primary.city]?.displayName ?? primary.city} · comfort tier ${tier} (${furn.length} item${furn.length === 1 ? '' : 's'}) · condition ${primary.condition ?? 100}%\nHousehold: ${hh.names || 'just you'} (${hh.size} total)\n${sleepLine}\nToday at home: morning routine ${morningLine}, evening routine ${eveningLine}.\n\nLive here with "morning" and "evening" (once each per game-day, while you're in this city).` };
  }

  private morningView(): GameAction {
    const home = this.homePropertyInCity();
    if (!home) return { success: false, message: `Mornings at home need a home where you are — you own no property in ${(WORLD_CITIES as Record<string, any>)[this.player.city]?.displayName ?? this.player.city}. Travel to a city where you own, or buy with "real-estate".` };
    if (this.routineDoneOnce('morning')) return { success: false, message: 'Morning routine is done for today — once per game-day. Come back tomorrow.' };
    this.player.energy = Math.min(100, (this.player.energy ?? 0) + MORNING_ENERGY);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + MORNING_HAPPINESS);
    this.time.advance({ hours: MORNING_HOURS, minutes: 0 });
    appendJournalLog(this.player, this.time.formatDate(), `Morning routine at ${home.name}.`);
    return { success: true, message: `☀️ Morning at ${home.name} (${MORNING_HOURS}h, energy +${MORNING_ENERGY}, happiness +${MORNING_HAPPINESS}). A quiet start before the day.` };
  }

  private eveningView(): GameAction {
    const home = this.homePropertyInCity();
    if (!home) return { success: false, message: `Evenings at home need a home where you are — you own no property in ${(WORLD_CITIES as Record<string, any>)[this.player.city]?.displayName ?? this.player.city}. Travel to a city where you own, or buy with "real-estate".` };
    if (this.routineDoneOnce('evening')) return { success: false, message: 'Evening routine is done for today — once per game-day. Come back tomorrow.' };
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + EVENING_HAPPINESS);
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - EVENING_ENERGY_COST);
    this.time.advance({ hours: EVENING_HOURS, minutes: 0 });
    const hh = this.householdLines();
    const withLine = hh.size > 1 ? ` Evening with ${hh.names}.` : '';
    appendJournalLog(this.player, this.time.formatDate(), `Evening at ${home.name}.`);
    return { success: true, message: `🌙 Evening at ${home.name} (${EVENING_HOURS}h, happiness +${EVENING_HAPPINESS}, energy −${EVENING_ENERGY_COST}).${withLine}` };
  }

  private householdView(): GameAction {
    const hh = this.householdLines();
    if (hh.size <= 1) {
      return { success: true, message: `👨‍👩‍👧 **Household**\nJust you, for now. Household size drives living costs (see "living") and tick comfort (see §36): a partner at 90+ can become a spouse (see "propose"), and a spouse + an owned property can welcome a child (see "welcome child").` };
    }
    return { success: true, message: `👨‍👩‍👧 **Household — ${hh.size} total**\n${hh.names}\n\nHousehold size already feeds your living costs ("living") and monthly home comfort. Spend time together with "evening" while you're home, or a "family activity".` };
  }

  // === EXPLORATION & MOVEMENT ===
  explore(district?: string): GameAction {
    // v0.108.18: "explore [district]" moves there first (normal goto
    // cost), then looks around the new district. Bare explore looks
    // around the current district and points at what to do next.
    if (district && district.trim()) {
      const moved = this.goto(district);
      if (!moved.success) return moved;
      const result = this.explore();
      return { ...result, message: `${moved.message}\n\n${result.message}` };
    }
    const weather = getWeather(this.time.currentTime, this.player.city);
    this.player.energy = Math.max(0, this.player.energy - 10);
    this.time.advance({ hours: 1, minutes: 0 });
    
    this.triggerCommunication(); // Living world update

    // Get NPCs in current location
    const npcsHere = this.social.getNPCByLocation(
      this.player.district, 
      this.time.getHour(), 
      this.time.currentTime.getDay()
    );
    
    let npcList = '';
    if (npcsHere.length > 0) {
      const names = npcsHere.slice(0, 5).map(n => n.name);
      npcList = `\n\n👥 People here: ${names.join(', ')}${npcsHere.length > 5 ? ` (+${npcsHere.length - 5} more)` : ''}`;
    }
    
    // Check for random event
    const randomEvent = this.storyline.generateRandomEvent(this.player);
    if (randomEvent) {
      this.storyline.activateEvent(randomEvent);
      return { 
        success: true, 
        message: `Exploring ${this.player.district.replace('_', ' ')}. ${weather.temp}°F, ${weather.condition}.${npcList}\n\n🎬 **Event: ${randomEvent.title}**\n${randomEvent.description}\n\nType "event" to see choices.`
      };
    }
    
    return { success: true, message: `Exploring ${this.player.district.replace('_', ' ')}. ${weather.temp}°F, ${weather.condition}. Energy: ${this.player.energy}/100${npcList}${npcsHere.length > 0 ? '\n\n💬 People here — type "talk [name]" to approach someone.' : '\n\n🗺️ Nothing stands out here — try "districts" for neighborhoods or "travel [city]" to move on.'}` };
  }

  // v0.108.18: district resolution shared by goto and explore [district].
  // Matches, in order: exact id, display name (via resolveNamed), unique
  // id substring. The names `districts` shows are the names this accepts.
  private resolveDistrict(input: string): { id?: string; ambiguous?: string[] } {
    const cityData = WORLD_CITIES[this.player.city as keyof typeof WORLD_CITIES];
    const ids = (cityData?.districts ?? []) as string[];
    const norm = input.toLowerCase().trim().replace(/\s+/g, '_');
    if (ids.includes(norm)) return { id: norm };
    const items = ids.map((id) => ({ id, name: WORLD_DISTRICTS[id as keyof typeof WORLD_DISTRICTS]?.displayName ?? id.replace(/_/g, ' ') }));
    const resolved = resolveNamed(items, input, (c) => c.name);
    if (resolved.item) return { id: resolved.item.id };
    if (resolved.ambiguous) return { ambiguous: resolved.ambiguous };
    const sub = ids.filter((id) => id.includes(norm));
    if (sub.length === 1) return { id: sub[0] };
    return {};
  }

  // v0.108.18: DISCOVER — list the current city's districts/neighborhoods
  // from the city's own district data, each with its flavor line. No
  // invented places: names and descriptions come from WORLD_DISTRICTS.
  districts(): GameAction {
    const cityData = WORLD_CITIES[this.player.city as keyof typeof WORLD_CITIES];
    const ids = (cityData?.districts ?? []) as string[];
    if (ids.length === 0) {
      return { success: true, message: `No district data for ${cityDisplay(this.player.city)} yet.` };
    }
    const lines = ids.map((id) => {
      const d = WORLD_DISTRICTS[id as keyof typeof WORLD_DISTRICTS];
      const name = d?.displayName ?? id.replace(/_/g, ' ');
      const here = id === this.player.district ? ' ← you are here' : '';
      const flavor = d?.description ? ` — ${d.description}` : '';
      return `• ${name}${here}${flavor}`;
    });
    return { success: true, message: `🗺️ **Districts of ${cityDisplay(this.player.city)}** (${ids.length})\n${lines.join('\n')}\n\nMove with "goto [district]", look around with "explore [district]".` };
  }

  // v0.108.18: ORIENT — where you are right now, in display names only.
  where(): GameAction {
    const districtName = WORLD_DISTRICTS[this.player.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? this.player.district.replace(/_/g, ' ');
    return { success: true, message: `📍 You are in ${districtName}, ${cityDisplay(this.player.city)}.\n\nSee the neighborhoods with "districts", move with "goto [district]", travel with "travel [city]", return home with "go home".` };
  }

  goto(district: string): GameAction {
    // v0.108.18: same "to" tolerance as travel — "goto to downtown" works
    // instead of failing on a district literally named "to downtown".
    const cleaned = district.trim().replace(/^to\s+(the\s+)?/i, '');
    // v0.108.9 fix (minor 8): validate against the current city's real
    // districts instead of accepting any string. Cities with no district
    // data can't be validated, so they keep the old accept-anything
    // behavior.
    const cityData = WORLD_CITIES[this.player.city as keyof typeof WORLD_CITIES];
    const validDistricts = cityData?.districts;
    let normalized: string;
    if (!validDistricts || validDistricts.length === 0) {
      normalized = cleaned.toLowerCase().replace(/\s+/g, '_');
    } else {
      const resolved = this.resolveDistrict(cleaned);
      if (resolved.ambiguous) {
        return { success: false, message: `Multiple districts match "${cleaned}": ${resolved.ambiguous.join(', ')}. Type "goto [district]".` };
      }
      if (!resolved.id) {
        const valid = validDistricts.map((d) => WORLD_DISTRICTS[d as keyof typeof WORLD_DISTRICTS]?.displayName ?? d.replace(/_/g, ' '));
        return { success: false, message: `Unknown district "${cleaned}" in ${cityDisplay(this.player.city)}. Valid districts here: ${valid.join(', ') || 'none listed — try "districts"'}.` };
      }
      normalized = resolved.id;
    }
    const districtName = WORLD_DISTRICTS[normalized as keyof typeof WORLD_DISTRICTS]?.displayName ?? normalized.replace(/_/g, ' ');
    this.player.district = normalized;
    this.player.energy = Math.max(0, this.player.energy - 5);
    this.time.advance({ hours: 0, minutes: 30 });
    // v0.108.9 fix (minor 9): moving across town uses the primary vehicle
    // (3 nominal miles via the existing VehicleService wear model — fuel
    // and condition move; inter-city travel already wore vehicles).
    let wearNote = '';
    if (this.player.vehicles && this.player.vehicles.length > 0) {
      const vehicle = this.player.vehicles[0];
      if (!vehicle.immobilized) {
        this.vehicleService.applyWear(vehicle, 3);
        if (vehicle.immobilized) wearNote = ` 🚗 Your ${vehicle.name} ran out of fuel on the way — refuel before driving it again.`;
      }
    }
    return { success: true, message: `🚶 Moved to ${districtName}.${wearNote}` };
  }

  // === NPC & SOCIAL SYSTEM ===
  people(): GameAction {
    const npcs = this.social.getNPCByCity(this.player.city);
    // Prefer NPCs in the same district, but show everyone in the city as a fallback
    // (some legacy NPC records have invalid/undefined districts).
    const districtNpcs = npcs.filter(n => n.district === this.player.district);
    const shownNpcs = districtNpcs.length > 0 ? districtNpcs : npcs;

    if (shownNpcs.length === 0) {
      return { success: true, message: `No one around right now. Try exploring or visiting different districts.` };
    }

    const list = shownNpcs.slice(0, 8).map(n => {
      // v0.108.15 NPC revamp: the player's own relationship record is the
      // source of truth (the NPC object's value can lag for people met
      // through gifts/hangouts before a reload syncs it).
      const stored = this.player.relationships?.[n.id]?.value;
      const value = typeof stored === 'number' ? stored : n.relationship;
      const rel = stored !== undefined ? ` — ${relationshipLevel(value)} (${value})${value >= 50 ? ' ★' : ''}` : (value > 0 ? ` (+${value})` : value < 0 ? ` (${value})` : '');
      // v0.108.18: every entry carries decision info — district (always,
      // in display name) and quests on offer, so a player can choose who
      // to approach without opening each profile.
      const districtName = (WORLD_DISTRICTS[n.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? n.district?.replace(/_/g, ' ')) || 'nearby';
      const questTitles = (n.quests ?? []).map((q: any) => q.title).filter(Boolean);
      const questPart = questTitles.length > 0 ? ` — quest: ${questTitles.join(', ')}` : '';
      return `• ${n.name} - ${n.role.replace(/_/g, ' ')}${rel} — ${districtName}${questPart}`;
    }).join('\n');

    const header = districtNpcs.length > 0 ? (WORLD_DISTRICTS[this.player.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? this.player.district.replace('_', ' ')) : cityDisplay(this.player.city);
    return { success: true, message: `👥 **People in ${header}**\n${'─'.repeat(40)}\n${list}\n\nType "talk [name]" to interact.` };
  }

  // v0.108.18: NEARBY — one look at what's around: people AND places,
  // all from real data only (roster, schools, listings, tracks). Every
  // line carries what you can do there, so decisions are possible from
  // one look. Nothing here is invented: schools come from the school
  // engine, listings from the property engine, tracks from RACE_TRACKS.
  nearby(): GameAction {
    const districtName = WORLD_DISTRICTS[this.player.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? this.player.district.replace(/_/g, ' ');
    const sections: string[] = [];
    const npcs = this.social.getNPCByCity(this.player.city);
    const districtNpcs = npcs.filter(n => n.district === this.player.district);
    const shown = districtNpcs.length > 0 ? districtNpcs : npcs;
    if (shown.length > 0) {
      const lines = shown.slice(0, 8).map(n => {
        const stored = this.player.relationships?.[n.id]?.value;
        const value = typeof stored === 'number' ? stored : n.relationship;
        const rel = stored !== undefined ? ` — ${relationshipLevel(value)} (${value})` : '';
        const questTitles = (n.quests ?? []).map((q: any) => q.title).filter(Boolean);
        const questPart = questTitles.length > 0 ? ` — quest: ${questTitles.join(', ')}` : '';
        return `• ${n.name} — ${n.role.replace(/_/g, ' ')}${rel}${questPart} — talk ${n.name}`;
      });
      sections.push(`**People nearby:**\n${lines.join('\n')}`);
    }
    const placeLines: string[] = [];
    for (const s of this.schools.getSchoolsByCity(this.player.city)) {
      const sd = WORLD_DISTRICTS[s.district as keyof typeof WORLD_DISTRICTS]?.displayName ?? s.district.replace(/_/g, ' ');
      placeLines.push(`• 🎓 ${s.name} (${sd}) — enroll ${s.id}`);
    }
    for (const p of this.property.getListingsByCity(this.player.city)) {
      placeLines.push(`• 🏠 ${p.name} — $${p.price.toLocaleString()} — buy property ${p.name}`);
    }
    const norm = (s: string) => s.toLowerCase().replace(/[\s_]/g, '');
    for (const t of RACE_TRACKS.filter(t => norm(t.city) === norm(this.player.city))) {
      placeLines.push(`• 🏁 ${t.name} — race ${t.name}`);
    }
    if (placeLines.length > 0) sections.push(`**Places nearby:**\n${placeLines.join('\n')}`);
    if (sections.length === 0) {
      return { success: true, message: `Nothing stands out nearby in ${districtName}, ${cityDisplay(this.player.city)} right now. Try "explore" or "travel [city]".` };
    }
    return { success: true, message: `👀 **Nearby in ${districtName}, ${cityDisplay(this.player.city)}**\n\n${sections.join('\n\n')}` };
  }

  async talk(name: string): Promise<GameAction> {
    const nearby = this.social.getNPCByCity(this.player.city);

    if (!name.trim()) {
      if (nearby.length === 0) {
        return { success: true, message: `No one stands out nearby. Try "people" to see who's around.` };
      }
      const list = nearby.slice(0, 5).map(n => `• ${n.name}`).join('\n');
      return { success: true, message: `👥 **Who do you want to talk to?**\n${'-'.repeat(40)}\n${list}\n\nType "talk [name]".` };
    }

    // v0.108.12: NPC lookup goes through resolveNamed like every other
    // name lookup since v0.108.9 — the old substring-first-hit silently
    // talked to the wrong person on ambiguous input.
    const exactId = nearby.find((n) => n.id.toLowerCase() === name.toLowerCase());
    const resolvedNpc = exactId
      ? { item: exactId }
      : resolveNamed(nearby, name, (n) => n.name);
    if (resolvedNpc.ambiguous) {
      return { success: false, message: `Multiple people match "${name}": ${resolvedNpc.ambiguous.join(', ')}. Type "talk [full name]".` };
    }
    const npc = resolvedNpc.item;

    if (!npc) {
      return { success: false, message: `No one named "${name}" is around right now. Try "people" or "travel" to another city.` };
    }

    // Auto-add to contacts
    this.comm.addContact({
      id: npc.id,
      name: npc.name,
      phone: `555-${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
      email: `${npc.firstName.toLowerCase()}.${npc.lastName.toLowerCase()}@example.com`,
      isFavorite: false
    });

    // Initialize relationship on first meeting
    if (!this.player.relationships[npc.id]) {
      this.player.relationships[npc.id] = {
        value: 0,
        flags: [],
        metAt: Date.now(),
        lastInteracted: Date.now(),
        memory: [],
      };
      this.achievementEngine.updateProgress('first_introduction', 1);
      this.achievementEngine.updateProgress('networker', 1);
      this.achievementEngine.updateProgress('socialite', 1);

      const knownCities = new Set<string>();
      for (const relNpcId of Object.keys(this.player.relationships)) {
        const relNpc = this.social.getNPCById(relNpcId);
        if (relNpc) knownCities.add(relNpc.city);
      }
      const previous = this.achievementEngine.getProgress('city_hopper');
      this.achievementEngine.updateProgress('city_hopper', knownCities.size - previous);
    }

    const rel = this.player.relationships[npc.id]!;

    // Once the player has created a named character, treat the world as
    // having introduced themselves off-screen. This fixes the "Name's
    // Marcus. What's yours?" loop while still allowing natural conversation.
    if (this.player.name && this.player.name !== 'Traveler') {
      if (!rel.flags.includes('knows_name')) rel.flags.push('knows_name');
      const knownFlag = rel.flags.find((f: string) => f.startsWith('known_name:'));
      if (!knownFlag) rel.flags.push(`known_name:${this.player.name}`);
    }

    this.player.currentConversation = { npcId: npc.id, npcName: npc.name };

    // NPC speaks first so "talk" doesn't feel like talking to a bot.
    // v0.108.10: routed through the dialogue engine (Optra-backed with
    // template fallback). Memory comes from this player's own state only.
    const timeCtx = this.getTimeCtx();
    const opening = await this.dialogue.generateGreeting({
      scope: this.scopeFor(npc.id),
      npc: npc as unknown as DialogueNpc,
      player: this.player,
      rel,
      timeCtx,
    });
    rel.value = Math.max(-100, Math.min(100, rel.value + opening.relationshipChange));
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;

    // Remember the greeting so follow-up replies can reference it.
    rel.memory.push({ role: 'npc', content: opening.text, timestamp: Date.now() });
    if (rel.memory.length > 20) rel.memory = rel.memory.slice(-20);

    // v0.108.15 NPC revamp: the greeting now carries the relationship
    // standing, so a conversation never hides where you stand.
    const talkPerks = relationshipPerks(rel.value);
    return {
      success: true,
      message: `You walk up to ${npc.name} and they respond:\n\n${opening.text}\n\n_Say anything to continue. Type "bye" or "end" to leave._\n🤝 Relationship: ${rel.value} (${relationshipLevel(rel.value)})${talkPerks.length ? ` — perks: ${talkPerks.join('; ')}` : ''}`,
      npcName: npc.name,
    };
  }
  
  async continueConversation(input: string): Promise<GameAction> {
    const conv = this.player.currentConversation;
    if (!conv) return { success: false, message: "You aren't in a conversation." };

    const npc = this.social.getNPCById(conv.npcId);
    if (!npc) return { success: false, message: "The person you were talking to disappeared." };

    // Exit conversation naturally
    const lower = input.toLowerCase().trim();
    if (['bye', 'goodbye', 'see ya', 'peace', 'later', 'end', 'leave', 'exit', 'gotta go'].includes(lower)) {
      this.player.currentConversation = null;
      return {
        success: true,
        message: `${npc.name} nods. "Take care." You step away from the conversation.\n\n💬 Conversation over — commands work again. Try "status", "districts", or "explore".`,
        npcName: npc.name,
      };
    }

    const relationship = this.player.relationships[npc.id];
    if (!relationship) {
      this.player.relationships[npc.id] = {
        value: 0,
        flags: [],
        metAt: Date.now(),
        lastInteracted: Date.now(),
        memory: [],
      };
    }
    const rel = this.player.relationships[npc.id]!;

    const timeCtx = this.getTimeCtx();
    // v0.108.10: routed through the dialogue engine (Optra-backed with
    // template fallback). Same result shape the quest hook below expects.
    const response = await this.dialogue.generateReply({
      scope: this.scopeFor(npc.id),
      npc: npc as unknown as DialogueNpc,
      player: this.player,
      rel,
      input,
      timeCtx,
      gameDate: this.time.formatDate(),
    });

    // Update relationship
    rel.value = Math.max(-100, Math.min(100, rel.value + response.relationshipChange));
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;

    // Conversation engine already records memory internally. We keep the
    // relationship object normalized here and trust the engine's transcript.
    let finalMessage = response.text;
    
    // Handle Quest Trigger
    if (response.questTriggered) {
      const questId = response.questTriggered;
      const quest = npc.quests?.find(q => q.id === questId);
      if (quest) {
        this.storyline.startQuest(this.player, npc, quest);
        // v0.108.15: quest starts are journal-log events (spec §3).
        appendJournalLog(this.player, this.time.formatDate(), `Quest started: ${quest.title} (from ${npc.name})`);
        if (!this.player.dialogueMemory) this.player.dialogueMemory = {};
        if (!this.player.dialogueMemory[npc.id]) this.player.dialogueMemory[npc.id] = { facts: {}, episodes: [], threads: [] };
        this.player.dialogueMemory[npc.id].facts['questStarted'] = quest.title;
        finalMessage += `\n\n🎁 **Quest Started: ${quest.title}**\n${quest.description}`;
      }
    }
    
    return { 
      success: true, 
      message: finalMessage, 
      npcName: npc.name 
    };
  }
  
  endConversation(): GameAction {
    if (!this.player.currentConversation) {
      return { success: false, message: 'You\'re not in a conversation.' };
    }
    
    const conv = this.player.currentConversation;
    const npc = this.social.getNPCById(conv.npcId);
    this.player.currentConversation = null;
    
    if (npc) {
      return { success: true, message: `You wave goodbye to ${npc.name}. Conversation ended.\n\n💬 Conversation over — commands work again. Try "status", "districts", or "explore".` };
    }
    
    return { success: true, message: 'Conversation ended.\n\n💬 Conversation over — commands work again. Try "status", "districts", or "explore".' };
  }

  // v0.108.20 (§28): deterministic template greetings — no dialogue
  // provider call, no randomness. The footer format is UNCHANGED from
  // talk(); only the greeting line above it and the style effects are
  // new. Effects apply at most once per NPC per game-day.
  greet(rawArgs: string): GameAction {
    const parts = rawArgs.trim().split(/\s+/).filter(Boolean);
    const styles = ['warm', 'respectful', 'playful', 'cool'];
    let style = 'warm';
    let npcName = rawArgs.trim();
    if (parts.length > 1 && styles.includes(parts[parts.length - 1]!.toLowerCase())) {
      style = parts[parts.length - 1]!.toLowerCase();
      npcName = parts.slice(0, -1).join(' ');
    }
    const nearby = this.social.getNPCByCity(this.player.city);
    const resolved = resolveNamed(nearby, npcName, (n) => n.name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${npcName}": ${resolved.ambiguous.join(', ')}. Type "greet [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${npcName}" is around right now. Type "people" or "travel" to another city.` };
    const isNew = !this.player.relationships?.[npc.id];
    const rel = this.ensureRel(npc);
    if (isNew) {
      this.achievementEngine.updateProgress('first_introduction', 1);
      this.achievementEngine.updateProgress('networker', 1);
      this.achievementEngine.updateProgress('socialite', 1);
    }
    if (this.player.name && this.player.name !== 'Traveler') {
      if (!rel.flags.includes('knows_name')) rel.flags.push('knows_name');
      if (!rel.flags.find((f: string) => f.startsWith('known_name:'))) rel.flags.push(`known_name:${this.player.name}`);
    }
    this.player.currentConversation = { npcId: npc.id, npcName: npc.name };
    const today = this.time.formatDate();
    const already = rel.lastGreetDate === today;
    const base = greetingBaseChange(rel.value ?? 0);
    let effectNote = '';
    if (!already) {
      if (style === 'warm') {
        rel.value = Math.max(-100, Math.min(100, (rel.value ?? 0) + base));
        effectNote = ` Relationship +${base}.`;
      } else if (style === 'respectful') {
        rel.value = Math.max(-100, Math.min(100, (rel.value ?? 0) + base));
        this.player.reputation.community = Math.min(100, (this.player.reputation?.community ?? 0) + 1);
        effectNote = ` Relationship +${base}, community reputation +1.`;
      } else if (style === 'playful') {
        if ((rel.value ?? 0) < 25) {
          effectNote = ` ${npc.name} deflects the joke with a cool nod — you don't know each other well enough yet for that tone. Relationship +0.`;
        } else {
          rel.value = Math.max(-100, Math.min(100, (rel.value ?? 0) + base + 1));
          this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + 2);
          effectNote = ` Relationship +${base + 1}, happiness +2.`;
        }
      } else {
        effectNote = ` A brief nod — no change.`;
      }
      rel.lastGreetDate = today;
    } else {
      effectNote = ` — already greeted today, so no relationship change this time.`;
    }
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;
    const line = this.buildGreetingLine(npc, rel, style, already);
    rel.memory.push({ role: 'npc', content: line, timestamp: Date.now() });
    if (rel.memory.length > 20) rel.memory = rel.memory.slice(-20);
    const perks = relationshipPerks(rel.value);
    return {
      success: true,
      message: `You greet ${npc.name} (${style}):\n\n${line}${effectNote}\n\n🤝 Relationship: ${rel.value} (${relationshipLevel(rel.value)})${perks.length ? ` — perks: ${perks.join('; ')}` : ''}`,
      npcName: npc.name,
    };
  }

  helpNPC(npcName: string): GameAction {
    if (!npcName) return { success: false, message: 'Help whom? Type "people" to see who\'s around.' };
    
    const npcs = this.social.getAllNPCs();
    const npc = npcs.find(n => n.name.toLowerCase().includes(npcName.toLowerCase()));
    
    if (!npc) {
      return { success: false, message: `No one named "${npcName}" found.` };
    }
    
    const result = this.social.interact(npc.id, { type: 'help' });
    
    if (!this.player.relationships) this.player.relationships = {};
    if (!this.player.relationships[npc.id]) {
      this.player.relationships[npc.id] = { value: 0, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };
    }
    const rel = this.player.relationships[npc.id];
    rel.value = Math.max(-100, Math.min(100, rel.value + (result.relationshipChange || 0)));
    rel.lastInteracted = Date.now();
    
    this.player.reputation.community += 1;
    
    return { success: result.success, message: result.message };
  }

  // === REST & RECOVERY ===
  sleep(): GameAction {
    if (this.player.energy >= 100) {
      // v0.108.3 fix: a fully-rested sleep used to be a total no-op — no
      // time advance at all — so sleeping twice in a row never moved the
      // day. Passing time still costs 8 game-hours, but grants no further
      // benefit: energy is already full, stress/happiness were already
      // restored by the last sleep, and the market tick stays tied to a
      // real restful sleep — otherwise rested sleeps would become a
      // zero-cost investment-tick farm (sleep, sleep, sleep...).
      this.time.advance({ hours: 8, minutes: 0 });
      this.triggerCommunication(); // Living world update
      return { success: true, message: `😴 You were already rested, so you pass 8 hours. No further energy, stress, or market change.` };
    }
    
    // v0.108.23 §62: capture the pre-sleep state for the sleep record.
    const beforeSleep = {
      energy: this.player.energy ?? 0,
      health: this.player.health ?? 100,
      happiness: this.player.happiness ?? 0,
    };
    this.player.energy = 100;
    this.player.stress = Math.max(0, this.player.stress - 20);
    this.player.happiness = Math.min(100, this.player.happiness + 5);
    // v0.108.19 Home Life: sleeping in a city where you own a furnished
    // property recovers better — comfort tier adds happiness, tier 2+
    // sheds extra stress. Only the best home in the current city counts.
    const homeComfort = Math.max(0, ...(this.player.properties ?? [])
      .filter((p: any) => p.city === this.player.city)
      .map((p: any) => comfortTier((p.furniture ?? []).length)));
    let comfortNote = '';
    if (homeComfort > 0) {
      this.player.happiness = Math.min(100, this.player.happiness + homeComfort);
      if (homeComfort >= 2) this.player.stress = Math.max(0, this.player.stress - 5);
      comfortNote = ` 🏠 Home comfort (tier ${homeComfort}) adds +${homeComfort} happiness${homeComfort >= 2 ? ' and sheds extra stress' : ''}.`;
    }
    // v0.108.24: night-band restful sleep (starts 9 PM–5 AM) recovers
    // better — +5 happiness on top of the base rest. Energy already
    // restores to 100 either way, so the bonus lands where it is
    // visible (and flows into lastSleep.happy naturally). The rested
    // early return above still records nothing.
    const sleepStartHour = this.time.currentTime.getHours();
    const nightBonus = sleepStartHour >= 21 || sleepStartHour < 5;
    if (nightBonus) {
      this.player.happiness = Math.min(100, this.player.happiness + 5);
    }
    // v0.108.9 fix (major 3): restful sleep restores health too.
    this.player.health = Math.min(100, (this.player.health ?? 100) + 5);
    // v0.108.23 §62: record what this restful sleep recovered (deltas +
    // comfort tier). The rested-sleep early return above records nothing.
    this.player.lastSleep = {
      energy: 100 - beforeSleep.energy,
      health: (this.player.health ?? 100) - beforeSleep.health,
      happy: (this.player.happiness ?? 0) - beforeSleep.happiness,
      comfort: homeComfort,
    };
    this.time.advance({ hours: 8, minutes: 0 });

    // v0.108.1 fix: applyInvestmentReturns() was defined but never called, so
    // investment values never moved.
    // v0.108.9 fix (major 4): a market tick now requires a genuine
    // game-day advance — at most one tick per game-day. Same-day sleep
    // loops (e.g. gym -> sleep twice) can no longer farm ticks; rested
    // sleeps never tick, as before.
    // v0.108.29: the market tick's outcome (per-position before → after)
    // is recorded for the server log — without it, investment movement
    // is invisible in log pulls (TOW-001). Only set when a tick runs.
    let tickOutcome: string | null = null;
    if (this.player.investments && this.player.investments.length > 0) {
      const today = this.time.formatDate();
      if (this.player.lastInvestmentTickDate !== today) {
        const before = new Map<string, number>(
          this.player.investments.map((i: any) => [String(i.name), Number(i.currentValue ?? 0)]),
        );
        // v0.108.20 (§25): stocks recompute deterministically — the
        // random-walk market tick must never touch them.
        const nonStock = this.player.investments.filter((i: any) => i.type !== 'stock');
        this.property.applyInvestmentReturns(nonStock);
        this.recomputeStockHoldings();
        this.player.lastInvestmentTickDate = today;
        const moves = this.player.investments.map((i: any) => {
          const oldV = before.get(String(i.name)) ?? 0;
          const newV = Number(i.currentValue ?? 0);
          const d = newV - oldV;
          return `${i.name} $${oldV.toLocaleString()}→$${newV.toLocaleString()} (${d >= 0 ? '+' : ''}$${d.toLocaleString()})`;
        });
        const beforeTotal = [...before.values()].reduce((a, b) => a + b, 0);
        const afterTotal = this.player.investments.reduce((s: number, i: any) => s + Number(i.currentValue ?? 0), 0);
        tickOutcome = `sleep investment tick: ${moves.join('; ')} (portfolio $${beforeTotal.toLocaleString()}→$${afterTotal.toLocaleString()})`;
      }
    }

    this.triggerCommunication(); // Living world update

    return {
      success: true,
      message: `😴 Slept for 8 hours. Energy restored to 100. Stress decreased.${comfortNote}${nightBonus ? ' 🌙 Night sleep recovers better (+5 happiness).' : ''}`,
      ...(tickOutcome ? { outcomeLog: tickOutcome } : {}),
    };
  }

  gym(): GameAction {
    if (this.player.money < 15) return { success: false, message: "Need $15 for gym day pass." };
    this.player.money -= 15;
    // v0.108.24: gym sessions feed the sports-news headline honestly.
    this.player.gymSessions = (this.player.gymSessions ?? 0) + 1;
    this.player.fitness = Math.min(100, this.player.fitness + 2);
    this.player.energy = Math.max(0, this.player.energy - 20);
    this.player.stress = Math.max(0, this.player.stress - 5);
    // v0.108.9 fix (minor 14): a workout also lifts mood slightly.
    this.player.happiness = Math.min(100, (this.player.happiness ?? 80) + 2);
    this.time.advance({ hours: 2, minutes: 0 });
    
    const levelUpMsg = this.addSkillXP('fitness', 20);
    
    return { success: true, message: `Workout complete. FIT +2 (now ${this.player.fitness})${levelUpMsg}. Stress -5. Happy +2. Energy: ${this.player.energy}/100` };
  }

  // === TRAVEL ===
  travelTo(city: string): GameAction {
    // v0.108.18: accept the natural "travel to [city]" form — strip a
    // leading "to" (or "to the") before lookup, so "travel to Memphis"
    // works exactly like "travel Memphis" instead of failing on a city
    // literally named "to Memphis".
    const dest = city.trim().replace(/^to\s+(the\s+)?/i, '');
    // v0.108.24: trailing "by [bus|train|airport]" picks a transit mode.
    const modeMatch = dest.match(/\s+by\s+(bus|train|airport)\s*$/i);
    const mode = modeMatch ? (modeMatch[1]!.toLowerCase() as 'bus' | 'train' | 'airport') : null;
    const destCity = modeMatch ? dest.slice(0, modeMatch.index).trim() : dest;
    // v0.108.12: city matching goes through resolveNamed (exact, then
    // unique substring, else refuse-with-list) instead of silently taking
    // the first substring hit on display name.
    const cityIds = Object.keys(WORLD_CITIES) as string[];
    const q = destCity.toLowerCase();
    let cityData = cityIds.find((id) => id === q);
    if (!cityData) {
      const resolved = resolveNamed(
        cityIds.map((id) => ({ id, name: WORLD_CITIES[id as keyof typeof WORLD_CITIES]?.displayName ?? id })),
        destCity,
        (c) => c.name,
      );
      if (resolved.ambiguous) {
        return { success: false, message: `Multiple cities match "${destCity}": ${resolved.ambiguous.join(', ')}. Type "travel [full city name]".` };
      }
      cityData = resolved.item?.id;
    }

    if (!cityData) return { success: false, message: `City "${destCity}" not found. Try: Memphis, Little Rock, Southaven, Nashville, Atlanta, Chicago, etc.` };

    const data = WORLD_CITIES[cityData as keyof typeof WORLD_CITIES];
    if (cityData === this.player.city) {
      return { success: false, message: `You're already in ${data.displayName}.` };
    }

    // v0.108.12: real travel pricing from TRAVEL_ROUTES (previously travel
    // was free). A direct route charges its cost and time; pairs with no
    // route data use a generic $50 / 3h bus connection so no destination
    // is stranded. The fare is checked BEFORE moving — a broke player
    // stays put instead of arriving in debt.
    // v0.108.24: a "by [mode]" suffix prices through the transit module
    // (bus ×0.8 fare / ×1.5 time, train ×1.25 / ×1.0, airport ×2.5 /
    // ×0.4, airport only between airport cities). Discounts are perks
    // only and apply to routed fares, never the $50 fallback: weekly
    // transit pass 20% off routed bus/drive, passport 15% off routed
    // fares to international cities (multiplicative when both apply).
    const fromCity = this.player.city;
    const route = TRAVEL_ROUTES.find((r) => r.from === fromCity && r.to === cityData);
    const base = route ? { baseCost: route.cost, baseHours: route.timeHours } : { baseCost: 50, baseHours: 3 };
    let fare: number;
    let fareHours: number;
    let fareMethod: string;
    if (mode) {
      const opt = transitOption({ fromCity, toCity: cityData, ...base }, mode);
      if (!opt.available) return { success: false, message: `No ${mode} service between ${cityShortName(fromCity)} and ${data.displayName}: ${opt.note} Try bus or train.` };
      fare = opt.fareCents / 100;
      fareHours = opt.timeHours;
      fareMethod = mode;
    } else {
      fare = base.baseCost;
      fareHours = base.baseHours;
      fareMethod = route ? route.method : 'bus';
    }
    const isInternational = ['london', 'tokyo', 'paris', 'berlin', 'dubai', 'mexico_city', 'toronto', 'sydney'].includes(cityData);
    if (route) {
      if (this.player.transitPassWeek === weekKeyFromDate(this.time.formatDate()) && (fareMethod === 'bus' || fareMethod === 'drive')) fare = roundCents(fare * 0.8);
      if (isInternational) fare = roundCents(fare * (1 - this.idDiscount('international_fare')));
    }
    // v0.108.24 severe weather at origin: routed travel takes +1h; once
    // per severe game-day, traveling costs −2 happiness and −1
    // condition on origin-city properties (floored at 0). Effects apply
    // only after the affordability check below passes.
    const originWeather = getWeather(this.time.currentTime, fromCity);
    const severe = originWeather.condition === 'stormy' || originWeather.condition === 'snowy';
    const finalHours = severe ? roundCents(fareHours + 1) : fareHours;
    if ((this.player.money || 0) < fare) {
      return { success: false, message: `Travel to ${data.displayName} costs $${fare} by ${fareMethod} (${finalHours}h). You have $${(this.player.money || 0).toFixed(2)}.` };
    }
    this.player.money = roundCents((this.player.money || 0) - fare);
    let severeNote = '';
    if (severe) {
      fareHours = finalHours;
      const todayKey = this.time.formatDate();
      if (this.player.severeDayNoted !== todayKey) {
        this.player.happiness = Math.max(0, (this.player.happiness ?? 0) - 2);
        for (const p of this.player.properties ?? []) {
          if ((p as any).city === fromCity) (p as any).condition = Math.max(0, ((p as any).condition ?? 100) - 1);
        }
        this.player.severeDayNoted = todayKey;
        severeNote = ' ⚠️ Severe weather added 1h, cost 2 happiness, and wore your properties here by 1 condition.';
      } else {
        severeNote = ' ⚠️ Severe weather added 1h to this trip.';
      }
    }

    // v0.108.23 §60: travel journal — every successful trip counts.
    this.player.travelStats = recordTrip(this.player.travelStats, cityData, fare);

    this.player.city = cityData;
    this.player.district = 'downtown';

    if (!this.player.visitedCities) this.player.visitedCities = ['west_memphis'];
    const wasNewCity = !this.player.visitedCities.includes(cityData);
    if (wasNewCity) {
      this.player.visitedCities.push(cityData);
    }
    const challengeCityGain = wasNewCity && this.noteChallengeCity(cityData) ? 1 : 0;
    // v0.108.12: progress is set to the true count via delta, not by
    // adding the full count on every trip (the old code inflated travel
    // progress on every new city, so world_traveler would have unlocked
    // after ~6 cities even with the correct 27 max).
    const bumpTo = (id: string, target: number) => {
      const prev = this.achievementEngine.getProgress(id);
      if (target > prev) this.achievementEngine.updateProgress(id, target - prev);
    };
    bumpTo('traveler', this.player.visitedCities.length);
    bumpTo('jetsetter', this.player.visitedCities.length);
    bumpTo('world_traveler', this.player.visitedCities.length);
    // International city progress
    const internationalCities = ['london', 'tokyo', 'paris', 'berlin', 'dubai', 'mexico_city', 'toronto', 'sydney'];
    const visitedInternational = this.player.visitedCities.filter((c: string) => internationalCities.includes(c)).length;
    bumpTo('global_citizen', visitedInternational);
    bumpTo('passport_collector', visitedInternational);
    // Check non-progress travel achievements
    this.achievementEngine.checkAchievement('international', this.player);
    this.achievementEngine.checkAchievement('continental', this.player);
    this.achievementEngine.checkAchievement('coast_to_coast', this.player);

    this.time.advance({ hours: fareHours, minutes: 0 });
    this.player.energy = Math.max(0, this.player.energy - 10);

    // Atmospheric Arrival Messages
    let arrivalMsg = `\ud83d\ude97 Arrived in ${data.displayName} by ${fareMethod} ($${fare}, ${fareHours}h).`;
    
    const greetings: Record<string, string[]> = {
      london: [
        'The red double-decker buses and historic skyline greet you. "Mind the gap," someone whispers.',
        'Fog rolls over the Thames as you arrive in the heart of the British Empire.',
        'The bustling energy of Piccadilly Circus welcomes you to the Big Smoke.'
      ],
      tokyo: [
        'Neon lights and organized chaos surround you. The city hums with high-tech energy.',
        'You step into a sea of people in Shibuya Crossing, the heartbeat of the world\'s largest city.',
        'The serene shrines and towering skyscrapers create a unique contrast as you arrive.'
      ],
      paris: [
        'The smell of fresh baguettes and the elegant architecture make it clear you\'re in the City of Light.',
        'The Eiffel Tower looms in the distance, a beacon of romance and art.',
        'Cobblestone streets and cozy cafes welcome you to the heart of France.'
      ],
      berlin: [
        'Vibrant street art and a gritty, creative energy pulse through the air.',
        'The echoes of history and the beat of techno define your arrival in the German capital.',
        'A city of contrast, where brutalist architecture meets avant-garde galleries.'
      ],
      dubai: [
        'Shimmering skyscrapers and luxury cars define the horizon in this desert oasis.',
        'The heat is intense, but the ambition of this city is even hotter.',
        'You arrive in a world of gold, glass, and gravity-defying architecture.'
      ],
      mexico_city: [
        'The vibrant colors and rich aromas of street food tell you you\'ve arrived in the heart of Mexico.',
        'A sprawling metropolis where ancient ruins and modern skyscrapers coexist.',
        'The energy of the Zócalo greets you with a whirlwind of music and culture.'
      ],
      toronto: [
        'A clean, modern skyline and friendly faces welcome you to Canada\'s largest hub.',
        'The CN Tower pierces the clouds, guiding you into the diverse heart of Ontario.',
        'A crisp breeze from Lake Ontario greets you as you step into the 6ix.'
      ],
      sydney: [
        'The salty sea breeze and the iconic silhouette of the Opera House welcome you down under.',
        'Bright sunshine and turquoise waters make Sydney feel like a permanent vacation.',
        'The laid-back vibe of the harbor greets you as you arrive in the Emerald City.'
      ],
      new_york: [
        'The concrete jungle surrounds you. You feel the frantic pace of the center of the world.',
        'Taxis honking and towering skyscrapers—welcome to the city that never sleeps.',
        'The electric energy of Times Square hits you like a wave upon arrival.'
      ],
      los_angeles: [
        'Palm trees and sunshine. The Hollywood sign peeks through the haze.',
        'The sprawl of the city and the promise of fame hang in the warm California air.',
        'Traffic, beaches, and movie stars—you\'ve arrived in the City of Angels.'
      ],
      chicago: [
        'Wind sweeps through the skyscrapers. The lake looks like an ocean from here.',
        'Deep-dish pizza and architectural marvels define the Windy City\'s welcome.',
        'The roar of the L-train echoes through the streets as you arrive.'
      ],
      memphis: [
        'The sound of blues and the smell of BBQ fill the air. Welcome to the Bluff City.',
        'The spirit of Elvis and the flow of the Mississippi define your arrival.',
        'Gritty, soulful, and authentic—Memphis welcomes you home.'
      ],
      nashville: [
        'Country music drifts from every doorway. Welcome to Music City.',
        'The neon lights of Broadway signal your arrival in the heart of songwriting.',
        'A blend of rhinestone and rustic charm welcomes you to Nashville.'
      ],
      atlanta: [
        'The busy airport and sprawling greenery welcome you to the capital of the South.',
        'Hip-hop beats and corporate power clash and blend in the Peach State\'s hub.',
        'The skyline of the A rises before you, promising opportunity and culture.'
      ],
      west_memphis: [
        'The quiet hum of the border town greets you where Arkansas meets the Mississippi.',
        'Trucks roll past and the water tower watches over familiar streets.',
        'You cross the bridge and feel the slower pace of small-town life.'
      ],
      littlerock: [
        'The dome of the State Capitol shines above the Arkansas River.',
        'A blend of government, history, and Southern hospitality awaits.',
        'You arrive in the Natural State\'s polished capital.'
      ],
      southaven: [
        'Suburban quiet spreads in every direction, just a short drive from Memphis.',
        'Well-kept neighborhoods and growing businesses signal a family-friendly stop.',
        'You arrive in a town that feels like home with room to grow.'
      ],
      new_orleans: [
        'Jazz spills into the street as the humid air wraps around you.',
        'The scent of Creole cooking and the sound of brass bands mark your arrival.',
        'You step into a city where every day feels like a celebration.'
      ],
      miami: [
        'Neon lights, ocean spray, and salsa rhythms pulse through the night.',
        'The tropical heat matches the energy of this coastal metropolis.',
        'You arrive where South Beach glamour meets Cuban soul.'
      ],
      charlotte: [
        'Banking towers rise beside Southern oak trees in the Queen City.',
        'A modern skyline meets old-school Southern charm on every corner.',
        'You arrive in one of the fastest-growing cities in the South.'
      ],
      detroit: [
        'The spirit of Motown and the roar of engines welcome you to the Motor City.',
        'Revitalized streets and gritty resilience define Detroit\'s comeback.',
        'You arrive in a city that built America and is rebuilding itself.'
      ],
      philadelphia: [
        'History echoes from cobblestone streets and Independence Hall.',
        'The aroma of cheesesteaks and the brotherly spirit surround you.',
        'You arrive in Philly, where liberty and attitude walk hand in hand.'
      ],
      las_vegas: [
        'The neon glow of the Strip lights up the desert night.',
        'Jackpot chimes, showbiz energy, and endless entertainment greet you.',
        'You arrive in a city that never stops rolling the dice.'
      ],
      houston: [
        'Space City sprawls under the Texas sun, driven by oil, tech, and ambition.',
        'Cultural diversity and Southern hospitality define this booming metropolis.',
        'You arrive where NASA dreams and Gulf Coast grit meet.'
      ],
      dallas: [
        'Cowboy boots and corporate towers share the skyline in Big D.',
        'The spirit of Texas pride is alive on every boulevard.',
        'You arrive in Dallas, where history, sports, and commerce collide.'
      ],
      phoenix: [
        'The desert sun blazes over red rock and saguaros in the Valley of the Sun.',
        'You arrive in a fast-growing oasis of heat, innovation, and southwestern spirit.',
        'Cactus-studded mountains frame the glowing sprawl below.'
      ],
      seattle: [
        'Coffee aroma, evergreen rain, and the Space Needle welcome you to the Emerald City.',
        'A tech hub tucked between Puget Sound and mist-covered mountains.',
        'You arrive where innovation meets Pacific Northwest calm.'
      ]
    };

    const options = greetings[cityData];
    if (options) {
      const picked = options[Math.floor(Math.random() * options.length)];
      if (picked) arrivalMsg = `\ud83d\ude97 **${data.displayName}**: ${picked}`;
    }

    // Time-of-day atmospheric detail
    const hour = this.time.currentTime.getHours();
    let timeDetail = '';
    if (hour >= 5 && hour < 12) {
      timeDetail = 'The morning light makes the city feel full of possibility.';
    } else if (hour >= 12 && hour < 17) {
      timeDetail = 'The afternoon hustle surrounds you as the city works.';
    } else if (hour >= 17 && hour < 21) {
      timeDetail = 'The golden hour settles over the streets as the day winds down.';
    } else {
      timeDetail = 'The city glows under the cover of night.';
    }
    arrivalMsg += `${severeNote}\n\ud83c\udf05 ${timeDetail}`;

    // Police checkpoint based on heat
    if ((this.player.heat || 0) > 50) {
      const checkpoint = this.handlePoliceEncounter(false);
      if (!checkpoint.success) {
        return checkpoint;
      }
      arrivalMsg += '\n\n' + checkpoint.message;
    }

    // Vehicle wear and tear / breakdown check
    if (this.player.vehicles && this.player.vehicles.length > 0) {
      const vehicle = this.player.vehicles[0];
      const dist = 50 + Math.random() * 150; // Miles traveled
      this.vehicleService.applyWear(vehicle, dist);
      const breakResult = this.vehicleService.attemptBreakdown(vehicle);
      if (breakResult.happened) {
        if ((breakResult.cost ?? 0) > 0) this.player.money = Math.max(0, this.player.money - breakResult.cost!);
        return {
          success: true,
          message: `🚗 ${breakResult.message} Condition fell to ${vehicle.condition}%.`
        };
      }
      if (vehicle.condition < 20) {
        return { success: true, message: `🚗 Arrived in ${data.displayName}. **WARNING**: Your ${vehicle.name} is in critical condition (${vehicle.condition}%). Maintain it soon!` };
      }
    }

    this.triggerCommunication(); // Living world update
    
    return { success: true, message: `${arrivalMsg}\n\n${data.districts?.length || 0} districts to explore. Type "districts" to see them, then "goto [district]" to move.`, challengeContributions: challengeCityGain ? { cities: challengeCityGain } : undefined };
  }

  // v0.108.17: "go home" / "home". The game has no stored home-city field,
  // so home is defined as the player's primary residence city: the first
  // owned property's city if any, else the starting city (west_memphis).
  // Travel reuses travelTo — same fares, same fare check, same time and
  // energy rules, no new travel economy. Same-city home costs nothing
  // per the v0.108.12 rule; landing in the home city puts the player at
  // their property's district when one exists, instead of downtown.
  goHome(): GameAction {
    const props = (this.player.properties ?? []) as Array<{ city?: string; district?: string; name?: string; id?: string }>;
    // v0.108.20 §36: PRIMARY residence first, then first owned, then
    // starting city, then west_memphis (extension, never a break).
    const homeProp = (props.find((p: any) => p.id === this.player.primaryResidenceId) ?? props[0]) as any;
    let homeCity = homeProp?.city;
    if (!homeCity || !WORLD_CITIES[homeCity as keyof typeof WORLD_CITIES]) {
      // v0.108.20: primary/first-property city -> start city -> west_memphis.
      const start = this.player.startCity;
      homeCity = start && WORLD_CITIES[start as keyof typeof WORLD_CITIES] ? start : 'west_memphis';
    }
    const homeData = WORLD_CITIES[homeCity as keyof typeof WORLD_CITIES];
    if (homeCity === this.player.city) {
      if (homeProp?.district && homeProp.district !== this.player.district) {
        this.player.district = homeProp.district;
        return { success: true, message: `🏠 You head home to ${homeProp.name ?? 'your place'} in ${homeData.displayName} — no travel cost, you're already in town.` };
      }
      return { success: true, message: `🏠 You're already home in ${homeData.displayName}.` };
    }
    const result = this.travelTo(homeCity!);
    if (result.success) {
      if (homeProp?.district) this.player.district = homeProp.district;
      return { success: true, message: `🏠 Heading home to ${homeData.displayName}.\n\n${result.message}` };
    }
    return result;
  }

  // === PROPERTY SYSTEM ===
  realEstate(): GameAction {
    const listings = this.property.getListingsByCity(this.player.city);
    const market = this.property.getMarketReport();

    if (listings.length === 0) {
      return { success: true, message: `No properties available in ${cityDisplay(this.player.city)}. Try traveling to Memphis, Little Rock, or Southaven.` };
    }

    // v0.108.21 (§52): in-flight listings show their INDEX-ADJUSTED
    // prices (catalog × today's index for this city) plus a line
    // naming the index — the price shown is the price charged.
    const monthKey = this.time.getMonthKey();
    const idx = housingMarketIndex(this.player.city, monthKey);
    const list = listings.map(p => {
      const adjusted = listingPriceNow(p.price, this.player.city, monthKey);
      const note = adjusted !== p.price ? ` (catalog $${p.price.toLocaleString()} × index ${idx.toFixed(2)})` : '';
      return `• ${p.name} - $${adjusted.toLocaleString()}${note}\n  ${p.type} in ${p.district.replace('_', ' ')} | Rent: $${p.rentalPotential}/mo\n  ${p.description}`;
    }).join('\n\n');

    return {
      success: true,
      message: `🏠 **Real Estate - ${cityDisplay(this.player.city)}**\n${'─'.repeat(50)}\n📈 Market: ${market.trend}\n📊 Housing index here: ${idx.toFixed(2)} — listing prices below are already index-adjusted (catalog price × index), and buys charge exactly the price shown.\n💡 ${market.recommendation}\n\n${list}\n\nBuying defaults to cash if you have the full price, otherwise a 20% down-payment mortgage. Example first: "buy property Broadway Starter Home mortgage" — then the pattern: "buy property [name] cash" / "buy property [name] mortgage".`
    };
  }

  buyProperty(rawInput: string): GameAction {
    if (!rawInput) {
      return { success: false, message: 'Which property? Type "real-estate" to see listings.' };
    }

    // Detect explicit payment method suffixes: "cash" or "mortgage".
    // v0.108.20 §47: suffix strip is CASE-INSENSITIVE (lowercase the tail
    // for comparison, keep the name's display casing), then bracket
    // tolerance strips ONE surrounding [ ] pair (players copy help's
    // brackets literally). Errors show the CLEANED name, never raw input.
    let propertyName = rawInput;
    let useMortgage: boolean | null = null;
    const trimmed = rawInput.trim();
    const lowerTail = trimmed.toLowerCase();

    if (lowerTail.endsWith(' cash')) {
      useMortgage = false;
      propertyName = trimmed.slice(0, -5).trim();
    } else if (lowerTail.endsWith(' mortgage')) {
      useMortgage = true;
      propertyName = trimmed.slice(0, -9).trim();
    }
    if (propertyName.startsWith('[') && propertyName.endsWith(']') && propertyName.length >= 2) {
      propertyName = propertyName.slice(1, -1).trim();
    }

    if (!propertyName) {
      return { success: false, message: 'Which property? Type "real-estate" to see listings.' };
    }

    // v0.108.20 §47: CURRENT-CITY-FIRST matching — resolve against the
    // current city's listings first (local wins ties), falling back to
    // all listings so remote buying is preserved, not removed.
    const listings = this.property.getAllListings();
    let foundListing = resolveNamed(this.property.getListingsByCity(this.player.city), propertyName, (l) => l.name);
    if (!foundListing.item && !foundListing.ambiguous) {
      foundListing = resolveNamed(listings, propertyName, (l) => l.name);
    }
    if (foundListing.ambiguous) {
      return { success: false, message: `Multiple properties match "${propertyName}": ${foundListing.ambiguous.join(', ')}. Be more specific.` };
    }
    const listing = foundListing.item;

    if (!listing) {
      return { success: false, message: `Property "${propertyName}" not found. Type "real-estate" to see listings.` };
    }

    const downPaymentPercent = 0.20;
    // v0.108.21 (§52): the buy charges the INDEX-ADJUSTED price end
    // to end — affordability, down payment, mortgage, and the
    // purchase record all use it, so display and buy never disagree.
    const monthKey = this.time.getMonthKey();
    const adjustedPrice = listingPriceNow(listing.price, listing.city, monthKey);
    const downPayment = Math.floor(adjustedPrice * downPaymentPercent);
    // v0.108.20 §47 affordability decision (stated, not silently changed):
    // funds stay CASH ONLY — bank savings never count toward a down
    // payment. Every affordability error states the rule + the remedy
    // (withdraw exists — point at a real action). Match first, then
    // funds: a matching name with short funds NEVER returns "not found".
    const cashOnlyNote = `Down payments come from cash on hand only — bank savings do not count. You have $${(this.player.money ?? 0).toLocaleString()} cash (+ $${(this.player.bankBalance ?? 0).toLocaleString()} in bank). Use "withdraw [amount]" to move bank money to cash, then buy.`;

    if (useMortgage === null) {
      // Smart default: pay cash if the player can afford the full price,
      // otherwise fall back to a mortgage with 20% down.
      if (this.player.money >= adjustedPrice) {
        useMortgage = false;
      } else if (this.player.money >= downPayment) {
        useMortgage = true;
      } else {
        return {
          success: false,
          message: `You can't afford ${listing.name}. You need $${adjustedPrice.toLocaleString()} for a cash purchase or $${downPayment.toLocaleString()} (20%) for a mortgage.\n\n${cashOnlyNote}\n\nUse "buy property ${listing.name} cash" or "buy property ${listing.name} mortgage".`,
        };
      }
    } else if (useMortgage && this.player.money < downPayment) {
      return {
        success: false,
        message: `Need $${downPayment.toLocaleString()} (20%) for a mortgage on ${listing.name}.\n\n${cashOnlyNote}`,
      };
    } else if (!useMortgage && this.player.money < adjustedPrice) {
      return {
        success: false,
        message: `Need $${adjustedPrice.toLocaleString()} for a cash purchase of ${listing.name}.\n\n${cashOnlyNote}`,
      };
    }

    const result = this.property.purchaseProperty(this.player, listing.id, useMortgage, adjustedPrice);

    if (result.success && result.data) {
      this.player.money -= result.data.cashSpent;
      this.player.properties.push(result.data.property);
    }

    return result;
  }

  sellProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    if (!this.player.properties || this.player.properties.length === 0) {
      return { success: false, message: 'You don\'t own any properties.' };
    }
    
    const propertyIndex = this.player.properties.findIndex((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (propertyIndex === -1) {
      return { success: false, message: `You don't own a property named "${propertyName}".` };
    }
    
    const property = this.player.properties[propertyIndex];
    const result = this.property.sellProperty(property, this.player);
    
    if (result.success && result.data) {
      this.player.money += result.data.netProceeds;
      this.player.properties.splice(propertyIndex, 1);
    }
    
    return result;
  }

  properties(): GameAction {
    if (!this.player.properties || this.player.properties.length === 0) {
      return { success: true, message: 'You don\'t own any properties yet. Type "real-estate" to browse listings.' };
    }
    
    const list = this.player.properties.map((p: Property) => {
      const lv = p.renovationLevel ?? 0;
      const next = lv >= 5 ? 'MAX' : `next upgrade $${nextUpgradeCost(p).toLocaleString()}`;
      const furn = (p as any).furniture ?? [];
      const furnStr = ` | Furniture: ${furn.length ? furn.join(', ') : 'none'} (Comfort tier ${comfortTier(furn.length)})`;
      return `• ${p.name} - $${p.currentValue.toLocaleString()}\n  Condition: ${p.condition}% | Rent: $${p.rentalIncome}/mo | Mortgage: $${p.mortgageRemaining.toLocaleString()}\n  Upgrade: Lv ${lv} (${propertyTierName(lv)}) | ${next}${furnStr}`;
    }).join('\n\n');
    
    const totalValue = this.property.calculatePropertyValue(this.player.properties);
    const monthlyIncome = this.property.calculateMonthlyIncome(this.player.properties);
    const equity = this.property.calculateEquity(this.player.properties);
    
    return { 
      success: true, 
      message: `🏠 **Your Properties**\n${'─'.repeat(50)}\n${list}\n\n📊 Total Value: $${totalValue.toLocaleString()}\n💰 Monthly Net Income: $${monthlyIncome.toLocaleString()}\n Equity: $${equity.toLocaleString()}` 
    };
  }

  repairProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    const property = this.player.properties?.find((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (!property) {
      return { success: false, message: `Property "${propertyName}" not found in your portfolio.` };
    }

    const beforeCondition = property.condition ?? 100;
    const result = this.property.repairProperty(property, this.player);
    if (result.success) {
      const cost = Math.floor((100 - beforeCondition) * 50);
      if (cost > 0) {
        if (!this.player.repairPayments) this.player.repairPayments = {};
        if (!this.player.repairPayments.property) this.player.repairPayments.property = {};
        this.player.repairPayments.property[property.id] = { month: this.time.getMonthKey(), amount: cost };
      }
    }
    return result;
  }

    // === PROPERTY RENOVATION ===
  renovateProperty(propertyName: string): GameAction {
    if (!propertyName) {
      return { success: false, message: 'Which property? Type "properties" to see your portfolio.' };
    }
    
    const property = this.player.properties?.find((p: Property) => 
      p.name.toLowerCase().includes(propertyName.toLowerCase())
    );
    
    if (!property) {
      return { success: false, message: `Property "${propertyName}" not found in your portfolio.` };
    }
    
    return this.property.renovateProperty(property, this.player);
  }

  // === v0.108.15 FEATURE BATCH ===
  // Business ownership, daily goals, NPC depth, story/journal. Tables live
  // in features-0.108.15.ts; these methods are the command-facing layer.

  businesses(): GameAction {
    const owned = ownedBusinesses(this.player);
    const catalog = BUSINESS_CATALOG.map((b) =>
      `• ${b.name} — $${b.price.toLocaleString()} to buy, $${b.monthlyIncome.toLocaleString()}/mo net\n  ${b.description}`
    ).join('\n');
    const ownedList = owned.length === 0
      ? 'You don\'t own any businesses yet.'
      : owned.map((b) => `• ${b.name} — $${b.monthlyIncome.toLocaleString()}/mo net (bought $${b.purchasePrice.toLocaleString()})`).join('\n');
    const total = businessMonthlyIncome(this.player);
    const hasStaff = owned.some((b: any) => (b.staff ?? []).length > 0);
    return {
      success: true,
      message: `🏪 **Businesses**\n${'─'.repeat(40)}\n**Yours** (catalog base: $${total.toLocaleString()}/mo, paid in the monthly tick):\n${ownedList}\n\n**For sale:**\n${catalog}\n\nCommands: buy business [name] | sell business [name] | staff | hire [business] [npc]${hasStaff ? '\n\nNote: staffed businesses pay the staffed rate in the tick (see "staff"), not the catalog base above.' : ''}`,
    };
  }

  buyBusiness(name: string): GameAction {
    if (!name) return { success: false, message: 'Which business? Type "businesses" to see what\'s for sale.' };
    const found = resolveNamed(BUSINESS_CATALOG, name, (b) => b.name);
    if (found.ambiguous) return { success: false, message: `Multiple businesses match "${name}": ${found.ambiguous.join(', ')}. Be more specific.` };
    const entry = found.item;
    if (!entry) return { success: false, message: `Business "${name}" not found. Type "businesses" to see what's for sale.` };
    if (ownedBusinesses(this.player).some((b) => b.type === entry.type)) {
      return { success: false, message: `You already own a ${entry.name}. One of each business type per player.` };
    }
    if (this.player.money < entry.price) {
      return { success: false, message: `${entry.name} costs $${entry.price.toLocaleString()}. You have $${this.player.money.toFixed(2)}.` };
    }
    this.player.money -= entry.price;
    if (!this.player.businesses) this.player.businesses = [];
    this.player.businesses.push({ id: `biz_${entry.type}_${Date.now()}`, name: entry.name, type: entry.type, purchasePrice: entry.price, monthlyIncome: entry.monthlyIncome, purchasedAt: Date.now() });
    return { success: true, message: `🏪 You bought ${entry.name} for $${entry.price.toLocaleString()}! It pays $${entry.monthlyIncome.toLocaleString()}/mo net in the monthly tick. Type "businesses" to see your portfolio.` };
  }

  sellBusiness(name: string): GameAction {
    if (!name) return { success: false, message: 'Which business? Type "businesses" to see what you own.' };
    const owned = ownedBusinesses(this.player);
    const found = resolveNamed(owned, name, (b) => b.name);
    if (found.ambiguous) return { success: false, message: `Multiple businesses match "${name}": ${found.ambiguous.join(', ')}. Be more specific.` };
    const biz = found.item;
    if (!biz) return { success: false, message: `Business "${name}" not found in your portfolio.` };
    const proceeds = Math.floor(biz.purchasePrice * 0.7);
    this.player.businesses = owned.filter((b) => b !== biz);
    this.player.money += proceeds;
    return { success: true, message: `🏪 Sold ${biz.name} for $${proceeds.toLocaleString()} (70% of purchase price).` };
  }

  goals(): GameAction {
    const state = ensureDailyGoals(this.player, this.time.formatDate());
    const lines = state.goals.map((g) =>
      `${g.completed ? '✅' : '⬜'} ${g.label} — ${g.progress}/${g.target} — reward $${g.reward}`
    ).join('\n');
    return { success: true, message: `🎯 **Daily Goals — ${state.date}**\n${'─'.repeat(40)}\n${lines}\n\nRewards pay out automatically when a goal completes.` };
  }

  // v0.108.18 audit fix: previously this swallowed ambiguity — a first
  // name matching two NPCs came back as "not found" even though the NPC
  // exists. talk() already refuses with a list; profile/gift/hangout now
  // surface the same list instead of a wrong not-found.
  private resolveNpcAnywhere(name: string): { item?: any; ambiguous?: string[] } {
    if (!name) return {};
    const all = this.social.getAllNPCs();
    const byId = all.find((n) => n.id.toLowerCase() === name.toLowerCase());
    if (byId) return { item: byId };
    return resolveNamed(all, name, (n) => n.name);
  }

  private ensureRel(npc: any): any {
    if (!this.player.relationships) this.player.relationships = {};
    if (!this.player.relationships[npc.id]) {
      this.player.relationships[npc.id] = { value: 0, flags: [], metAt: Date.now(), lastInteracted: Date.now(), memory: [] };
    }
    const rel = this.player.relationships[npc.id];
    rel.lastInteracted = Date.now();
    npc.relationship = rel.value;
    return rel;
  }

  giftNpc(rawArgs: string): GameAction {
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      const list = GIFTS.map((g) => `• ${g.key}: ${g.label} — $${g.cost} (+${g.gain} relationship)`).join('\n');
      return { success: true, message: `🎁 **Gifts**\n${list}\n\nUsage: gift [npc name] [coffee|flowers|meal|gift]` };
    }
    const giftKey = parts[parts.length - 1]!.toLowerCase();
    const gift = GIFTS.find((g) => g.key === giftKey);
    if (!gift) {
      return { success: false, message: `Unknown gift "${giftKey}". Available: ${GIFTS.map((g) => g.key).join(', ')}.` };
    }
    const npcName = parts.slice(0, -1).join(' ');
    const resolved = this.resolveNpcAnywhere(npcName);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${npcName}": ${resolved.ambiguous.join(', ')}. Type "gift [full name] [gift]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${npcName}" found. Type "people" to see who's around.` };
    if (this.player.money < gift.cost) {
      return { success: false, message: `${gift.label} costs $${gift.cost}. You have $${this.player.money.toFixed(2)}.` };
    }
    const rel = this.ensureRel(npc);
    const gain = giftGain(gift, rel.value);
    this.player.money -= gift.cost;
    rel.value = Math.max(-100, Math.min(100, rel.value + gain));
    npc.relationship = rel.value;
    // v0.108.20 (§27): gifts are recorded facts for dialogue callbacks.
    if (!this.player.dialogueMemory) this.player.dialogueMemory = {};
    if (!this.player.dialogueMemory[npc.id]) this.player.dialogueMemory[npc.id] = { facts: {}, episodes: [], threads: [] };
    this.player.dialogueMemory[npc.id].episodes.push({ at: this.time.formatDate(), kind: 'gift', summary: `You gave ${npc.name} a ${gift.key}` });
    if (this.player.dialogueMemory[npc.id].episodes.length > 30) this.player.dialogueMemory[npc.id].episodes = this.player.dialogueMemory[npc.id].episodes.slice(-30);
    const level = relationshipLevel(rel.value);
    const perks = relationshipPerks(rel.value);
    return { success: true, message: `🎁 You gave ${npc.name} ${gift.label} ($${gift.cost}). Relationship +${gain} → ${rel.value} (${level}).${perks.length ? `\nPerks unlocked: ${perks.join('; ')}` : ''}` };
  }

  hangoutNpc(name: string): GameAction {
    if (!name) return { success: false, message: 'Hang out with whom? Type "people" to see who\'s around.' };
    const resolved = this.resolveNpcAnywhere(name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${name}": ${resolved.ambiguous.join(', ')}. Type "hangout [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${name}" found. Type "people" to see who's around.` };
    const rel = this.ensureRel(npc);
    const cost = 25;
    if (this.player.money < cost) return { success: false, message: `Hanging out costs $${cost}. You have $${this.player.money.toFixed(2)}.` };
    const energyCost = rel.value >= 50 ? 5 : 10;
    if ((this.player.energy ?? 0) < energyCost) return { success: false, message: `Too tired to hang out. Rest first.` };
    const happyGain = rel.value >= 50 ? 10 : 5;
    this.player.money -= cost;
    this.player.energy = Math.max(0, (this.player.energy ?? 0) - energyCost);
    this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + happyGain);
    rel.value = Math.max(-100, Math.min(100, rel.value + 6));
    npc.relationship = rel.value;
    this.time.advance({ hours: 2, minutes: 0 });
    let extra = '';
    if (rel.value >= 75) {
      const xpMsg = this.addSkillXP('charisma', 10);
      extra = xpMsg ? `\n${xpMsg}` : '';
    }
    const level = relationshipLevel(rel.value);
    return { success: true, message: `☕ You spent 2 hours hanging out with ${npc.name} ($${cost}, -${energyCost} energy, +${happyGain} happiness). Relationship +6 → ${rel.value} (${level}).${extra}` };
  }

  friends(): GameAction {
    const rels = this.player.relationships ?? {};
    const entries = Object.entries(rels)
      .map(([id, rel]: [string, any]) => ({ id, value: rel.value ?? 0, spouse: !!rel.spouse, npc: this.social.getNPCById(id) }))
      .filter((e) => e.npc)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    if (entries.length === 0) {
      return { success: true, message: '👥 **Friends & Relationships**\nYou haven\'t met anyone yet. Type "people" to see who\'s around, then "talk [name]".' };
    }
    const lines = entries.map((e) => {
      const level = (e as any).spouse ? 'Spouse' : relationshipLevel(e.value);
      const perks = relationshipPerks(e.value);
      return `• ${e.npc!.name} — ${e.value} (${level})${perks.length ? ` — perks: ${perks.join('; ')}` : ''}`;
    }).join('\n');
    return { success: true, message: `👥 **Friends & Relationships**\n${'─'.repeat(40)}\n${lines}\n\nCommands: gift [name] [coffee|flowers|meal|gift] | hangout [name]` };
  }

  journal(): GameAction {
    return { success: true, message: buildJournal(this.player, this.storyline.getActiveQuests()) };
  }

  upgradeVehicle(rawArgs: string): GameAction {
    const parts = rawArgs.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { success: false, message: 'Upgrade which vehicle? Usage: upgrade vehicle [name] [engine|transmission|aero]' };
    const knownParts = ['engine', 'transmission', 'aero'];
    const lastIsPart = knownParts.includes(parts[parts.length - 1]!.toLowerCase());
    const name = lastIsPart ? parts.slice(0, -1).join(' ') : rawArgs;
    const part = lastIsPart ? parts[parts.length - 1]! : '';
    return this.vehicleService.upgrade(name, this.player, part || undefined);
  }

  // === v0.108.15 EXPANSION: GOVERNMENT & LAW ===
  // A life-sim layer on the existing crime/prison/faction/job data — not
  // a civ sim. Laws are the existing offenses + a fine schedule;
  // enforcement comes from the city's existing crimeRate; citations are
  // issued by the existing police-encounter path; government jobs and
  // officials come from the existing jobs database and NPC roster.

  laws(): GameAction {
    const city = this.player.city;
    const cityName = cityDisplay(city);
    const lines = OFFENSE_FINES.map((o) => `• ${o.label} — court fine $${o.fine.toLocaleString()} (heat +${o.heat})`).join('\n');
    return {
      success: true,
      message: `⚖️ **Laws of ${cityName}** (enforcement: ${enforcementLevel(city)})\n${'─'.repeat(50)}\n${lines}\n\nGet caught and you may be arrested (3-day sentence + $500 on the spot) or cited — citations land as outstanding fines. Type "court" to see your standing, "pay fine all" to settle up.`,
    };
  }

  court(): GameAction {
    const fines = (this.player.fines ?? []) as { offense: string; amount: number; date: string }[];
    const total = totalOutstandingFines(this.player);
    const fineLines = fines.length === 0
      ? 'No outstanding fines.'
      : fines.map((f) => `• ${f.offense} — $${f.amount.toLocaleString()} (${f.date})`).join('\n');
    const arrests = this.player.prisonRecord?.arrests ?? 0;
    const recordBlocked = (this.player.criminalRecord?.length ?? 0) > 0 || arrests > 0;
    const caseList = (this.player.cases ?? []) as { id: string; offense: string; fine: number; status: string }[];
    const caseLines = caseList.length === 0
      ? 'No cases.'
      : caseList.map((c) => `• ${c.id}: ${c.offense} — $${c.fine.toLocaleString()} (${c.status})`).join('\n');
    const invList = (this.player.investigations ?? []).filter((i: any) => i.status === 'open');
    const invLines = invList.length === 0
      ? 'No open investigations.'
      : invList.map((i: any) => `• ${i.id} (opened at heat ${i.openedAtHeat})`).join('\n');
    return {
      success: true,
      message: `🏛️ **Court & Standing**\n${'─'.repeat(50)}\nHeat: ${this.player.heat ?? 0}/100 | Arrests: ${arrests} | Criminal record entries: ${this.player.criminalRecord?.length ?? 0}\nCommunity reputation: ${this.player.reputation?.community ?? 0}\nTrusted jobs (government, medical, law): ${recordBlocked ? 'BLOCKED by your record — a lawyer can clean heat, not a record.' : 'open to you'}\n\n**Outstanding fines: $${total.toLocaleString()}**\n${fineLines}\n\n**Open cases:**\n${caseLines}\n\n**Investigations:**\n${invLines}\n\nCommands: pay fine all | pay fine [amount] | laws | lawyer clean | lawyer defend [id] | cases | police`,
    };
  }

  payFine(arg: string): GameAction {
    const fines = (this.player.fines ?? []) as { offense: string; amount: number; date: string }[];
    if (fines.length === 0) return { success: true, message: 'You have no outstanding fines. Type "court" to confirm your standing.' };
    const total = totalOutstandingFines(this.player);
    let amount: number;
    if (!arg || arg.toLowerCase() === 'all') amount = total;
    else {
      amount = parseFloat(arg.replace(/[^0-9.]/g, ''));
      if (isNaN(amount) || amount <= 0) return { success: false, message: 'Usage: pay fine all | pay fine [amount]' };
    }
    if (amount > this.player.money) return { success: false, message: `You need $${amount.toLocaleString()} to pay that. You have $${this.player.money.toFixed(2)}.` };
    let remaining = Math.min(amount, total);
    let paidOff = 0;
    const kept: typeof fines = [];
    for (const f of fines) {
      if (remaining <= 0) { kept.push(f); continue; }
      if (remaining >= f.amount) { remaining -= f.amount; paidOff += 1; }
      else { kept.push({ ...f, amount: f.amount - remaining }); remaining = 0; }
    }
    const paid = Math.min(amount, total);
    this.player.money = Math.round((this.player.money - paid) * 100) / 100;
    this.player.fines = kept;
    // Good behavior counts: each fully-settled fine cools heat by 10.
    if (paidOff > 0) this.player.heat = Math.max(0, (this.player.heat ?? 0) - 10 * paidOff);
    return { success: true, message: `⚖️ Paid $${paid.toLocaleString()} in fines (${paidOff} fine(s) settled, heat -${10 * paidOff}). Outstanding: $${totalOutstandingFines(this.player).toLocaleString()}.` };
  }

  government(): GameAction {
    const city = this.player.city;
    const officials = this.social.getNPCByCity(city).filter((n) => n.role === 'politician');
    const officialLines = officials.length === 0
      ? 'No elected officials in the local roster — travel to a capital city to find them.'
      : officials.slice(0, 5).map((n) => `• ${n.name} — ${n.description}`).join('\n');
    const govJobs = getJobsByCity(city).filter((j: any) => ['government', 'political', 'federal'].includes(String(j.category ?? '').toLowerCase()));
    const jobLines = govJobs.length === 0
      ? 'No government openings listed here right now.'
      : govJobs.slice(0, 5).map((j: any) => `• ${j.title} @ ${j.employer}: $${(j.hourlyPay ?? 0).toFixed(2)}/hr`).join('\n');
    return {
      success: true,
      message: `🏛️ **Government — ${cityDisplay(city)}** (enforcement: ${enforcementLevel(city)})\n${'─'.repeat(50)}\n**Your civic standing:** community rep ${this.player.reputation?.community ?? 0}, heat ${this.player.heat ?? 0}, outstanding fines $${totalOutstandingFines(this.player).toLocaleString()}\n\n**Local officials:**\n${officialLines}\n\n**Government openings:**\n${jobLines}\n\nCommands: laws | court | pay fine all | apply [job]`,
    };
  }

  // === v0.108.15 EXPANSION: NPC PROFILE (merged with NPC depth) ===
  // Richer presentation of the existing roster — role, description,
  // personality, mood, today's schedule, relationship + perks, quests on
  // offer. No new NPC data is invented; everything shown already exists
  // on the NPC record or the player's relationship record.
  npcProfile(name: string): GameAction {
    if (!name) return this.status();
    const resolved = this.resolveNpcAnywhere(name);
    if (resolved.ambiguous) return { success: false, message: `Multiple people match "${name}": ${resolved.ambiguous.join(', ')}. Type "profile [full name]".` };
    const npc = resolved.item;
    if (!npc) return { success: false, message: `No one named "${name}" found. Type "people" to see who's around.` };
    const rel = this.player.relationships?.[npc.id];
    const value = rel?.value ?? npc.relationship ?? 0;
    const level = (rel as any)?.spouse ? 'Spouse' : relationshipLevel(value);
    const staffAt = (this.player.businesses ?? []).find((b: any) => (b.staff ?? []).some((st: any) => st.npcId === npc.id));
    const staffLine = staffAt ? `\n\n🏪 Works at your ${staffAt.name}.` : '';
    const perks = relationshipPerks(value);
    const met = rel ? 'You\'ve met.' : 'Not met yet — talk to them first.';
    const hour = this.time.getHour();
    const weekend = this.time.currentTime.getDay() === 0 || this.time.currentTime.getDay() === 6;
    const blocks = weekend ? npc.schedule?.weekend ?? [] : npc.schedule?.weekday ?? [];
    const now = blocks.find((b: any) => hour >= b.start && hour < b.end);
    const scheduleLines = blocks.map((b: any) => `  ${b.start}:00–${b.end}:00 ${b.activity} (${b.location})`).join('\n');
    const questLines = (npc.quests ?? []).length > 0
      ? (npc.quests as any[]).map((q) => `• ${q.title}`).join('\n')
      : 'No quests on offer right now.';
    return {
      success: true,
      message: `👤 **${npc.name}** — ${String(npc.role).replace(/_/g, ' ')}, age ${npc.age}\n📍 ${String(npc.district).replace(/_/g, ' ')}, ${cityDisplay(String(npc.city))}\n${npc.description}\nPersonality: ${(npc.personality ?? []).join(', ') || '—'} | Mood: ${npc.mood ?? 'neutral'}\n${met}\n\n🤝 Relationship: ${value} (${level})${perks.length ? `\nPerks: ${perks.join('; ')}` : ''}\n\n🕐 Right now: ${now ? `${now.activity} (${now.location})` : 'off schedule'}\nToday's schedule:\n${scheduleLines || '  —'}\n\n📜 Quests:\n${questLines}${staffLine}\n\nCommands: talk ${npc.name} | gift ${npc.name} [coffee|flowers|meal|gift] | hangout ${npc.name}`,
    };
  }

  // === INVESTMENT SYSTEM ===
  invest(): GameAction {
    const options = this.property.getInvestmentOptions();
    const list = options.map(o => 
      `• ${o.name} (${o.type})\n  Min: $${o.minInvestment} | Risk: ${o.risk} | Return: ${o.expectedReturn}`
    ).join('\n\n');
    
    return {
      success: true,
      message: `📈 **Investment Options**\n${'─'.repeat(50)}\n${list}\n\nType "invest [name] [amount]" to invest.\n\n📈 Stocks: type "stocks" to see listed companies, "buy stock [name] [$amount]" to buy shares. Stock holdings live in "investments".`
    };
  }

  makeInvestment(name: string, amountStr: string): GameAction {
    // v0.108.29: "all" invests all available cash (whole dollars) — a
    // real player phrasing ("Invest all into google", Nov 2) that used
    // to die on the digit-only parse with a bare "Invalid amount".
    const wantAll = (amountStr ?? '').trim().toLowerCase() === 'all';
    const amount = wantAll ? Math.floor(this.player.money ?? 0) : parseInt(amountStr, 10);

    if (isNaN(amount) || amount <= 0) {
      return wantAll
        ? { success: false, message: 'You have no cash to invest.' }
        : { success: false, message: 'Invalid amount. Usage: invest [name] [amount]' };
    }
    
    const options = this.property.getInvestmentOptions();
    const option = options.find(o => o.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!option) {
      return { success: false, message: `Investment "${name}" not found. Type "invest" to see options.` };
    }
    
    if (amount < option.minInvestment) {
      return { success: false, message: `Minimum investment for ${option.name} is $${option.minInvestment}.` };
    }
    
    const result = this.property.purchaseInvestment(this.player, option.type, option.name, amount);

    if (result.success && result.data) {
      this.player.money -= amount;
      // v0.108.21 (§57): buying more of an asset already held MERGES
      // into that position — new money enters at current value, so the
      // merge itself leaves P/L unchanged (value + amount, invested
      // + amount). Never a second line for the same asset.
      this.foldInvestmentPositions();
      const existing = (this.player.investments ?? []).find(
        (i: any) => i.type === option.type && String(i.name).toLowerCase() === option.name.toLowerCase(),
      );
      if (existing) {
        (existing as any).purchasePrice = roundCents(((existing as any).purchasePrice ?? 0) + amount);
        (existing as any).shares = roundCents(((existing as any).shares ?? 0) + amount);
        (existing as any).currentValue = roundCents(((existing as any).currentValue ?? 0) + amount);
        return {
          success: true,
          message: `📈 **Added $${amount.toLocaleString()} to your ${option.name} position** (now $${(existing as any).purchasePrice.toLocaleString()} invested, $${(existing as any).currentValue.toLocaleString()} value — one line, merged, not duplicated).`,
          outcomeLog: `invested $${amount} in ${option.name} (merged, now $${(existing as any).purchasePrice.toLocaleString()} invested, $${(existing as any).currentValue.toLocaleString()} value)`,
        };
      }
      this.player.investments.push(result.data.investment);
      result.outcomeLog = `invested $${amount} in ${option.name} (new position, $${amount} invested)`;
    }

    return result;
  }

  investments(): GameAction {
    // v0.108.21 (§57): display folds duplicates first, so a doubled
    // screen can never render even if a save predates the load fold.
    this.foldInvestmentPositions();
    if (!this.player.investments || this.player.investments.length === 0) {
      return { success: true, message: 'You don\'t have any investments. Type "invest" to see options.' };
    }
    // v0.108.20 (§25): stock holdings recompute from the deterministic
    // price rules on every read.
    this.recomputeStockHoldings();

    const list = this.player.investments.map((i: Investment) => {
      const profit = i.currentValue - i.purchasePrice;
      const profitSign = profit >= 0 ? '+' : '';
      const stockNote = (i as any).type === 'stock' ? ` | ${(i as any).shares ?? 0} shares` : '';
      // v0.108.21 (§50): stock holdings show their dividend terms.
      const divNote = (i as any).type === 'stock'
        ? ` | dividend ${(DIVIDEND_MONTHLY_RATE * 100).toFixed(2)}%/mo${(i as any).lastDividend !== undefined ? `, last $${Number((i as any).lastDividend).toLocaleString()} (${(i as any).dividendMonthKey ?? '—'})` : ', no payout yet'}`
        : '';
      return `• ${i.name} - $${i.currentValue.toLocaleString()}\n  Invested: $${i.purchasePrice.toLocaleString()} | P/L: ${profitSign}$${profit.toLocaleString()}${stockNote}${divNote}`;
    }).join('\n\n');

    const totalValue = this.player.investments.reduce((sum: number, i: Investment) => sum + i.currentValue, 0);
    const totalProfit = this.player.investments.reduce((sum: number, i: Investment) => sum + (i.currentValue - i.purchasePrice), 0);

    return {
      success: true,
      message: `📈 **Your Investments**\n${'─'.repeat(50)}\n${list}\n\n📊 Total Value: $${totalValue.toLocaleString()}\n💰 Total P/L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toLocaleString()}\n\nDividends detail: "dividends" (stock holdings pay ${(DIVIDEND_MONTHLY_RATE * 100).toFixed(2)}%/mo in the monthly tick).`
    };
  }

  sellInvestment(rawArgs: string): GameAction {
    if (!rawArgs) {
      return { success: false, message: 'Which investment? Type "investments" to see your portfolio.' };
    }

    // v0.108.21 (§57): sells operate on the MERGED position. Forms:
    // "sell investment [name]" (sell all, the old behavior) and
    // "sell investment [name] [amount]" (partial sale in dollars at
    // current value — invested/shares scale down proportionally).
    // Exact-name match first, so "S&P 500 Index Fund" (whose name
    // contains a number) never misparses as name + amount.
    this.foldInvestmentPositions();
    let name = rawArgs.trim();
    let partialAmount: number | null = null;
    const exact = resolveNamed(this.player.investments || [], name, (i: Investment) => i.name);
    if (!exact.item && !exact.ambiguous) {
      const parts = name.split(/\s+/);
      const last = parts[parts.length - 1] ?? '';
      const asNum = Number(last);
      if (parts.length >= 2 && last !== '' && Number.isFinite(asNum) && asNum > 0) {
        name = parts.slice(0, -1).join(' ');
        partialAmount = asNum;
      }
    }
    if (!name) {
      return { success: false, message: 'Which investment? Type "investments" to see your portfolio.' };
    }

    const foundInv = resolveNamed(this.player.investments || [], name, (i: Investment) => i.name);
    if (foundInv.ambiguous) {
      return { success: false, message: `Multiple investments match "${name}": ${foundInv.ambiguous.join(', ')}. Be more specific.` };
    }
    const index = foundInv.item ? this.player.investments.indexOf(foundInv.item) : -1;

    if (index === undefined || index === -1) {
      return { success: false, message: `Investment "${name}" not found.` };
    }

    const investment = this.player.investments[index];
    if (partialAmount !== null) {
      const value = investment.currentValue ?? 0;
      if (partialAmount > value) {
        return { success: false, message: `Your ${investment.name} position is worth $${value.toLocaleString()} — you can't sell $${partialAmount.toLocaleString()} of it.` };
      }
      if (partialAmount >= value) {
        const result = this.property.sellInvestment(investment);
        if (result.success && result.data) {
          this.player.money += result.data.proceeds;
          this.player.investments.splice(index, 1);
        }
        return result;
      }
      const remainFrac = (value - partialAmount) / value;
      (investment as any).purchasePrice = roundCents((investment.purchasePrice ?? 0) * remainFrac);
      (investment as any).shares = roundCents(((investment as any).shares ?? 0) * remainFrac);
      investment.currentValue = roundCents(value - partialAmount);
      this.player.money = roundCents((this.player.money ?? 0) + partialAmount);
      return {
        success: true,
        message: `📊 **Sold $${partialAmount.toLocaleString()} of ${investment.name}** (partial sale at current value).\nRemaining: $${investment.currentValue.toLocaleString()} value, $${(investment as any).purchasePrice.toLocaleString()} invested.`,
      };
    }
    const result = this.property.sellInvestment(investment);

    if (result.success && result.data) {
      this.player.money += result.data.proceeds;
      this.player.investments.splice(index, 1);
    }

    return result;
  }

  // === VEHICLE SYSTEM ===
  vehicles(): GameAction {
    if (!this.player.vehicles || this.player.vehicles.length === 0) {
      return { success: true, message: 'You don\'t own any vehicles. Type "buy vehicle [type]" to purchase.\n\nAvailable: car, truck, motorcycle, bike, luxury, sports' };
    }

    const list = this.player.vehicles.map((v: any) => {
      const risk = this.vehicleService.breakdownRisk(v);
      const overdue = this.vehicleService.overdueServices(v);
      const overdueStr = overdue.length ? ` | ⚠️ ${overdue[0]!.label} due` : '';
      const perf = this.vehicleService.perfLevels(v);
      const perfStr = perf > 0 ? ` | Performance +${perf} tiers` : '';
      return `• ${v.name} - ${v.type} | Condition: ${v.condition ?? 100}% | Value: $${this.vehicleService.currentValue(v).toLocaleString()} | Risk: ${risk}%${overdueStr}${perfStr}`;
    }).join('\n');

    return { success: true, message: `🚗 **Your Vehicles**\n${'─'.repeat(30)}\n${list}\n\nCommands: inspect [name] | fuel [name] | maintain [name] | service [name] [oil|tires|brakes|tuneup|wash] | repair vehicle [name] | register [name] | customize [name] [mod] | upgrade vehicle [name] [engine|transmission|aero]` };
  }

  buyVehicle(type: string): GameAction {
    const prices: Record<string, { name: string; price: number; fuelCap: number; mpg: number }> = {
      car: { name: 'Used Sedan', price: 5000, fuelCap: 14, mpg: 28 },
      truck: { name: 'Used Pickup', price: 8000, fuelCap: 23, mpg: 18 },
      motorcycle: { name: 'Used Motorcycle', price: 3000, fuelCap: 4, mpg: 45 },
      bike: { name: 'Bicycle', price: 150, fuelCap: 0, mpg: 0 },
      luxury: { name: 'Luxury Sedan', price: 35000, fuelCap: 19, mpg: 22 },
      sports: { name: 'Sports Car', price: 25000, fuelCap: 16, mpg: 18 },
    };

    const vehicle = prices[type.toLowerCase()];
    if (!vehicle) {
      return { success: false, message: `Unknown vehicle type: "${type}". Available: car, truck, motorcycle, bike, luxury, sports` };
    }

    if (this.player.money < vehicle.price) {
      return { success: false, message: `Need $${vehicle.price.toLocaleString()} for a ${vehicle.name}. You have $${this.player.money.toFixed(2)}.` };
    }

    this.player.money -= vehicle.price;
    this.player.vehicles.push({
      id: `vehicle_${Date.now()}`,
      name: vehicle.name,
      type: type.toLowerCase(),
      value: vehicle.price,
      condition: 100,
      mileage: 0,
      lastService: Date.now(),
      services: {},
      purchasedAt: Date.now(),
      fuel: vehicle.fuelCap,
      fuelCap: vehicle.fuelCap,
      mpg: vehicle.mpg,
      registered: false,
      registrationExpiry: 0,
      inspected: false,
      inspectionExpiry: 0,
      modifications: [],
      immobilized: false,
    });

    const regTip = vehicle.fuelCap > 0 ? `\n\n📋 Tip: Register your vehicle with "register [name]" and refuel with "fuel [name]".` : '';
    return { success: true, message: `🚗 Purchased ${vehicle.name} for $${vehicle.price.toLocaleString()}.${regTip}` };
  }

  sellVehicle(name: string): GameAction {
    if (!name) {
      return { success: false, message: 'Which vehicle? Type "vehicles" to see your garage.' };
    }
    
    const foundVeh = resolveNamed(this.player.vehicles || [], name, (v: any) => `${v.name} ${v.type}`);
    if (foundVeh.ambiguous) {
      return { success: false, message: `Multiple vehicles match "${name}": ${foundVeh.ambiguous.join(', ')}. Be more specific.` };
    }
    const index = foundVeh.item ? this.player.vehicles.indexOf(foundVeh.item) : -1;

    if (index === undefined || index === -1) {
      return { success: false, message: `Vehicle "${name}" not found.` };
    }
    
    const vehicle = this.player.vehicles[index];
    const appraised = this.vehicleService.currentValue(vehicle);
    const sellPrice = Math.floor(appraised * 0.6);

    this.player.money += sellPrice;
    this.player.vehicles.splice(index, 1);
    
    return { success: true, message: `🚗 Sold ${vehicle.name} for $${sellPrice.toLocaleString()}. Your new balance is $${this.player.money.toFixed(2)}.` };
  }

  fuelVehicle(name: string): GameAction {
    if (!name) return { success: false, message: 'Fuel which vehicle? Type "vehicles" to see your garage.' };
    return this.vehicleService.fuel(name, this.player);
  }

  registerVehicle(name: string): GameAction {
    if (!name) return { success: false, message: 'Register which vehicle? Type "vehicles" to see your garage.' };
    return this.vehicleService.register(name, this.player);
  }

  customizeVehicle(name: string, mod: string): GameAction {
    if (!name) return { success: false, message: 'Customize which vehicle? Type "vehicles" to see your garage.' };
    return this.vehicleService.customize(name, mod || '', this.player);
  }

  emergencyTow(name: string): GameAction {
    if (!name) return { success: false, message: 'Tow which vehicle? Type "vehicles" to see your garage.' };
    return this.vehicleService.emergencyTow(name, this.player);
  }

  repairVehicle(name: string): GameAction {
    if (!name) {
      return { success: false, message: 'Which vehicle? Type "vehicles" to see your garage.' };
    }

    const index = this.player.vehicles?.findIndex((v: any) =>
      v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase())
    );

    if (index === undefined || index === -1) {
      return { success: false, message: `Vehicle "${name}" not found.` };
    }

    const vehicle = this.player.vehicles[index];
    const beforeCondition = vehicle.condition ?? 100;
    const result = this.vehicleService.repair(name, this.player);
    if (result.success) {
      const missing = 100 - beforeCondition;
      const cost = missing > 0 ? Math.max(50, Math.floor(Math.floor((vehicle.value ?? 0) * 0.002) * missing)) : 0;
      if (cost > 0) {
        if (!this.player.repairPayments) this.player.repairPayments = {};
        if (!this.player.repairPayments.vehicle) this.player.repairPayments.vehicle = {};
        this.player.repairPayments.vehicle[vehicle.id ?? vehicle.name] = { month: this.time.getMonthKey(), amount: cost };
      }
    }
    return result;
  }

  maintainVehicle(name: string): GameAction {
    const vehicle = name
      ? this.player.vehicles?.find((v: any) => v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase()))
      : this.player.vehicles?.[0];

    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : 'You don\'t own any vehicles.' };

    return this.vehicleService.maintain(name, this.player);
  }

  serviceVehicle(name: string, serviceType: string): GameAction {
    if (!name || !serviceType) {
      return { success: false, message: 'Usage: service [vehicle name] [oil|tires|brakes|tuneup|wash]' };
    }
    const vehicle = this.player.vehicles?.find((v: any) =>
      v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase())
    );
    if (!vehicle) return { success: false, message: `Vehicle "${name}" not found.` };
    return this.vehicleService.service(name, this.player, serviceType);
  }

  inspectVehicle(name: string): GameAction {
    const vehicle = name
      ? this.player.vehicles?.find((v: any) => v.name.toLowerCase().includes(name.toLowerCase()) || v.type.toLowerCase().includes(name.toLowerCase()))
      : this.player.vehicles?.[0];
    if (!vehicle) return { success: false, message: name ? `Vehicle "${name}" not found.` : 'You don\'t own any vehicles.' };
    return { success: true, message: this.vehicleService.describeStatus(vehicle) };
  }

  race(query: string): GameAction {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      const localTracks = RACE_TRACKS.filter(t => t.city.toLowerCase() === (this.player.city || '').toLowerCase());
      const local = localTracks.map(t => `• ${t.name} — $${t.entryFee.toLocaleString()} entry`).join('\n');
      const localHeader = local ? `\n\n**Local tracks in ${cityDisplay(this.player.city)}:**\n${local}` : '';
      return { success: true, message: this.racingService.listTracks(this.player.city) + localHeader };
    }
    if (q === 'season') {
      const championship = this.racingService.championshipService.startSeasonChampionship();
      if (!championship || championship.tracks.length === 0) {
        return { success: false, message: 'Could not start a championship right now.' };
      }
      const standing = this.racingService.championshipService.getStandings();
      return { success: true, message: `🌍 **World Street Series started!**\n\n${standing.text}` };
    }
    if (q === 'standings' || q === 'standing') {
      const standing = this.racingService.championshipService.getStandings();
      return { success: true, message: standing.text };
    }
    const vehicle = this.player.vehicles?.[0];
    const result = this.racingService.race(this.player, vehicle, query);
    if (result.success && result.data) {
      const trackName = (result.data.track || '').toLowerCase();
      this.time.advance({ hours: trackName.includes('drag') ? 1 : 2, minutes: 0 });
    }
    return result;
  }

  
  // === CRIME CONSEQUENCES HELPERS ===

  private decayHeat(): void {
    const now = Date.now();
    const last = this.player.lastActive || now;
    const hoursPassed = Math.max(0, now - last) / 3600000;
    if (hoursPassed >= 0.5 && (this.player.heat || 0) > 0) {
      const decay = Math.floor(hoursPassed * 2);
      this.player.heat = Math.max(0, (this.player.heat || 0) - decay);
    }
  }

  private applyCrimeConsequences(crimeName: string, reward: number): string {
    let info = '';
    // Reputation erosion
    this.player.reputation.professional = Math.max(-100, this.player.reputation.professional - 1);
    this.player.reputation.community = Math.max(-100, this.player.reputation.community - 2);

    // Possible witness
    const hour = this.time.getHour();
    const day = this.time.currentTime.getDay();
    const npcsHere = this.social.getNPCByLocation(this.player.district, hour, day);
    if (npcsHere.length > 0 && Math.random() < 0.35) {
      const witness = npcsHere[Math.floor(Math.random() * npcsHere.length)];
      if (witness && typeof witness.relationship === 'number') {
        witness.relationship = Math.max(-100, witness.relationship - 15);
        info += `\n👀 ${witness.name} saw something. They look at you differently now.`;
      }
    }

    // Heat warnings
    if ((this.player.heat || 0) >= 80) {
      info += '\n🔥 The streets are buzzing. You\'re attracting serious attention.';
    }
    if ((this.player.heat || 0) >= 50 && Math.random() < 0.25) {
      this.comm.addNotification('Law', 'A police cruiser slowed down as you passed. Keep your head down.');
    }

    // Large crimes trigger professional fallout
    if (reward >= 1000) {
      this.player.reputation.professional = Math.max(-100, this.player.reputation.professional - 2);
      info += '\n📉 Employers are whispering about your name.';
    }

    return info;
  }

  layLow(): GameAction {
    if ((this.player.heat || 0) <= 0) {
      return { success: true, message: 'You\'re already flying under the radar.' };
    }
    this.time.advance({ hours: 4, minutes: 0 });
    this.player.energy = Math.max(0, this.player.energy - 10);
    const reduction = Math.max(5, Math.floor((this.player.heat || 0) * 0.3));
    this.player.heat = Math.max(0, (this.player.heat || 0) - reduction);
    this.closeInvestigationsIfCool();
    return { success: true, message: `🌑 You lay low for a few hours. Heat drops by ${reduction}.` };
  }

  // === CRIME SYSTEM ===

  crime(): GameAction {
    const cityData = WORLD_CITIES[this.player.city as keyof typeof WORLD_CITIES];
    const crimeRate = cityData?.crimeRate || 50;
    
    let riskLevel = 'Normal';
    if (crimeRate > 70) riskLevel = 'High (Dangerous)';
    else if (crimeRate < 30) riskLevel = 'Low (Heavy Police)';

    return { 
      success: true, 
      message: `\ud83d\udde1\ufe0f **Crime - ${cityDisplay(this.player.city)}**\n${'\u2500'.repeat(40)}\nRisk Level: ${riskLevel} (${crimeRate}%)\n\n**Options:**\n\u2022 **pickpocket** - Low risk, $10-$50 reward\n\u2022 **shoplift** - Medium risk, $50-$200 reward\n\u2022 **scam** - Medium risk, $200-$1000 reward (INT bonus)\n\u2022 **robbery** - High risk, $500-$2000 reward\n\u2022 **grand_theft_auto** - High risk, $2000-$8000 reward\n\u2022 **heist** - Extreme risk, $5000+ reward\n\nType "crime [type]" to proceed. Consequences include prison time and reputation loss.` 
    };
  }

  private commitCrime(crimeType: string): GameAction {
    const crimes: Record<string, { name: string; risk: number; reward: number; heat: number; skill: string }> = {
      pickpocket: { name: 'pickpocketing', risk: 0.1, reward: 50, heat: 5, skill: 'stealth' },
      shoplift: { name: 'shoplifting', risk: 0.2, reward: 200, heat: 15, skill: 'stealth' },
      scam: { name: 'scamming', risk: 0.25, reward: 500, heat: 20, skill: 'charisma' },
      robbery: { name: 'robbery', risk: 0.35, reward: 1000, heat: 30, skill: 'combat' },
      grand_theft_auto: { name: 'grand theft auto', risk: 0.4, reward: 3000, heat: 35, skill: 'driving' },
      heist: { name: 'a heist', risk: 0.5, reward: 10000, heat: 50, skill: 'stealth' },
    };

    const crime = crimes[crimeType.toLowerCase()];
    if (!crime) {
      return { success: false, message: 'Invalid crime type. Usage: crime [pickpocket|shoplift|scam|robbery|grand_theft_auto|heist]' };
    }

    if (this.player.incarcerated) {
      return { success: false, message: 'You are in prison! You can\'t commit crimes here.' };
    }

    const skillLevel = this.player.skills[crime.skill]?.level || 1;
    let adjustedRisk = Math.max(0.05, crime.risk - (skillLevel * 0.02));
    let currentHeat = crime.heat;

    // Parole penalty: Higher risk and more heat if on parole
    if (this.player.prisonRecord?.paroleEligible) {
      adjustedRisk += 0.2;
      currentHeat *= 2;
    }
    
    this.player.heat = Math.min(100, (this.player.heat || 0) + currentHeat);
    this.player.reputation.criminal += 2;

    if (Math.random() < adjustedRisk) {
      // If on parole, the arrest is much more severe
      if (this.player.prisonRecord?.paroleEligible) {
        return this.handleArrest(30); // Heavy sentence for parole violation
      }
      return this.handlePoliceEncounter(true, crime.name);
    }

    const actualReward = Math.floor(crime.reward * (0.8 + Math.random() * 0.4));
    this.player.money += actualReward;
    this.addSkillXP(crime.skill, 30);
    this.player.criminalRecord.push(crime.name);
    this.achievementEngine.updateProgress('mastermind', 1);
    this.achievementEngine.checkAchievement('first_crime', this.player);
    const consequenceMsg = this.applyCrimeConsequences(crime.name, actualReward);

    return { 
      success: true, 
      message: `🕵️ You successfully committed ${crime.name} and made $${actualReward}! Your heat is now ${this.player.heat}.${consequenceMsg}` 
    };
  }

  // v0.108.15: a non-arrest encounter during a crime now issues a court
  // citation (the fine schedule from the laws view) instead of vanishing
  // without a trace. The fine is OUTSTANDING — it is not deducted here —
  // and "pay fine" settles it. Arrest behavior is unchanged.
  private handlePoliceEncounter(isDuringCrime: boolean, offenseName?: string): GameAction {
    const heat = this.player.heat || 0;
    const charisma = this.player.charisma || 50;
    const riskOfArrest = (heat / 100) * (1 - (charisma / 200));

    if (Math.random() < riskOfArrest) {
      this.player.incarcerated = true;
      this.player.prisonRecord.arrests++;
      this.player.heat = 0;
      this.player.money = Math.max(0, this.player.money - 500); // Bail/Fine
      // v0.108.2 fix (B1): this used to set incarcerated with NO sentenceEnd,
      // and updateIncarceration() returns early without one, so the player was
      // locked in prison forever (soft-lock). Give a short sentence in the
      // same real-clock pattern handleArrest() uses, but 3 days instead of
      // 14/30: a police-encounter bust is a short stay, and prison work and
      // lawyer appeal can shorten it further. A game-clock sentence was NOT
      // used: the sentence system and existing saves all use real-epoch ms,
      // while the game clock starts in 2024 and advances only by actions, so
      // a game-clock sentenceEnd would compare inconsistently against it.
      this.player.sentenceEnd = Date.now() + 3 * 24 * 60 * 60 * 1000;

      return {
        success: false,
        message: `🚨 **BUSTED!** The police caught you. You've been arrested and fined $500. You are now incarcerated on a 3-day sentence. Use "prison work" or "lawyer appeal" to shorten it.`
      };
    }

    if (isDuringCrime && offenseName) {
      const fine = fineForOffense(offenseName);
      if (fine) {
        if (!this.player.fines) this.player.fines = [];
        this.player.fines.push({ offense: fine.label, amount: fine.fine, date: this.time.formatDate() });
        // v0.108.20 (§2): every citation also creates a case record.
        if (!Array.isArray(this.player.cases)) this.player.cases = [];
        const caseId = `case-${this.player.cases.length + 1}`;
        this.player.cases.push({ id: caseId, offense: fine.label, fine: fine.fine, status: 'open' });
        // v0.108.20 (§32): notices point at the existing commands.
        this.postNotice('City Court', `Fine — ${fine.label}`, `A fine of $${fine.fine.toLocaleString()} was issued (${fine.label}). Pay with "pay fine all".`);
        this.postNotice('City Court', `Case opened — ${caseId}`, `Case ${caseId} opened for ${fine.label} ($${fine.fine.toLocaleString()}). See it with "case ${caseId}" or contest it with "lawyer defend ${caseId}".`);
        return {
          success: true,
          message: `🚔 A police cruiser stopped you — no arrest this time, but you were cited: ${fine.label}, $${fine.fine.toLocaleString()} outstanding. Type "court" to see it, "pay fine all" to settle it.`,
        };
      }
    }
    return {
      success: true,
      message: isDuringCrime
        ? `🚔 A police cruiser drove by, but you managed to stay hidden.`
        : `🚔 You feel the eyes of the law on you. Stay low.`
    };
  }

  // === STORYLINE & EVENTS ===
  event(): GameAction {
    const activeEvents = this.storyline.getActiveEvents();
    
    if (activeEvents.length === 0) {
      return { success: true, message: 'No active events right now. Explore, work, or travel to trigger new events.' };
    }
    
    const list = activeEvents.map((e: any) =>
      `**${e.title}**\n${e.description}\n\nChoices:\n${e.outcomes.map((o: any) => `  • ${o.id}: ${o.text.substring(0, 50)}...`).join('\n')}`
    ).join('\n\n' + '─'.repeat(50) + '\n\n');
    
    return { success: true, message: `🎬 **Active Events**\n${'─'.repeat(50)}\n${list}\n\nType "event choice [choice id]" to make a decision.` };
  }

  eventChoice(choiceId: string): GameAction {
    const activeEvents = this.storyline.getActiveEvents();
    if (activeEvents.length === 0) {
      return { success: false, message: 'No active events. Explore or work to trigger events.' };
    }
    
    // Find event with this choice
    for (const event of activeEvents) {
      const outcome = event.outcomes.find(o => o.id.toLowerCase() === choiceId.toLowerCase());
      if (outcome) {
        return this.storyline.processInterviewChoice(this.player, event.id, outcome.id);
      }
    }
    
    return { success: false, message: `Choice "${choiceId}" not found. Type "event" to see available choices.` };
  }

  // === PRISON SYSTEM ===
  handleArrest(sentenceDays: number): GameAction {
    this.player.incarcerated = true;
    this.player.prisonRecord.arrests += 1;
    
    const sentenceMs = sentenceDays * 24 * 60 * 60 * 1000;
    this.player.sentenceEnd = Date.now() + sentenceMs;
    
    return { 
      success: true, 
      message: `🚨 **ARRESTED!**\n\nYour crimes have caught up with you. You've been sentenced to ${sentenceDays} days in prison. Your freedom is now a distant dream.` 
    };
  }

  updateIncarceration(): void {
    if (!this.player.incarcerated) return;
    if (!this.player.sentenceEnd) {
      // v0.108.2 fix (B1): heal saves soft-locked before this fix (incarcerated
      // with no sentenceEnd). Assign the standard short sentence instead of
      // returning early and leaving the player locked in prison forever.
      this.player.sentenceEnd = Date.now() + 3 * 24 * 60 * 60 * 1000;
      return;
    }
    if (Date.now() >= this.player.sentenceEnd) {
      this.player.incarcerated = false;
      this.player.sentenceEnd = undefined;
      // v0.108.21 (§54): release from a FEE arrest carries no parole
      // tail — the fee arrest is bounded by design (no record, no
      // parole). Crime releases keep the existing parole behavior.
      if (this.player.feeArrestActive) {
        this.player.feeArrestActive = false;
        this.player.feeArrested = false;
        this.comm.addNotification('Law', 'You have been released after serving your short sentence for unpaid fees. Pay any remaining fees with "pay fees" to clear the ladder.');
      } else {
        this.player.prisonRecord.paroleEligible = true; // Set parole on release
        this.comm.addNotification('Law', 'You have been released from prison. You are now on parole. Stay clean, or you\'ll go back for much longer!');
      }
    }
  }

  prisonStatus(): GameAction {
    if (!this.player.incarcerated) {
      return { success: false, message: "You aren't in prison." };
    }
    
    const remainingMs = this.player.sentenceEnd ? this.player.sentenceEnd - Date.now() : 0;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    
    return { 
      success: true, 
      message: `⛓️ **Prison Status**\n${'─'.repeat(40)}\nSentence Remaining: ${remainingDays} days\nArrests: ${this.player.prisonRecord.arrests}\nTime Served: ${this.player.prisonRecord.timeServed} days\n\nCommands:\n• prison work - Work in the laundry (reduces sentence by 1 day)\n• lawyer appeal - Appeal to shorten your sentence\n• sleep - Rest (advances the game clock only — sentences run on real time, so sleep does not shorten your sentence)\n• status - View stats` 
    };
  }

  prisonWork(): GameAction {
    if (!this.player.incarcerated) return { success: false, message: "You aren't in prison." };
    if (this.player.energy < 20) return { success: false, message: "Too exhausted to work." };

    this.player.energy = Math.max(0, this.player.energy - 30);
    // v0.108.3 fix: cap fitness at 100 like every other fitness path
    // (gym, storyline effects, quest rewards, background bonuses). Without
    // the cap, repeated prison work pushed fitness past 100.
    this.player.fitness = Math.min(100, this.player.fitness + 1);
    this.player.happiness = Math.max(0, this.player.happiness - 5);
    // v0.108.9 fix (major 3): hard prison labor wears health down.
    this.player.health = Math.max(0, (this.player.health ?? 100) - 2);
    this.player.prisonRecord.timeServed += 0.1; // Partial credit

    // v0.108.2 fix (B1): prison work now actually shortens the sentence by
    // one day per shift, so working your way out is real instead of cosmetic.
    let message = "You spend the day scrubbing floors in the prison laundry. It's grueling work, but it keeps you fit. FIT +1. Health -2 (hard labor)." + this.lowHealthWarning();
    if (this.player.sentenceEnd) {
      this.player.sentenceEnd = this.player.sentenceEnd - 24 * 60 * 60 * 1000;
      message += " Your sentence is reduced by 1 day.";
      this.updateIncarceration();
      if (!this.player.incarcerated) {
        message += " 🎉 You've served your sentence and walk free!";
      }
    }

    return {
      success: true,
      message
    };
  }

  // === PHONE & COMMUNICATION ===
  phone(): GameAction {
    const unread = this.comm.getUnreadCounts();
    return { 
      success: true, 
      message: `📱 **Phone OS v2.0**
${'─'.repeat(40)}
📬 Emails: ${unread.emails} unread
💬 Messages: ${unread.sms} unread
📞 Voicemails: ${unread.voicemails} unread
👥 Contacts: ${this.comm.getContacts().length} saved
🛡️ Factions: ${this.player.factions?.length || 0} joined

Commands:
• emails - View inbox
• messages - View texts (viewing marks shown messages read)
• threads - Conversations by contact
• read message [id] - Open one text (marks only it read)
• delete message [id] - Delete one text
• factions - View your groups
• chat [id] - View group chat
• text [name] [msg] - Send text
• search [query] - Search all comms
• social - View social feed` 
    };
  }

  factions(): GameAction {
    this.checkFactions();
    if (!this.player.factions || this.player.factions.length === 0) {
      return { success: true, message: "🛡️ **Factions**\nYou haven't joined any factions yet. Increase your reputation to get invited!" };
    }

    let message = "🛡️ **YOUR FACTIONS**\n" + "─".repeat(40) + "\n";
    this.player.factions.forEach((id: string) => {
      const faction = this.social.getFaction(id);
      if (faction) {
        message += `**${faction.name}** [ID: ${faction.id}]\n   ${faction.description}\n`;
      }
    });

    message += '\nType "chat [id]" to view a faction group chat.';
    return { success: true, message };
  }

  influence(): GameAction {
    const allFactions = this.social.getAllFactions();
    let message = "📊 **FACTION INFLUENCE**\n" + "─".repeat(40) + "\n";
    
    allFactions.sort((a, b) => (b.influence || 0) - (a.influence || 0)).forEach(faction => {
      const influence = faction.influence || 0;
      let bar = "█".repeat(Math.floor(influence / 10)) + "░".repeat(10 - Math.floor(influence / 10));
      message += `**${faction.name}** (${faction.hqCity})\n[${bar}] ${influence}%\n`;
    });
    
    message += "\nUse 'support [id]' or 'sabotage [id]' to influence power.";
    return { success: true, message };
  }

  support(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: support [faction_id]" };
    if (!this.player.factions?.includes(id)) {
      return { success: false, message: "You can only support factions you belong to." };
    }
    if (this.player.energy < 25) return { success: false, message: "Too tired. Go rest." };

    const faction = this.social.getFaction(id);
    if (!faction) return { success: false, message: "Faction not found." };

    this.player.energy -= 25;
    faction.influence = Math.min(100, (faction.influence || 0) + 5);
    this.player.reputation.social += 5;
    this.player.reputation.professional += 2;
    this.time.advance({ hours: 2, minutes: 0 });

    return { 
      success: true, 
      message: `✅ **Success!** You spent 2 hours supporting **${faction.name}**. Their influence increased to **${faction.influence}%**.` 
    };
  }

  sabotage(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: sabotage [faction_id]" };
    const faction = this.social.getFaction(id);
    if (!faction) return { success: false, message: "Faction not found." };
    
    // Check if player is in a rival faction
    const isMemberOfRival = this.player.factions?.some((fId: string) => {
      const playerFaction = this.social.getFaction(fId);
      return playerFaction?.rivals?.includes(id);
    });

    if (!isMemberOfRival) {
      return { success: false, message: "You have no reason to sabotage this faction. Only members of rival factions can pull this off." };
    }

    if (this.player.energy < 40) return { success: false, message: "Too tired. Sabotage requires full focus." };

    this.player.energy -= 40;
    this.time.advance({ hours: 3, minutes: 0 });

    const successChance = 0.4 + (this.player.reputation.criminal / 500);
    if (Math.random() < successChance) {
      faction.influence = Math.max(0, (faction.influence || 0) - 8);
      this.player.reputation.criminal += 15;
      return { 
        success: true, 
        message: `🔥 **Success!** You effectively sabotaged **${faction.name}**. Their influence dropped to **${faction.influence}%** and your street cred rose.` 
      };
    } else {
      return this.handleArrest(14); // 2 weeks in prison
    }
  }

  chat(id: string): GameAction {
    if (!id) return { success: false, message: "Usage: chat [faction_id]" };
    
    if (!this.player.factions?.includes(id)) {
      return { success: false, message: "You are not a member of this faction." };
    }

    const group = this.comm.getGroupChat(id);
    if (!group) return { success: false, message: "Chat not found." };

    let message = `💬 **GROUP: ${group.name}**\n${'─'.repeat(40)}\n`;
    if (group.messages.length === 0) {
      message += "No messages yet.";
    } else {
      group.messages.forEach(m => {
        message += `**${m.from}**: ${m.message}\n`;
      });
    }

    return { success: true, message };
  }

  contacts(): GameAction {
    const contacts = this.comm.getContacts();
    if (contacts.length === 0) {
      return { success: true, message: '👥 No contacts saved yet. Meet people to add them!' };
    }
    
    const list = contacts.map(c => {
      const fav = c.isFavorite ? '⭐ ' : '';
      return `${fav}**${c.name}**\n   📞 ${c.phone} | 📧 ${c.email}`;
    }).join('\n');
    
    return { success: true, message: `👥 **Contacts**\n${'─'.repeat(40)}\n${list}` };
  }

  searchComm(query: string): GameAction {
    if (!query) return { success: false, message: 'Usage: search [query]' };
    
    const results = this.comm.searchComm(query);
    let message = `🔍 **Search Results for "${query}"**\n${'─'.repeat(40)}\n`;
    
    if (results.emails.length === 0 && results.sms.length === 0) {
      return { success: true, message: message + 'No results found.' };
    }
    
    if (results.emails.length > 0) {
      message += `📬 **Emails (${results.emails.length})**\n`;
      results.emails.forEach(e => message += `- ${e.subject} (from ${e.fromName})\n`);
      message += '\n';
    }
    
    if (results.sms.length > 0) {
      message += `💬 **Messages (${results.sms.length})**\n`;
      results.sms.forEach(s => message += `- ${s.fromName}: "${s.message.substring(0, 30)}..."\n`);
    }
    
    return { success: true, message };
  }

  // v0.108.18: the inbox lister. NOTE — this was dead code until .18:
  // the 'emails' case routed to email(rawArgs), so bare `emails`
  // printed the usage block instead of the inbox even when unread mail
  // existed. The dispatch now calls this directly. Lists EVERY message
  // (the old slice(0, 5) hid mail) with its id — ids are the only
  // handle `email read [id]` accepts, so they must be visible.
  emails(): GameAction {
    const emails = this.comm.getEmails();
    if (emails.length === 0) {
      return { success: true, message: '📭 No emails yet.' };
    }

    const list = emails.map(e => {
      const read = e.read ? '✅' : '🔵';
      const kind = mailKindIcon((e as any).kind);
      const paidMark = (e as any).kind === 'bill' && (e as any).paid ? ' (paid)' : '';
      return `${read} ${kind} **${e.subject}**${paidMark}\n   From: ${e.fromName || e.from} · id: ${e.id}\n   ${new Date(e.timestamp).toLocaleDateString()}`;
    }).join('\n\n');

    return { success: true, message: `📬 **Inbox (${emails.length})**\n${'─'.repeat(40)}\n${list}\n\nRead one with "email read [id]" or "read [id]". Kinds: ✉️ letter · 🧾 bill · 🏛️ notice · 📦 package.` };
  }

  textMsg(args: string): GameAction {
    if (!args) {
      return { success: false, message: 'Usage: text [name] [message]' };
    }
    
    // Parse name and message
    const parts = args.split(' ');
    const name = parts[0] || '';
    const msg = parts.slice(1).join(' ');
    
    if (!msg || !name) {
      return { success: false, message: 'What do you want to say? Usage: text [name] [message]' };
    }
    
    // Find NPC
    const npcs = this.social.getAllNPCs();
    const npc = npcs.find(n => n.name.toLowerCase().includes(name.toLowerCase()));
    
    if (!npc) {
      return { success: false, message: `No contact named "${name}" found.` };
    }
    
    // Send SMS
    this.comm.sendSMS(npc.id, msg);
    
    // NPC responds based on relationship and personality
    const rel = this.player.relationships?.[npc.id]?.value ?? 0;
    let response = 'Ok.';
    
    if (rel > 70) {
      response = this.pickRandom(['You know I got you! 💯', 'Bet. See you soon?', 'Always a pleasure hearing from you.', 'For sure, fam!']);
    } else if (rel > 30) {
      response = this.pickRandom(['Gotcha!', 'Sounds good!', '👍', 'Bet.', 'I hear you.']);
    } else if (rel < -20) {
      response = this.pickRandom(['Don\'t text me.', 'Blocked.', 'Why you hit me up?', 'Leave me alone.']);
    } else {
      response = this.pickRandom(['Ok...', 'Sure.', 'Noted.', 'Alright.', 'I\'m busy right now.']);
    }

    // Add personality flavor
    if (npc.personality.includes('street_smart') && rel > 0) response += ' Real talk.';
    if (npc.personality.includes('proper')) response = 'Pardon me, but ' + response.toLowerCase();

    this.comm.receiveSMS(npc.id, npc.name, response);
    this.comm.addNotification('SMS', `New message from ${npc.name}`);
    
    return { success: true, message: `📱 Sent to ${npc.name}: "${msg}"\n\n💬 ${npc.name} replied: "${response}"` };
  }

  email(args: string): GameAction {
    if (!args) {
      return {
        success: true,
        message: `📧 **Email**\n${'─'.repeat(40)}\n• emails — List your inbox\n• email read [id] — Read a message\n• read [id] — Same as email read\n• email compose [name] [subject] [body] — Send a message\n• email delete [id] — Delete a message`
      };
    }

    const parts = args.split(' ');
    const subCommand = parts[0]?.toLowerCase();

    if (subCommand === 'read') {
      return this.readEmail(parts[1] ?? '');
    }

    if (subCommand === 'compose') {
      const name = parts[1];
      const subject = parts[2];
      const body = parts.slice(3).join(' ');

      if (!name || !subject || !body) {
        return { success: false, message: 'Usage: email compose [name] [subject] [body]' };
      }

      const npcs = this.social.getAllNPCs();
      const npc = npcs.find(n => n.name.toLowerCase().includes(name.toLowerCase()));

      if (!npc) {
        return { success: false, message: `Recipient "${name}" not found.` };
      }

      this.comm.composeEmail('player', npc.name, subject, body);
      return { success: true, message: `📧 Email sent to ${npc.name}: "${subject}"` };
    }

    if (subCommand === 'delete') {
      const id = parts[1];
      if (!id) return { success: false, message: 'Usage: email delete [id]' };
      
      const success = this.comm.deleteEmail(id);
      return { success, message: success ? 'Email deleted.' : 'Email not found.' };
    }

    return { success: false, message: 'Unknown email command. Valid: email read [id], email compose [name] [subject] [body], email delete [id] — or "emails" for the inbox list.' };
  }

  socialFeed(): GameAction {
    // v0.108.24 item 9: your posts + followed roster posts lead; the
    // pre-existing community feed follows unchanged.
    const myPosts = [...(this.player.social?.posts ?? [])].sort((a, b) => b.timestamp - a.timestamp);
    const followedNpcs = (this.player.socialFollowing ?? [])
      .map((id: string) => this.social.getAllNPCs().find((n: any) => n.id === id))
      .filter(Boolean);
    const followedFeed = followedNpcs.length > 0 ? feedFor(this.player as any, followedNpcs as any).filter((f) => f.kind === 'npc') : [];
    const mySection = myPosts.length > 0
      ? `**Your posts**\n${myPosts.map((p) => `📱 "${p.text}"\n❤️ ${p.likes}`).join('\n\n')}\n\n`
      : '';
    const followedSection = followedFeed.length > 0
      ? `**Followed**\n${followedFeed.map((f) => `📱 **${f.authorName}**\n"${f.text}"\n❤️ ${f.likes}`).join('\n\n')}\n\n`
      : '';
    const posts = this.comm.getSocialFeed(10);
    if (posts.length === 0 && myPosts.length === 0 && followedFeed.length === 0) {
      return { success: true, message: '📱 Social feed is empty. Meet more people! Post with "post [visit|work|milestone|home]" or follow someone with "follow [name]".' };
    }
    const list = posts.map(p => {
      const icon = p.platform === 'twitter' ? '🐦' : p.platform === 'instagram' ? '📸' : '📘';
      return `${icon} **${p.author}** ${p.authorHandle}\n"${p.content.substring(0, 60)}..."\n❤️ ${p.likes} | 💬 ${p.comments} | 🔄 ${p.shares}`;
    }).join('\n\n');
    const communitySection = posts.length > 0 ? `**Community**\n${list}` : '';
    return { success: true, message: `📱 **Social Feed**\n${'─'.repeat(40)}\n${mySection}${followedSection}${communitySection}`.trimEnd() };
  }

  private pickRandom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)] || arr[0]!;
  }

  // === LIVING WORLD SYSTEM ===
  triggerCommunication(): void {
    const npcs = this.social.getAllNPCs();
    const chance = Math.random();
    
    // Simulate Faction Chat Activity
    if (this.player.factions?.length > 0 && Math.random() < 0.15) {
      const factionId = this.player.factions[Math.floor(Math.random() * this.player.factions.length)];
      const faction = this.social.getFaction(factionId);
      if (faction && faction.members.length > 0) {
        const senderId = faction.members[Math.floor(Math.random() * faction.members.length)] || '';
        const sender = this.social.getNPCById(senderId);
        if (sender) {
          const factionMsgs = [
            "Anyone seen the latest market trends?",
            "West Memphis is looking good tonight.",
            "Heard there's a big event coming up.",
            "Don't forget the meeting tomorrow.",
            "Stay safe out there, y'all.",
            "Business is booming."
          ];
          const randomMsg = factionMsgs[Math.floor(Math.random() * factionMsgs.length)] || "...";
          this.comm.sendGroupMessage(factionId, sender.name, randomMsg);
          this.comm.addNotification('Group Chat', `New message in ${faction.name}`);
        }
      }
    }

    if (chance > 0.2) return; // Only 20% chance to trigger a private message
    
    const npc = npcs[Math.floor(Math.random() * npcs.length)];
    if (!npc) return;
    const rel = this.player.relationships?.[npc.id]?.value ?? 0;
    
    if (rel > 50) {
      // Close friend sends a supportive text
      this.comm.receiveSMS(npc.id, npc.name, `Hey ${this.player.name}, just checking in! Hope you're doing good. 😊`);
      this.comm.addNotification('SMS', `New message from ${npc.name}`);
    } else if (rel < -20) {
      // Rival sends a snarky text
      this.comm.receiveSMS(npc.id, npc.name, `Saw you around. Still grinding that low-pay job, huh? 😂`);
      this.comm.addNotification('SMS', `New message from ${npc.name}`);
    } else if (this.player.money > 10000 && npc.role === 'realtor') {
      // Realtor emails about a property
      this.comm.receiveEmail(
        npc.id, 
        npc.name, 
        'Exclusive Listing', 
        `Hello ${this.player.name}, I noticed you've been doing well lately. I have a luxury property in East Memphis that just hit the market. Let me know if you're interested!`
      );
      this.comm.addNotification('Email', `New email from ${npc.name}`);
    } else {
      // Random social update
      this.comm.addPost(
        npc.name, 
        `@${npc.name.toLowerCase().replace(/\s+/g, '_')}`, 
        `Just had the best ${npc.role === 'chef' ? 'meal' : 'day'} in ${npc.city}! Living the dream. ✨`, 
        Math.random() > 0.5 ? 'twitter' : 'instagram'
      );
    }
  }

  // === ACHIEVEMENTS ===

  activeQuests(): GameAction {
    const quests = this.storyline.getActiveQuests();
    if (!quests || quests.length === 0) {
      return { success: true, message: '📜 **Active Quests**\nTalk to NPCs and ask for a *quest* or *favor* to find work.' };
    }
    const lines = quests.map((q: any) => {
      const progress = q.objectives.filter((o: any) => o.isCompleted).length;
      const total = q.objectives.length;
      return `• **${q.title}** — ${progress}/${total} objectives\n  ${q.description}`;
    }).join('\n\n');
    return { success: true, message: `📜 **Active Quests**\n${'─'.repeat(40)}\n\n${lines}` };
  }

  achievements(): GameAction {
    this.checkAllAchievements();
    const unlocked = this.achievementEngine.getUnlocked();
    const all = this.achievementEngine.getAll();
    const total = all.length;
    
    if (unlocked.length === 0) {
      return { success: true, message: `🏆 **Achievements**\n${'─'.repeat(40)}\nNo achievements unlocked yet.\n\nGet started:\n• Work your first shift\n• Buy a vehicle\n• Travel to a new city\n• Build relationships` };
    }
    
    const list = unlocked.slice(-10).reverse().map(a => 
      `${a.icon} **${a.name}** - ${a.description}`
    ).join('\n');
    
    return { 
      success: true, 
      message: `🏆 **Achievements** (${unlocked.length}/${total} unlocked)\n${'─'.repeat(40)}\n${list}${unlocked.length > 10 ? `\n\n...and ${unlocked.length - 10} more!` : ''}` 
    };
  }

  private checkFactions(): void {
    const allFactions = this.social.getAllFactions();
    if (!this.player.factions) this.player.factions = [];

    allFactions.forEach(faction => {
      if (this.player.factions.includes(faction.id)) return;

      const socialRep = this.player.reputation.social || 0;
      const profRep = this.player.reputation.professional || 0;
      const combinedRep = socialRep + profRep;

      if (combinedRep >= faction.reputationNeeded) {
        this.player.factions.push(faction.id);
        this.comm.createGroupChat(faction.id, faction.name, [...faction.members, 'player']);
        this.comm.addNotification('Faction', `You've been invited to join the ${faction.name}!`);
        
        // Welcome message in group chat
        if (faction.members.length > 0) {
          const welcomeNpcId = faction.members[0] || '';
          const welcomeNpc = this.social.getNPCById(welcomeNpcId);
          if (welcomeNpc) {
            this.comm.sendGroupMessage(faction.id, welcomeNpc.name, `Welcome to the group, ${this.player.name}! We've been watching your progress.`);
          }
        }
      }
    });
  }

  // v0.108.12 fix: evaluate the FULL achievement list, not a hardcoded
  // 30-id subset — progress-based ids (traveler, networker, ...) accrued
  // progress forever without ever being checked, so they could never
  // unlock. Returns the achievements unlocked by this check so the
  // caller can announce them.
  private checkAllAchievements(): Achievement[] {
    const unlocked: Achievement[] = [];
    for (const a of ACHIEVEMENTS) {
      const result = this.achievementEngine.checkAchievement(a.id, this.player);
      if (result.unlocked && result.achievement) {
        unlocked.push(result.achievement);
      }
    }
    return unlocked;
  }

  // === UTILITIES ===
  calculateNetWorth(): number {
    let total = this.player.money + this.player.bankBalance;
    
    if (this.player.properties) {
      total += this.property.calculateEquity(this.player.properties);
    }
    
    if (this.player.investments) {
      total += this.player.investments.reduce((sum: number, i: Investment) => sum + i.currentValue, 0);
    }
    
    if (this.player.vehicles) {
      total += this.player.vehicles.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
    }
    
    return Math.floor(total);
  }

  getPlayer(): any { 
    // Get time and weather info
    const weather = getWeather(this.time.currentTime, this.player.city);
    
    return {
      ...this.player,
      emails: this.comm.getEmails(),
      // v0.108.21 (§49): SMS + voicemails ride the same round-trip as
      // mail — without these lines they regenerated per request.
      sms: this.comm.getMessages(),
      voicemails: this.comm.getVoicemails(),
      achievements: this.achievementEngine.exportSerializable(),
      gameTime: this.time.formatTime(),
      gameDate: this.time.formatDate(),
      gameTimeISO: this.time.currentTime.toISOString(),
      weather: { temp: weather.temp, condition: weather.condition },
    };
  }
  setPlayerName(name: string): void { this.player.name = name; }

  // v0.108.10: per-request dialogue scope, set by index.ts before each
  // command. Routing metadata only — see the field comment above.
  setDialogueScope(scope: DialogueScope | null): void {
    this.dialogueScope = scope;
  }

  private scopeFor(npcId: string): DialogueScope {
    return {
      userId: this.dialogueScope?.userId ?? 'player',
      installId: this.dialogueScope?.installId ?? 'default',
      npcId,
    };
  }

  private getTimeCtx() {
    const now = this.time.currentTime;
    return {
      hour: this.time.getHour(),
      timeOfDay: this.time.getTimeOfDay(),
      isWeekend: this.time.isWeekend(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      weather: this.getWeatherString(),
    };
  }

  private getWeatherString(): string {
    try {
      const weather = getWeather(this.time.currentTime, this.player.city);
      return `${weather.temp}°F, ${weather.condition}`;
    } catch {
      return 'clear';
    }
  }
  
  loadState(state: any): void { 
    this.player = { 
      ...this.player, 
      ...state,
      // Defensive number conversion for stats
      // v0.108.3 fix: round cash/bank to whole cents on load. Percentage
      // math from earlier versions left balances with long fractional
      // tails (e.g. 677.8846153846154); rounding heals those saves in
      // place by at most half a cent.
      money: roundCents(Number(state.money ?? 500)),
      bankBalance: roundCents(Number(state.bankBalance ?? 0)),
      energy: Number(state.energy ?? 100),
      health: Number(state.health ?? 100),
      happiness: Number(state.happiness ?? 80),
      
      // Ensure arrays exist
      properties: state.properties || [],
      investments: state.investments || [],
      businesses: state.businesses || [],
      fines: state.fines || [],
      journalLog: state.journalLog || [],
      vehicles: state.vehicles || [],
      inventory: state.inventory || [],
      visitedCities: state.visitedCities || ['west_memphis'],
      workDaysCompleted: state.workDaysCompleted || 0,
      // Preserve relationships as a plain JSON-safe record
      relationships: state.relationships || {},
    };

    // v0.108.20 migration defaults: old saves gain the new fields at
    // their documented defaults (age 18, credit 50, no traits) — never
    // a wipe, never phantom data beyond the defaults.
    // v0.108.20 (§31): mail persistence — a saved mail array REPLACES
    // the constructor-generated initials (no duplicates). Old saves
    // with no emails field keep initials exactly as today.
    if (Array.isArray(state.emails)) {
      this.comm.restoreEmails(state.emails);
    }
    // v0.108.21 (§49): SMS + voicemails replace initials when saved;
    // old saves with neither field keep today's initials exactly.
    if (Array.isArray(state.sms)) {
      this.comm.restoreSMS(state.sms);
    }
    if (Array.isArray(state.voicemails)) {
      this.comm.restoreVoicemails(state.voicemails);
    }

    if (typeof this.player.ageYears !== 'number') this.player.ageYears = 18;
    if (typeof this.player.credit !== 'number') this.player.credit = 50;
    if (!Array.isArray(this.player.traits)) this.player.traits = [];

    // v0.108.21 (§57): duplicate positions for the same asset fold into
    // one line on load — legacy doubled screens fix themselves here,
    // with totals preserved exactly (sums, never averages).
    this.foldInvestmentPositions(); 

    // Sync NPC relationship values to the player's saved relationships so the
    // singleton social engine reports the current standing in `people`,
    // `explore`, and other commands that look at NPC objects directly.
    if (this.player.relationships) {
      for (const [npcId, rawRel] of Object.entries(this.player.relationships)) {
        const rel = rawRel as Relationship;
        const npc = this.social.getNPCById(npcId);
        if (npc && rel && typeof rel.value === 'number') {
          npc.relationship = rel.value;
        }
      }
    }
    
    if (state.achievements) {
      this.achievementEngine.importSerializable(state.achievements);
    }

    // v0.108.3 fix: restore the game clock from the save. Before this,
    // loadState never touched the TimeEngine, so the clock was engine-local:
    // every server-process restart snapped it back to Jan 1 2024 06:00 and
    // the header showed 6:00 AM on the same day no matter how much the
    // player had worked or slept. The monthly-tick watermark needs no
    // change: it is compared against this restored clock, and saves that
    // predate the tick feature still initialise the watermark to the
    // current game-month without ticking (see runMonthlyTicksIfDue).
    const restoredClock = parseGameClock(state);
    if (restoredClock) {
      this.time = new TimeEngine(restoredClock);
    }

    // v0.108.9 fix (major 5): warn when loading a save idle 20+ days.
    // serverSavePlayer stamps lastSaved on every save; the wrapper shows
    // this exactly once, on the next command after the load.
    this.player.pendingSaveWarning = null;
    if (typeof state?.lastSaved === 'number') {
      const idleDays = Math.floor((Date.now() - state.lastSaved) / 86400000);
      if (idleDays >= 20) {
        this.player.pendingSaveWarning = `⚠️ Your save is ${idleDays} days old. Saves expire after 90 days without play — keep playing to refresh it.`;
      }
    }
  }

  // === BANKING ===

  private bank(): GameAction {
    const totalWealth = this.player.money + this.player.bankBalance;
    return {
      success: true,
      message: `🏦 **THE OPEN WORLD BANK**\n\n` +
               `**Cash**: $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
               `**Bank Balance**: $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
               `**Total Liquidity**: $${totalWealth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
               `**Bank interest**: 0.5% per game-month on your bank balance, paid in the monthly tick.\n\n` +
               `Commands: \`deposit [amount]\`, \`withdraw [amount]\`, \`deposit all\`, \`withdraw all\`\nSavings & loans: \`savings\`, \`savings goal [name] [amount]\`, \`loans\`, \`loan [amount]\``
    };
  }

  private deposit(amountStr: string): GameAction {
    let amount: number;
    if (amountStr.toLowerCase() === 'all') {
      amount = this.player.money;
    } else {
      amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Invalid deposit amount. Usage: deposit [amount] or deposit all' };
    }

    if (amount > this.player.money) {
      return { success: false, message: `You only have $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in cash.` };
    }

    this.player.money -= amount;
    this.player.bankBalance += amount;
    
    // Round to 2 decimals
    this.player.money = Math.round(this.player.money * 100) / 100;
    this.player.bankBalance = Math.round(this.player.bankBalance * 100) / 100;

    return { 
      success: true, 
      message: `✅ Deposited $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. New bank balance: $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` 
    };
  }

  private withdraw(amountStr: string): GameAction {
    let amount: number;
    if (amountStr.toLowerCase() === 'all') {
      amount = this.player.bankBalance;
    } else {
      amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Invalid withdrawal amount. Usage: withdraw [amount] or withdraw all' };
    }

    if (amount > this.player.bankBalance) {
      return { success: false, message: `You only have $${this.player.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in your bank account.` };
    }

    this.player.bankBalance -= amount;
    this.player.money += amount;
    
    // Round to 2 decimals
    this.player.money = Math.round(this.player.money * 100) / 100;
    this.player.bankBalance = Math.round(this.player.bankBalance * 100) / 100;

    return { 
      success: true, 
      message: `✅ Withdrew $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. New cash on hand: $${this.player.money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` 
    };
  }

  // === COMMAND DISPATCHER ===
  //
  // Monthly-tick trigger (v0.108.2) — why the wrapper, not a
  // sleep() hook: game-time advances from MANY commands (work, travel, gym,
  // study, sleep, ...), and sleep() early-returns when fully rested, so a
  // sleep-only hook would miss boundaries crossed by any other action.
  // Wrapping the dispatcher is the single choke point every command passes
  // through (including the incarcerated early-returns), so no time-advance
  // path can cross a month boundary without the tick being considered.
  // The tick itself is idempotent per game-month via the persisted
  // player.lastMonthlyTick watermark (see runMonthlyTicksIfDue).
  async processCommand(
    input: string,
    opts?: { dialogueScope?: DialogueScope | null; asCommand?: boolean },
  ): Promise<GameAction> {
    if (opts && 'dialogueScope' in opts) this.dialogueScope = opts.dialogueScope ?? null;
    // v0.108.17: a quick-selection press is an explicit command invocation,
    // not chat — it exits any active conversation first, then dispatches.
    // v0.108.18: typed input follows the same commands-win rule below in
    // processCommandInner; only non-command text still chats.
    if (opts?.asCommand) this.player.currentConversation = null;
    // v0.108.15: daily goals refresh on the game-date, before dispatch, so
    // a day boundary crossed by any command still rotates the goals.
    ensureDailyGoals(this.player, this.time.formatDate());
    // v0.108.20 (§15): challenge week rollover — the engine grants the
    // participation reward at the first command of the new week.
    let challengeRolloverNote = '';
    {
      const wk = weekKeyFromDate(this.time.formatDate());
      const prevWeek = this.player.challengeWeek;
      if (prevWeek === undefined || prevWeek === null) {
        this.player.challengeWeek = wk;
        if (this.player.challengeContribution === undefined) this.player.challengeContribution = 0;
      } else if (prevWeek !== wk) {
        const goal = challengeGoalForWeek(prevWeek);
        if ((this.player.challengeContribution ?? 0) >= goal.threshold) {
          this.player.money = roundCents((this.player.money ?? 0) + CHALLENGE_REWARD);
          this.player.challengePayouts = (this.player.challengePayouts ?? 0) + 1;
          appendJournalLog(this.player, this.time.formatDate(), `Community challenge reward: +$${CHALLENGE_REWARD} (${goal.label})`);
          challengeRolloverNote = `\n\n🎉 Community challenge: you hit last week's ${goal.label} threshold — +$${CHALLENGE_REWARD}!`;
        }
        this.player.challengeWeek = wk;
        this.player.challengeContribution = 0;
        this.player.challengeVisitedCities = [];
      }
    }
    const result = await this.processCommandInner(input);
    this.syncInvestigations();
    // v0.108.20 (§32): relationship-tier crossings post incoming packages.
    if (result.success) this.grantTierPackages();
    // v0.108.20 (§15): only the current week's goal kind accrues.
    if (result.success && result.challengeContributions) {
      const wk = weekKeyFromDate(this.time.formatDate());
      if (this.player.challengeWeek !== wk) {
        this.player.challengeWeek = wk;
        this.player.challengeContribution = 0;
      }
      const goal = challengeGoalForWeek(wk);
      const amt = result.challengeContributions[goal.type] ?? 0;
      if (amt > 0) this.player.challengeContribution = (this.player.challengeContribution ?? 0) + amt;
    }
    // v0.108.15: goal progress only on SUCCESSFUL commands, mapped by the
    // command token. Rewards pay out here, in the open, never silently.
    if (result.success) {
      const token = input.trim().toLowerCase().split(/\s+/)[0] ?? '';
      const goalKind = token === 'rest' ? 'rest' : token === 'sleep' ? 'rest' : token === 'greet' ? 'talk' : token;
      const completed = recordDailyGoalProgress(this.player, goalKind);
      for (const g of completed) {
        this.player.money = roundCents((this.player.money ?? 0) + g.reward);
        this.trackTaxIncome(g.reward);
        result.message = `${result.message}\n\n🎯 Daily goal complete: ${g.label} — +$${g.reward}!`;
      }
    }
    const tickLines = this.runMonthlyTicksIfDue();
    if (tickLines.length > 0) {
      result.message = `${result.message}\n\n${tickLines.join('\n')}`;
    }
    // v0.108.3 fix: keep cash/bank at whole cents. This wrapper is the
    // single choke point every command passes through, and it runs after
    // the monthly tick, so pay, rent, mortgage and percentage math all
    // land rounded before the save. Together with the loadState rounding,
    // no stored balance can carry a fractional-cent tail again.
    this.player.money = roundCents(Number(this.player.money) || 0);
    this.player.bankBalance = roundCents(Number(this.player.bankBalance) || 0);
    // v0.108.9 fix (minor 12): lastActive refreshes on every command, not
    // just on hire — heat decay now measures real idle time between
    // commands instead of resetting after 30 minutes regardless of play.
    this.player.lastActive = Date.now();
    // v0.108.9 fix (major 5): surface the one-shot save-age warning set by
    // loadState, then clear it so it shows exactly once per load.
    if (challengeRolloverNote) {
      result.message = `${result.message}${challengeRolloverNote}`;
    }
    if (this.player.pendingSaveWarning) {
      const w = this.player.pendingSaveWarning;
      this.player.pendingSaveWarning = null;
      result.message = `${w}\n\n${result.message}`;
    }
    return result;
  }

  // Runs one property monthly tick per game-month crossed since the
  // watermark, and advances the watermark. Returns one summary line per
  // month ticked (empty when nothing was due). Idempotency: the watermark
  // lives on the player save, so re-running the same command, reloading a
  // save, or replaying a ticked month re-computes from the watermark and
  // finds nothing due. First run for a pre-feature save INITIALISES the
  // watermark to the current game-month without ticking — no retroactive
  // windfall for months that passed before this feature existed. If the
  // game clock ever moves BACKWARD past the watermark (it is engine-local
  // and resets on a server restart — see the uncertainty note on the tick),
  // no tick fires and nothing rewinds; ticking resumes once the clock
  // passes the watermark again.
  runMonthlyTicksIfDue(): string[] {
    const currentKey = this.time.getMonthKey();
    const last = this.player.lastMonthlyTick as string | null | undefined;
    if (!last) {
      this.player.lastMonthlyTick = currentKey;
      return [];
    }
    if (last >= currentKey) return [];

    const lines: string[] = [];
    let month = last;
    while (month < currentKey) {
      const prevMonth = month;
      month = nextMonthKey(month);
      const prevYear = parseInt(prevMonth.split('-')[0]!, 10);
      const monthYear = parseInt(month.split('-')[0]!, 10);
      // v0.108.20 (§6): the year crossing runs FIRST, so the prior
      // year's tax/age/family/fees are assessed before this month's
      // income lands in the new year's bucket.
      if (monthYear > prevYear) {
        lines.push(...this.runYearCrossing(prevYear, month));
      }
      const s = this.property.runMonthlyTick(this.player, month);
      let line = `🏠 Monthly tick (${month}): +$${s.rentCollected.toLocaleString()} rent`;
      if (s.vacantProperties > 0) {
        line += ` (${s.vacantProperties} propert${s.vacantProperties === 1 ? 'y' : 'ies'} vacant — no rent)`;
      }
      if (s.mortgagePaid > 0) {
        line += `, -$${s.mortgagePaid.toLocaleString()} mortgage`;
        this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + s.mortgagePaid;
      }
      if (s.missedPayments > 0) {
        line += `, ⚠️ ${s.missedPayments} mortgage payment(s) missed — $${s.arrearsAdded.toLocaleString()} added to arrears (cash was short; nothing was taken)`;
      }
      if (s.rentCollected > 0) {
        this.player.taxAnnualIncome = roundCents((this.player.taxAnnualIncome ?? 0) + s.rentCollected);
      }
      // v0.108.20 §36: arrears consequences — warnings at 3/5 consecutive
      // misses, foreclosure at 6 (property removed, mortgage cleared,
      // equity lost, journal + notice). Warnings fire when the count
      // HITS the threshold, never as a surprise.
      for (const prop of [...(this.player.properties ?? [])]) {
        const missed = prop.missedMortgagePayments ?? 0;
        if (missed === 3) {
          this.postNotice('City Court', `Mortgage warning: ${prop.name}`, `You have missed 3 consecutive mortgage payments on ${prop.name}. Arrears: $${(prop.mortgageArrears ?? 0).toLocaleString()}. Pay the arrears or arrange payment — 3 more consecutive misses lead to foreclosure.`);
          line += `, ⚠️ mortgage warning on ${prop.name} (3 missed)`;
        } else if (missed === 5) {
          this.postNotice('City Court', `FINAL mortgage warning: ${prop.name}`, `You have missed 5 consecutive mortgage payments on ${prop.name}. One more consecutive miss leads to foreclosure.`);
          line += `, ⚠️ FINAL mortgage warning on ${prop.name} (5 missed)`;
        } else if (missed >= 6) {
          this.player.properties = (this.player.properties ?? []).filter((x: any) => x.id !== prop.id);
          if (this.player.primaryResidenceId === prop.id) this.player.primaryResidenceId = null;
          appendJournalLog(this.player, this.time.formatDate(), `Foreclosure: ${prop.name} repossessed after 6 consecutive missed mortgage payments. Equity lost.`);
          this.postNotice('City Court', `Foreclosure: ${prop.name}`, `${prop.name} was foreclosed after 6 consecutive missed mortgage payments. The mortgage is cleared and the equity is lost.`);
          line += `, 🏚️ FORECLOSURE on ${prop.name} (6 missed — property removed)`;
        }
      }
      // v0.108.20 §36: household comfort — primary condition >= 70 gives
      // happiness +2/member (cap +10); < 40 gives stress +2/member (cap
      // +10); no property is neutral. No new cost.
      {
        const primary = this.primaryProperty();
        if (primary) {
          const spouseHere = Object.values(this.player.relationships ?? {}).some((r: any) => r.spouse) ? 1 : 0;
          const members = 1 + spouseHere + ((this.player.children ?? []).length);
          if ((primary.condition ?? 100) >= 70) {
            const gain = Math.min(10, 2 * members);
            this.player.happiness = Math.min(100, (this.player.happiness ?? 0) + gain);
            line += `, 🏠 home comfort +${gain} happiness`;
          } else if ((primary.condition ?? 100) < 40) {
            const gain = Math.min(10, 2 * members);
            this.player.stress = Math.min(100, (this.player.stress ?? 0) + gain);
            line += `, 🏠 poor home condition +${gain} stress`;
          }
        }
      }
      // v0.108.20 (§26 + §31): staffed business income (replaces the
      // flat .15 call; unstaffed businesses still pay exactly base),
      // with the business-license +5% multiplier when held.
      const staffed = this.staffedBusinessTick(month);
      let bizNet = staffed.net;
      const hasBizPermit = (this.player.permits ?? []).includes('business');
      if (hasBizPermit && bizNet > 0) bizNet = roundCents(bizNet * BUSINESS_PERMIT_MULTIPLIER);
      if (bizNet !== 0 || staffed.wagesPaid > 0) {
        this.player.money = roundCents((this.player.money ?? 0) + bizNet);
        if (bizNet > 0) this.player.taxAnnualIncome = roundCents((this.player.taxAnnualIncome ?? 0) + bizNet);
        this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + staffed.wagesPaid;
        const n = ownedBusinesses(this.player).length;
        line += `, +$${bizNet.toLocaleString()} business income (${n} business${n === 1 ? '' : 'es'})${hasBizPermit ? ' (business license +5%)' : ''}${staffed.detail}`;
      }
      if (staffed.quits.length > 0) {
        line += `, ⚠️ ${staffed.quits.join('; ')}`;
      }
      // v0.108.24 (§24): executive profit-share, only while employed
      // at that jobs-database company at executive tier.
      if (this.player.job && String((this.player.job as any).tier ?? '').toLowerCase() === 'executive') {
        const comp = groupCompanies(ALL_JOBS).find((c: any) => c.employer === this.player.job.employer);
        if (comp) {
          const perf = companyPerformance(comp.employer, month);
          const share = PROFIT_SHARE_UNIT * profitShareFactor(perf);
          if (share > 0) {
            this.player.money = roundCents((this.player.money ?? 0) + share);
            this.player.taxAnnualIncome = roundCents((this.player.taxAnnualIncome ?? 0) + share);
            line += `, 💼 profit-share $${share} (${comp.employer}, ${performanceWord(perf)})`;
          }
        }
      }
      // v0.108.12: bank interest — 0.5% per game-month on a positive bank
      // balance, paid in the same monthly tick.
      if ((this.player.bankBalance || 0) > 0) {
        const interest = roundCents(this.player.bankBalance * 0.005);
        if (interest > 0) {
          this.player.bankBalance = roundCents(this.player.bankBalance + interest);
          line += `, +$${interest.toLocaleString()} bank interest (0.5%/mo)`;
        }
      }
      // v0.108.21 (§50): stock dividends — 0.25%/month on the computed
      // price × shares, paid per holding into cash as taxable income.
      // The month-key guard makes the payout idempotent: a holding
      // never pays twice for the same ticked month.
      {
        this.recomputeStockHoldings();
        let divTotal = 0;
        const divParts: string[] = [];
        for (const h of (this.player.investments ?? [])) {
          if ((h as any).type !== 'stock') continue;
          const shares = (h as any).shares ?? 0;
          if (shares <= 0) continue;
          if ((h as any).dividendMonthKey === month) continue;
          const price = this.stockPriceNow((h as any).company);
          const div = stockDividend(shares, price);
          if (div <= 0) continue;
          (h as any).lastDividend = div;
          (h as any).dividendMonthKey = month;
          divTotal = roundCents(divTotal + div);
          divParts.push(`${(h as any).company} $${div.toLocaleString()}`);
        }
        if (divTotal > 0) {
          this.player.money = roundCents((this.player.money ?? 0) + divTotal);
          this.trackTaxIncome(divTotal);
          line += `, 📈 dividends +$${divTotal.toLocaleString()} (${divParts.join(', ')})`;
        }
      }
      // v0.108.21 (§51): player-founded companies tick (revenue,
      // expenses, debt, failure) in the same monthly tick.
      {
        const ct = this.companyTick(month);
        if (ct.line) line += ct.line;
      }
      // v0.108.21 (§52): owned-property repricing — each property's
      // currentValue moves by exactly the index ratio for its city
      // between the previous ticked month and this one. Every move
      // gets its own tick line (old price, new price, index move) —
      // never a silent overnight change. Flat-index months produce
      // no line. Mortgages, rent, and condition are untouched.
      {
        const prevIdx = (cityId: string) => housingMarketIndex(cityId, prevMonth);
        for (const p of (this.player.properties ?? [])) {
          const oldValue = (p as any).currentValue ?? (p as any).purchasePrice ?? 0;
          const oldIndex = prevIdx((p as any).city);
          const newIndex = housingMarketIndex((p as any).city, month);
          if (oldIndex === newIndex) continue;
          const newValue = repriceValue(oldValue, oldIndex, newIndex);
          if (newValue === oldValue) continue;
          (p as any).currentValue = newValue;
          (p as any).lastReprice = { month, oldValue, newValue, oldIndex, newIndex };
          line += `, 🏠 Repriced: ${(p as any).name} $${oldValue.toLocaleString()} → $${newValue.toLocaleString()} (housing index ${oldIndex.toFixed(2)} → ${newIndex.toFixed(2)} in ${cityDisplay((p as any).city)} — market movement, not a fee)`;
        }
      }
      // v0.108.20 §38: insurance premiums — missed premium lapses the
      // policy + notice; re-insure anytime.
      {
        const policies = this.insurancePolicies();
        for (const key of Object.keys(policies)) {
          const [type, targetId] = key.split(':');
          let prem = INSURANCE_PREMIUMS.health;
          let label = 'health';
          if (type === 'property') {
            const count = (this.player.properties ?? []).filter((x: any) => x.id === targetId).length;
            if (count === 0) { delete policies[key]; continue; }
            prem = INSURANCE_PREMIUMS.property; label = `property (${(this.player.properties ?? []).find((x: any) => x.id === targetId)?.name ?? targetId})`;
          } else if (type === 'vehicle') {
            const found = (this.player.vehicles ?? []).find((x: any) => (x.id ?? x.name) === targetId);
            if (!found) { delete policies[key]; continue; }
            prem = INSURANCE_PREMIUMS.vehicle; label = `vehicle (${found.name})`;
          } else if (type === 'business') {
            const found = ownedBusinesses(this.player).find((x: any) => x.id === targetId);
            if (!found) { delete policies[key]; continue; }
            prem = INSURANCE_PREMIUMS.business; label = `business (${found.name})`;
          }
          if ((this.player.money ?? 0) >= prem) {
            this.player.money = roundCents((this.player.money ?? 0) - prem);
            this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + prem;
            line += `, -$${prem} ${label} premium`;
          } else {
            delete policies[key];
            this.postNotice('Insurance Office', `Policy lapsed: ${label}`, `Your ${label} insurance premium of $${prem} could not be paid (cash short). The policy has lapsed. Re-insure anytime with "insure".`);
            line += `, ⚠️ ${label} policy LAPSED (premium $${prem} unpaid)`;
          }
        }
      }
      // v0.108.20 §40: office term — salary (taxed) while active, term
      // end vacates with completed-term credit, missed duty costs rep.
      {
        const office = this.player.office;
        if (office) {
          if (month >= office.endMonthKey) {
            const def = OFFICE_DEFS[office.key]!;
            if (!this.player.completedTerms) this.player.completedTerms = {};
            this.player.completedTerms[office.key] = (this.player.completedTerms[office.key] ?? 0) + 1;
            this.player.office = null;
            appendJournalLog(this.player, this.time.formatDate(), `Completed term as ${def.title} of ${office.jurisdiction}.`);
            line += `, 🏛️ term as ${def.title} ended (completed-term credit earned)`;
          } else {
            const def = OFFICE_DEFS[office.key]!;
            if (this.player.dutyDoneMonth !== month) {
              this.player.reputation.community = Math.max(0, (this.player.reputation?.community ?? 0) - 2);
              line += `, 🏛️ missed duty as ${def.title} (rep −2)`;
            }
            this.player.money = roundCents((this.player.money ?? 0) + def.salary);
            this.trackTaxIncome(def.salary);
            line += `, +$${def.salary.toLocaleString()} ${def.title} salary`;
          }
        }
      }
      // v0.108.20 (§34, superseding §10's original food/utilities
      // lines): living expenses for everyone; hard mode charges the
      // total at 1.5× plus asset lines. Grace: first 2 ticks are free.
      const living = livingExpenses(this.player, economicIndexForCity(this.player.city));
      const ticksCharged = this.player.livingTicksCharged ?? 0;
      if (ticksCharged < 2) {
        this.player.livingTicksCharged = ticksCharged + 1;
        line += `, 🏠 living costs waived (grace period, tick ${ticksCharged + 1}/2)`;
      } else {
        this.player.livingTicksCharged = ticksCharged + 1;
        const total = living.total;
        const cashBefore = this.player.money ?? 0;
        if (this.player.hardMode) {
          const paid = Math.min(cashBefore, total);
          this.player.money = roundCents(cashBefore - paid);
          this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + paid;
          const short = roundCents(total - paid);
          if (short > 0) {
            this.player.hardDebt = roundCents((this.player.hardDebt ?? 0) + short);
            this.player.stress = Math.min(100, (this.player.stress ?? 0) + 10);
            this.player.happiness = Math.max(0, (this.player.happiness ?? 0) - 5);
            line += `, 🏠 living $${total.toLocaleString()} (housing $${living.housing.toLocaleString()}, food $${living.food.toLocaleString()}, utilities $${living.utilities.toLocaleString()}, transport $${living.transport.toLocaleString()}, surcharge $${living.surcharge.toLocaleString()}, assets $${living.assetSurcharge.toLocaleString()}): paid $${paid.toLocaleString()}, $${short.toLocaleString()} to hard debt (+10 stress, −5 happiness)`;
            // §32 (refined by §34): a bill email ONLY when a hard-mode
            // tick creates hardDebt — never a second monthly bill.
            const bill: any = this.comm.receiveEmail('city', 'City Billing', `Hard-mode bill — $${short.toLocaleString()}`, `Your hard-mode living costs left a $${short.toLocaleString()} shortfall this month. Pay it with "pay bill" once you have the id — see "emails".`);
            bill.kind = 'bill';
            bill.billAmount = short;
            bill.paid = false;
          } else {
            line += `, 🏠 living $${total.toLocaleString()} paid (housing $${living.housing.toLocaleString()}, food $${living.food.toLocaleString()}, utilities $${living.utilities.toLocaleString()}, transport $${living.transport.toLocaleString()}, surcharge $${living.surcharge.toLocaleString()}, assets $${living.assetSurcharge.toLocaleString()})`;
          }
        } else {
          const paid = Math.min(cashBefore, total);
          this.player.money = roundCents(cashBefore - paid);
          this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + paid;
          const short = roundCents(total - paid);
          if (short > 0) {
            // Normal mode: partial pay + FORGIVENESS — no debt spiral.
            this.player.stress = Math.min(100, (this.player.stress ?? 0) + 5);
            line += `, 🏠 living $${total.toLocaleString()} (housing $${living.housing.toLocaleString()}, food $${living.food.toLocaleString()}, utilities $${living.utilities.toLocaleString()}, transport $${living.transport.toLocaleString()}): paid $${paid.toLocaleString()}, $${short.toLocaleString()} forgiven (+5 stress)`;
          } else {
            line += `, 🏠 living $${total.toLocaleString()} paid (housing $${living.housing.toLocaleString()}, food $${living.food.toLocaleString()}, utilities $${living.utilities.toLocaleString()}, transport $${living.transport.toLocaleString()})`;
          }
        }
        if ((this.player.money ?? 0) < 200) {
          line += ` ⚠️ Cash after living costs is under $200.`;
        }
      }
      // v0.108.20 (§8): loan interest, then payment, then missed rules.
      if ((this.player.loanBalance ?? 0) > 0) {
        const withInterest = roundCents(this.player.loanBalance * (1 + LOAN_INTEREST_RATE));
        const interest = roundCents(withInterest - this.player.loanBalance);
        this.player.loanBalance = withInterest;
        const payment = loanMonthlyPayment(this.player.loanBalance);
        if (payment > 0 && (this.player.money ?? 0) >= payment) {
          this.player.money = roundCents((this.player.money ?? 0) - payment);
          this.player.loanBalance = roundCents(this.player.loanBalance - payment);
          this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + payment;
          this.player.credit = Math.min(100, (this.player.credit ?? 50) + CREDIT_ON_TIME_GAIN);
          line += `, 💳 loan: +$${interest} interest, -$${payment} payment (balance $${this.player.loanBalance})`;
        } else if (payment > 0) {
          this.player.loanBalance = roundCents(this.player.loanBalance + LOAN_LATE_FEE);
          this.player.credit = Math.max(0, (this.player.credit ?? 50) - CREDIT_MISSED_LOSS);
          line += `, 💳 loan payment missed: +$${LOAN_LATE_FEE} late fee (balance $${this.player.loanBalance}, credit −${CREDIT_MISSED_LOSS})`;
          this.postNotice('City Bank', `Loan payment missed — $${payment.toLocaleString()}`, `Your monthly loan payment of $${payment.toLocaleString()} could not be paid (cash short). A $${LOAN_LATE_FEE} late fee was added. Pay down the balance with "loan pay".`);
        }
      }
      // v0.108.20 (§1): tax-plan installments, auto-deducted.
      if ((this.player.taxPlanRemaining ?? 0) > 0) {
        const inst = Math.min(this.player.taxPlanRemaining, this.player.taxPlanInstallment ?? this.player.taxPlanRemaining);
        if ((this.player.money ?? 0) >= inst) {
          this.player.money = roundCents((this.player.money ?? 0) - inst);
          this.player.taxOwed = roundCents(Math.max(0, (this.player.taxOwed ?? 0) - inst));
          this.player.taxPlanRemaining = roundCents(this.player.taxPlanRemaining - inst);
          this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + inst;
          line += this.player.taxPlanRemaining <= 0
            ? `, 🧾 tax plan installment $${inst} paid — plan complete`
            : `, 🧾 tax plan installment $${inst} paid ($${this.player.taxPlanRemaining} remaining)`;
          if (this.player.taxPlanRemaining <= 0) this.player.taxPlanInstallment = 0;
        } else {
          const penalty = roundCents(this.player.taxPlanRemaining * TAX_PLAN_BREAK_PENALTY_RATE);
          this.player.taxPlanRemaining = roundCents(this.player.taxPlanRemaining + penalty);
          this.player.taxOwed = roundCents((this.player.taxOwed ?? 0) + penalty);
          this.player.taxPlanInstallment = 0;
          this.player.taxPlanRemaining = 0;
          this.player.credit = Math.max(0, (this.player.credit ?? 50) - CREDIT_MISSED_LOSS);
          line += `, 🧾 tax plan BROKEN (cash short): +5% penalty $${penalty} on the remainder, credit −${CREDIT_MISSED_LOSS}`;
        }
      }
      // v0.108.20 (§1): tax late penalty — +10% once past the deadline,
      // plus $25/month while still unpaid.
      if ((this.player.taxOwed ?? 0) > 0 && this.player.taxDueMonthKey && month > this.player.taxDueMonthKey) {
        if (!this.player.taxPenaltyApplied) {
          const pen = roundCents(this.player.taxOwed * TAX_LATE_PENALTY_RATE);
          this.player.taxOwed = roundCents(this.player.taxOwed + pen);
          this.player.taxPenaltyApplied = true;
          line += `, 🧾 tax late penalty +10% ($${pen})`;
        }
        this.player.taxOwed = roundCents(this.player.taxOwed + TAX_LATE_FEE_MONTHLY);
        line += `, 🧾 tax late fee $${TAX_LATE_FEE_MONTHLY}`;
      }
      // v0.108.20 (§31): annual fees gain a $10 late fee past 2 months.
      if ((this.player.feesDue ?? 0) > 0 && !this.player.feesLateApplied && this.player.feesAssessedMonthKey && month > addMonthsToKey(this.player.feesAssessedMonthKey, FEE_LATE_MONTHS)) {
        this.player.feesDue = roundCents(this.player.feesDue + FEE_LATE);
        this.player.feesLateApplied = true;
        line += `, 🧾 fees late fee $${FEE_LATE} (unpaid past ${FEE_LATE_MONTHS} game-months)`;
      }
      // v0.108.21 (§54): fee payment plan + escalation ladder. The
      // plan deducts FIRST, before any ladder evaluation, and while
      // active the ladder is FROZEN (no warnings, no seizure, no
      // arrest). A missed installment breaks the plan with NO
      // penalty fee and restarts the warning sequence from the
      // break month. Warnings fire once each, seizure takes exactly
      // ONE asset per window with a 2-month cooldown, arrest fires
      // at most once per ladder and only when no seizable asset
      // remains — never a surprise, never a death spiral.
      if ((this.player.feesDue ?? 0) > 0) {
        if (this.player.feePlanActive && (this.player.feePlanRemaining ?? 0) > 0) {
          const inst = Math.min(this.player.feePlanRemaining, this.player.feePlanInstallment ?? this.player.feePlanRemaining);
          if ((this.player.money ?? 0) >= inst) {
            this.player.money = roundCents((this.player.money ?? 0) - inst);
            this.player.feesDue = roundCents((this.player.feesDue ?? 0) - inst);
            this.player.feePlanRemaining = roundCents(this.player.feePlanRemaining - inst);
            this.player.annualSpentAccum = (this.player.annualSpentAccum ?? 0) + inst;
            line += this.player.feePlanRemaining <= 0
              ? `, 🧾 fee plan installment $${inst.toLocaleString()} paid — plan complete`
              : `, 🧾 fee plan installment $${inst.toLocaleString()} paid ($${this.player.feePlanRemaining.toLocaleString()} remaining)`;
            if (this.player.feePlanRemaining <= 0) {
              this.player.feePlanActive = false;
              this.player.feePlanInstallment = 0;
              if ((this.player.feesDue ?? 0) > 0) {
                // Plan done but a balance remains (e.g. a late fee
                // landed mid-plan): warnings restart from here.
                this.player.feesClockMonthKey = month;
                this.player.feesWarning1Sent = false;
                this.player.feesWarning2Sent = false;
                line += ` (fees still owed — warning sequence restarts)`;
              } else {
                this.clearFeeLadder();
              }
            }
          } else {
            // Broken plan: NO penalty fee, NO credit hit — the tax
            // plan's 5% break penalty is deliberately NOT copied.
            // The warning sequence restarts from the break month.
            this.player.feePlanActive = false;
            this.player.feePlanRemaining = 0;
            this.player.feePlanInstallment = 0;
            this.player.feesClockMonthKey = month;
            this.player.feesWarning1Sent = false;
            this.player.feesWarning2Sent = false;
            line += `, 🧾 fee plan BROKEN (cash short for the installment): no penalty — warning sequence restarts from this month`;
          }
        }
        if ((this.player.feesDue ?? 0) > 0 && !this.player.feePlanActive) {
          const base = this.player.feesClockMonthKey ?? this.player.feesAssessedMonthKey ?? month;
          const monthsPast = monthDiff(base, month);
          const dueNow = this.player.feesDue ?? 0;
          if (monthsPast >= FEE_WARNING_1_MONTHS && !this.player.feesWarning1Sent) {
            this.player.feesWarning1Sent = true;
            const warnMonth = addMonthsKey(month, FEE_WARNING_2_MONTHS - monthsPast);
            const seizeMonth = addMonthsKey(month, FEE_SEIZURE_MONTHS - monthsPast);
            this.postNotice('City Court', `Fee warning: $${dueNow.toLocaleString()} outstanding`, `You owe $${dueNow.toLocaleString()} in annual fees (assessed ${base}). A final warning arrives ${warnMonth}; if the fees are still unpaid ${seizeMonth}, the city will seize one asset (cheapest vehicle, else cheapest non-primary property) or, if you hold no seizable asset, arrest you for a short 3-day sentence. Resolve it now: "pay fees all", "pay fees [amount]" (any partial payment restarts the warning clock), or "fees plan" (3 monthly installments, ladder frozen while active).`);
            line += `, ⚠️ fee warning 1: $${dueNow.toLocaleString()} outstanding — final warning ${warnMonth}, seizure/arrest ${seizeMonth} if unpaid`;
          }
          if (monthsPast >= FEE_WARNING_2_MONTHS && !this.player.feesWarning2Sent) {
            this.player.feesWarning2Sent = true;
            const seizeMonth = addMonthsKey(month, FEE_SEIZURE_MONTHS - monthsPast);
            this.postNotice('City Court', `FINAL fee warning: $${dueNow.toLocaleString()} outstanding`, `FINAL WARNING: you owe $${dueNow.toLocaleString()} in annual fees. If unpaid by ${seizeMonth}, the city will seize ONE asset (cheapest vehicle first, else cheapest property that is not your primary residence) and apply its value to the debt — or arrest you for a short 3-day sentence if you hold no seizable asset. Resolve it now: "pay fees all", "pay fees [amount]", or "fees plan".`);
            line += `, ⚠️ FINAL fee warning: $${dueNow.toLocaleString()} outstanding — seizure/arrest ${seizeMonth} if unpaid`;
          }
          if (monthsPast >= FEE_SEIZURE_MONTHS && !this.player.feesArrestFired) {
            const cooldownOk = !this.player.feesNextSeizureMonthKey || month >= this.player.feesNextSeizureMonthKey;
            if (cooldownOk) {
              const asset = firstSeizableAsset(this.player);
              if (asset) {
                if (asset.kind === 'vehicle') {
                  this.player.vehicles = (this.player.vehicles ?? []).filter((v: any) => v !== asset.ref);
                } else {
                  this.player.properties = (this.player.properties ?? []).filter((p: any) => p !== asset.ref);
                }
                const applied = Math.min(asset.value, this.player.feesDue ?? 0);
                this.player.feesDue = roundCents((this.player.feesDue ?? 0) - applied);
                this.player.feesNextSeizureMonthKey = addMonthsKey(month, FEE_SEIZURE_COOLDOWN_MONTHS);
                const remain = this.player.feesDue ?? 0;
                const assetName = asset.ref?.name ?? asset.kind;
                appendJournalLog(this.player, this.time.formatDate(), `Fee seizure: ${assetName} seized ($${asset.value.toLocaleString()} value, $${applied.toLocaleString()} applied to fees). Remaining fees: $${remain.toLocaleString()}.`);
                this.postNotice('City Court', `Fee seizure: ${assetName}`, `${assetName} (value $${asset.value.toLocaleString()}) was seized for unpaid fees. $${applied.toLocaleString()} was applied to your fees; $${remain.toLocaleString()} remains.${remain > 0 ? ` No further seizure before ${this.player.feesNextSeizureMonthKey}. Pay the rest with "pay fees all", "pay fees [amount]", or "fees plan".` : ' The ladder is now clear.'}`);
                line += `, 🏛️ fee seizure: ${assetName} ($${asset.value.toLocaleString()} → $${applied.toLocaleString()} applied, $${remain.toLocaleString()} remaining)`;
                if (remain <= 0) this.clearFeeLadder();
              } else {
                // Last resort, once per ladder: short bounded arrest.
                // No criminal-record entry, no arrests increment, no
                // parole tail — and job, home, businesses, and bank
                // balance are untouched throughout.
                this.player.incarcerated = true;
                this.player.sentenceEnd = Date.now() + 3 * 24 * 60 * 60 * 1000;
                this.player.feeArrestActive = true;
                this.player.feeArrested = true;
                this.player.feesArrestFired = true;
                appendJournalLog(this.player, this.time.formatDate(), `Fee arrest: arrested for unpaid fees ($${dueNow.toLocaleString()}) with no seizable assets. Short 3-day sentence; pay fees in full to release immediately.`);
                this.postNotice('City Court', 'Arrest for unpaid fees', `You were arrested for unpaid fees of $${dueNow.toLocaleString()} — no seizable assets remained. This is a short 3-day sentence with no criminal record and no parole tail. Release immediately by paying the fees in full ("pay fees all" works while incarcerated), or serve the sentence, or use "prison work" / "lawyer appeal" to shorten it.`);
                line += `, 🚨 fee arrest: 3-day sentence for $${dueNow.toLocaleString()} unpaid fees (no seizable assets) — pay in full to release immediately`;
              }
            }
          }
        }
      }
      lines.push(line);
      this.player.lastMonthlyTick = month;
    }
    return lines;
  }

  private async processCommandInner(input: string): Promise<GameAction> {
    this.updateIncarceration();
    this.decayHeat();
    this.closeInvestigationsIfCool();
    // v0.108.20 (§32): due outgoing packages flip to delivered (once,
    // via the delivered flag) before the command runs.
    this.checkPackageDeliveries();

    // v0.108.18 fluency: filler tolerance is computed once here and used
    // for every dispatch decision below; chat always receives the ORIGINAL
    // input, so a filler phrase can never swallow a conversation line.
    const effectiveInput = stripFiller(input);

    if (this.player.incarcerated) {
      const [command, ...args] = effectiveInput.trim().toLowerCase().split(/\s+/);

      if (command === 'prison') {
        if (args[0] === 'work') return this.prisonWork();
        return this.prisonStatus();
      }
      if (command === 'status') return this.status();
      if (command === 'help') return this.help(args.join(' '));
      if (command === 'sleep' || command === 'rest') return this.sleep();
      // v0.108.2 fix (B1): a prisoner must be able to appeal, or the appeal
      // system is unreachable exactly when it matters.
      if (command === 'lawyer' && args[0] === 'appeal') return this.lawyer(args.join(' '));
      // v0.108.21 (§54): ONLY while incarcerated FOR FEES, three more
      // commands stay open — the fee view (read-only), paying fees
      // (the exit), and withdrawing (so bank savings can fund the
      // exit). Every other restriction stands, and crime
      // incarcerations keep the old gate exactly.
      if (this.player.feeArrestActive) {
        if (command === 'fees') return this.feesView();
        if (command === 'pay' && args[0] === 'fees') return this.payFees(args.slice(1).join(' '));
        if (command === 'withdraw') return this.withdraw(effectiveInput.trim().split(/\s+/).slice(1).join(' '));
      }

      return { success: false, message: '⛓️ You are incarcerated. You can only use "prison", "status", "help", "sleep", and "lawyer appeal".' };
    }

    // Check if we're in a conversation first
    // (v0.108.17: quick presses clear currentConversation in processCommand,
    // so they never reach this branch.)
    // (v0.108.18: commands win over chat for typed input too. A typed input
    // whose first word is a known game command exits the conversation and
    // dispatches below; only non-command text goes to the NPC as chat.)
    if (this.player.currentConversation) {
      const [cmd] = effectiveInput.toLowerCase().trim().split(/\s+/);
      if (cmd && KNOWN_COMMANDS.has(cmd)) {
        // v0.108.18 audit fix: leave-family commands must NOT be cleared
        // here — endConversation() reads currentConversation to say
        // goodbye by name and print the "commands work again" hint. The
        // old clear-first made typed `leave` answer "You're not in a
        // conversation" for a conversation it just left. Every other
        // known command still clears first, as before.
        // v0.108.20 (§27): topics/ask are IN-conversation commands —
        // clearing here would destroy the conversation they need.
        if (!['end', 'exit', 'bye', 'goodbye', 'leave', 'topics', 'ask'].includes(cmd)) {
          this.player.currentConversation = null;
        }
      } else if (cmd) {
        return await this.continueConversation(input);
      }
    }
    
    const [command, ...args] = effectiveInput.trim().toLowerCase().split(/\s+/);
    const rawArgs = effectiveInput.trim().split(/\s+/).slice(1).join(' ');

    let result: GameAction;

    switch (command) {
      // Core
      case 'work': result = this.work(); break;
      case 'apply': result = args.length === 0 ? this.apply() : this.applyForJob(rawArgs); break;
      case 'status': result = this.status(); break;
      case 'help': result = this.help(rawArgs); break;
      case 'sleep': result = this.sleep(); break;
      case 'rest': result = this.sleep(); break;
      case 'study':
        // v0.108.1 fix: studyHours() was defined but never dispatched, so an
        // enrolled course could never gain hours or graduate. Route the
        // documented "study hours [n]" form to it; bare "study" still lists
        // schools, and "study library" keeps its library fallback.
        if (args[0] === 'hours') result = this.studyHours(args[1] ?? '');
        else if (args[0] === 'library' && !this.player.enrolledCourse) result = this.studyHours('library');
        else result = this.study();
        break;
      case 'gym': result = this.gym(); break;
      case 'skills': result = this.skills(); break;
      case 'bank': result = this.bank(); break;
      case 'deposit': result = this.deposit(rawArgs); break;
      case 'withdraw': result = this.withdraw(rawArgs); break;
      case 'lawyer': result = this.lawyer(rawArgs); break;
      case 'record': result = this.recordView(); break;
      case 'laylow': result = this.layLow(); break;
      case 'lay': result = this.layLow(); break;
      
      // Movement
      case 'explore': result = rawArgs ? this.explore(rawArgs) : this.explore(); break;
      case 'goto': result = this.goto(rawArgs); break;
      case 'districts': case 'district': result = this.districts(); break;
      case 'where': case 'location': result = this.where(); break;
      case 'nearby': case 'places': result = this.nearby(); break;
      case 'travel': result = rawArgs ? this.travelTo(rawArgs) : { success: false, message: 'Travel where? Usage: travel [city] or travel to [city]' }; break;
      case 'home': result = this.goHome(); break;
      case 'go': result = rawArgs.toLowerCase().trim() === 'home' ? this.goHome() : { success: false, message: 'Go where? Try "go home".' }; break;
      
      // Social
      case 'talk': result = await this.talk(rawArgs); break;
      case 'greet': result = await this.greet(rawArgs); break;
      case 'assist': result = rawArgs ? this.helpNPC(rawArgs) : { success: false, message: 'Assist whom? Type "people" to see who\'s around.' }; break;
      case 'people': result = this.people(); break;
      case 'end':
      case 'exit':
      case 'bye':
      case 'goodbye':
      case 'leave':
        result = this.endConversation();
        break;
      
      // Property
      case 'real-estate': case 'realestate': case 'properties_list': result = this.realEstate(); break;
      case 'buy':
        if (args[0] === 'stock') result = this.buyStock(args.slice(1).join(' '));
        else if (args[0] === 'property') result = this.buyProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.buyVehicle(args.slice(1).join(' '));
        else if (args[0] === 'business') result = this.buyBusiness(args.slice(1).join(' '));
        else result = { success: false, message: 'Buy what? "buy property [name]", "buy vehicle [type]", "buy business [name]", or "buy stock [name] [amount]"' };
        break;
      case 'sell':
        if (args[0] === 'stock') result = this.sellStock(args.slice(1).join(' '));
        else if (args[0] === 'property') result = this.sellProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.sellVehicle(args.slice(1).join(' '));
        else if (args[0] === 'investment') result = this.sellInvestment(args.slice(1).join(' '));
        else if (args[0] === 'business') result = this.sellBusiness(args.slice(1).join(' '));
        else result = { success: false, message: 'Sell what? "sell property/vehicle/investment/business [name]" or "sell stock [name] [shares|all]"' };
        break;
      case 'properties': result = this.properties(); break;
      case 'businesses': case 'business': result = this.businesses(); break;
      case 'repair':
        if (args[0] === 'property') result = this.repairProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.repairVehicle(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: repair property [name] or repair vehicle [name]' };
        break;
      case 'renovate':
        if (args[0] === 'property') result = this.renovateProperty(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: renovate property [name]' };
        break;
      // v0.108.15: "upgrade" covers both upgrade systems — property tiers
      // (alias for renovate) and vehicle performance tiers.
      case 'upgrade':
        if (args[0] === 'property') result = this.renovateProperty(args.slice(1).join(' '));
        else if (args[0] === 'vehicle') result = this.upgradeVehicle(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: upgrade property [name] or upgrade vehicle [name] [engine|transmission|aero]' };
        break;
      case 'goals': case 'goal': result = this.goals(); break;
      case 'career': result = this.career(); break;
      case 'promote': case 'promotion': result = this.promote(); break;
      case 'laws': case 'law': result = this.laws(); break;
      case 'court': result = this.court(); break;
      case 'government': case 'gov': result = this.governmentView(rawArgs); break;
      case 'pay':
        if (args[0] === 'fine') result = this.payFine(args.slice(1).join(' '));
        else if (args[0] === 'bill') result = this.payBill(args.slice(1).join(' '));
        else if (args[0] === 'fees') result = this.payFees(args.slice(1).join(' '));
        else if (args[0] === 'mortgage') result = this.payMortgageView(args.slice(1).join(' '));
        else result = { success: false, message: 'Usage: pay fine all | pay fine [amount] | pay bill [id] | pay fees [all|amount] | pay mortgage [property] [amount]' };
        break;
      case 'profile': result = rawArgs ? this.npcProfile(rawArgs) : this.status(); break;
      case 'gift': result = this.giftNpc(rawArgs); break;
      case 'hangout': result = rawArgs ? this.hangoutNpc(rawArgs) : { success: false, message: 'Hang out with whom? Type "people" to see who\'s around.' }; break;
      case 'friends': case 'relationships': result = this.friends(); break;
      case 'journal': case 'story': result = this.journal(); break;
      case 'maintain':
        result = this.maintainVehicle(rawArgs);
        break;
      case 'service': {
          const knownServices = ['oil','tires','brakes','tuneup','wash'];
          let serviceType = '';
          let vehicleName = rawArgs;
          if (args.length > 0 && knownServices.includes(args[args.length - 1]!.toLowerCase())) {
            serviceType = args[args.length - 1]!.toLowerCase();
            vehicleName = args.slice(0, -1).join(' ');
          }
          if (!serviceType) {
            const first = this.player.vehicles?.[0];
            result = first
              ? { success: true, message: `🔧 Available services for ${first.name}: oil, tires, brakes, tuneup, wash. Usage: service [vehicle name] [service]` }
              : { success: false, message: 'You don\'t own any vehicles.' };
          } else {
            result = this.serviceVehicle(vehicleName, serviceType);
          }
        }
        break;
      // v0.108.2 fix (M1): vehicles() existed but was never dispatched, so
      // the documented "vehicles" command fell through to the unknown-command
      // path. Same pattern as the v0.108.1 study-hours fix.
      case 'vehicles': result = this.vehicles(); break;
      case 'fuel':
      case 'refuel':
        result = rawArgs ? this.fuelVehicle(rawArgs) : { success: false, message: 'Fuel which vehicle? Usage: fuel [vehicle name]' };
        break;
      case 'register':
        result = rawArgs.trim().toLowerCase() === 'voter' ? this.registerVoter() : rawArgs ? this.registerVehicle(rawArgs) : { success: false, message: 'Register which vehicle? Usage: register [vehicle name] or register voter' };
        break;
      case 'customize': {
        const cvParts = rawArgs.split(/\s+/).filter(Boolean);
        if (cvParts.length === 0) {
          result = { success: false, message: 'Customize which vehicle? Try "customize [vehicle name]" to see mods.' };
        } else {
          const knownMods = ['tint', 'spoiler', 'paint', 'rims', 'exhaust', 'stereo', 'turbo', 'suspension'];
          const lastIsMod = knownMods.includes(cvParts[cvParts.length - 1]!.toLowerCase());
          const cvName = lastIsMod ? cvParts.slice(0, -1).join(' ').trim() : rawArgs;
          const cvMod = lastIsMod ? cvParts[cvParts.length - 1]! : '';
          result = cvName ? this.customizeVehicle(cvName, cvMod) : { success: false, message: 'Customize which vehicle? Usage: customize [vehicle name] [mod]. Try "customize sedan" for available mods.' };
        }
        break;
      }
      case 'tow':
      case 'emergency':
        result = rawArgs ? this.emergencyTow(rawArgs) : { success: false, message: 'Tow which vehicle? Usage: tow [vehicle name] | emergency [vehicle name]' };
        break;
      case 'inspect':
        result = this.inspectVehicle(rawArgs);
        break;
      case 'race':
      case 'races':
        result = rawArgs ? this.race(rawArgs) : this.race('');
        break;
      case 'crime':
        // v0.108.18 audit fix: bare `crime` used to fall into
        // commitCrime('') whose usage listed only 3 of the 6 types, and
        // the crime() risk/options menu was never dispatched at all.
        // Bare crime shows the menu; crime [type] commits.
        result = rawArgs ? this.commitCrime(rawArgs) : this.crime();
        break;
      
      // Investments
      case 'invest':
        if (args.length === 0) result = this.invest();
        else if (args[0] !== 'options') {
          // v0.108.29: "invest all into [name]" / "invest all [name]" —
          // the amount is "all" (every dollar of cash), the name follows
          // the preposition (or directly). The old last-arg parse turned
          // "invest all into google" into amount "google" → "Invalid
          // amount"; the name is resolved here, makeInvestment resolves
          // "all" to the cash balance.
          if (args[0] === 'all') {
            const prep = args[1] === 'into' || args[1] === 'in' || args[1] === 'on' ? 2 : 1;
            const allName = args.slice(prep).join(' ');
            result = allName
              ? this.makeInvestment(allName, 'all')
              : { success: false, message: 'Invest all in what? Usage: invest all into [name] — type "invest" to see options.' };
          } else {
            // invest [name] [amount]
            const amount = args[args.length - 1] || '0';
            const name = args.slice(0, -1).join(' ');
            result = this.makeInvestment(name, amount);
          }
        }
        else result = this.invest();
        break;
      case 'investments': result = this.investments(); break;
      
      // Phone / Social
      case 'phone': result = this.phone(); break;
      case 'text': result = this.textMsg(rawArgs); break;
      case 'email': result = this.email(rawArgs); break;
      case 'emails': result = this.emails(); break;
      case 'inbox': result = this.emails(); break;
      case 'messages': result = this.messagesView(); break;
      case 'social': result = this.socialFeed(); break;
      case 'contacts': result = this.contacts(); break;
      case 'search': result = this.searchComm(rawArgs); break;
      case 'factions': result = this.factions(); break;
      case 'quests':
      case 'quest':
        result = this.activeQuests();
        break;
      case 'chat': result = this.chat(rawArgs); break;
      case 'influence': result = this.influence(); break;
      case 'support': result = this.support(rawArgs); break;
      case 'sabotage': result = this.sabotage(rawArgs); break;
      
      // Education
      case 'enroll': result = this.enroll(rawArgs); break;
      case 'schools': result = this.listSchools(); break;

      // Crimes
      case 'rob': result = this.commitCrime('robbery'); break;
      case 'scam': result = this.commitCrime('scam'); break;
      
      // Events
      case 'event': 
        if (args[0] === 'choice') result = this.eventChoice(args[1] ?? '');
        else result = this.event();
        break;
      
      // Meta
      case 'achievements': case 'achievement': result = this.achievements(); break;
      case 'milestones': result = this.milestones(); break;
      case 'celebrate': result = rawArgs ? this.celebrate(rawArgs) : { success: false, message: 'Celebrate with whom? Type "people" to see who\'s around.' }; break;
      case 'furnish': result = this.furnish(rawArgs); break;
      case 'cook': result = this.cook(rawArgs); break;
      case 'events': result = this.worldEvents(); break;
      case 'attend': result = this.attendEvent(rawArgs); break;
      case 'roadtrip': result = this.roadtrip(rawArgs); break;
      case 'passport': result = this.passport(); break;
      // v0.108.23: travel / properties / home expansions.
      case 'trips': result = this.tripsView(); break;
      case 'journey': result = this.journeyView(rawArgs); break;
      case 'souvenirs': result = this.souvenirsView(); break;
      case 'souvenir': result = this.souvenirView(rawArgs); break;
      case 'tenants': result = this.tenantsView(); break;
      case 'open': result = rawArgs.trim().toLowerCase().startsWith('house') ? this.openHouseView(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : { success: false, message: 'Usage: open house [property].' }; break;
      case 'lease': result = this.leaseView(rawArgs); break;
      case 'break': result = rawArgs.trim().toLowerCase().startsWith('lease') ? this.breakLeaseView(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : { success: false, message: 'Usage: break lease [property].' }; break;
      case 'myhome': result = this.myHomeView(); break;
      case 'morning': result = this.morningView(); break;
      case 'evening': result = this.eveningView(); break;
      case 'household': result = this.householdView(); break;
      // v0.108.20 — mega-expansion
      case 'tax': result = rawArgs.trim().toLowerCase() === 'plan' ? this.taxPlan() : this.taxStatus(); break;
      case 'file': {
        const f = rawArgs.trim().toLowerCase();
        result = f === 'taxes' ? this.fileTaxes()
          : (OFFICE_DEFS[f] ? this.fileOfficeView(f) : { success: false, message: 'Usage: file taxes, or file [mayor|governor|president].' });
        break;
      }
      case 'cases': result = this.casesList(); break;
      case 'case': result = this.caseDetail(rawArgs); break;
      case 'police': result = this.policeStatus(); break;
      case 'degrees': result = this.degreesView(); break;
      case 'campus': result = this.campusView(rawArgs); break;
      case 'propose': result = this.propose(rawArgs); break;
      case 'family': result = rawArgs.trim().toLowerCase().startsWith('activity') ? this.familyActivity(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.familyView(); break;
      case 'welcome': result = rawArgs.trim().toLowerCase().startsWith('child') ? this.welcomeChild(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : { success: false, message: 'Usage: welcome child [name].' }; break;
      case 'civic': result = this.civicView(); break;
      case 'calendar': result = this.calendarView(); break;
      case 'years': result = this.yearsView(); break;
      case 'gigs': result = this.gigsList(); break;
      case 'gig': result = this.gigWork(rawArgs); break;
      case 'overtime': result = /^\d+$/.test(rawArgs.trim()) ? this.overtimeHoursView(rawArgs.trim()) : rawArgs.trim() === '' ? this.overtimeWork() : { success: false, message: 'Usage: overtime (a full extra shift) or overtime [hours] (1-4).' }; break;
      case 'savings': result = rawArgs.trim().toLowerCase().startsWith('goal') ? this.savingsGoal(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : rawArgs.trim().toLowerCase().startsWith('deposit') ? this.savingsDeposit(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.savingsView(); break;
      case 'loans': result = this.loansView(); break;
      case 'loan': result = rawArgs.trim().toLowerCase().startsWith('pay') ? this.loanPay(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.loanBorrow(rawArgs); break;
      case 'hardmode': result = rawArgs.trim().toLowerCase() === 'on' ? this.hardmodeSet(true) : rawArgs.trim().toLowerCase() === 'off' ? this.hardmodeSet(false) : this.hardmodeView(); break;
      case 'bills': result = rawArgs.trim().toLowerCase().startsWith('pay') ? this.billsPay(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.billsView(); break;
      case 'backgrounds': result = this.backgroundsList(); break;
      case 'name': result = this.renameCharacter(rawArgs); break;
      case 'retire': result = rawArgs.trim().toLowerCase() === 'confirm' ? this.retireConfirm() : this.retirePreview(); break;
      case 'legacy': result = this.legacyView(); break;
      case 'challenge': result = this.challengeView(); break;
      case 'news': result = this.newsView(rawArgs); break;
      case 'workplace': result = this.workplaceView(); break;
      case 'shift': result = this.shiftSet(rawArgs); break;
      case 'coworkers': result = this.coworkersList(); break;
      case 'lunch': result = this.lunchWith(rawArgs); break;
      // v0.108.26: deeper working activities + emergency-track activities.
      case 'task': result = rawArgs.trim().toLowerCase() === 'complete' ? this.taskComplete() : this.taskView(); break;
      case 'tasks': result = this.taskView(); break;
      case 'mentor': result = this.mentorView(rawArgs); break;
      case 'meeting': result = this.meetingView(); break;
      case 'breakroom': result = this.breakroomView(); break;
      case 'report': result = this.reportView(); break;
      case 'cover': result = this.coverView(rawArgs); break;
      case 'patrol': result = this.emergencyActivity('patrol'); break;
      case 'drill': result = this.emergencyActivity('drill'); break;
      case 'respond': result = this.emergencyActivity('respond'); break;
      case 'training': result = this.emergencyActivity('training'); break;
      case 'ridealong': result = this.emergencyActivity('ridealong'); break;
      case 'citizens': result = this.citizensView(); break;
      case 'volunteer': result = this.volunteerWork(); break;
      case 'fame': result = this.fameView(); break;
      // v0.108.25 (§76): studio credit + copyright, same text as the
      // About screen and the main menu footer.
      case 'about': result = this.aboutView(); break;
      case 'companies': result = this.companiesList(); break;
      case 'company': result = this.companyDetail(rawArgs); break;
      // v0.108.21: founding/running companies, dividends, voicemails,
      // repricing transparency.
      case 'found': result = this.foundCompany(rawArgs); break;
      case 'mycompanies': result = this.myCompaniesView(); break;
      case 'dividends': result = this.dividendsView(); break;
      case 'voicemails': result = this.voicemailsView(); break;
      case 'repricing': result = this.repricingView(); break;
      case 'stocks': result = this.stocksList(); break;
      case 'stock': result = this.stockDetail(rawArgs); break;
      case 'index': result = this.indexView(); break;
      case 'hire': result = this.hireStaff(rawArgs); break;
      case 'fire': result = this.fireStaff(rawArgs); break;
      case 'staff': result = this.staffView(rawArgs); break;
      case 'raise': result = this.raiseStaff(rawArgs); break;
      case 'topics': result = this.topicsView(); break;
      case 'ask': result = this.askTopic(rawArgs); break;
      case 'read': {
        const parts = rawArgs.trim().split(/\s+/);
        result = parts[0]?.toLowerCase() === 'message'
          ? this.readSmsView(parts.slice(1).join(' '))
          : parts[0]?.toLowerCase() === 'mail'
            ? this.mailRead(parts.slice(1).join(' '))
            : this.readEmail(parts[0] ?? '');
        break;
      }
      case 'mail': {
        // v0.108.28: `mail read [id]` opens one item; bare `mail` (or
        // `mail [kind]`) lists. Checked here, not in mailView, so the
        // filter words can never swallow the read subcommand.
        const m = rawArgs.trim().split(/\s+/);
        result = m[0]?.toLowerCase() === 'read'
          ? this.mailRead(m.slice(1).join(' '))
          : this.mailView(rawArgs);
        break;
      }
      case 'packages': result = this.packagesView(); break;
      case 'track': result = this.trackPackage(rawArgs); break;
      case 'send': result = rawArgs.trim().toLowerCase().startsWith('package') ? this.sendPackage(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : { success: false, message: 'Usage: send package [npc] [item].' }; break;
      case 'claim': result = rawArgs.trim().toLowerCase().startsWith('package') ? this.claimPackage(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.claimView(rawArgs); break;
      case 'deliver': result = this.deliverCourier(rawArgs); break;
      case 'services': result = this.servicesView(); break;
      case 'permits': result = this.permitsView(); break;
      case 'permit': result = this.permitBuy(rawArgs); break;
      case 'fees':
        // v0.108.21 (§54): "fees plan" starts the payment plan;
        // bare "fees" shows the ladder view (stage, deadline, ways out).
        if (rawArgs.trim().toLowerCase() === 'plan') result = this.feesPlan();
        else result = this.feesView();
        break;
      case 'benefits': result = rawArgs.trim().toLowerCase() === 'claim' ? this.benefitsClaim() : this.benefitsView(); break;
      case 'records': result = this.recordsView(); break;
      case 'utilities': result = this.utilitiesView(); break;
      case 'living': case 'expenses': result = this.livingView(); break;
      // v0.108.20 Appendix J (items 33-42) + K (item 44).
      case 'stores': result = this.storesView(); break;
      case 'shop': result = this.shopView(rawArgs); break;
      case 'commercial': result = this.commercialView(); break;
      case 'stroll': result = this.strollView(rawArgs); break;
      case 'errands': result = this.errandsView(); break;
      case 'chores': result = this.choresView(); break;
      case 'selfcare': result = this.selfcareView(); break;
      case 'routines': result = this.routinesView(); break;
      case 'housing': result = rawArgs.trim().toLowerCase().startsWith('market') ? this.housingMarketView(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : this.housingView(); break;
      case 'mortgage': result = this.mortgageView(rawArgs); break;
      case 'set': result = rawArgs.trim().toLowerCase().startsWith('home') ? this.setHomeView(rawArgs.trim().split(/\s+/).slice(1).join(' ')) : { success: false, message: 'Usage: set home [property] or set home none.' }; break;
      case 'move': result = this.moveView(rawArgs); break;
      case 'will': {
        const w = rawArgs.trim().split(/\s+/);
        result = w[0] === 'heir' ? this.willHeirView(w.slice(1).join(' ')) : w[0] === 'bequeath' ? this.willBequeathView(w.slice(1).join(' ')) : this.willView();
        break;
      }
      case 'insurance': result = this.insuranceView(); break;
      case 'insure': result = this.insureView(rawArgs); break;
      case 'uninsure': result = this.uninsureView(rawArgs); break;
      case 'offices': result = this.officesView(); break;
      case 'campaign': result = this.campaignView(rawArgs); break;
      case 'election': result = this.electionView(); break;
      case 'office': result = this.officeView(); break;
      case 'decide': result = this.decideView(rawArgs); break;
      case 'resign': result = this.resignView(); break;
      case 'careers': {
        const t = rawArgs.trim().toLowerCase();
        result = (t === 'police' || t === 'fire' || t === 'ems') ? this.careersTrackView(t) : this.careersView();
        break;
      }
      case 'gpa': result = this.gpaView(); break;
      case 'exam': result = this.examView(); break;
      case 'graduate': result = this.graduateView(); break;
      case 'ticker': result = this.tickerView(rawArgs); break;
      case 'view': result = this.viewView(rawArgs); break;
      case 'clear_conv': this.player.currentConversation = null; result = { success: true, message: 'Conversation cleared.' }; break;
      // v0.108.24: every new command token, routed to its .24 method.
      case 'id': result = this.idView(rawArgs); break;
      case 'transit': result = this.transitView(rawArgs); break;
      case 'stations': result = this.stationsView(); break;
      case 'weather': result = this.weatherView(); break;
      case 'forecast': result = this.forecastView(); break;
      case 'time': result = this.timeView(); break;
      case 'day': result = this.dayView(); break;
      case 'wait': result = this.waitView(rawArgs); break;
      case 'advance': result = this.advanceLadder(); break;
      case 'sports': result = this.sportsView(rawArgs); break;
      case 'tryout': result = this.tryoutView(rawArgs); break;
      case 'contract': result = this.contractView(); break;
      case 'season': result = this.seasonView(); break;
      case 'college': result = this.collegeView(rawArgs); break;
      case 'post': result = this.postView(rawArgs); break;
      case 'follow': result = this.followView(rawArgs, true); break;
      case 'unfollow': result = this.followView(rawArgs, false); break;
      case 'following': result = this.followingView(); break;
      case 'threads': result = this.threadsView(); break;
      case 'thread': result = this.threadView(rawArgs); break;
      case 'message': result = this.readSmsView(rawArgs); break;
      case 'delete':
        if (rawArgs.trim().toLowerCase().startsWith('message ')) result = this.deleteMessageView(rawArgs.trim().slice(8));
        else result = { success: false, message: 'Usage: delete message [id].' };
        break;
      // v0.108.18 audit fix: `prison` was promised by the arrest message
      // and the incarcerated gate but had no switch case — free players
      // got "Unknown command" instead of prisonStatus()'s clean answer.
      // prisonStatus/prisonWork already guard the non-incarcerated case.
      case 'prison':
        result = args[0] === 'work' ? this.prisonWork() : this.prisonStatus();
        break;
      
      default:
        {
          // v0.108.18 fluency: an unrecognized input suggests the nearest
          // real command instead of a bare dead end.
          const suggestion = nearestCommand(command ?? '');
          result = { success: false, message: suggestion
            ? `Unknown command: \"${command}\". Did you mean \"${suggestion}\"? Type \"help\" for list of commands.`
            : `Unknown command: \"${command}\". Type \"help\" for list of commands.` };
        }
    }

    // v0.108.12 fix: announce unlocks in-band. Previously checkAll
    // discarded its results, so a player only learned about unlocks by
    // typing `achievements`.
    const newlyUnlocked = this.checkAllAchievements();
    if (newlyUnlocked.length > 0) {
      const lines = newlyUnlocked.map((a) => `🏆 Achievement unlocked: **${a.name}** — ${a.description}`);
      // v0.108.15: achievement unlocks are journal-log events (see the
      // story/journal spec) — same announcement, plus a dated log entry.
      for (const a of newlyUnlocked) appendJournalLog(this.player, this.time.formatDate(), `Achievement unlocked: ${a.name}`);
      result.message = `${result.message}\n\n${lines.join('\n')}`;
    }
    return result;
  }

  private lawyer(action: string): GameAction {
    if (!action) {
      return { success: false, message: 'Which legal service? Usage: lawyer [clean|appeal|defend case-<n>|expunge <n>]' };
    }

    const defendParts = action.trim().split(/\s+/);
    if (defendParts[0]!.toLowerCase() === 'defend') {
      return this.defendCase(defendParts.slice(1).join(' '));
    }

    if (defendParts[0]!.toLowerCase() === 'expunge') {
      return this.expungeEntry(defendParts.slice(1).join(' '));
    }

    const act = action.toLowerCase();

    if (act === 'clean') {
      if (this.player.incarcerated) {
        return { success: false, message: 'You can\'t hire a lawyer to clean your record while you\'re locked up. Try "lawyer appeal" instead.' };
      }
      
      const currentHeat = this.player.heat || 0;
      if (currentHeat === 0) {
        return { success: false, message: 'Your record is already clean.' };
      }

      const openInvCount = (this.player.investigations ?? []).filter((i: any) => i.status === 'open').length;
      const surcharge = openInvCount * LAWYER_CLEAN_INVESTIGATION_SURCHARGE;
      const cost = currentHeat * 100 + surcharge;
      if (this.player.money < cost) {
        return { success: false, message: `A legal team to scrub your heat would cost $${cost.toLocaleString()}. You only have $${this.player.money.toFixed(2)}.` };
      }

      this.player.money -= cost;
      const reduction = Math.floor(currentHeat * (0.3 + (this.player.charisma / 200)));
      this.player.heat = Math.max(0, currentHeat - reduction);

      return { 
        success: true, 
        message: `⚖️ Your lawyer successfully scrubbed some of your record. Heat reduced by ${reduction}. New heat: ${this.player.heat}. Cost: $${cost.toLocaleString()}${surcharge > 0 ? ` (includes $${surcharge.toLocaleString()} investigation surcharge: $${LAWYER_CLEAN_INVESTIGATION_SURCHARGE} per open investigation)` : ''}.` 
      };
    }

    if (act === 'appeal') {
      if (!this.player.incarcerated) {
        return { success: false, message: 'You can only appeal if you are currently incarcerated.' };
      }

      const cost = 1000;
      if (this.player.money < cost) {
        return { success: false, message: `An appeal costs $${cost.toLocaleString()}. You don\'t have enough funds.` };
      }

      this.player.money -= cost;
      const successChance = 0.3 + (this.player.intelligence / 400);
      
      if (Math.random() < successChance) {
        const reductionPercent = 0.25 + (Math.random() * 0.25); // 25-50% reduction
        if (this.player.sentenceEnd) {
          const remaining = this.player.sentenceEnd - Date.now();
          const reductionMs = Math.floor(remaining * reductionPercent);
          this.player.sentenceEnd = this.player.sentenceEnd! - reductionMs;
          
          const daysSaved = Math.ceil(reductionMs / (1000 * 60 * 60 * 24));
          return { success: true, message: `⚖️ **APPEAL SUCCESSFUL!** Your lawyer found a loophole. Your sentence has been reduced by ${daysSaved} days.` };
        }
      }

      return { success: false, message: `⚖️ The judge rejected your appeal. Your lawyer keeps the $${cost} fee regardless.` };
    }

    return { success: false, message: 'Invalid lawyer action. Usage: lawyer [clean|appeal|defend case-<n>|expunge <n>]' };
  }
}