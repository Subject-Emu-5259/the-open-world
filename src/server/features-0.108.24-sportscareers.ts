// THE OPEN WORLD — v0.108.24 PRO SPORTS + COLLEGE CAREERS
// Pure-logic module only. It is NOT wired into the engine (no other file
// is touched by this change): it defines the sports tracks, the college
// career tracks, answers eligibility questions about a player-like
// object, scores a season, and prices contracts. It builds on the
// v0.108.20 §42 careers system (CAREER_PATHS / careerMappingForJob /
// careerGPA in features-0.108.20.ts) without duplicating it: the .20
// paths are untouched, and this module adds two new families beside
// them — athlete contracts and college-tied jobs.
//
// Conventions, following features-0.108.20.ts §42 and the sibling
// v0.108.24 emergency-careers module:
// - TypeScript ESM; the one import is type-only, with a .js suffix.
// - No new dependencies, no randomness, no Date, no I/O. Every function
//   is deterministic: same inputs always give the same outputs. (Racing
//   in racing-service.ts is deliberately NOT reused here: it rolls dice
//   and charges entry fees, so it is flavor-adjacent only and is never
//   called or rewired by this module.)
// - Money is in whole cents: every hourlyPay below has at most two
//   decimal places, every annual salary is a whole number of dollars,
//   and every monthly salary is annual / 12 rounded to whole cents
//   (all twelve annuals below divide into whole cents; see the pay
//   table). Annual salaries are stated in dollars, not cents, and the
//   field names say so (annualSalaryDollars / monthlySalaryDollars).
// - Economy scale, anchored to the established bands and to real
//   listings (entry jobs ~$26k–$38k/yr; skilled listings $19–$28/hr =
//   $39,520–$58,240/yr; the executive listing mem_exec_fedex at $75/hr
//   = $156,000/yr):
//   * Rookie athlete deals ($42,000–$48,000/yr) sit INSIDE the skilled
//     band — above entry, never absurd.
//   * Star deals ($105,000–$120,000/yr) sit above the career band but
//     BELOW the $156,000 executive anchor. The $180/hr surgeon listing
//     is a known outlier and is NOT used as the cap.
//   * College rungs reuse the jobs-database bands directly: entry
//     $14–$17/hr, skilled $19–$24/hr, career $30–$38/hr.
// - A "certification" here is ONLY a SCHOOLS rewardCertification from
//   school-engine.ts, exactly as in .20 §42. Free-text listing text is
//   never encoded as a cert. Every cert named below is checked against
//   the real course list (see the per-track notes).
// - Skill levels are the engine's skill LEVEL scale (fresh skill = 1,
//   promotion gate in the engine = 3), NOT the jobs-database `required`
//   field (a 10–90 listing threshold). The two scales are never mixed:
//   gates use minSkillLevel; gap-fill listings carry a `required` value
//   on the database's own scale for display/apply parity only.
// - "Fitness" is TWO different engine numbers, and both are read:
//   skills.fitness.level (the skill) and the flat fitness stat (the
//   gym stat, 0–100, starting at 50). A gate has a skill-level part
//   (always applied) and a flat-stat part (applied ONLY when the
//   player-like carries a numeric `fitness` field — engine players do;
//   a bare fixture without it is not penalised for lacking it).
// - GPA follows .20 careerGPA() (enrolled-course GPA, else last
//   graduation GPA, else 2.5 for a save with no GPA history — neutral,
//   above the 2.0 floor and below the 3.0 bar), with a flat `gpa` field
//   read first, as in the sibling .24 module. The one exception is the
//   college-athlete floor: it ALSO blocks when lastGPA itself is below
//   2.0, because the engine's enroll() probation check keys on lastGPA
//   alone (game-engine.ts: "Probation: your GPA is … (below 2.0)"). A
//   player on probation is therefore blocked from a college team even
//   if a current enrollment GPA reads higher.
// - Eligibility answers "does this player meet the requirements?", NOT
//   "does this player currently hold this rank?". Sports and college
//   advancement here is requirement-based only: unlike the sibling
//   emergency ladders, no prior-rung-employment check is applied,
//   because no sports/college job record exists yet for the engine to
//   check against (this module is unwired). A future wiring step that
//   stores an athlete/college job should add that check; until then,
//   requiring it would make every rank unreachable.
// - Teams, leagues, and athletes are FICTIONAL. Every team name below
//   is a city-generic invention (the "[City] Bolts" pattern from the
//   spec); no real team, league, or athlete name appears anywhere in
//   this module. No team is tied to a real-world franchise.
// - Gap-fill listings follow the .20 §42 approach and the sibling .24
//   approach: a REAL city/district only, `requirements: []` (the
//   engine's requirementDecision() fails CLOSED on unevaluable
//   credential text, so copying free-text requirements onto gap rungs
//   would make them unhirable; the track requirements are the gate),
//   and a real in-game employer — a school from school-engine.ts for
//   college rungs, the sport's Memphis team for sports ranks (one
//   canonical listing per rank, mirroring the sibling's one-listing-
//   per-rung rule; the other SPORTS_TEAMS entries are tryout/contract
//   destinations in data, not separate listings).

import type { JobListing } from './jobs-database.js';

// ---------------------------------------------------------------------------
// Player-like input
// ---------------------------------------------------------------------------
// Only the fields eligibility reads. Every field is optional so old
// saves and partial test fixtures both work.
// - skills: engine shape ({ level, xp }) OR flat numbers. A missing
//   skill reads as level 1, the engine's default.
// - fitness: the flat gym stat (0–100) when present; absent means the
//   flat-stat part of a fitness gate is skipped, never failed.
// - certifications / certs: held SCHOOLS rewardCertifications.
// - enrolledCourse: the live enrollment record (schoolId + courseId
//   from school-engine.ts, plus the runtime GPA the engine stamps on
//   enroll — the PlayerState type omits it, but enroll() writes it).
// - GPA: gpa, then enrolledCourse.gpa, then lastGPA, then 2.5.
export interface PlayerLike {
  skills?: Record<string, number | { level?: number; value?: number } | null | undefined>;
  fitness?: number;
  certifications?: string[];
  certs?: string[];
  gpa?: number;
  lastGPA?: number;
  enrolledCourse?: { schoolId?: string; courseId?: string; gpa?: number };
}

// ---------------------------------------------------------------------------
// Shared readers (internal, deterministic)
// ---------------------------------------------------------------------------

function skillLevelFor(player: PlayerLike, skill: string): number {
  const raw = player.skills?.[skill];
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') {
    if (typeof raw.level === 'number') return raw.level;
    if (typeof raw.value === 'number') return raw.value;
  }
  return 1;
}

function flatFitnessFor(player: PlayerLike): number | null {
  if (typeof player.fitness === 'number') return Math.max(0, Math.min(100, player.fitness));
  return null;
}

function certificationsFor(player: PlayerLike): string[] {
  if (Array.isArray(player.certifications)) return player.certifications;
  if (Array.isArray(player.certs)) return player.certs;
  return [];
}

function gpaFor(player: PlayerLike): number {
  if (typeof player.gpa === 'number') return player.gpa;
  if (typeof player.enrolledCourse?.gpa === 'number') return player.enrolledCourse.gpa;
  if (typeof player.lastGPA === 'number') return player.lastGPA;
  return 2.5;
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ---------------------------------------------------------------------------
// PRO SPORTS — fictional teams and leagues
// ---------------------------------------------------------------------------

export type SportId = 'basketball' | 'football' | 'soccer' | 'baseball';

export interface SportsTeam {
  id: string;
  name: string;
  city: string;
  league: string;
  sport: SportId;
}

// One team per Mid-South city per sport. All names are invented
// city-generic combinations; none matches a real professional team.
export const SPORTS_TEAMS: SportsTeam[] = [
  // Basketball — Mid-South Basketball League (fictional).
  { id: 'memphis_bolts_basketball', name: 'Memphis Bolts', city: 'memphis', league: 'Mid-South Basketball League', sport: 'basketball' },
  { id: 'littlerock_comets_basketball', name: 'Little Rock Comets', city: 'littlerock', league: 'Mid-South Basketball League', sport: 'basketball' },
  { id: 'southaven_strikers_basketball', name: 'Southaven Strikers', city: 'southaven', league: 'Mid-South Basketball League', sport: 'basketball' },
  { id: 'west_memphis_waves_basketball', name: 'West Memphis Waves', city: 'west_memphis', league: 'Mid-South Basketball League', sport: 'basketball' },
  // Football — Delta Gridiron League (fictional).
  { id: 'memphis_forge_football', name: 'Memphis Forge', city: 'memphis', league: 'Delta Gridiron League', sport: 'football' },
  { id: 'littlerock_stampede_football', name: 'Little Rock Stampede', city: 'littlerock', league: 'Delta Gridiron League', sport: 'football' },
  { id: 'southaven_blaze_football', name: 'Southaven Blaze', city: 'southaven', league: 'Delta Gridiron League', sport: 'football' },
  { id: 'west_memphis_anchors_football', name: 'West Memphis Anchors', city: 'west_memphis', league: 'Delta Gridiron League', sport: 'football' },
  // Soccer — River Valley Soccer League (fictional).
  { id: 'memphis_current_soccer', name: 'Memphis Current', city: 'memphis', league: 'River Valley Soccer League', sport: 'soccer' },
  { id: 'littlerock_oaks_soccer', name: 'Little Rock Oaks', city: 'littlerock', league: 'River Valley Soccer League', sport: 'soccer' },
  { id: 'southaven_prairie_soccer', name: 'Southaven Prairie', city: 'southaven', league: 'River Valley Soccer League', sport: 'soccer' },
  { id: 'west_memphis_harbor_soccer', name: 'West Memphis Harbor', city: 'west_memphis', league: 'River Valley Soccer League', sport: 'soccer' },
  // Baseball — Delta Diamond League (fictional).
  { id: 'memphis_rails_baseball', name: 'Memphis Rails', city: 'memphis', league: 'Delta Diamond League', sport: 'baseball' },
  { id: 'littlerock_diamonds_baseball', name: 'Little Rock Diamonds', city: 'littlerock', league: 'Delta Diamond League', sport: 'baseball' },
  { id: 'southaven_storm_baseball', name: 'Southaven Storm', city: 'southaven', league: 'Delta Diamond League', sport: 'baseball' },
  { id: 'west_memphis_beacons_baseball', name: 'West Memphis Beacons', city: 'west_memphis', league: 'Delta Diamond League', sport: 'baseball' },
];

export function teamsForSport(sport: string): SportsTeam[] {
  return SPORTS_TEAMS.filter((t) => t.sport === sport);
}

export function teamById(teamId: string): SportsTeam | null {
  return SPORTS_TEAMS.find((t) => t.id === teamId) ?? null;
}

// ---------------------------------------------------------------------------
// PRO SPORTS — ranks, tryouts, contracts
// ---------------------------------------------------------------------------

export interface SportsRank {
  id: string;
  title: string;
  /** Gap-fill JobListing id for this rank (no real athlete listing exists). */
  jobId: string;
  gapFillJob: JobListing;
  /** Fitness skill level gate. */
  minFitnessLevel: number;
  /** Flat gym-stat gate; applied only when the player carries one. */
  minFitnessStat: number;
  /** Star ranks only: media/leadership presence (null otherwise). */
  minCharismaLevel: number | null;
  /** Annual salary in whole dollars (see the pay table in the header). */
  annualSalaryDollars: number;
  /** Contract term in game-months. */
  termMonths: number;
  /** Season score (0–100, see seasonPerformance) needed to renew. */
  renewalScoreThreshold: number;
  /** Performance bonus as a fraction of annual salary at score >= 85. */
  performanceBonusPct: number;
}

export interface SportsTrack {
  id: SportId;
  sport: string;
  league: string;
  /** Canonical home team for the rank listings (Memphis team, memphis/downtown). */
  homeTeamId: string;
  /** Tryout gates = the rookie rank's gates. */
  minFitnessLevel: number;
  minFitnessStat: number;
  ranks: SportsRank[];
}

// Gap-fill listings: hourlyPay = annual / 2080, rounded to whole cents
// (48,000 -> 23.08; 62,000 -> 29.81; 85,000 -> 40.87; 120,000 -> 57.69;
// 45,000 -> 21.63; 58,000 -> 27.88; 80,000 -> 38.46; 115,000 -> 55.29;
// 42,000 -> 20.19; 54,000 -> 25.96; 75,000 -> 36.06; 105,000 -> 50.48;
// 44,000 -> 21.15; 56,000 -> 26.92; 78,000 -> 37.50; 110,000 -> 52.88).
// Tier carries the pay band (skilled / career / elite); category is
// 'career' throughout because the JobListing category union has no
// sports value. `required` is the database's 10–90 scale, rising with rank.
const SPORTS_GAP_BASKETBALL_ROOKIE: JobListing = {
  id: 'sport_basketball_rookie', title: 'Rookie Player', employer: 'Memphis Bolts',
  tier: 'skilled', hourlyPay: 23.08, skill: 'fitness', required: 25,
  city: 'memphis', district: 'downtown',
  description: 'First-year pro on the Memphis Bolts (Mid-South Basketball League): practice squad, spot minutes, and development work.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASKETBALL_ROTATION: JobListing = {
  id: 'sport_basketball_rotation', title: 'Rotation Player', employer: 'Memphis Bolts',
  tier: 'skilled', hourlyPay: 29.81, skill: 'fitness', required: 40,
  city: 'memphis', district: 'downtown',
  description: 'Regular rotation minutes for the Memphis Bolts (Mid-South Basketball League).',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASKETBALL_STARTER: JobListing = {
  id: 'sport_basketball_starter', title: 'Starter', employer: 'Memphis Bolts',
  tier: 'career', hourlyPay: 40.87, skill: 'fitness', required: 55,
  city: 'memphis', district: 'downtown',
  description: 'Starting five for the Memphis Bolts (Mid-South Basketball League).',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASKETBALL_STAR: JobListing = {
  id: 'sport_basketball_star', title: 'Star Player', employer: 'Memphis Bolts',
  tier: 'elite', hourlyPay: 57.69, skill: 'fitness', required: 70,
  city: 'memphis', district: 'downtown',
  description: 'Franchise face of the Memphis Bolts (Mid-South Basketball League): first option, media duties, and league attention.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_FOOTBALL_ROOKIE: JobListing = {
  id: 'sport_football_rookie', title: 'Rookie Player', employer: 'Memphis Forge',
  tier: 'skilled', hourlyPay: 21.63, skill: 'fitness', required: 30,
  city: 'memphis', district: 'downtown',
  description: 'First-year pro on the Memphis Forge (Delta Gridiron League): special teams, practice reps, and development work.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_FOOTBALL_ROTATION: JobListing = {
  id: 'sport_football_rotation', title: 'Rotation Player', employer: 'Memphis Forge',
  tier: 'skilled', hourlyPay: 27.88, skill: 'fitness', required: 45,
  city: 'memphis', district: 'downtown',
  description: 'Regular snaps in the Memphis Forge (Delta Gridiron League) rotation.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_FOOTBALL_STARTER: JobListing = {
  id: 'sport_football_starter', title: 'Starter', employer: 'Memphis Forge',
  tier: 'career', hourlyPay: 38.46, skill: 'fitness', required: 60,
  city: 'memphis', district: 'downtown',
  description: 'Starting lineup for the Memphis Forge (Delta Gridiron League).',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_FOOTBALL_STAR: JobListing = {
  id: 'sport_football_star', title: 'Star Player', employer: 'Memphis Forge',
  tier: 'elite', hourlyPay: 55.29, skill: 'fitness', required: 75,
  city: 'memphis', district: 'downtown',
  description: 'Franchise face of the Memphis Forge (Delta Gridiron League): marquee role, media duties, and league attention.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_SOCCER_ROOKIE: JobListing = {
  id: 'sport_soccer_rookie', title: 'Rookie Player', employer: 'Memphis Current',
  tier: 'skilled', hourlyPay: 20.19, skill: 'fitness', required: 25,
  city: 'memphis', district: 'downtown',
  description: 'First-year pro on Memphis Current (River Valley Soccer League): bench minutes, training, and development work.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_SOCCER_ROTATION: JobListing = {
  id: 'sport_soccer_rotation', title: 'Rotation Player', employer: 'Memphis Current',
  tier: 'skilled', hourlyPay: 25.96, skill: 'fitness', required: 40,
  city: 'memphis', district: 'downtown',
  description: 'Regular minutes in the Memphis Current (River Valley Soccer League) rotation.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_SOCCER_STARTER: JobListing = {
  id: 'sport_soccer_starter', title: 'Starter', employer: 'Memphis Current',
  tier: 'career', hourlyPay: 36.06, skill: 'fitness', required: 55,
  city: 'memphis', district: 'downtown',
  description: 'Starting eleven for Memphis Current (River Valley Soccer League).',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_SOCCER_STAR: JobListing = {
  id: 'sport_soccer_star', title: 'Star Player', employer: 'Memphis Current',
  tier: 'elite', hourlyPay: 50.48, skill: 'fitness', required: 70,
  city: 'memphis', district: 'downtown',
  description: 'Franchise face of Memphis Current (River Valley Soccer League): marquee role, media duties, and league attention.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASEBALL_ROOKIE: JobListing = {
  id: 'sport_baseball_rookie', title: 'Rookie Player', employer: 'Memphis Rails',
  tier: 'skilled', hourlyPay: 21.15, skill: 'fitness', required: 20,
  city: 'memphis', district: 'downtown',
  description: 'First-year pro on the Memphis Rails (Delta Diamond League): bench role, training, and development work.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASEBALL_ROTATION: JobListing = {
  id: 'sport_baseball_rotation', title: 'Rotation Player', employer: 'Memphis Rails',
  tier: 'skilled', hourlyPay: 26.92, skill: 'fitness', required: 35,
  city: 'memphis', district: 'downtown',
  description: 'Regular games in the Memphis Rails (Delta Diamond League) rotation.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASEBALL_STARTER: JobListing = {
  id: 'sport_baseball_starter', title: 'Starter', employer: 'Memphis Rails',
  tier: 'career', hourlyPay: 37.5, skill: 'fitness', required: 55,
  city: 'memphis', district: 'downtown',
  description: 'Starting lineup for the Memphis Rails (Delta Diamond League).',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};
const SPORTS_GAP_BASEBALL_STAR: JobListing = {
  id: 'sport_baseball_star', title: 'Star Player', employer: 'Memphis Rails',
  tier: 'elite', hourlyPay: 52.88, skill: 'fitness', required: 70,
  city: 'memphis', district: 'downtown',
  description: 'Franchise face of the Memphis Rails (Delta Diamond League): marquee role, media duties, and league attention.',
  category: 'career', requirements: [], benefits: ['Team training', 'Health insurance'],
};

/** Every sports gap-fill listing, in track order. */
export const SPORTS_GAP_FILL_JOBS: JobListing[] = [
  SPORTS_GAP_BASKETBALL_ROOKIE, SPORTS_GAP_BASKETBALL_ROTATION,
  SPORTS_GAP_BASKETBALL_STARTER, SPORTS_GAP_BASKETBALL_STAR,
  SPORTS_GAP_FOOTBALL_ROOKIE, SPORTS_GAP_FOOTBALL_ROTATION,
  SPORTS_GAP_FOOTBALL_STARTER, SPORTS_GAP_FOOTBALL_STAR,
  SPORTS_GAP_SOCCER_ROOKIE, SPORTS_GAP_SOCCER_ROTATION,
  SPORTS_GAP_SOCCER_STARTER, SPORTS_GAP_SOCCER_STAR,
  SPORTS_GAP_BASEBALL_ROOKIE, SPORTS_GAP_BASEBALL_ROTATION,
  SPORTS_GAP_BASEBALL_STARTER, SPORTS_GAP_BASEBALL_STAR,
];

// Rank gates: football is the most physical (highest floors), baseball
// the lowest; basketball and soccer sit between. Star ranks add a
// charisma floor (media/leadership presence) on top of fitness.
// Terms: 12 months for rookie/rotation, 24 for starter, 36 for star.
// Renewal thresholds rise with rank; the performance bonus is 10% of
// annual salary at a season score of 85+ on every rank.
export const SPORTS_TRACKS: SportsTrack[] = [
  {
    id: 'basketball', sport: 'Basketball', league: 'Mid-South Basketball League',
    homeTeamId: 'memphis_bolts_basketball', minFitnessLevel: 3, minFitnessStat: 60,
    ranks: [
      { id: 'rookie', title: 'Rookie Player', jobId: 'sport_basketball_rookie', gapFillJob: SPORTS_GAP_BASKETBALL_ROOKIE, minFitnessLevel: 3, minFitnessStat: 60, minCharismaLevel: null, annualSalaryDollars: 48000, termMonths: 12, renewalScoreThreshold: 40, performanceBonusPct: 0.10 },
      { id: 'rotation', title: 'Rotation Player', jobId: 'sport_basketball_rotation', gapFillJob: SPORTS_GAP_BASKETBALL_ROTATION, minFitnessLevel: 4, minFitnessStat: 65, minCharismaLevel: null, annualSalaryDollars: 62000, termMonths: 12, renewalScoreThreshold: 50, performanceBonusPct: 0.10 },
      { id: 'starter', title: 'Starter', jobId: 'sport_basketball_starter', gapFillJob: SPORTS_GAP_BASKETBALL_STARTER, minFitnessLevel: 5, minFitnessStat: 70, minCharismaLevel: null, annualSalaryDollars: 85000, termMonths: 24, renewalScoreThreshold: 60, performanceBonusPct: 0.10 },
      { id: 'star', title: 'Star Player', jobId: 'sport_basketball_star', gapFillJob: SPORTS_GAP_BASKETBALL_STAR, minFitnessLevel: 7, minFitnessStat: 80, minCharismaLevel: 3, annualSalaryDollars: 120000, termMonths: 36, renewalScoreThreshold: 70, performanceBonusPct: 0.10 },
    ],
  },
  {
    id: 'football', sport: 'Football', league: 'Delta Gridiron League',
    homeTeamId: 'memphis_forge_football', minFitnessLevel: 4, minFitnessStat: 65,
    ranks: [
      { id: 'rookie', title: 'Rookie Player', jobId: 'sport_football_rookie', gapFillJob: SPORTS_GAP_FOOTBALL_ROOKIE, minFitnessLevel: 4, minFitnessStat: 65, minCharismaLevel: null, annualSalaryDollars: 45000, termMonths: 12, renewalScoreThreshold: 40, performanceBonusPct: 0.10 },
      { id: 'rotation', title: 'Rotation Player', jobId: 'sport_football_rotation', gapFillJob: SPORTS_GAP_FOOTBALL_ROTATION, minFitnessLevel: 5, minFitnessStat: 70, minCharismaLevel: null, annualSalaryDollars: 58000, termMonths: 12, renewalScoreThreshold: 50, performanceBonusPct: 0.10 },
      { id: 'starter', title: 'Starter', jobId: 'sport_football_starter', gapFillJob: SPORTS_GAP_FOOTBALL_STARTER, minFitnessLevel: 6, minFitnessStat: 80, minCharismaLevel: null, annualSalaryDollars: 80000, termMonths: 24, renewalScoreThreshold: 60, performanceBonusPct: 0.10 },
      { id: 'star', title: 'Star Player', jobId: 'sport_football_star', gapFillJob: SPORTS_GAP_FOOTBALL_STAR, minFitnessLevel: 8, minFitnessStat: 90, minCharismaLevel: 3, annualSalaryDollars: 115000, termMonths: 36, renewalScoreThreshold: 70, performanceBonusPct: 0.10 },
    ],
  },
  {
    id: 'soccer', sport: 'Soccer', league: 'River Valley Soccer League',
    homeTeamId: 'memphis_current_soccer', minFitnessLevel: 3, minFitnessStat: 60,
    ranks: [
      { id: 'rookie', title: 'Rookie Player', jobId: 'sport_soccer_rookie', gapFillJob: SPORTS_GAP_SOCCER_ROOKIE, minFitnessLevel: 3, minFitnessStat: 60, minCharismaLevel: null, annualSalaryDollars: 42000, termMonths: 12, renewalScoreThreshold: 40, performanceBonusPct: 0.10 },
      { id: 'rotation', title: 'Rotation Player', jobId: 'sport_soccer_rotation', gapFillJob: SPORTS_GAP_SOCCER_ROTATION, minFitnessLevel: 4, minFitnessStat: 65, minCharismaLevel: null, annualSalaryDollars: 54000, termMonths: 12, renewalScoreThreshold: 50, performanceBonusPct: 0.10 },
      { id: 'starter', title: 'Starter', jobId: 'sport_soccer_starter', gapFillJob: SPORTS_GAP_SOCCER_STARTER, minFitnessLevel: 5, minFitnessStat: 70, minCharismaLevel: null, annualSalaryDollars: 75000, termMonths: 24, renewalScoreThreshold: 60, performanceBonusPct: 0.10 },
      { id: 'star', title: 'Star Player', jobId: 'sport_soccer_star', gapFillJob: SPORTS_GAP_SOCCER_STAR, minFitnessLevel: 7, minFitnessStat: 80, minCharismaLevel: 3, annualSalaryDollars: 105000, termMonths: 36, renewalScoreThreshold: 70, performanceBonusPct: 0.10 },
    ],
  },
  {
    id: 'baseball', sport: 'Baseball', league: 'Delta Diamond League',
    homeTeamId: 'memphis_rails_baseball', minFitnessLevel: 2, minFitnessStat: 55,
    ranks: [
      { id: 'rookie', title: 'Rookie Player', jobId: 'sport_baseball_rookie', gapFillJob: SPORTS_GAP_BASEBALL_ROOKIE, minFitnessLevel: 2, minFitnessStat: 55, minCharismaLevel: null, annualSalaryDollars: 44000, termMonths: 12, renewalScoreThreshold: 40, performanceBonusPct: 0.10 },
      { id: 'rotation', title: 'Rotation Player', jobId: 'sport_baseball_rotation', gapFillJob: SPORTS_GAP_BASEBALL_ROTATION, minFitnessLevel: 3, minFitnessStat: 60, minCharismaLevel: null, annualSalaryDollars: 56000, termMonths: 12, renewalScoreThreshold: 50, performanceBonusPct: 0.10 },
      { id: 'starter', title: 'Starter', jobId: 'sport_baseball_starter', gapFillJob: SPORTS_GAP_BASEBALL_STARTER, minFitnessLevel: 5, minFitnessStat: 70, minCharismaLevel: null, annualSalaryDollars: 78000, termMonths: 24, renewalScoreThreshold: 60, performanceBonusPct: 0.10 },
      { id: 'star', title: 'Star Player', jobId: 'sport_baseball_star', gapFillJob: SPORTS_GAP_BASEBALL_STAR, minFitnessLevel: 7, minFitnessStat: 80, minCharismaLevel: 3, annualSalaryDollars: 110000, termMonths: 36, renewalScoreThreshold: 70, performanceBonusPct: 0.10 },
    ],
  },
];

function sportsTrackFor(track: string): SportsTrack | null {
  return SPORTS_TRACKS.find((t) => t.id === track) ?? null;
}

function sportsRankMissing(player: PlayerLike, rank: SportsRank): string[] {
  const missing: string[] = [];
  const fitnessLevel = skillLevelFor(player, 'fitness');
  if (fitnessLevel < rank.minFitnessLevel) {
    missing.push(`fitness level ${rank.minFitnessLevel} required (have ${fitnessLevel})`);
  }
  const stat = flatFitnessFor(player);
  if (stat !== null && stat < rank.minFitnessStat) {
    missing.push(`fitness ${rank.minFitnessStat} required (have ${stat})`);
  }
  if (rank.minCharismaLevel !== null) {
    const cha = skillLevelFor(player, 'charisma');
    if (cha < rank.minCharismaLevel) {
      missing.push(`charisma level ${rank.minCharismaLevel} required (have ${cha})`);
    }
  }
  return missing;
}

export interface EligibilityResult {
  eligible: boolean;
  missing: string[];
}

/**
 * Pro tryout eligibility for a sports track (`track` is the track id:
 * 'basketball' | 'football' | 'soccer' | 'baseball'). The tryout gate
 * is the track's rookie-rank gate (fitness skill level, plus the flat
 * fitness stat when the player carries one). No enrollment, GPA, or
 * certification is required for a pro tryout. Unknown track is
 * ineligible with a single "Unknown …" entry.
 */
export function tryoutEligibility(player: PlayerLike, track: string): EligibilityResult {
  const t = sportsTrackFor(track);
  if (!t) return { eligible: false, missing: [`Unknown sports track: ${String(track)}`] };
  const rookie = t.ranks[0]!;
  const missing = sportsRankMissing(player, rookie);
  return { eligible: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export interface SeasonPerformance {
  /** Season performance score, 0–100. */
  score: number;
  rating: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export function seasonRating(score: number): string {
  if (score >= 85) return 'Star';
  if (score >= 70) return 'Starter-quality';
  if (score >= 50) return 'Rotation';
  if (score >= 30) return 'Developing';
  return 'Prospect';
}

/**
 * Season performance from skills/fitness only — no randomness, no
 * track input (the score is track-agnostic by design; the track gates
 * who gets in, the score measures how they played).
 * With a flat fitness stat: score = fitnessLevel × 7 + flatFitness ×
 * 0.35 (level 5 + stat 80 -> 63). Without one: score = fitnessLevel ×
 * 10 + 10 (level 5 -> 60), so a bare fixture lands on the same curve.
 * Clamped to 0–100. Wins are deterministic from the score:
 * wins = floor(gamesPlayed × score / 100); losses = games − wins.
 * gamesPlayed is floored to a non-negative integer.
 */
export function seasonPerformance(player: PlayerLike, gamesPlayed: number): SeasonPerformance {
  const level = skillLevelFor(player, 'fitness');
  const stat = flatFitnessFor(player);
  const score = stat !== null
    ? clampScore(level * 7 + stat * 0.35)
    : clampScore(level * 10 + 10);
  const games = Math.max(0, Math.floor(gamesPlayed));
  const wins = Math.floor((games * score) / 100);
  return { score, rating: seasonRating(score), gamesPlayed: games, wins, losses: games - wins };
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export interface ContractOffer {
  track: string;
  league: string;
  rankId: string;
  rankTitle: string;
  jobId: string;
  annualSalaryDollars: number;
  monthlySalaryDollars: number;
  termMonths: number;
  renewalScoreThreshold: number;
  performanceBonusDollars: number;
  /** Human-readable renewal clause (threshold is a seasonPerformance score). */
  renewalClause: string;
  /** Human-readable performance clause (bonus at score >= 85). */
  performanceClause: string;
}

function buildContractOffer(track: SportsTrack, rank: SportsRank): ContractOffer {
  return {
    track: track.id,
    league: track.league,
    rankId: rank.id,
    rankTitle: rank.title,
    jobId: rank.jobId,
    annualSalaryDollars: rank.annualSalaryDollars,
    monthlySalaryDollars: roundCents(rank.annualSalaryDollars / 12),
    termMonths: rank.termMonths,
    renewalScoreThreshold: rank.renewalScoreThreshold,
    performanceBonusDollars: roundCents(rank.annualSalaryDollars * rank.performanceBonusPct),
    renewalClause: `Renewable if the season performance score is ${rank.renewalScoreThreshold} or higher.`,
    performanceClause: `A bonus of $${roundCents(rank.annualSalaryDollars * rank.performanceBonusPct).toLocaleString('en-US')} (10% of annual salary) is paid if the season performance score is 85 or higher.`,
  };
}

/**
 * Pure contract lookup: the offer for `rankId` on sports track `track`
 * (track id, rank id — e.g. contractOffer('basketball', 'starter')).
 * Returns null for an unknown track or rank. Player-independent: it
 * does not check eligibility — use contractFor() for that.
 */
export function contractOffer(track: string, rankId: string): ContractOffer | null {
  const t = sportsTrackFor(track);
  if (!t) return null;
  const rank = t.ranks.find((r) => r.id === rankId);
  if (!rank) return null;
  return buildContractOffer(t, rank);
}

export interface ContractResult extends EligibilityResult {
  offer: ContractOffer | null;
}

/**
 * Player-aware contract: the offer for `rankId` on sports track `track`
 * plus whether this player meets that rank's gates. Unknown track/rank
 * yields offer null and a single "Unknown …" missing entry.
 */
export function contractFor(player: PlayerLike, track: string, rankId: string): ContractResult {
  const t = sportsTrackFor(track);
  if (!t) return { eligible: false, missing: [`Unknown sports track: ${String(track)}`], offer: null };
  const rank = t.ranks.find((r) => r.id === rankId);
  if (!rank) return { eligible: false, missing: [`Unknown rank: ${String(rankId)}`], offer: null };
  const missing = sportsRankMissing(player, rank);
  return { eligible: missing.length === 0, missing, offer: buildContractOffer(t, rank) };
}

// ---------------------------------------------------------------------------
// COLLEGE ATHLETE CROSSOVER
// ---------------------------------------------------------------------------

export const COLLEGE_ATHLETE_MIN_GPA = 2.0;

/**
 * College-team tryout: the pro tryout gates for `track` PLUS enrolled
 * status and the GPA floor. Below 2.0 blocks, mirroring the engine's
 * GPA probation rule — enforced on BOTH the probation record (lastGPA
 * below 2.0 blocks even if a current enrollment GPA reads higher) and
 * the effective GPA (gpa / enrolledCourse.gpa / lastGPA / 2.5).
 * Not enrolled at all is its own missing entry. Unknown track is
 * ineligible with a single "Unknown …" entry (plus enrollment/GPA
 * entries are not stacked onto an unknown track).
 */
export function collegeTryoutEligibility(player: PlayerLike, track: string): EligibilityResult {
  const t = sportsTrackFor(track);
  if (!t) return { eligible: false, missing: [`Unknown sports track: ${String(track)}`] };
  const missing: string[] = [];
  if (!player.enrolledCourse) {
    missing.push('Not enrolled in a course (college team tryouts require current enrollment)');
  }
  if (typeof player.lastGPA === 'number' && player.lastGPA < COLLEGE_ATHLETE_MIN_GPA) {
    missing.push(`GPA probation: last GPA ${player.lastGPA} is below 2.0`);
  }
  const gpa = gpaFor(player);
  if (gpa < COLLEGE_ATHLETE_MIN_GPA) {
    missing.push(`GPA 2.0 required (have ${gpa})`);
  }
  missing.push(...sportsRankMissing(player, t.ranks[0]!));
  return { eligible: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// COLLEGE CAREERS — academic + campus tracks
// ---------------------------------------------------------------------------

export type CollegeTrackKind = 'academic' | 'campus';

export interface CollegeRungRequirements {
  /** A SCHOOLS rewardCertification, or null when no cert gates the rung. */
  cert: string | null;
  /** Skill whose level gates the rung (always checked). */
  skill: string;
  minSkillLevel: number;
  /** GPA bar, or null when GPA does not gate the rung (cf. .20 §42: elite rungs 3.0). */
  minGPA: number | null;
  /** True when the rung requires a live enrollment (any school/course). */
  requiresEnrollment: boolean;
  /** When set, enrollment must be at this school id (school-engine.ts). */
  enrolledSchoolId: string | null;
}

export interface CollegeRung {
  id: string;
  title: string;
  /** Gap-fill JobListing id for this rung (no real college listing exists). */
  jobId: string;
  gapFillJob: JobListing;
  requirements: CollegeRungRequirements;
}

export interface CollegeCareerTrack {
  id: string;
  title: string;
  kind: CollegeTrackKind;
  /** Employer = the school from school-engine.ts; city/district are that school's. */
  schoolId: string;
  employer: string;
  city: string;
  district: string;
  rungs: CollegeRung[];
}

// Gap-fill listings. Employers, cities, and districts are copied exactly
// from school-engine.ts (Little Rock CC: littlerock/river_market;
// Maestro College: memphis/downtown; Southaven CC:
// southaven/goodman_road; Memphis Medical Academy: memphis/midtown).
// Category mirrors tier (the .20 §42 gap convention); `required` is
// the database's 10–90 scale, rising with rung.
const COLLEGE_GAP_TUTOR: JobListing = {
  id: 'college_tutor', title: 'Campus Tutor', employer: 'Little Rock Community College',
  tier: 'entry', hourlyPay: 16, skill: 'charisma', required: 10,
  city: 'littlerock', district: 'river_market',
  description: 'Tutor enrolled students in general studies at Little Rock Community College. Campus job for current students.',
  category: 'entry', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_SENIOR_TUTOR: JobListing = {
  id: 'college_senior_tutor', title: 'Senior Tutor', employer: 'Little Rock Community College',
  tier: 'skilled', hourlyPay: 20, skill: 'charisma', required: 20,
  city: 'littlerock', district: 'river_market',
  description: 'Lead tutoring sessions and mentor new tutors at Little Rock Community College.',
  category: 'skilled', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_TUTOR_COORDINATOR: JobListing = {
  id: 'college_tutor_coordinator', title: 'Tutoring Coordinator', employer: 'Little Rock Community College',
  tier: 'career', hourlyPay: 30, skill: 'charisma', required: 35,
  city: 'littlerock', district: 'river_market',
  description: 'Run the tutoring program at Little Rock Community College: scheduling, training, and student progress.',
  category: 'career', requirements: [], benefits: ['Full benefits'],
};
const COLLEGE_GAP_RESEARCH_ASSISTANT: JobListing = {
  id: 'college_research_assistant', title: 'Research Assistant', employer: 'Maestro College',
  tier: 'entry', hourlyPay: 17, skill: 'tech', required: 10,
  city: 'memphis', district: 'downtown',
  description: 'Assist faculty research at Maestro College: data gathering, cleanup, and lab support. Campus job for current Maestro students.',
  category: 'entry', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_RESEARCH_ASSOCIATE: JobListing = {
  id: 'college_research_associate', title: 'Research Associate', employer: 'Maestro College',
  tier: 'skilled', hourlyPay: 24, skill: 'tech', required: 30,
  city: 'memphis', district: 'downtown',
  description: 'Run research tasks independently at Maestro College: analysis, reporting, and experiment support.',
  category: 'skilled', requirements: [], benefits: ['Full benefits'],
};
const COLLEGE_GAP_RESEARCH_LEAD: JobListing = {
  id: 'college_research_lead', title: 'Research Lead', employer: 'Maestro College',
  tier: 'career', hourlyPay: 38, skill: 'tech', required: 50,
  city: 'memphis', district: 'downtown',
  description: 'Lead a research project at Maestro College: design, supervision, and publication support.',
  category: 'career', requirements: [], benefits: ['Full benefits'],
};
const COLLEGE_GAP_CAMPUS_GUIDE: JobListing = {
  id: 'college_campus_guide', title: 'Campus Guide', employer: 'Southaven Community College',
  tier: 'entry', hourlyPay: 14, skill: 'charisma', required: 10,
  city: 'southaven', district: 'goodman_road',
  description: 'Welcome visitors and new students at Southaven Community College: tours and campus directions. Campus job for current students.',
  category: 'entry', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_ACTIVITIES_ASSISTANT: JobListing = {
  id: 'college_activities_assistant', title: 'Student Activities Assistant', employer: 'Southaven Community College',
  tier: 'skilled', hourlyPay: 19, skill: 'charisma', required: 20,
  city: 'southaven', district: 'goodman_road',
  description: 'Help run student events and activities at Southaven Community College.',
  category: 'skilled', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_ACTIVITIES_COORDINATOR: JobListing = {
  id: 'college_activities_coordinator', title: 'Student Activities Coordinator', employer: 'Southaven Community College',
  tier: 'career', hourlyPay: 30, skill: 'charisma', required: 35,
  city: 'southaven', district: 'goodman_road',
  description: 'Run the student activities program at Southaven Community College: events calendar, clubs, and budgets.',
  category: 'career', requirements: [], benefits: ['Full benefits'],
};
const COLLEGE_GAP_WELLNESS_AIDE: JobListing = {
  id: 'college_wellness_aide', title: 'Campus Wellness Aide', employer: 'Memphis Medical Academy',
  tier: 'entry', hourlyPay: 15, skill: 'charisma', required: 10,
  city: 'memphis', district: 'midtown',
  description: 'Support campus wellness outreach at Memphis Medical Academy: screening events and health information. Campus job for current academy students.',
  category: 'entry', requirements: [], benefits: ['Flexible hours'],
};
const COLLEGE_GAP_WELLNESS_ASSISTANT: JobListing = {
  id: 'college_wellness_assistant', title: 'Campus Wellness Assistant', employer: 'Memphis Medical Academy',
  tier: 'skilled', hourlyPay: 22, skill: 'charisma', required: 25,
  city: 'memphis', district: 'midtown',
  description: 'Run wellness clinics and outreach shifts at Memphis Medical Academy.',
  category: 'skilled', requirements: [], benefits: ['Full benefits'],
};
const COLLEGE_GAP_WELLNESS_COORDINATOR: JobListing = {
  id: 'college_wellness_coordinator', title: 'Campus Wellness Coordinator', employer: 'Memphis Medical Academy',
  tier: 'career', hourlyPay: 32, skill: 'charisma', required: 40,
  city: 'memphis', district: 'midtown',
  description: 'Run the campus wellness program at Memphis Medical Academy: clinics, outreach, and student health support.',
  category: 'career', requirements: [], benefits: ['Full benefits'],
};

/** Every college gap-fill listing, in track order. */
export const COLLEGE_GAP_FILL_JOBS: JobListing[] = [
  COLLEGE_GAP_TUTOR, COLLEGE_GAP_SENIOR_TUTOR, COLLEGE_GAP_TUTOR_COORDINATOR,
  COLLEGE_GAP_RESEARCH_ASSISTANT, COLLEGE_GAP_RESEARCH_ASSOCIATE, COLLEGE_GAP_RESEARCH_LEAD,
  COLLEGE_GAP_CAMPUS_GUIDE, COLLEGE_GAP_ACTIVITIES_ASSISTANT, COLLEGE_GAP_ACTIVITIES_COORDINATOR,
  COLLEGE_GAP_WELLNESS_AIDE, COLLEGE_GAP_WELLNESS_ASSISTANT, COLLEGE_GAP_WELLNESS_COORDINATOR,
];

// Cert audit (all SCHOOLS rewardCertifications, school-engine.ts):
// - ASSOC_GENERAL: Little Rock CC, General Studies.
// - AI_BASICS: Maestro College, AI Foundations.
// - AI_SOFTWARE_ENG_DEGREE: Maestro College, AAS in AI Software Engineering.
// - ASSOC_HOSPITALITY: Southaven CC, Hospitality Foundations.
// - CHW_CERT: Memphis Medical Academy, Community Health Worker.
// Entry rungs require enrollment only (no cert, no GPA bar) so a new
// student can start; terminal rungs carry the .20 elite GPA bar (3.0).
export const COLLEGE_CAREER_TRACKS: CollegeCareerTrack[] = [
  {
    id: 'tutoring', title: 'Tutoring', kind: 'academic',
    schoolId: 'little_rock_cc', employer: 'Little Rock Community College',
    city: 'littlerock', district: 'river_market',
    rungs: [
      { id: 'tutor', title: 'Campus Tutor', jobId: 'college_tutor', gapFillJob: COLLEGE_GAP_TUTOR,
        requirements: { cert: null, skill: 'charisma', minSkillLevel: 1, minGPA: null, requiresEnrollment: true, enrolledSchoolId: null } },
      { id: 'senior_tutor', title: 'Senior Tutor', jobId: 'college_senior_tutor', gapFillJob: COLLEGE_GAP_SENIOR_TUTOR,
        requirements: { cert: 'ASSOC_GENERAL', skill: 'charisma', minSkillLevel: 2, minGPA: null, requiresEnrollment: false, enrolledSchoolId: null } },
      { id: 'tutoring_coordinator', title: 'Tutoring Coordinator', jobId: 'college_tutor_coordinator', gapFillJob: COLLEGE_GAP_TUTOR_COORDINATOR,
        requirements: { cert: 'ASSOC_GENERAL', skill: 'charisma', minSkillLevel: 4, minGPA: 3.0, requiresEnrollment: false, enrolledSchoolId: null } },
    ],
  },
  {
    id: 'research', title: 'Research', kind: 'academic',
    schoolId: 'maestro_college', employer: 'Maestro College',
    city: 'memphis', district: 'downtown',
    rungs: [
      { id: 'research_assistant', title: 'Research Assistant', jobId: 'college_research_assistant', gapFillJob: COLLEGE_GAP_RESEARCH_ASSISTANT,
        requirements: { cert: null, skill: 'tech', minSkillLevel: 1, minGPA: null, requiresEnrollment: true, enrolledSchoolId: 'maestro_college' } },
      { id: 'research_associate', title: 'Research Associate', jobId: 'college_research_associate', gapFillJob: COLLEGE_GAP_RESEARCH_ASSOCIATE,
        requirements: { cert: 'AI_BASICS', skill: 'tech', minSkillLevel: 3, minGPA: null, requiresEnrollment: false, enrolledSchoolId: null } },
      { id: 'research_lead', title: 'Research Lead', jobId: 'college_research_lead', gapFillJob: COLLEGE_GAP_RESEARCH_LEAD,
        requirements: { cert: 'AI_SOFTWARE_ENG_DEGREE', skill: 'tech', minSkillLevel: 5, minGPA: 3.0, requiresEnrollment: false, enrolledSchoolId: null } },
    ],
  },
  {
    id: 'student_activities', title: 'Student Activities', kind: 'campus',
    schoolId: 'southaven_cc', employer: 'Southaven Community College',
    city: 'southaven', district: 'goodman_road',
    rungs: [
      { id: 'campus_guide', title: 'Campus Guide', jobId: 'college_campus_guide', gapFillJob: COLLEGE_GAP_CAMPUS_GUIDE,
        requirements: { cert: null, skill: 'charisma', minSkillLevel: 1, minGPA: null, requiresEnrollment: true, enrolledSchoolId: null } },
      { id: 'activities_assistant', title: 'Student Activities Assistant', jobId: 'college_activities_assistant', gapFillJob: COLLEGE_GAP_ACTIVITIES_ASSISTANT,
        requirements: { cert: 'ASSOC_HOSPITALITY', skill: 'charisma', minSkillLevel: 2, minGPA: null, requiresEnrollment: false, enrolledSchoolId: null } },
      { id: 'activities_coordinator', title: 'Student Activities Coordinator', jobId: 'college_activities_coordinator', gapFillJob: COLLEGE_GAP_ACTIVITIES_COORDINATOR,
        requirements: { cert: 'ASSOC_HOSPITALITY', skill: 'charisma', minSkillLevel: 4, minGPA: 3.0, requiresEnrollment: false, enrolledSchoolId: null } },
    ],
  },
  {
    id: 'campus_wellness', title: 'Campus Wellness', kind: 'campus',
    schoolId: 'memphis_medical_academy', employer: 'Memphis Medical Academy',
    city: 'memphis', district: 'midtown',
    rungs: [
      { id: 'wellness_aide', title: 'Campus Wellness Aide', jobId: 'college_wellness_aide', gapFillJob: COLLEGE_GAP_WELLNESS_AIDE,
        requirements: { cert: null, skill: 'charisma', minSkillLevel: 1, minGPA: null, requiresEnrollment: true, enrolledSchoolId: 'memphis_medical_academy' } },
      { id: 'wellness_assistant', title: 'Campus Wellness Assistant', jobId: 'college_wellness_assistant', gapFillJob: COLLEGE_GAP_WELLNESS_ASSISTANT,
        requirements: { cert: 'CHW_CERT', skill: 'charisma', minSkillLevel: 2, minGPA: null, requiresEnrollment: false, enrolledSchoolId: null } },
      { id: 'wellness_coordinator', title: 'Campus Wellness Coordinator', jobId: 'college_wellness_coordinator', gapFillJob: COLLEGE_GAP_WELLNESS_COORDINATOR,
        requirements: { cert: 'CHW_CERT', skill: 'charisma', minSkillLevel: 4, minGPA: 3.0, requiresEnrollment: false, enrolledSchoolId: null } },
    ],
  },
];

function collegeTrackFor(trackId: string): CollegeCareerTrack | null {
  return COLLEGE_CAREER_TRACKS.find((t) => t.id === trackId) ?? null;
}

function collegeRungMissing(player: PlayerLike, rung: CollegeRung): string[] {
  const req = rung.requirements;
  const missing: string[] = [];
  if (req.requiresEnrollment && !player.enrolledCourse) {
    missing.push(`Requires current enrollment (not enrolled in a course)`);
  }
  if (req.enrolledSchoolId !== null) {
    if (!player.enrolledCourse) {
      missing.push(`Requires enrollment at ${req.enrolledSchoolId} (not enrolled in a course)`);
    } else if (player.enrolledCourse.schoolId !== req.enrolledSchoolId) {
      missing.push(`Requires enrollment at ${req.enrolledSchoolId} (enrolled at ${player.enrolledCourse.schoolId ?? 'unknown school'})`);
    }
  }
  if (req.cert !== null && !certificationsFor(player).includes(req.cert)) {
    missing.push(`Missing certification: ${req.cert}`);
  }
  const level = skillLevelFor(player, req.skill);
  if (level < req.minSkillLevel) {
    missing.push(`${req.skill} level ${req.minSkillLevel} required (have ${level})`);
  }
  if (req.minGPA !== null) {
    const gpa = gpaFor(player);
    if (gpa < req.minGPA) {
      missing.push(`GPA ${req.minGPA.toFixed(1)} required (have ${gpa})`);
    }
  }
  return missing;
}

/**
 * College-track entry eligibility: can this player START track
 * `trackId`? Answers the track's first rung only — `missing` lists
 * every failed entry-rung check in order (enrollment, school, cert,
 * skill, GPA), and is empty exactly when `eligible` is true. Unknown
 * track is ineligible with a single "Unknown …" entry. Advancement
 * past the entry rung is rung-by-rung via collegeTrackProgress():
 * entry eligibility is not a promotion check, and a graduate who
 * holds a later rung's cert but is no longer enrolled will read as
 * entry-ineligible — that is the start-a-track semantics, not a bug
 * (mirroring the sibling module's appointment-vs-holding distinction).
 */
export function collegeCareerEligibility(player: PlayerLike, trackId: string): EligibilityResult {
  const track = collegeTrackFor(trackId);
  if (!track) return { eligible: false, missing: [`Unknown college track: ${String(trackId)}`] };
  const entry = track.rungs[0]!;
  const missing = collegeRungMissing(player, entry);
  return { eligible: missing.length === 0, missing };
}

export interface CollegeRungProgress {
  rungId: string;
  title: string;
  jobId: string;
  eligible: boolean;
  missing: string[];
}

/**
 * Per-rung eligibility for every rung of track `trackId`
 * (empty array for an unknown track), for advancement checks and
 * display. Each entry is that rung's own requirements only — rungs do
 * not inherit earlier rungs' gates.
 */
export function collegeTrackProgress(player: PlayerLike, trackId: string): CollegeRungProgress[] {
  const track = collegeTrackFor(trackId);
  if (!track) return [];
  return track.rungs.map((rung) => {
    const missing = collegeRungMissing(player, rung);
    return { rungId: rung.id, title: rung.title, jobId: rung.jobId, eligible: missing.length === 0, missing };
  });
}

/** Every gap-fill listing defined in this module (sports + college), in table order. */
export const GAP_FILL_JOBS: JobListing[] = [...SPORTS_GAP_FILL_JOBS, ...COLLEGE_GAP_FILL_JOBS];
