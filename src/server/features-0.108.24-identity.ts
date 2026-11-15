// THE OPEN WORLD — v0.108.24 IDENTITY
// (A) IDENTIFICATION documents and (B) CRIMINAL RECORDS.
// Pure logic only: no imports, no I/O, no Math.random, no new
// dependencies, no new currencies. Every function is deterministic and
// returns new arrays/objects — nothing here mutates its input, deducts
// money, blocks a hire, or changes a stat. Callers (the engine) own
// charging, messaging, and any hiring decision; this module only
// computes the tables, the status, and the discount / tier facts.
//
// ADDITIVE-STATE RULE (same as .15/.19/.20/.21/.23): old saves lack
// the new fields, so every accessor defaults them. The new save field
// is `identityDocs` (an IdentityDocument array, see below); it is
// optional everywhere in this module and defaults to [].
// No real ID numbers, no real documents: an IdentityDocument carries
// only its type and its game-month validity window — never a number,
// never a scan, never a real-world credential.
//
// HARD RULE (A): an ID must NEVER block a previously-free action.
// IDs unlock PERKS (discounts) only. There is no "required" document
// in this module: idPerkFor() returns 0 for a missing/expired ID or
// an unknown action, and the underlying action still proceeds at full
// price. Any future engine wiring must keep that shape — check the
// perk, apply the discount, never gate the action on the document.
//
// HARD RULE (B): a criminal record must NEVER be a surprise
// punishment. buildCriminalRecord() only DESCRIBES the record and the
// disclosure a NEW application would carry (see `consequences`); it
// does not block, fine, or punish anything by itself. The engine's
// existing hire gate (hireBlocked in game-engine.ts, which already
// closes trusted roles to players with any record) is untouched by
// this module — this module adds the stated, up-front disclosure for
// new applications, not a second hidden gate. The only lawful
// remedies are the ones already in the game plus the one added here:
//   1. lawyer clean — reduces HEAT only (existing mechanic); it does
//      NOT remove criminal-record entries. A player with heat 0 and a
//      record still has a record.
//   2. expunge (this module) — removes MINOR entries only, for a fee,
//      after a clean period (see EXPUNGE_CLEAN_MONTHS). It removes
//      entries from the criminal-record list only: it never erases
//      outstanding fines, open cases, or the prisonRecord arrest count.
//
// MONEY: whole cents everywhere (Math.round(n * 100) / 100), same as
// the engine. Costs below are sized against entry pay (~$2,200/mo:
// entry jobs ~$26k–$38k/yr): a state ID is pocket change, a passport
// is a considered purchase, an expunge is a serious legal expense —
// none of them is a month's pay.
//
// MONTH KEYS: game-months are "YYYY-MM" strings (the same key shape
// .20/.21 use). A document is valid while monthKey < expiresAt: in
// its expiry month it is already expired, so renew BEFORE that month.
// Month arithmetic here is local and self-contained (no import) so
// this module stays pure and importable on its own.

// ------------------------------------------------------------------
// Shared month-key helpers (internal; not exported)
// ------------------------------------------------------------------

function roundCents24(n: number): number {
  return Math.round(n * 100) / 100;
}

// "2024-01" -> 2024 * 12 + 0; month arithmetic is integer math on this.
function monthIndex(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return (y ?? 2024) * 12 + ((m ?? 1) - 1);
}

function keyFromIndex(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function addMonths24(key: string, n: number): string {
  return keyFromIndex(monthIndex(key) + n);
}

// Whole game-months from `fromKey` to `toKey` (negative if to < from).
function monthDiff24(fromKey: string, toKey: string): number {
  return monthIndex(toKey) - monthIndex(fromKey);
}

function isMonthKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

// Parse the engine's game-date strings ("Monday, January 15, 2024")
// down to their game-month ("2024-01"). Returns null when the string
// is neither a month key nor a parseable game date — the caller then
// records date: null (unknown), never an invented date.
function monthKeyFromDateString(value: unknown): string | null {
  if (isMonthKey(value)) return value;
  if (typeof value !== 'string') return null;
  const months: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  };
  const m = value.match(/([A-Za-z]+)\s+\d{1,2},\s*(\d{4})/);
  if (!m) return null;
  const month = months[m[1]!];
  if (month === undefined) return null;
  return `${m[2]}-${String(month).padStart(2, '0')}`;
}

// ==================================================================
// (A) IDENTIFICATION DOCUMENTS
// ==================================================================

export type IdType = 'state_id' | 'drivers_license' | 'passport';

// The action a perk discounts. Canonical names only; idPerkFor()
// also accepts the aliases listed beside each one.
//   'roadtrip_fuel'     — road-trip fuel (base $15 in .19; the .20
//                         driver's permit is a separate, older
//                         discount — the engine must apply ONE fuel
//                         discount, never stack both).
//   'international_fare' — an international travel fare (the generic
//                         $50 bus fare is domestic; this perk applies
//                         only to fares the engine marks international).
//   'services'          — municipal service fees (e.g. the .20 vehicle
//                         fee $40 / property fee $25). NEVER fines,
//                         taxes, court costs, or case fees: a discount
//                         on a punishment would read as buying your
//                         way out of it, and this module does not do that.
export type IdPerkAction = 'roadtrip_fuel' | 'international_fare' | 'services';

export interface IdDef {
  type: IdType;
  label: string;
  cost: number; // first issue, whole dollars (all defs are whole here)
  validityMonths: number; // game-months from the issue month
  renewalCost: number; // whole dollars; always below `cost`
  perkAction: IdPerkAction;
  // Fraction saved, 0–1: 0.20 means "20% off", so the caller charges
  // price * (1 - discount). This is a SAVING fraction, not a price
  // multiplier (a multiplier for 20% off would be 0.80 — do not mix
  // them up when wiring the engine).
  perkDiscount: number;
  perkLabel: string;
}

export const ID_DEFS: Record<IdType, IdDef> = {
  state_id: {
    type: 'state_id',
    label: 'State ID',
    cost: 35,
    validityMonths: 48,
    renewalCost: 25,
    perkAction: 'services',
    perkDiscount: 0.10,
    perkLabel: '10% off municipal service fees',
  },
  drivers_license: {
    type: 'drivers_license',
    label: "Driver's License",
    cost: 75,
    validityMonths: 60,
    renewalCost: 50,
    perkAction: 'roadtrip_fuel',
    perkDiscount: 0.20,
    perkLabel: '20% off road-trip fuel',
  },
  passport: {
    type: 'passport',
    label: 'Passport',
    cost: 150,
    validityMonths: 120,
    renewalCost: 110,
    perkAction: 'international_fare',
    perkDiscount: 0.15,
    perkLabel: '15% off international fares',
  },
};

export const ID_TYPES: IdType[] = ['state_id', 'drivers_license', 'passport'];

// One held document. Deliberately minimal: type + validity window.
// There is NO number field here, by design — see the header note.
export interface IdentityDocument {
  type: IdType;
  issuedAt: string; // "YYYY-MM" game-month of issue
  expiresAt: string; // "YYYY-MM" game-month it stops being valid
  renewedAt?: string; // "YYYY-MM" of the most recent renewal, if any
}

// The save field is `identityDocs?: IdentityDocument[]` on the player.
// Every function below accepts `IdentityDocument[] | undefined` so an
// old save (no field) just reads as "holds no documents".

function docsOf(docs: IdentityDocument[] | undefined): IdentityDocument[] {
  return Array.isArray(docs) ? docs : [];
}

function findDoc(docs: IdentityDocument[], type: IdType): IdentityDocument | undefined {
  return docs.find((d) => d?.type === type);
}

// Issue (or re-issue after expiry) a document of `type` in `monthKey`.
// PURE: returns a NEW array; the input is never mutated, and no money
// is touched — the caller checks the player can afford ID_DEFS[type]
// .cost and deducts it before/after calling this.
//   - No document of this type held -> appended.
//   - Held but expired in `monthKey` -> replaced with a fresh window.
//   - Held and STILL VALID -> returned unchanged (no double-issue,
//     no silent extension). Renew a valid document with renewId().
//   - Unknown `type` -> returned unchanged (never invent a document).
// Worked example:
//   issueId([], 'passport', '2024-01')
//     -> [{ type: 'passport', issuedAt: '2024-01', expiresAt: '2034-01' }]
//   issueId(that, 'passport', '2024-06') -> unchanged (still valid).
//   issueId(that, 'passport', '2034-01') -> fresh window to '2044-01'
//     (2034-01 is the expiry month, so the old document is expired).
export function issueId(
  docs: IdentityDocument[] | undefined,
  type: IdType,
  monthKey: string,
): IdentityDocument[] {
  const def = ID_DEFS[type];
  if (!def) return [...docsOf(docs)];
  const list = docsOf(docs);
  const existing = findDoc(list, type);
  if (existing && monthKey < existing.expiresAt) return [...list];
  const fresh: IdentityDocument = {
    type,
    issuedAt: monthKey,
    expiresAt: addMonths24(monthKey, def.validityMonths),
  };
  if (!existing) return [...list, fresh];
  return list.map((d) => (d.type === type ? fresh : d));
}

// Renew a held document in `monthKey`.
// PURE: returns a NEW array; no money is touched — the caller checks
// and deducts ID_DEFS[type].renewalCost.
//   - Still valid -> the window extends FROM THE OLD EXPIRY (no time
//     is lost by renewing early): expiresAt += validityMonths.
//   - Already expired -> the window extends FROM `monthKey` (the
//     lapsed months are not refunded as validity).
//   - No document of this type held -> returned unchanged. Renewal is
//     not a back door to a first issue; call issueId() for that.
//   - Unknown `type` -> returned unchanged.
// Worked example (driver's license, 60 months):
//   issueId([], 'drivers_license', '2024-01') -> expires '2029-01'.
//   renewId(that, 'drivers_license', '2028-06') -> expires '2034-01'
//     (early renewal keeps the remaining months).
//   renewId(that, 'drivers_license', '2030-03') -> expires '2035-03'
//     (lapsed renewal restarts from the renewal month).
export function renewId(
  docs: IdentityDocument[] | undefined,
  type: IdType,
  monthKey: string,
): IdentityDocument[] {
  const def = ID_DEFS[type];
  if (!def) return [...docsOf(docs)];
  const list = docsOf(docs);
  const existing = findDoc(list, type);
  if (!existing) return [...list];
  const base = monthKey < existing.expiresAt ? existing.expiresAt : monthKey;
  const renewed: IdentityDocument = {
    ...existing,
    expiresAt: addMonths24(base, def.validityMonths),
    renewedAt: monthKey,
  };
  return list.map((d) => (d.type === type ? renewed : d));
}

export type IdStatusValue = 'valid' | 'expired' | 'none';

export interface IdStatus {
  type: IdType;
  status: IdStatusValue;
  issuedAt: string | null;
  expiresAt: string | null;
  // Whole game-months of validity left in `monthKey`; 0 for expired
  // and none (never negative — "how long ago it expired" is not a
  // number any display in this module needs).
  monthsRemaining: number;
}

// Status of all three documents in `monthKey`, keyed by type, so a
// display can show the whole wallet in one call without inventing
// entries for documents the player never held (those read 'none').
// Worked example: idStatus(issueId([], 'state_id', '2024-01'), '2024-06')
//   -> state_id { status: 'valid', monthsRemaining: 43 },
//      drivers_license { status: 'none', ... }, passport { 'none' }.
export function idStatus(
  docs: IdentityDocument[] | undefined,
  monthKey: string,
): Record<IdType, IdStatus> {
  const list = docsOf(docs);
  const out = {} as Record<IdType, IdStatus>;
  for (const type of ID_TYPES) {
    const doc = findDoc(list, type);
    if (!doc) {
      out[type] = { type, status: 'none', issuedAt: null, expiresAt: null, monthsRemaining: 0 };
    } else if (monthKey < doc.expiresAt) {
      out[type] = {
        type,
        status: 'valid',
        issuedAt: doc.issuedAt,
        expiresAt: doc.expiresAt,
        monthsRemaining: monthDiff24(monthKey, doc.expiresAt),
      };
    } else {
      out[type] = {
        type, status: 'expired', issuedAt: doc.issuedAt, expiresAt: doc.expiresAt, monthsRemaining: 0,
      };
    }
  }
  return out;
}

// Discount fraction saved for `action` in `monthKey` (0–1; see IdDef).
// Returns the perk ONLY when the matching document is valid in
// `monthKey`. Missing, expired, or unknown action -> 0, and the action
// itself is never blocked — the caller charges price * (1 - factor).
// Accepted aliases (canonical first): roadtrip_fuel | roadtrip | fuel;
// international_fare | international | international_travel;
// services | service | gov_services | municipal_services.
// Only ONE perk applies per action (each action maps to exactly one
// document), so discounts here never stack with each other.
// Worked examples:
//   idPerkFor('roadtrip_fuel', validLicenseDocs, '2024-06') -> 0.20
//     (a $15 fuel fee becomes 15 * (1 - 0.20) = $12.00).
//   idPerkFor('roadtrip_fuel', expiredLicenseDocs, '2030-01') -> 0.
//   idPerkFor('international_fare', stateIdOnlyDocs, '2024-06') -> 0
//     (a state ID does not discount an international fare).
export function idPerkFor(
  action: string,
  docs: IdentityDocument[] | undefined,
  monthKey: string,
): number {
  const normalized = String(action ?? '').trim().toLowerCase();
  const actionMap: Record<string, IdPerkAction> = {
    roadtrip_fuel: 'roadtrip_fuel', roadtrip: 'roadtrip_fuel', fuel: 'roadtrip_fuel',
    international_fare: 'international_fare', international: 'international_fare',
    international_travel: 'international_fare',
    services: 'services', service: 'services', gov_services: 'services',
    municipal_services: 'services',
  };
  const canonical = actionMap[normalized];
  if (!canonical) return 0;
  const status = idStatus(docs, monthKey);
  for (const type of ID_TYPES) {
    const def = ID_DEFS[type];
    if (def.perkAction === canonical && status[type]!.status === 'valid') {
      return def.perkDiscount;
    }
  }
  return 0;
}

// ==================================================================
// (B) CRIMINAL RECORD
// ==================================================================

// Severity of one offense entry. The mapping below is the whole
// severity rule: minor offenses are the non-violent, low-level ones
// from the .15 fine schedule; everything else — including an offense
// string this module has never seen — defaults to SERIOUS (fail
// closed: an unknown offense is never quietly expungeable).
export type OffenseSeverity = 'minor' | 'serious';

export const OFFENSE_SEVERITY: Record<string, OffenseSeverity> = {
  pickpocketing: 'minor',
  pickpocket: 'minor',
  shoplifting: 'minor',
  shoplift: 'minor',
  scamming: 'minor',
  scam: 'minor',
  robbery: 'serious',
  'grand theft auto': 'serious',
  grand_theft_auto: 'serious',
  heist: 'serious',
};

export function severityForOffense(offense: string): OffenseSeverity {
  const key = String(offense ?? '').trim().toLowerCase();
  return OFFENSE_SEVERITY[key] ?? 'serious';
}

// One normalized record entry, as buildCriminalRecord() reports it.
// `date` is a "YYYY-MM" game-month or null: the engine's live
// criminalRecord is a string[] with NO dates, so legacy entries
// normalize to date: null — and date: null is exactly what makes
// them ineligible for expunge (see canExpunge): the module never
// invents a date to make an old entry look eligible.
export interface CriminalRecordEntry {
  offense: string;
  date: string | null;
  severity: OffenseSeverity;
  // Position in the source criminalRecord array (stable within one
  // buildCriminalRecord call); expungeRecord() uses offense + date
  // to match, not this index, so callers need not store it.
  index: number;
}

export type RecordTier = 'clean' | 'minor' | 'serious';

// A player-like object: only the fields this module reads. All are
// optional (old saves / partial objects default cleanly). Shapes
// mirror the engine: criminalRecord is string[] in live saves, but
// structured entries are accepted too (see normalizeRecordEntries);
// fines are { offense, amount, date }; cases are
// { id, offense, fine, status }; prisonRecord is
// { arrests, timeServed, paroleEligible }.
export interface CriminalRecordPlayerLike {
  criminalRecord?: unknown;
  fines?: { offense?: string; amount?: number; date?: string }[] | undefined;
  cases?: { id?: string; offense?: string; fine?: number; status?: string }[] | undefined;
  prisonRecord?: { arrests?: number; timeServed?: number; paroleEligible?: boolean } | undefined;
  heat?: number | undefined;
}

// Normalize whatever the save holds into structured entries.
//   - string "Shoplifting" -> { offense: 'Shoplifting', date: null,
//     severity: 'minor' } (severity from the label; date unknown).
//   - { offense, date | monthKey, severity? } -> date parsed to a
//     month key when possible, else null; an explicit severity is
//     honored only if it is 'minor' or 'serious', otherwise inferred.
//   - anything else (numbers, nulls, empty strings) -> skipped, never
//     counted as an offense.
function normalizeRecordEntries(record: unknown): CriminalRecordEntry[] {
  if (!Array.isArray(record)) return [];
  const out: CriminalRecordEntry[] = [];
  for (let i = 0; i < record.length; i++) {
    const raw = record[i];
    if (typeof raw === 'string') {
      const offense = raw.trim();
      if (!offense) continue;
      out.push({ offense, date: null, severity: severityForOffense(offense), index: i });
      continue;
    }
    if (raw && typeof raw === 'object') {
      const obj = raw as { offense?: unknown; date?: unknown; monthKey?: unknown; severity?: unknown };
      const offense = typeof obj.offense === 'string' ? obj.offense.trim() : '';
      if (!offense) continue;
      const date = monthKeyFromDateString(obj.monthKey ?? obj.date ?? null);
      const severity = obj.severity === 'minor' || obj.severity === 'serious'
        ? obj.severity
        : severityForOffense(offense);
      out.push({ offense, date, severity, index: i });
    }
  }
  return out;
}

// Tier from a record: clean = no entries; minor = at least one entry
// and none serious; serious = at least one serious entry. Accepts
// either a player-like object (with .criminalRecord), a raw record
// array, or an already-normalized entry array — the same rule either
// way, so callers cannot get two different tiers for one record.
export function recordTier(
  input: CriminalRecordPlayerLike | CriminalRecordEntry[] | unknown,
): RecordTier {
  let entries: CriminalRecordEntry[];
  if (Array.isArray(input)) {
    entries = input.length > 0 && typeof input[0] === 'object' && input[0] !== null && 'severity' in (input[0] as object)
      ? (input as CriminalRecordEntry[])
      : normalizeRecordEntries(input);
  } else if (input && typeof input === 'object' && 'criminalRecord' in (input as object)) {
    entries = normalizeRecordEntries((input as CriminalRecordPlayerLike).criminalRecord);
  } else {
    entries = [];
  }
  if (entries.length === 0) return 'clean';
  return entries.some((e) => e.severity === 'serious') ? 'serious' : 'minor';
}

export interface CriminalRecordSummary {
  entries: CriminalRecordEntry[];
  tier: RecordTier;
  totalEntries: number;
  minorCount: number;
  seriousCount: number;
  // Money owed on outstanding fines (whole cents; 0 when none).
  // Fines are REPORTED here, never settled: paying is the engine's
  // existing "pay fine" command, not this module.
  outstandingFines: number;
  openCases: number;
  totalCases: number;
  arrests: number;
  heat: number;
  // Disclosure text for NEW applications ONLY (see header rule B).
  // Empty when tier is clean. These strings are meant to be SHOWN to
  // the player before they apply — e.g. on the job listing — so the
  // scrutiny is never a surprise at the hiring step. This module does
  // not itself reject any application.
  consequences: string[];
  // One-line version of `consequences` for a status display.
  applicationNote: string;
}

function consequencesForTier(tier: RecordTier): string[] {
  if (tier === 'clean') return [];
  if (tier === 'minor') {
    return [
      'Government and EMS job applications face extra scrutiny: a stated background-check step is added to a NEW application. It does not change any job you already hold, and it is shown before you apply.',
    ];
  }
  return [
    'Government, EMS, medical, law, and other trusted-role applications face extra scrutiny: a stated background-check step is added to a NEW application, and a trusted role may be declined for that role. It does not change any job you already hold, and it is shown before you apply.',
  ];
}

// Build the full, display-ready record view from a player-like object.
// PURE: reads only, returns a fresh summary. Open fines/cases and the
// prison arrest count are included because a record display that hid
// them would mislead — but they are NOT entries: they do not change
// the tier, and expunge never removes them (see header rule B).
// Worked examples:
//   buildCriminalRecord({ criminalRecord: [] })
//     -> tier 'clean', consequences [], applicationNote 'Clean record.'
//   buildCriminalRecord({ criminalRecord: ['Shoplifting'],
//     fines: [{ offense: 'Shoplifting', amount: 400 }],
//     cases: [{ id: 'case-1', offense: 'Shoplifting', fine: 400,
//       status: 'open' }], prisonRecord: { arrests: 0 }, heat: 15 })
//     -> tier 'minor', entries [{ offense: 'Shoplifting', date: null,
//        severity: 'minor' }], outstandingFines 400, openCases 1.
//   buildCriminalRecord({ criminalRecord: ['Heist'] })
//     -> tier 'serious' (heist is serious by the mapping above).
export function buildCriminalRecord(playerLike: CriminalRecordPlayerLike): CriminalRecordSummary {
  const p: CriminalRecordPlayerLike = playerLike ?? {};
  const entries = normalizeRecordEntries(p.criminalRecord);
  const tier = recordTier(entries);
  const fines = Array.isArray(p.fines) ? p.fines : [];
  const cases = Array.isArray(p.cases) ? p.cases : [];
  const outstandingFines = roundCents24(
    fines.reduce((sum, f) => sum + (typeof f?.amount === 'number' ? f.amount : 0), 0),
  );
  const openCases = cases.filter((c) => String(c?.status ?? '').toLowerCase() === 'open').length;
  const consequences = consequencesForTier(tier);
  return {
    entries,
    tier,
    totalEntries: entries.length,
    minorCount: entries.filter((e) => e.severity === 'minor').length,
    seriousCount: entries.filter((e) => e.severity === 'serious').length,
    outstandingFines,
    openCases,
    totalCases: cases.length,
    arrests: typeof p.prisonRecord?.arrests === 'number' ? p.prisonRecord.arrests : 0,
    heat: typeof p.heat === 'number' ? p.heat : 0,
    consequences,
    applicationNote: tier === 'clean' ? 'Clean record.' : consequences[0]!,
  };
}

// ------------------------------------------------------------------
// Expungement — the lawful remedy for minor entries
// ------------------------------------------------------------------

// Flat fee per expunged entry (whole dollars). The caller checks the
// player can afford it and deducts it; neither canExpunge() nor
// expungeRecord() touches money.
export const EXPUNGE_COST = 500;

// Clean period in game-months: an entry is expungeable only once it is
// at least this old AND no newer offense sits on the record (any
// newer entry, minor or serious, means the player has not been clean
// for the full period — the clock runs from the NEWEST offense, not
// from each entry in isolation).
export const EXPUNGE_CLEAN_MONTHS = 12;

// Whether `entry` can be expunged in `monthKey` against `playerLike`.
// All four conditions must hold; any failure -> false (no partial
// expunge, no exception path):
//   1. The entry is on the player's record (matched by offense + date
//      when the entry carries a date, else by offense alone — see
//      expungeRecord for the matching rule).
//   2. Severity is 'minor'. Serious entries are never expungeable,
//      however old they are.
//   3. The entry's date is KNOWN (a month key). Legacy string entries
//      with date: null fail here — the module will not guess a date.
//   4. Clean period: monthDiff(entry.date, monthKey) >= 12 AND no
//      other entry on the record is dated after entry.date.
// Note what is deliberately NOT a condition: outstanding fines, open
// cases, heat, and the arrest count do not block expunge here — they
// are separate obligations with their own remedies (pay fine, defend
// case, lawyer clean), and conflating them would let an unpaid $100
// fine permanently bar clearing a minor offense. Callers SHOULD still
// show them (buildCriminalRecord reports all three) so the player
// sees the full picture before paying the fee.
// Worked examples (record: Shoplifting '2024-01' only):
//   canExpunge(entry, player, '2025-01') -> true (12 months, no newer).
//   canExpunge(entry, player, '2024-06') -> false (only 5 months).
//   canExpunge(legacy string entry, player, '2025-01') -> false
//     (date unknown — condition 3).
//   Record Shoplifting '2024-01' + Robbery '2024-06':
//   canExpunge(shopliftingEntry, player, '2025-06') -> false
//     (a newer offense exists, even though 17 months have passed).
export function canExpunge(
  entry: CriminalRecordEntry | string,
  playerLike: CriminalRecordPlayerLike,
  monthKey: string,
): boolean {
  const entries = normalizeRecordEntries(playerLike?.criminalRecord);
  const target = typeof entry === 'string'
    ? entries.find((e) => e.offense.toLowerCase() === entry.trim().toLowerCase())
    : findExpungeTarget(entries, entry);
  if (!target) return false;
  if (target.severity !== 'minor') return false;
  if (!target.date) return false;
  if (monthDiff24(target.date, monthKey) < EXPUNGE_CLEAN_MONTHS) return false;
  if (entries.some((e) => e !== target && e.date && target.date && monthIndex(e.date) > monthIndex(target.date))) {
    return false;
  }
  return true;
}

function findExpungeTarget(
  entries: CriminalRecordEntry[],
  entry: CriminalRecordEntry,
): CriminalRecordEntry | undefined {
  const offense = String(entry.offense ?? '').trim().toLowerCase();
  if (entry.date) {
    const dated = entries.find(
      (e) => e.offense.toLowerCase() === offense && e.date === entry.date,
    );
    if (dated) return dated;
  }
  return entries.find((e) => e.offense.toLowerCase() === offense);
}

export interface ExpungeResult {
  success: boolean;
  // The player's record AFTER the operation, in its ORIGINAL shapes
  // (strings stay strings, structured entries stay structured) — so
  // the engine can store it straight back without a shape migration.
  // Unchanged when success is false.
  remaining: unknown[];
  removed: CriminalRecordEntry | null;
  // Fee the caller must charge on success (0 on failure). This
  // function never deducts it.
  cost: number;
  reason: string;
}

// Expunge one entry from the player's record in `monthKey`.
// PURE: returns a NEW `remaining` array; the input record is never
// mutated, and no money is deducted (see `cost`).
// `entry` may be a normalized CriminalRecordEntry or a bare offense
// string; matching is offense + date when a date is given, else the
// first entry with that offense. When several entries share one
// offense, pass the dated entry to pick the right one — a bare string
// always picks the first match, which may not be the intended one.
// Only the criminal-record entry is removed: fines, cases, and the
// prisonRecord arrest count are returned untouched (they live outside
// this array, and this function cannot reach them — that is the point).
// Worked example:
//   player = { criminalRecord: [
//     { offense: 'Shoplifting', date: '2024-01', severity: 'minor' }] }
//   expungeRecord(player, playerEntry, '2025-02')
//     -> { success: true, remaining: [], cost: 500,
//          reason: 'Expunged.' }
//   expungeRecord(player, 'Heist', '2025-02')
//     -> { success: false, remaining: <unchanged>, cost: 0,
//          reason: 'No matching entry ...' } (or the eligibility
//          reason, when the entry exists but cannot be expunged yet).
export function expungeRecord(
  playerLike: CriminalRecordPlayerLike,
  entry: CriminalRecordEntry | string,
  monthKey: string,
): ExpungeResult {
  const raw: unknown[] = Array.isArray(playerLike?.criminalRecord)
    ? [...playerLike.criminalRecord]
    : [];
  const entries = normalizeRecordEntries(raw);
  const target = typeof entry === 'string'
    ? entries.find((e) => e.offense.toLowerCase() === entry.trim().toLowerCase())
    : findExpungeTarget(entries, entry);
  if (!target) {
    const name = typeof entry === 'string' ? entry : entry.offense;
    return {
      success: false, remaining: raw, removed: null, cost: 0,
      reason: `No matching entry for "${name}" on the record.`,
    };
  }
  if (!canExpunge(target, playerLike, monthKey)) {
    let reason = 'This entry cannot be expunged yet.';
    if (target.severity !== 'minor') {
      reason = 'Only minor offenses can be expunged; serious offenses stay on the record.';
    } else if (!target.date) {
      reason = 'This entry has no recorded date, so the clean period cannot be proven. Only entries recorded with a date can be expunged.';
    } else if (monthDiff24(target.date, monthKey) < EXPUNGE_CLEAN_MONTHS) {
      const left = EXPUNGE_CLEAN_MONTHS - monthDiff24(target.date, monthKey);
      reason = `The clean period is ${EXPUNGE_CLEAN_MONTHS} game-months; this entry needs ${left} more month(s) with no new offense.`;
    } else {
      reason = 'A newer offense is on the record; the clean period runs from the newest offense, so this entry is not eligible yet.';
    }
    return { success: false, remaining: raw, removed: null, cost: 0, reason };
  }
  const remaining = raw.filter((_, i) => i !== target.index);
  return {
    success: true,
    remaining,
    removed: target,
    cost: EXPUNGE_COST,
    reason: 'Expunged.',
  };
}
