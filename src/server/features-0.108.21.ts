// THE OPEN WORLD — v0.108.21 FOLLOW-UP
// Six previously-not-shipped items, specced in
// docs/EXPANSION_ROADMAP_SPEC_v0.108.20.md Appendix L (§§49–54).
// Same rules as .20: additive state only, existing architecture only,
// no new currencies, no new services, no dialogue changes, rewards at
// or below the established economy scale (entry jobs ~$26k–$38k/yr,
// rents ~$800–$3,500/mo, bank 0.5%/mo).
import { housingMarketIndex } from './features-0.108.20.js';

export function roundCents21(n: number): number {
  return Math.round(n * 100) / 100;
}

// === §50 — STOCK DIVIDENDS ===
// 0.25%/month on current value = 3% annualized. Same rate for every
// listed company — no per-company yield is ever invented.
export const DIVIDEND_MONTHLY_RATE = 0.0025;
export function stockDividend(shares: number, price: number): number {
  if (shares <= 0 || price <= 0) return 0;
  return roundCents21(shares * price * DIVIDEND_MONTHLY_RATE);
}

// === §51 — FOUNDING / RUNNING COMPANIES ===
export const FOUNDING_COST = 5000;
export const COMPANY_MAX_EMPLOYEES = 5;
export const COMPANY_WAGE_PER_EMPLOYEE = 100;
export const COMPANY_OVERHEAD = 100;
export const COMPANY_DEBT_FAILURE_THRESHOLD = 2000;
export const COMPANY_DEBT_FAILURE_MONTHS = 2;
export const COMPANY_INDUSTRIES: string[] = [
  'Logistics', 'Banking & Finance', 'Healthcare', 'Public Safety',
  'Education', 'Government', 'Retail', 'Technology',
  'Hospitality & Food', 'General Services',
];
export function companyPerfMultiplier(perf: number): number {
  if (perf >= 70) return 1.2;
  if (perf >= 40) return 1.0;
  return 0.8;
}
export interface CompanyTickResult { revenue: number; expenses: number; net: number }
export function companyMonthlyTick(employeeCount: number, perf: number): CompanyTickResult {
  const revenue = Math.round((300 + 150 * employeeCount) * companyPerfMultiplier(perf));
  const expenses = COMPANY_WAGE_PER_EMPLOYEE * employeeCount + COMPANY_OVERHEAD;
  return { revenue, expenses, net: revenue - expenses };
}

// === §52 — REPRICING (owned + in-flight listings) ===
// Listing prices are computed on read: catalog price × today's index.
// The catalog itself is never overwritten.
export function listingPriceNow(catalogPrice: number, cityId: string, monthKey: string): number {
  return Math.round(catalogPrice * housingMarketIndex(cityId, monthKey));
}
export function repriceValue(oldValue: number, oldIndex: number, newIndex: number): number {
  if (oldIndex <= 0) return oldValue;
  return Math.round(oldValue * (newIndex / oldIndex));
}

// === §54 — FEE SEIZURE / ARREST LADDER ===
// Game-months past the assessment month key. +2 = existing $10 late
// fee (unchanged); +3 = warning 1; +4 = final warning; +5+ = one
// seizure per window, else arrest when no seizable asset remains.
// Fairness bar (Dre): any payment restarts the warning clock, a plan
// freezes the ladder, seizure is one cheapest asset per window with
// primary residence / job / businesses / bank / inventory exempt,
// and a fee arrest adds no criminal record and no parole tail.
export const FEE_WARNING_1_MONTHS = 3;
export const FEE_WARNING_2_MONTHS = 4;
export const FEE_SEIZURE_MONTHS = 5;
export const FEE_PLAN_INSTALLMENTS = 3;
export const FEE_SEIZURE_COOLDOWN_MONTHS = 2;
export function monthDiff(fromKey: string, toKey: string): number {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!);
}
export function addMonthsKey(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const total = (y ?? 2024) * 12 + ((m ?? 1) - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}
export function feeLadderStage(monthsPast: number): string {
  if (monthsPast >= FEE_SEIZURE_MONTHS) return 'seizure';
  if (monthsPast >= FEE_WARNING_2_MONTHS) return 'final warning';
  if (monthsPast >= FEE_WARNING_1_MONTHS) return 'warning 1';
  if (monthsPast >= 2) return 'late fee';
  return 'current';
}
// Cheapest seizable asset: cheapest vehicle first (by value), else
// cheapest NON-primary property (by currentValue). Primary residence,
// businesses, bank, inventory, and the job are never seizable — the
// function cannot return them, so the tick cannot seize them.
export function firstSeizableAsset(player: any): { kind: string; ref: any; value: number } | null {
  const vehicles = player.vehicles ?? [];
  if (vehicles.length > 0) {
    const cheapest = [...vehicles].sort((a: any, b: any) => ((a.value ?? a.price ?? 0) - (b.value ?? b.price ?? 0)))[0];
    return { kind: 'vehicle', ref: cheapest, value: cheapest.value ?? cheapest.price ?? 0 };
  }
  const primaryId = player.primaryResidenceId;
  const props = (player.properties ?? []).filter((p: any) => p.id !== primaryId);
  if (props.length > 0) {
    const cheapest = [...props].sort((a: any, b: any) => (a.currentValue ?? 0) - (b.currentValue ?? 0))[0];
    return { kind: 'property', ref: cheapest, value: cheapest.currentValue ?? 0 };
  }
  return null;
}
