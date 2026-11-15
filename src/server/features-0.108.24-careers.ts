// THE OPEN WORLD — v0.108.24 POLICE / FIRE / EMS CAREER LADDERS
// Pure-logic module only. It is NOT wired into the engine (no other file
// is touched by this change): it defines the ladders, answers eligibility
// questions about a player-like object, and supplies gap-fill JobListings
// for rungs that have no real listing in jobs-database.ts.
//
// Conventions, following features-0.108.20.ts §42 and the engine:
// - TypeScript ESM; the one import is type-only, with a .js suffix.
// - No new dependencies, no randomness, no Date, no I/O. Every function
//   is deterministic: same inputs always give the same outputs.
// - Money is in whole cents: every hourlyPay below has at most two
//   decimal places, and every payMultiplier x ladder base rate lands on
//   a whole-cent value (see the anchoring note on each ladder).
// - A "certification" here is ONLY a SCHOOLS rewardCertification from
//   school-engine.ts, exactly as in .20 §42. Free-text listing text such
//   as "Police academy" or "Fire academy" is never encoded as a cert:
//   no course grants it, so encoding it would make the rung
//   unachievable. Police/Fire rungs are therefore gated on skill,
//   shifts/tenure, and (terminal rung only) GPA — not on a cert.
// - "Shifts" means shifts at the CURRENT job (jobTenure), with the
//   engine's legacy fallback to lifetime shifts (workDaysCompleted)
//   when no current-job tenure is recorded. See tenureFor().
// - GPA follows .20 careerGPA(): enrolled-course GPA, else last
//   graduation GPA, else 2.5 for a save with no GPA history (neutral
//   and below the 3.0 bar). A direct `gpa` field on the player-like
//   object is read first, since some callers carry GPA flat.
// - Skill levels are the engine's skill LEVEL scale (fresh skill = 1,
//   promotion gate in the engine = 3), NOT the jobs-database `required`
//   field (a 10–90 listing threshold). The two scales are never mixed:
//   ladder gates use minSkillLevel; gap-fill listings carry a `required`
//   value on the database's own scale for display/apply parity only.
// - isEligibleForRank() answers "does this player meet the appointment
//   requirements for this rank?", NOT "does this player currently hold
//   this rank?". rankFor() answers the holding question, from job id.
//   A player who already holds a rank may therefore read as ineligible
//   for it after tenure resets on hire (applyForJob sets jobTenure = 0):
//   that is the promotion-gate semantics, not a bug.
// - Pay multipliers are factors over the LADDER'S ENTRY-RUNG base rate
//   (ladderPayMultiplier), not ratios of real listing rates. Real rungs
//   keep their database hourlyPay; gap-fill hourlyPays are set to
//   base x multiplier so gap rungs are internally consistent with the
//   multiplier. Where a real rate and base x multiplier coincide
//   (Officer, Firefighter, Paramedic — see below) that is by anchoring
//   the base rate to the real rate, and it is called out per ladder.

import type { JobListing } from './jobs-database.js';

export type EmergencyTrack = 'police' | 'fire' | 'ems';
export type EmergencySkill = 'fitness' | 'charisma';
export type EmergencyShiftKey = 'morning' | 'evening' | 'night';

// A player-like object: only the fields eligibility reads. Every field
// is optional so old saves and partial test fixtures both work.
// - job: the current job record (engine spreads a JobListing into it, so
//   it carries `id`); a bare id string, or a record with only `title`,
//   is also accepted. Promoted titles ("Senior …", "Lead …",
//   "Principal …" — see the engine's promote()) are stripped before
//   title matching, since promotion changes title but never id.
// - skills: engine shape ({ level, xp }) OR flat numbers (the shared
//   PlayerSkills shape). A missing skill reads as level 1, the engine's
//   default in career().
// - shifts/tenure: jobTenure first (current job), then shiftsAtJob /
//   tenure / shifts, then lifetime workDaysCompleted / shiftsWorked.
// - GPA: gpa, then enrolledCourse.gpa, then lastGPA, then 2.5.
export interface EmergencyPlayerLike {
  job?: { id?: string; jobId?: string; title?: string } | string | null;
  certifications?: string[];
  certs?: string[];
  skills?: Record<string, number | { level?: number; value?: number } | null | undefined>;
  jobTenure?: number;
  shiftsAtJob?: number;
  tenure?: number;
  shifts?: number;
  workDaysCompleted?: number;
  shiftsWorked?: number;
  gpa?: number;
  lastGPA?: number;
  enrolledCourse?: { gpa?: number };
}

export interface RankRequirements {
  /** A SCHOOLS rewardCertification, or null when no cert gates the rank. */
  certification: string | null;
  skill: EmergencySkill;
  minSkillLevel: number;
  /** Shifts at the current job (see tenureFor); 0 for entry rungs. */
  minShifts: number;
  /** GPA bar, or null when GPA does not gate the rank. */
  minGPA: number | null;
}

export interface EmergencyRank {
  id: string;
  title: string;
  /** Real jobs-database id, or the gap-fill id for a rung with no listing. */
  jobId: string;
  /**
   * The gap-fill JobListing for this rung, when the rung has no real
   * listing. Undefined for real rungs — their listing already exists in
   * jobs-database.ts and is never duplicated here.
   */
  gapFillJob?: JobListing;
  requirements: RankRequirements;
  /** Factor over the ladder's entry-rung base rate (see header). */
  payMultiplier: number;
  /** Shift keys from the .20 SHIFTS set (morning/evening/night). */
  shifts: EmergencyShiftKey[];
}

export interface EmergencyLadder {
  track: EmergencyTrack;
  title: string;
  /** Entry-rung base hourly rate in dollars (whole cents). */
  baseHourlyPay: number;
  ranks: EmergencyRank[];
}

// ---------------------------------------------------------------------------
// Gap-fill JobListings (v0.108.24 §1)
// ---------------------------------------------------------------------------
// Same approach as the .20 §42 ladder gaps: a REAL city/district only,
// a REAL employer already in jobs-database.ts, category 'emergency'.
// requirements is [] on every gap rung, deliberately: the engine's
// requirementDecision() fails CLOSED on unevaluable credential text
// ("Police academy", "Fire academy", "21+ years old"), so copying the
// real listings' free-text requirements onto gap rungs would make them
// unhirable. The ladder requirements (cert/skill/shifts/GPA) are the
// gate for these rungs, not listing text. `required` is on the
// database's own 10–90 listing scale, increasing with seniority, and is
// unrelated to the ladder's minSkillLevel (see header).

const MEM_POLICE_CADET: JobListing = {
  id: 'mem_police_cadet',
  title: 'Police Cadet',
  employer: 'Memphis Police Department',
  tier: 'entry',
  hourlyPay: 25.6,
  skill: 'fitness',
  required: 40,
  city: 'memphis',
  district: 'downtown',
  description: 'Train at the academy and ride along with patrol officers. Classroom and field training before solo patrol.',
  category: 'emergency',
  requirements: [],
  benefits: ['Health insurance'],
};

const MEM_POLICE_SERGEANT: JobListing = {
  id: 'mem_police_sergeant',
  title: 'Police Sergeant',
  employer: 'Memphis Police Department',
  tier: 'career',
  hourlyPay: 38.4,
  skill: 'fitness',
  required: 55,
  city: 'memphis',
  district: 'downtown',
  description: 'Lead a patrol squad: supervise officers, review reports, and run the shift.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Health insurance', 'Take-home vehicle'],
};

const MEM_POLICE_LIEUTENANT: JobListing = {
  id: 'mem_police_lieutenant',
  title: 'Police Lieutenant',
  employer: 'Memphis Police Department',
  tier: 'career',
  hourlyPay: 44.8,
  skill: 'charisma',
  required: 60,
  city: 'memphis',
  district: 'downtown',
  description: 'Command a shift or unit: staffing, operations, and community relations.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Health insurance', 'Take-home vehicle'],
};

const MEM_POLICE_CAPTAIN: JobListing = {
  id: 'mem_police_captain',
  title: 'Police Captain',
  employer: 'Memphis Police Department',
  tier: 'elite',
  hourlyPay: 51.2,
  skill: 'charisma',
  required: 65,
  city: 'memphis',
  district: 'downtown',
  description: 'Command a precinct or division: budgets, policy, and command staff.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Health insurance', 'Take-home vehicle'],
};

const MEM_POLICE_CHIEF: JobListing = {
  id: 'mem_police_chief',
  title: 'Police Chief',
  employer: 'Memphis Police Department',
  tier: 'elite',
  hourlyPay: 64,
  skill: 'charisma',
  required: 75,
  city: 'memphis',
  district: 'downtown',
  description: 'Lead the whole department: strategy, budget, and public accountability.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Health insurance', 'Take-home vehicle'],
};

const MEM_FIRE_PROBATIONARY: JobListing = {
  id: 'mem_fire_probationary',
  title: 'Probationary Firefighter',
  employer: 'Memphis Fire Department',
  tier: 'entry',
  hourlyPay: 22.4,
  skill: 'fitness',
  required: 35,
  city: 'memphis',
  district: 'downtown',
  description: 'Probation year at the firehouse: training, equipment, and supervised calls.',
  category: 'emergency',
  requirements: [],
  benefits: ['Full benefits'],
};

const MEM_FIRE_ENGINEER: JobListing = {
  id: 'mem_fire_engineer',
  title: 'Fire Engineer',
  employer: 'Memphis Fire Department',
  tier: 'career',
  hourlyPay: 33.6,
  skill: 'fitness',
  required: 50,
  city: 'memphis',
  district: 'downtown',
  description: 'Drive and operate the apparatus: pumps, ladders, and scene equipment.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Full benefits', 'Early retirement'],
};

const MEM_FIRE_LIEUTENANT: JobListing = {
  id: 'mem_fire_lieutenant',
  title: 'Fire Lieutenant',
  employer: 'Memphis Fire Department',
  tier: 'career',
  hourlyPay: 39.2,
  skill: 'charisma',
  required: 55,
  city: 'memphis',
  district: 'downtown',
  description: 'Lead a fire company on every call: crew safety, tactics, and reports.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Full benefits', 'Early retirement'],
};

const MEM_FIRE_CAPTAIN: JobListing = {
  id: 'mem_fire_captain',
  title: 'Fire Captain',
  employer: 'Memphis Fire Department',
  tier: 'elite',
  hourlyPay: 44.8,
  skill: 'charisma',
  required: 60,
  city: 'memphis',
  district: 'downtown',
  description: 'Command a station: crews, apparatus, and multi-company incidents.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Full benefits', 'Early retirement'],
};

const MEM_FIRE_CHIEF: JobListing = {
  id: 'mem_fire_chief',
  title: 'Fire Chief',
  employer: 'Memphis Fire Department',
  tier: 'elite',
  hourlyPay: 56,
  skill: 'charisma',
  required: 70,
  city: 'memphis',
  district: 'downtown',
  description: 'Lead the whole fire department: operations, budget, and citywide readiness.',
  category: 'emergency',
  requirements: [],
  benefits: ['Pension', 'Full benefits', 'Early retirement'],
};

const LR_EMS_EMT_B: JobListing = {
  id: 'lr_ems_emt_b',
  title: 'EMT-B',
  employer: 'MEMS Ambulance',
  tier: 'entry',
  hourlyPay: 20,
  skill: 'charisma',
  required: 35,
  city: 'littlerock',
  district: 'downtown',
  description: 'Basic life support on an ambulance crew: patient care and transport across central Arkansas.',
  category: 'emergency',
  requirements: [],
  benefits: ['Health insurance'],
};

const LR_EMS_EMT_A: JobListing = {
  id: 'lr_ems_emt_a',
  title: 'EMT-A',
  employer: 'MEMS Ambulance',
  tier: 'skilled',
  hourlyPay: 23,
  skill: 'charisma',
  required: 40,
  city: 'littlerock',
  district: 'downtown',
  description: 'Advanced EMT care: IV therapy and advanced airway support on ambulance calls.',
  category: 'emergency',
  requirements: [],
  benefits: ['Health insurance', 'Retirement'],
};

const LR_EMS_SUPERVISOR: JobListing = {
  id: 'lr_ems_supervisor',
  title: 'EMS Supervisor',
  employer: 'MEMS Ambulance',
  tier: 'career',
  hourlyPay: 30,
  skill: 'charisma',
  required: 55,
  city: 'littlerock',
  district: 'downtown',
  description: 'Supervise ambulance crews and shifts: staffing, quality, and field support.',
  category: 'emergency',
  requirements: [],
  benefits: ['Health insurance', 'Retirement'],
};

const LR_EMS_DIRECTOR: JobListing = {
  id: 'lr_ems_director',
  title: 'EMS Director',
  employer: 'MEMS Ambulance',
  tier: 'elite',
  hourlyPay: 35,
  skill: 'charisma',
  required: 65,
  city: 'littlerock',
  district: 'downtown',
  description: 'Direct EMS operations for the service: clinical standards, budget, and system readiness.',
  category: 'emergency',
  requirements: [],
  benefits: ['Health insurance', 'Retirement'],
};

/** Every gap-fill listing defined in this module, in ladder order. */
export const GAP_FILL_JOBS: JobListing[] = [
  MEM_POLICE_CADET,
  MEM_POLICE_SERGEANT,
  MEM_POLICE_LIEUTENANT,
  MEM_POLICE_CAPTAIN,
  MEM_POLICE_CHIEF,
  MEM_FIRE_PROBATIONARY,
  MEM_FIRE_ENGINEER,
  MEM_FIRE_LIEUTENANT,
  MEM_FIRE_CAPTAIN,
  MEM_FIRE_CHIEF,
  LR_EMS_EMT_B,
  LR_EMS_EMT_A,
  LR_EMS_SUPERVISOR,
  LR_EMS_DIRECTOR,
];

// ---------------------------------------------------------------------------
// Ladders
// ---------------------------------------------------------------------------
// POLICE — canonical employer Memphis Police Department (memphis /
// downtown), the only department with a real Officer listing used as the
// ladder's Officer rung. The Little Rock and Southaven Officer listings
// and the DeSoto Deputy listing are equivalent hires in other cities,
// not ladder rungs: one canonical listing per rung keeps rankFor()
// unambiguous. Detective (mem_police_detective) is a lateral specialty,
// not a command rank, so it is not on this ladder.
// Anchoring: base $25.60 x 1.25 = $32.00, exactly the real Officer rate.
// Multipliers: 1.00 / 1.25 / 1.50 / 1.75 / 2.00 / 2.50.
const POLICE_LADDER: EmergencyLadder = {
  track: 'police',
  title: 'Police',
  baseHourlyPay: 25.6,
  ranks: [
    { id: 'police_cadet', title: 'Police Cadet', jobId: 'mem_police_cadet', gapFillJob: MEM_POLICE_CADET,
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 1, minShifts: 0, minGPA: null },
      payMultiplier: 1, shifts: ['morning', 'evening', 'night'] },
    { id: 'police_officer', title: 'Police Officer', jobId: 'mem_police_officer',
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 2, minShifts: 15, minGPA: null },
      payMultiplier: 1.25, shifts: ['morning', 'evening', 'night'] },
    { id: 'police_sergeant', title: 'Police Sergeant', jobId: 'mem_police_sergeant', gapFillJob: MEM_POLICE_SERGEANT,
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 3, minShifts: 30, minGPA: null },
      payMultiplier: 1.5, shifts: ['morning', 'evening', 'night'] },
    { id: 'police_lieutenant', title: 'Police Lieutenant', jobId: 'mem_police_lieutenant', gapFillJob: MEM_POLICE_LIEUTENANT,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 3, minShifts: 45, minGPA: null },
      payMultiplier: 1.75, shifts: ['morning', 'evening', 'night'] },
    { id: 'police_captain', title: 'Police Captain', jobId: 'mem_police_captain', gapFillJob: MEM_POLICE_CAPTAIN,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 4, minShifts: 60, minGPA: null },
      payMultiplier: 2, shifts: ['morning', 'evening', 'night'] },
    { id: 'police_chief', title: 'Police Chief', jobId: 'mem_police_chief', gapFillJob: MEM_POLICE_CHIEF,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 5, minShifts: 75, minGPA: 3.0 },
      payMultiplier: 2.5, shifts: ['morning', 'evening'] },
  ],
};

// FIRE — canonical employer Memphis Fire Department (memphis /
// downtown). Little Rock and Southaven Firefighter listings are
// equivalent hires in other cities, not ladder rungs (same one-listing-
// per-rung rule as Police). The Memphis Firefighter/Paramedic listing
// (mem_paramedic) is an EMS crossover role, not a Fire command rank, so
// it is not on this ladder.
// Anchoring: base $22.40 x 1.25 = $28.00, exactly the real Firefighter rate.
// Multipliers: 1.00 / 1.25 / 1.50 / 1.75 / 2.00 / 2.50.
const FIRE_LADDER: EmergencyLadder = {
  track: 'fire',
  title: 'Fire',
  baseHourlyPay: 22.4,
  ranks: [
    { id: 'fire_probationary', title: 'Probationary Firefighter', jobId: 'mem_fire_probationary', gapFillJob: MEM_FIRE_PROBATIONARY,
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 1, minShifts: 0, minGPA: null },
      payMultiplier: 1, shifts: ['morning', 'evening', 'night'] },
    { id: 'fire_firefighter', title: 'Firefighter', jobId: 'mem_firefighter',
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 2, minShifts: 15, minGPA: null },
      payMultiplier: 1.25, shifts: ['morning', 'evening', 'night'] },
    { id: 'fire_engineer', title: 'Fire Engineer', jobId: 'mem_fire_engineer', gapFillJob: MEM_FIRE_ENGINEER,
      requirements: { certification: null, skill: 'fitness', minSkillLevel: 3, minShifts: 30, minGPA: null },
      payMultiplier: 1.5, shifts: ['morning', 'evening', 'night'] },
    { id: 'fire_lieutenant', title: 'Fire Lieutenant', jobId: 'mem_fire_lieutenant', gapFillJob: MEM_FIRE_LIEUTENANT,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 3, minShifts: 45, minGPA: null },
      payMultiplier: 1.75, shifts: ['morning', 'evening', 'night'] },
    { id: 'fire_captain', title: 'Fire Captain', jobId: 'mem_fire_captain', gapFillJob: MEM_FIRE_CAPTAIN,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 4, minShifts: 60, minGPA: null },
      payMultiplier: 2, shifts: ['morning', 'evening', 'night'] },
    { id: 'fire_chief', title: 'Fire Chief', jobId: 'mem_fire_chief', gapFillJob: MEM_FIRE_CHIEF,
      requirements: { certification: null, skill: 'charisma', minSkillLevel: 5, minShifts: 75, minGPA: 3.0 },
      payMultiplier: 2.5, shifts: ['morning', 'evening'] },
  ],
};

// EMS — canonical employer MEMS Ambulance (littlerock / downtown), the
// employer of the real Paramedic listing used as the ladder's Paramedic
// rung. The Memphis Firefighter/Paramedic listing (mem_paramedic) and
// the Southaven AMR Paramedic listing (south_ems_paramedic) are
// equivalent hires elsewhere, not ladder rungs. The 911 Dispatcher
// listing (mem_911_dispatcher) is a dispatch role, not an EMT rung, so
// it is not on this ladder. The ladder skill is charisma throughout,
// matching the real Paramedic listings (charisma, not fitness).
// Certs are all real SCHOOLS rewardCertifications from Memphis Medical
// Academy: EMT_LICENSE (EMT Certification course) and PARAMEDIC_LICENSE
// (Paramedic Certification course). No EMT-A course exists, so EMT-A
// carries EMT_LICENSE — the step is gated on skill/tenure, not on a
// cert no course grants.
// Anchoring: base $20.00 x 1.30 = $26.00, exactly the real Paramedic rate.
// Multipliers: 1.00 / 1.15 / 1.30 / 1.50 / 1.75.
const EMS_LADDER: EmergencyLadder = {
  track: 'ems',
  title: 'EMS',
  baseHourlyPay: 20,
  ranks: [
    { id: 'ems_emt_b', title: 'EMT-B', jobId: 'lr_ems_emt_b', gapFillJob: LR_EMS_EMT_B,
      requirements: { certification: 'EMT_LICENSE', skill: 'charisma', minSkillLevel: 1, minShifts: 0, minGPA: null },
      payMultiplier: 1, shifts: ['morning', 'evening', 'night'] },
    { id: 'ems_emt_a', title: 'EMT-A', jobId: 'lr_ems_emt_a', gapFillJob: LR_EMS_EMT_A,
      requirements: { certification: 'EMT_LICENSE', skill: 'charisma', minSkillLevel: 2, minShifts: 15, minGPA: null },
      payMultiplier: 1.15, shifts: ['morning', 'evening', 'night'] },
    { id: 'ems_paramedic', title: 'Paramedic', jobId: 'lr_paramedic_mem',
      requirements: { certification: 'PARAMEDIC_LICENSE', skill: 'charisma', minSkillLevel: 3, minShifts: 30, minGPA: null },
      payMultiplier: 1.3, shifts: ['morning', 'evening', 'night'] },
    { id: 'ems_supervisor', title: 'EMS Supervisor', jobId: 'lr_ems_supervisor', gapFillJob: LR_EMS_SUPERVISOR,
      requirements: { certification: 'PARAMEDIC_LICENSE', skill: 'charisma', minSkillLevel: 4, minShifts: 45, minGPA: null },
      payMultiplier: 1.5, shifts: ['morning', 'evening', 'night'] },
    { id: 'ems_director', title: 'EMS Director', jobId: 'lr_ems_director', gapFillJob: LR_EMS_DIRECTOR,
      requirements: { certification: 'PARAMEDIC_LICENSE', skill: 'charisma', minSkillLevel: 5, minShifts: 60, minGPA: 3.0 },
      payMultiplier: 1.75, shifts: ['morning', 'evening'] },
  ],
};

// The task names this export EMS_LADDERS; it holds ALL THREE tracks, not
// EMS alone. Keyed by track so rankFor/nextRank/etc. share one lookup.
export const EMS_LADDERS: Record<EmergencyTrack, EmergencyLadder> = {
  police: POLICE_LADDER,
  fire: FIRE_LADDER,
  ems: EMS_LADDER,
};

// ---------------------------------------------------------------------------
// Player-like readers (internal, deterministic)
// ---------------------------------------------------------------------------

function ladderFor(track: string | undefined): EmergencyLadder | null {
  if (track === 'police' || track === 'fire' || track === 'ems') return EMS_LADDERS[track];
  return null;
}

function stripPromotionPrefix(title: string): string {
  return title.replace(/^(Senior |Lead |Principal )/, '');
}

function playerJobId(player: EmergencyPlayerLike): string | null {
  const job = player.job;
  if (typeof job === 'string') return job || null;
  if (job && typeof job === 'object') return job.id ?? job.jobId ?? null;
  return null;
}

function playerJobTitle(player: EmergencyPlayerLike): string | null {
  const job = player.job;
  if (job && typeof job === 'object' && job.title) return stripPromotionPrefix(String(job.title));
  return null;
}

function rankByJobId(ladder: EmergencyLadder, jobId: string): EmergencyRank | null {
  return ladder.ranks.find((r) => r.jobId === jobId) ?? null;
}

function rankByTitle(ladder: EmergencyLadder, title: string): EmergencyRank | null {
  return ladder.ranks.find((r) => r.title === title) ?? null;
}

/** The player's current rank on this track, by job id, else by job title. */
function playerRankOnTrack(player: EmergencyPlayerLike, ladder: EmergencyLadder): EmergencyRank | null {
  const id = playerJobId(player);
  if (id) {
    const byId = rankByJobId(ladder, id);
    if (byId) return byId;
  }
  const title = playerJobTitle(player);
  if (title) return rankByTitle(ladder, title);
  return null;
}

function skillLevelFor(player: EmergencyPlayerLike, skill: EmergencySkill): number {
  const raw = player.skills?.[skill];
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') {
    if (typeof raw.level === 'number') return raw.level;
    if (typeof raw.value === 'number') return raw.value;
  }
  return 1;
}

function tenureFor(player: EmergencyPlayerLike): number {
  const candidates = [
    player.jobTenure, player.shiftsAtJob, player.tenure, player.shifts,
    player.workDaysCompleted, player.shiftsWorked,
  ];
  for (const c of candidates) if (typeof c === 'number') return c;
  return 0;
}

function gpaFor(player: EmergencyPlayerLike): number {
  if (typeof player.gpa === 'number') return player.gpa;
  if (typeof player.enrolledCourse?.gpa === 'number') return player.enrolledCourse.gpa;
  if (typeof player.lastGPA === 'number') return player.lastGPA;
  return 2.5;
}

function certificationsFor(player: EmergencyPlayerLike): string[] {
  if (Array.isArray(player.certifications)) return player.certifications;
  if (Array.isArray(player.certs)) return player.certs;
  return [];
}

// ---------------------------------------------------------------------------
// Exported lookups
// ---------------------------------------------------------------------------

/** The rank on `track` whose job id is `jobId`, or null if none matches. */
export function rankFor(track: EmergencyTrack, jobId: string): EmergencyRank | null {
  const ladder = ladderFor(track);
  if (!ladder) return null;
  return rankByJobId(ladder, jobId);
}

/** The next rank after `currentRankId` on `track`, or null at the top / unknown. */
export function nextRank(track: EmergencyTrack, currentRankId: string): EmergencyRank | null {
  const ladder = ladderFor(track);
  if (!ladder) return null;
  const idx = ladder.ranks.findIndex((r) => r.id === currentRankId);
  if (idx < 0 || idx + 1 >= ladder.ranks.length) return null;
  return ladder.ranks[idx + 1]!;
}

/** The requirements of `rankId` on `track`, or null for an unknown track/rank. */
export function rankRequirements(track: EmergencyTrack, rankId: string): RankRequirements | null {
  const ladder = ladderFor(track);
  if (!ladder) return null;
  return ladder.ranks.find((r) => r.id === rankId)?.requirements ?? null;
}

/** The pay multiplier of `rankId` on `track` over the ladder base rate, or null if unknown. */
export function ladderPayMultiplier(track: EmergencyTrack, rankId: string): number | null {
  const ladder = ladderFor(track);
  if (!ladder) return null;
  return ladder.ranks.find((r) => r.id === rankId)?.payMultiplier ?? null;
}

/**
 * Does `player` meet the appointment requirements for `rankId` on `track`?
 * Checks, in order, (1) track employment for non-entry rungs, (2)
 * certification, (3) skill level, (4) shifts/tenure, (5) GPA.
 * `missing` lists every failed check in that order; it is empty exactly
 * when `eligible` is true. Unknown track/rank is ineligible with a single
 * "Unknown …" entry. Entry rungs (index 0) carry no track-employment
 * check: a new hire need not already hold a job on the track.
 */
export function isEligibleForRank(
  player: EmergencyPlayerLike,
  track: EmergencyTrack,
  rankId: string,
): { eligible: boolean; missing: string[] } {
  const ladder = ladderFor(track);
  if (!ladder) return { eligible: false, missing: [`Unknown track: ${String(track)}`] };
  const idx = ladder.ranks.findIndex((r) => r.id === rankId);
  if (idx < 0) return { eligible: false, missing: [`Unknown rank: ${String(rankId)}`] };
  const rank = ladder.ranks[idx]!;
  const req = rank.requirements;
  const missing: string[] = [];

  if (idx > 0 && !playerRankOnTrack(player, ladder)) {
    const current = playerJobTitle(player) ?? playerJobId(player) ?? 'unemployed';
    missing.push(`Not employed on the ${ladder.title} track (current job: ${current})`);
  }
  if (req.certification && !certificationsFor(player).includes(req.certification)) {
    missing.push(`Missing certification: ${req.certification}`);
  }
  const level = skillLevelFor(player, req.skill);
  if (level < req.minSkillLevel) {
    missing.push(`${req.skill} level ${req.minSkillLevel} required (have ${level})`);
  }
  const tenure = tenureFor(player);
  if (tenure < req.minShifts) {
    missing.push(`${req.minShifts} shifts required (have ${tenure})`);
  }
  if (req.minGPA !== null) {
    const gpa = gpaFor(player);
    if (gpa < req.minGPA) {
      missing.push(`GPA ${req.minGPA.toFixed(1)} required (have ${gpa})`);
    }
  }
  return { eligible: missing.length === 0, missing };
}
