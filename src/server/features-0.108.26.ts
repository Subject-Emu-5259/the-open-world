// v0.108.26 — Deeper working activities + deeper shift expansion.
// Pure data + deterministic helpers for the .26 work systems. The engine
// methods live in game-engine.ts; this module holds only the tables and
// the one deterministic function (today's shift task), so the harness can
// import them without the full engine.

export function hashStr26(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// One assigned task per game-day, deterministic from employer + game-date.
// Generic wording only — no employer-specific claims, no invented people.
export const SHIFT_TASKS: string[] = [
  'Tidy the work area and restock supplies',
  "File the day's paperwork",
  'Help a customer with a routine question',
  'Check inventory and note shortages',
  "Prepare tomorrow's opening checklist",
  'Assist with the end-of-day cleanup',
];

export function taskForDay(employer: string, dateStr: string): string {
  return SHIFT_TASKS[hashStr26(`${employer}|${dateStr}`) % SHIFT_TASKS.length]!;
}

// --- General activity economics (all at or below the established scale) ---
export const TASK_BONUS = 25; // cash, taxed like work pay
export const TASK_HOURS = 1;
export const TASK_ENERGY = 5;
export const TASK_SKILL_XP = 10;

export const MENTOR_HOURS = 1;
export const MENTOR_ENERGY = 5;
export const MENTOR_REL = 4;
export const MENTOR_PRO_REP = 3;

export const MEETING_HOURS = 1;
export const MEETING_ENERGY = 5;
export const MEETING_SKILL_XP = 5;
export const MEETING_HAPPY = 2;

export const BREAKROOM_HOURS = 1;
export const BREAKROOM_ENERGY = 10;
export const BREAKROOM_HAPPY = 2;

export const REPORT_HOURS = 1;
export const REPORT_ENERGY = 5;
export const REPORT_PRO_REP = 3;
export const REPORT_SKILL_XP = 5;

export const COVER_HOURS = 4;
export const COVER_ENERGY = 20;
export const COVER_REL = 3;

// --- Emergency-track activity economics ---
// +$30 for 2h sits BELOW 2h base pay at Cadet rate ($51.20): a bonus
// activity, never a shift replacement.
export const EMERG_BONUS = 30;
export const EMERG_HOURS = 2;
export const EMERG_ENERGY = 10;
export const EMERG_SKILL_XP = 10;
export const TRAINING_SKILL_XP = 15;
export const RIDEALONG_ENERGY = 5;
export const RIDEALONG_SKILL_XP = 5;
export const RIDEALONG_HAPPY = 2;

// Track labels for activity copy (generic wording only).
export const EMERG_TRACK_LABEL: Record<string, string> = {
  police: 'police',
  fire: 'fire',
  ems: 'EMS',
};
