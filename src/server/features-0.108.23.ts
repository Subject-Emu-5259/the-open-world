// THE OPEN WORLD — v0.108.23 EXPANSIONS
// Travel (§60), Properties (§61), Living Your Home (§62) — specced in
// docs/EXPANSION_ROADMAP_SPEC_v0.108.20.md Appendix M (§§60–62).
// Same rules as .20/.21: additive state only, existing architecture
// only, no new currencies, no new services, no dialogue changes,
// rewards at or below the established economy scale.
import { monthDiff, addMonthsKey } from './features-0.108.21.js';
import { generateCitizenName } from './citizen-names.js';

export function roundCents23(n: number): number {
  return Math.round(n * 100) / 100;
}

// === §60 — TRAVEL ===
export interface TravelStats {
  trips: number;
  faresPaid: number;
  visitsByCity: Record<string, number>;
}
export function emptyTravelStats(): TravelStats {
  return { trips: 0, faresPaid: 0, visitsByCity: {} };
}
export function recordTrip(stats: TravelStats | undefined, city: string, fare: number): TravelStats {
  const s = stats ?? emptyTravelStats();
  s.trips += 1;
  s.faresPaid = roundCents23(s.faresPaid + fare);
  s.visitsByCity[city] = (s.visitsByCity[city] ?? 0) + 1;
  return s;
}
export function mostVisitedCity(stats: TravelStats | undefined): string | null {
  if (!stats) return null;
  let best: string | null = null;
  let bestN = 0;
  for (const [city, n] of Object.entries(stats.visitsByCity)) {
    if (n > bestN) { bestN = n; best = city; }
  }
  return best;
}

// Souvenirs: $25, current city only, once per city, +2 happiness.
export const SOUVENIR_PRICE = 25;
export const SOUVENIR_HAPPINESS = 2;

// === §61 — PROPERTIES ===
export const LEASE_MONTHS = 3;
export const LEASE_RENT_FACTOR = 0.9;
export const OPEN_HOUSE_PRICE = 50;
export const BREAK_LEASE_FEE = 100;
export function leaseRent(rentalIncome: number): number {
  return Math.round(rentalIncome * LEASE_RENT_FACTOR);
}
export function leaseUntilFor(startMonthKey: string): string {
  return addMonthsKey(startMonthKey, LEASE_MONTHS);
}
export function leaseActive(leaseUntil: string | undefined, monthKey: string): boolean {
  if (!leaseUntil) return false;
  return monthDiff(monthKey, leaseUntil) >= 0;
}
export function openHouseActive(openHouseMonth: string | undefined, monthKey: string): boolean {
  return !!openHouseMonth && openHouseMonth === monthKey;
}
// Tenant display name: deterministic per (property | monthKey), from the
// citizen-names pools of the property's city country. Display only —
// never an NPC, never persisted, never a relationship or quest hook.
export function tenantNameFor(propertyName: string, country: string, monthKey: string): string {
  return generateCitizenName(country, `${propertyName}|${monthKey}`).display;
}

// === §62 — LIVING YOUR HOME ===
// Morning/evening reuse the existing routinesDone once-per-game-day
// mechanism (keys 'morning' / 'evening'); no new tracking shape.
export const MORNING_ENERGY = 5;
export const MORNING_HAPPINESS = 2;
export const MORNING_HOURS = 1;
export const EVENING_HAPPINESS = 4;
export const EVENING_ENERGY_COST = 5;
export const EVENING_HOURS = 2;
