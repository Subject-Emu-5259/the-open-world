# THE OPEN WORLD — MEGA-EXPANSION ROADMAP SPEC v0.108.20

**Status:** SPEC FIRST, then built to it. Stacks on v0.108.19 (submitted,
pending review). v0.108.17 is live. **STAGE ONLY — do NOT submit**; Dre
reviews the breakdown first, then gives the submit go.

**Design rule (from the .18 audit, extended):** extend PROVEN systems,
never duplicate them. Every item below names the exact system it
extends. Two earlier scoping calls are SUPERSEDED by Dre's explicit
orders and must NOT be re-litigated: (a) .15 skipped recurring tax —
the IRS order overrides it (tax is designed fairly anyway, see §1);
(b) .19 excluded family simulation beyond Partner — the Family order
overrides it (family mechanics stay clean and game-mechanical, see §4).

**Global constraints (all 18 items):**
- Additive only. Existing saves keep loading; every new player field
  is optional and defaulted on read (same rule as .15/.18/.19).
- Existing command/state/tick architecture only. No new currencies,
  no new external services, no dialogue/Optra changes, no .18
  menu/theme changes. Expanded mode stays a player option.
- Economy scale (never break it): entry jobs ~$26k–$38k/yr
  (~$2,200–$3,200/mo), owned rents ~$800–$3,500/mo on occupied units
  only, bank interest 0.5%/mo. Every new cash reward sits at or below
  this scale; every new cash cost is payable from ordinary play.
  The one inherent exception is tax (§1), which is still designed to
  stay survivable (deduction + graduated brackets + payment plan).
- No invented lore, cities, NPCs, or venues beyond existing data.
  City content derives from CITY_METADATA / WORLD_CITIES / district
  data; NPC content from the existing roster; holidays from the real
  calendar (§6/§17).
- Help documents EVERY new/changed command with exact syntax (Dre's
  non-negotiable .20 rule — see §19). Usage blocks match reality.
- Harness proves every new command/mechanic with REAL effect (state
  changed, correct output, money/tax/rank/news/trade actually
  computed) — dispatch-without-"Unknown command" is NOT proof (§19).
- **Unified time design (§6 + §9):** ONE game clock (the existing
  TimeEngine, actions advance it, starting 2024-01-01). Calendar,
  years, seasons, holidays, aging, and life stages all derive from
  that single clock. No second clock, no competing date system.

---

## §1 — IRS EXPANSION (extends: monthly tick + income tracking)

Tax is annual, fair, and never a surprise bill that bankrupts a new
player. Income is tracked additively on the player
(`taxYear`, `taxAnnualIncome`): every cash income event the engine
already pays (work shifts, gig pay, overtime, business tick income,
rent tick income, goal rewards, passport payouts, event appearance
pay) adds to `taxAnnualIncome` for the current game-year. Cash
SPENDING is never taxed. Old saves start at 0 for the current year.

- Standard deduction: first **$12,000** of annual income is tax-free.
- Graduated brackets on taxable income (income − deduction):
  10% up to $40,000 · 15% up to $85,000 · 25% above $85,000.
  Worked example (spec-checked): $30,000 income → taxable $18,000 →
  $1,800 owed. A new player earning under $12,000 owes $0.
- Assessment: when the game-year crosses (January, in the monthly
  tick), the prior year's liability is computed and stored
  (`taxOwed`, `taxYearDue`). A tick line announces it — no silent debt.
- Commands:
  - `tax` — status: current-year income so far, estimated liability,
    amount owed (if assessed), deadline, payment-plan status.
  - `file taxes` — pay the assessed liability in full from cash.
    Refuses cleanly if nothing is owed or cash is short (names the
    shortfall and points at `tax plan`).
  - `tax plan` — split an assessed liability into 3 monthly
    installments, auto-deducted in the monthly tick, no interest.
    A missed installment (cash short in the tick) breaks the plan and
    adds a 5% penalty to the remainder.
- Late penalty: liability unpaid 4 game-months past assessment gains
  +10% once, plus $25/month late fee in the tick. Penalties are
  itemized in `tax` output, never hidden.
- Deadline shown in `tax` and `calendar`: taxes are due 4 game-months
  after assessment (the "April" rule, stated in game-months so it
  survives the action-driven clock).
- Rewards/costs: tax is a cost, not a reward. Nothing here pays the
  player. Filing on time grants a journal log line only.

## §2 — COURT AND POLICE EXPANSION (extends: .15 court/heat/fines,
## .18 crime menu, lawyer clean/appeal, prison)

Cases: every citation/fine the engine already issues also creates a
case record (additive `player.cases`: { id, offense, fine, status }).
Status flow: open → defended → dismissed | reduced | upheld.
Case ids are `case-<n>` in creation order (deterministic, no random).

- Commands:
  - `cases` — open + resolved cases with offense, fine, status.
  - `case [id]` — one case in full: offense, fine, status, outcome.
  - `lawyer defend [id]` — $250 fee, case must be open. Outcome is
    DETERMINISTIC from a hash of the case id (so the harness can
    assert it, and players get consistent rulings): dismissed (fine
    removed), reduced (fine halved), or upheld (fine stands + $100
    court costs). `lawyer` usage gains the defend form; clean/appeal
    behavior is unchanged.
  - `police` — standing: heat, active investigations, patrol level
    in the current city (derived from that city's crimeRate:
    Relaxed <40 · Moderate 40–59 · Strict 60+), and what cools heat.
- Investigations: heat ≥ 50 opens an investigation (additive
  `player.investigations`: { id, openedAtHeat, status }); heat ≥ 80
  opens a second. Investigations are shown in `police` and `court`.
  `laylow` and time decay close investigations when heat falls
  below 30. An open investigation raises `lawyer clean` cost by $200
  each (clean pricing itself is unchanged otherwise).
- `court` output gains open cases + investigations lines. No change
  to arrest behavior, prison, fines, or the fine schedule.
- Rewards/costs: defend fee $250; upheld adds $100 court costs;
  dismissed/reduced SAVE the player the fine — the only "reward" is
  money not lost. No new income.

## §3 — COLLEGE AND SCHOOL EXPANSION (extends: 7 schools / 13 courses,
## enroll → study → graduate chain, certifications)

One new course per existing school (7 new courses, ids/hours/costs
in the existing ranges — builder reads school-engine.ts and matches
each school's scale; no school gains a course its catalog cannot
support). New courses use the existing enroll/study/graduate path
unchanged — no parallel education system.

- Commands:
  - `schools` — extended catalog (existing command, new rows).
  - `degrees` — completed credentials (from `certifications`) +
    in-progress course + next credential hint (certificate →
    associate → bachelor → master by completed-course count within
    a school family, computed from live state, never stored as a
    separate rank).
  - `campus` — school life at your enrolled school (or nearest
    school list when unenrolled): study group (free, 2h, +10
    intelligence XP), club social (free, 2h, +5 happiness, +3
    relationship with a random classmate NPC from the roster —
    roster NPCs only, no invented classmates). Both use existing
    XP/happiness paths.
- Graduation progression: completing a course logs a journal entry
  and counts toward `degrees`; no diploma item, no new currency.
- Rewards: XP + happiness only, within existing skill scales. Course
  costs stay in existing ranges (no $10k surprise courses).

## §4 — FAMILY EXPANSION (extends: .19 Partner status, relationships,
## property ownership, journal)

Clean and game-mechanical. No romance simulation beyond status.

- `propose [name]` — requires Partner tier (90+) with that NPC,
  costs $200 (ring), uses the shared name resolver. Success sets
  `spouse: true` on that relationship (replacing the Partner label
  with "Spouse" in `friends`/`profile`/`milestones`) and logs a
  journal entry. Only one spouse at a time (a second proposal
  refuses and names the current spouse).
- `family` — household view: spouse, children, household size,
  next family dates (anniversaries, birthdays).
- `welcome child [name]` — requires a spouse AND an owned property
  (a family needs a home), costs $300. Creates a child record
  (additive `player.children`: { name, birthYear }) — the name is
  player-supplied, so no invented NPCs. Child age = current
  game-year − birthYear. Stages: baby 0–2 · child 3–12 · teen 13–17 ·
  young adult 18+ (stays in the family record; no household exit
  mechanic — no one is removed from the family).
- `family activity [movie|picnic|dinner]` — movie $40 · picnic $25 ·
  dinner $60; 2h; +5 happiness per household member count capped at
  +15, +2 relationship with spouse. Requires a spouse (family
  activities are household activities).
- Family dates: each game-year crossing logs spouse anniversary
  (+5 happiness) and each child's birthday (+5 happiness) in the
  journal + tick line. No costs, no penalties, no aging-out.
- Rewards: happiness + relationship only. No money, no XP farm.

## §5 — LOCAL, STATE, FEDERAL EXPANSION, INCLUDING JOBS (extends: .15
## government command, jobs-database categories, civic standing)

Tiers derive from data, never invented: state/country comes from the
city's display name suffix ("Memphis, TN" → Tennessee; "London, UK"
→ United Kingdom; "Tokyo, Japan" → Japan). US cities sit under
United States federal; international cities under their own country.

- Commands:
  - `government` — unchanged local view (current city).
  - `government state` — state view: state name, state-level
    openings (jobs-database listings with category `political` in
    that state — matched by city, never invented listings).
  - `government federal` — federal view: country name, federal
    openings (listings with category `federal`).
  - `civic` — civic standing: community reputation → civic title
    (Resident <25 · Active Citizen 25+ · Community Leader 50+ ·
    Public Servant 75+ · Office Holder 100+), plus which tier jobs
    are open to you (trusted-job blocking from `court` still applies).
- Jobs at each tier use the EXISTING `apply [job]` flow — no new
  hiring path. Government listings are surfaced, not created.
- Rewards: job pay only, at existing listing rates. Civic titles are
  labels, not powers (no discounts, no gates beyond existing trusted
  blocking).

## §6 + §9 — CALENDAR AND YEARS + TIME AND ADVANCING (ONE UNIFIED
## DESIGN — extends: TimeEngine, monthly tick, journal, status)

One clock: the existing TimeEngine (actions advance it, starting
2024-01-01). Everything here derives from it.

- Seasons from month: Winter Dec–Feb · Spring Mar–May · Summer
  Jun–Aug · Autumn Sep–Nov.
- Player age: new players start at 18 (`ageYears`, additive; old
  saves default to 18 on first .20 load — documented migration
  default; age affects labels and summaries only, never stats).
  Each game-year crossing: age +1, birthday journal entry, +5
  happiness, tick line.
- Life stages (labels only, no stat effects, no punishments):
  Young Adult 18–29 · Adult 30–49 · Midlife 50–64 · Senior 65+.
  `status` gains an age + stage line.
- Annual stats: the monthly tick accumulates per-year totals
  (additive `annualStats`: { year: { earned, spent, citiesVisited,
  shiftsWorked, milestonesHit } }) from values the tick already
  computes. Nothing new is tracked beyond summing existing flows.
- Commands:
  - `calendar` — current game date, season, day-of-year progress,
    days until year end, age + stage, upcoming markers (next
    holiday, tax deadline, anniversaries/birthdays).
  - `years` — year-by-year summary from `annualStats` (each year:
    earned, cities, shifts, milestone count) + current-year
    running totals. Years with no data show as such, never invented.
- Year-crossing (in the monthly tick, when the month key's year
  increments): age/birthday, tax assessment (§1), family dates (§4),
  annual summary line. One hook, all year systems ride it.

## §7 — JOBS AND MORE EXPANSION (extends: .15 job revamp + promotion
## system, job lifecycle, skills)

- Commands:
  - `gigs` — gig catalog.
  - `gig [delivery|rideshare|freelance]` — side work, no employer:
    delivery $60 / 2h (no requirements); rideshare $75 / 3h (requires
    any owned car, condition 30%+, −1 condition); freelance $90 / 3h
    (requires tech or craftsmanship level 3+). Each grants +10 XP
    in its skill (driving / driving / tech-or-craftsmanship).
    Hustle trait (§12) pays +20% gig pay — the one ongoing trait hook.
  - `overtime` — employed only: one extra 8h shift at 1.5× hourly
    pay, −35 energy (same as a normal shift), counts as a shift for
    tenure/promotion. Refuses cleanly when unemployed or exhausted.
  - `career` — extended (existing command): work-milestone titles
    from `workDaysCompleted` (10 shifts "Regular" · 25 "Reliable" ·
    50 "Veteran" · 100 "Lifer"), shown as labels + journal entries
    at each crossing. No money beyond existing pay/promotion.
- Rewards stay at/below shift pay. Gigs never beat a job shift
  per-hour by design (delivery $30/h vs shift ~$100+/8h is comparable
  but gig-gated by time/energy all the same — gigs cost energy like
  work: −15 energy each).

## §8 — MONEY AND BANK EXPANSION (extends: bank + deposit/withdraw +
## 0.5%/mo interest, monthly tick)

- Commands:
  - `savings` — savings goals view: goals, progress, bank balance.
  - `savings goal [name] [amount]` — create a goal (name +
    positive amount; max 5 open goals). Goals are trackers, not
    separate accounts: money stays in `bankBalance` and earns the
    same 0.5%/mo.
  - `savings deposit [amount]` — move cash → bankBalance and credit
    the most-recent open goal's progress (or a named goal:
    `savings deposit [goal] [amount]`). Goal completion logs a
    journal entry. No interest change, no fees.
  - `loans` — loan status: outstanding balance, credit standing,
    monthly payment, next due tick.
  - `loan [amount]` — borrow up to your credit limit
    ($1,000 + credit × $50; credit starts at 50 → $3,500 cap;
    credit 100 → $6,000 cap; never above $6,000). Cash in hand
    immediately. Interest 2%/mo on the outstanding balance, charged
    in the monthly tick.
  - `loan pay [amount]` — repay from cash (oldest balance first;
    partial payments allowed).
- Credit standing (additive `player.credit`, starts at 50, range
  0–100): +2 per on-time monthly loan payment (tick payment made
  in full), −10 per missed loan payment (cash short in the tick),
  −10 per broken tax plan installment (§1). Credit affects ONLY
  the loan cap — never job eligibility, never prices.
- Missed loan payment in the tick: $25 late fee added to the balance
  (itemized in the tick line), never a seizure, never an arrest.
- Rewards: borrowed cash is debt, not income — the tick charges
  interest until repaid. No money printer: max $6,000 one-time debt
  against ~$2,200–$3,200/mo job income is repayable, not free.

## §10 — LIFE HARD EXPANSION (extends: monthly tick, status, bills)

OFF BY DEFAULT for every player, new and existing. Nothing changes
unless the player opts in. When on, pressure is graduated and
itemized — never a surprise wipe.

- Commands:
  - `hardmode` — status + rules + how to toggle.
  - `hardmode on` — enable. Prints the full rules on enable (no
    hidden mechanics). Future monthly ticks include bills.
  - `hardmode off` — disable future bills. Existing hard debt
    remains until paid (honest — toggling off does not erase debt).
  - `bills` — bills due, hard debt, payment status.
  - `bills pay [amount|all]` — pay hard debt from cash (debt first,
    then nothing — bills pay never overpays into a void).
- Bills (monthly tick, hard mode only): utilities $120 + food $150
  + $50 per owned property + $30 per owned vehicle. A single
  player with no assets pays $270/mo — inside entry-job income.
  Bills are deducted from cash in the tick; a shortfall becomes
  hard debt (additive `player.hardDebt`), +10 stress, −5 happiness
  that month, all itemized in the tick line. Debt never compounds
  (no interest on hard debt), never triggers arrest or seizure.
- Rewards: none. Hard mode is a pressure layer, not a payout mode.
  (No "hard mode bonus pay" — that would subsidize the pressure
  away and break the economy.)

## §12 — CHARACTER AND START LOCATION EXPANSION (extends: BACKGROUNDS
## shared source of truth, creation flow, go-home definition)

- Backgrounds (all added to `src/shared/backgrounds.ts` — the single
  source of truth; client labels MUST be generated from it, never
  hardcoded): service_industry ($500, charisma +5, "Tables, tips,
  and regulars. People skills."), immigrant ($200, charisma +3,
  intelligence +3, "New city, fresh start. Resourceful."),
  veteran ($600, fitness +5, energy +5, "Service done. Discipline
  kept."), first_gen ($150, intelligence +5, "First in the family
  to chase more. Book smart, hungry."). Bonuses use ONLY top-level
  engine stats (applyBackground applies `bonus.stat in player` —
  fitness, intelligence, charisma, energy — never nested skill keys).
  The legacy 10-entry table in types.ts (BACKGROUND_DATA) is NOT the
  live path (the .18 audit established backgrounds.ts); do not add
  to it, do not reconcile it in this version — flag it as a known
  divergence in the report, not a silent fix.
- Traits (from the existing 8 Trait definitions in types.ts — no
  invented traits): creation gains an optional trait pick (one).
  Stored additively (`player.traits`, default []). Each trait grants
  exactly one starting bonus at creation (table below) and is shown
  in `profile` + `backgrounds`. The ONLY ongoing trait hook is
  hustle → +20% gig pay (§7); every other trait is a recorded
  identity choice future versions may hook — the spec says so
  plainly instead of pretending at eight hooks.
  Trait starting bonuses: charisma_trait → charisma +5 ·
  discipline → energy +5 · empathy → happiness +5 · hustle → cash
  +$100 (stake) · intelligence → intelligence +5 · risk_taking →
  cash +$100 (stake) · resilient → stress −10 (from 20 to 10) ·
  ambitious → charisma +3, intelligence +3.
- Commands:
  - `backgrounds` — all backgrounds + bonuses + traits list
    (in-game reference; labels generated from BACKGROUNDS).
  - `profile` — extended (existing command): background, trait,
    start city lines alongside existing output.
  - `name [first name]` — rename the current character (new life
    naming for §14; single first name, letters/spaces only, no
    empty names). Tiny, natural, part of character identity.
- Start location: creation gains a start-city select listing all 27
  real cities (display names from WORLD_CITIES). The server create
  handler accepts `startCity`, validates it against WORLD_CITIES
  keys (invalid → west_memphis, never a crash), and sets
  `player.city` + `player.district` (first district of that city
  from WORLD_DISTRICTS, fallback 'downtown') + `visitedCities: [start]`
  + additive `player.startCity`. Each city's real modifiers apply
  automatically (enforcement, events, jobs are all city-driven —
  nothing special-cased per start city).
- Home definition (must keep working): go-home resolution becomes
  first-owned-property's city → `player.startCity` → 'west_memphis'
  (old saves without startCity keep the exact old behavior). The
  `go home` help line is updated to say so.

## §13 — IN-GAME REDDIT LEADERBOARD (extends: per-install Redis saves,
## progression data; placement decided per Dre's delegation)

Placement (Melo's pick, decided): the MAIN MENU gains its own
Leaderboard row (visible between sessions, fully out of gameplay's
way), PLUS the player's own rank line on the Status screen. Do NOT
put it in the pause/Game Menu — .17 trimmed that menu to five clean
items, and a leaderboard there would re-clutter it.

- Metric (surveyed pick, documented): LIFETIME XP = sum over skills
  of ((level − 1) × 100 + xp). It is monotone, reflects every
  progression path (work skills, driving, cooking, fitness), and is
  computable from existing state with no new tracking. (Alternatives
  considered and rejected: cash — spendable, not progression;
  workDaysCompleted — one-dimensional; achievements count — coarse.)
- Server model: install-scoped Redis (Devvit Redis is per-install,
  so one sub's board never sees another sub's players — no
  cross-sub leakage by platform design). Shared sorted set
  `tow:leaderboard`, member = Reddit username (already the game's
  player identity), score = lifetime XP. Updated on every
  command-path save (best-effort, never blocks gameplay — a failed
  board write logs and moves on, exactly like telemetry).
- Surfaces (one ranking source, three views):
  - Main-menu Leaderboard row → leaderboard screen (top 10 +
    viewing player's rank + lifetime XP).
  - `leaderboard` command → top 10 + own rank as text (served by
  the server handler, since the engine cannot see Redis — see below).
  - Status screen rank line → client fetches the same endpoint
    when status is shown and appends "Community rank: #N"
    (best-effort; a failed fetch shows no line, never an error).
- Endpoint: GET /api/leaderboard → { top: [{ username, xp, rank }],
  me: { rank, xp } | null }. Username comes from server context
  (same identity as saves).
- Handler seam: inputs starting with `leaderboard` are served by
  the server handler (ranking read + text render) instead of the
  engine, because ranking lives in Redis. All other commands flow
  through the engine unchanged.
- Rank display uses Reddit usernames only — no real names, no PII
  beyond the identity the game already uses.
- Harness: ranking module with an injected store interface; harness
  uses an in-memory store (real ordering + rank resolution logic,
  end-to-end at the logic layer). Cases: rankings order correctly,
  own rank resolves (including unranked → null, never a crash),
  two separate stores never mix (community separation). Live Redis
  wiring is verified by code review + Dre's playtest (stated
  honestly — the VM cannot reach a live install).

## §14 — LEGACY LOOP (extends: character lifecycle, journal, creation
## bonuses; endgame WITHOUT death)

No death mechanic is added. Retirement is a player choice, not a
punishment.

- Commands:
  - `retire` — preview: retired-life summary (name, years lived
    from ageYears, cities visited, wealth, achievements count) +
    the legacy bonus the next life would carry + "type 'retire
    confirm' to retire". Nothing changes on preview.
  - `retire confirm` — executes: the life is archived (additive
    `player.legacy`: [{ name, years, cities, wealth, achievements,
    retiredYear }]) and `player.legacyCount` increments; the player
    resets to a fresh life (initPlayer-equivalent) KEEPING ONLY
    `legacy` + `legacyCount`; background stays the previous
    background (no creation-screen round-trip inside the engine);
    name resets to 'Traveler' (rename with `name`, §12).
  - `legacy` — past lives + current legacy bonus.
- Legacy bonus (capped, non-compounding): next life's starting
  money = background starting money + ($100 × min(legacyCount, 5)).
  Cap: $500 maximum bonus, reached at 5 retired lives; the 6th
  retirement adds nothing further. Because the bonus is computed
  from legacyCount alone (never from retired wealth), wealth
  cannot compound across retirements — a billionaire's heir starts
  with at most +$500, same as anyone else's.
- Rewards: the bonus only. No stat carryover, no item carryover,
  no skill carryover — a new life is a new life.

## §15 — COMMUNITY CHALLENGES (extends: weekKey determinism, income
## + travel flows, leaderboard visibility)

One shared goal per game-week per install community. The goal TYPE
is deterministic from weekKey (cycles: earnings → cities visited →
work shifts → repeat), so every player sees the same goal. The
community total lives in install-scoped Redis (same scoping as §13);
the player's own contribution lives on the player state (additive
`challengeWeek`, `challengeContribution`).

- Commands:
  - `challenge` — this week's goal, the player's contribution
    this week, the participation threshold, and how to contribute.
- Contribution hooks (engine sets an optional contribution on the
  command result; the server handler adds it to the Redis weekly
  total best-effort): earning commands (work, gig, overtime) add
  cash earned; travel/roadtrip add 1 city on first visit that week;
  work shifts add 1 shift. Only SUCCESSFUL commands contribute.
- Community total + top contributors: served by GET /api/challenge
  and shown as a section on the leaderboard screen ("with
  leaderboard visibility for who's contributing" — the board shows
  top contributors by contribution, not just XP).
- Rewards (participation-based, NEVER winner-take-all, NEVER gated
  on the community total — the engine cannot see Redis, so gating
  on it would be unprovable and unfair): any player whose weekly
  contribution reaches the participation threshold (earnings $500
  · cities 3 · shifts 3, by goal type) receives +$75 at the next
  week rollover, granted by the engine at the first command of the
  new week (engine knows its own contribution + the rollover —
  fully provable). The community target is a shared aspiration
  shown on the board, not a payout gate.
- Rewards scale: $75 one-time per week is below one shift's pay
  scale and below daily-goal rewards — modest by design.

## §16 — WORLD NEWSPAPER (extends: world events calendar, investments,
## journal, challenge goal; NO invented news)

- Command: `news` — a dated daily feed built ONLY from real state.
  Sections, each present only when its data exists (a section with
  no data says so plainly — never a fabricated entry):
  - This week's world events (worldEventsThisWeek, display names).
  - Market (the player's own investments: names + values; plus
    economic indices of visited cities from CITY_METADATA — real
    numbers, not tickers or invented movement).
  - Milestones (recent journal log entries + newly unlocked
    achievements, capped at 5 lines).
  - Community challenge goal this week (deterministic from weekKey).
  - Community top 3 (client appends from the leaderboard endpoint
    when available, best-effort — same pattern as the status rank
    line; a failed fetch omits the section, never invents names).
- No fabricated entries, no invented headlines, no rumor lines.
  Every line traces to a data source named in this spec. The date
  line uses the game clock.

## §17 — SEASONS AND HOLIDAYS (extends: §6 calendar, world events,
## attend)

Dates derive from the real calendar; content derives from the
calendar design. Nothing invented outside it.

- Holiday table (fixed, computable dates): New Year's Day Jan 1 ·
  Valentine's Day Feb 14 · Independence Day Jul 4 · Halloween
  Oct 31 · Thanksgiving (4th Thursday of November, computed) ·
  Christmas Dec 25 · plus season starts Mar 20 / Jun 21 / Sep 22 /
  Dec 21 (shown in `calendar`, not holidays).
- Holiday weeks: the game-week containing a holiday is a holiday
  week. In a holiday week, `events` output carries the holiday
  label for that week (holiday name + the city's own event
  activity — the city data still drives the activity), and
  `attend` during a holiday week grants +5 extra happiness and
  +$25 (holiday bonus, inside daily-goal reward scale).
- Seasonal variants: summer weeks prefer beach/outdoor event
  templates where the city carries a matching modifier; winter
  weeks prefer market/fair templates — a preference inside the
  existing template pool, never a new event system.
- `calendar` shows the current season + next holiday + days away.
- Rewards: +5 happiness, +$25 per holiday attendance — modest,
  weekly-capped by one-attendance-per-event.

## §18 — PLAYER TRADING (extends: inventory items, per-install Redis
## saves; EXPLOIT-PROOFING IS A REQUIREMENT)

Trade inventory items ONLY (never vehicles, properties, businesses,
cash as an item, or skills). Cash may be the asking price of an
item trade, never the traded object itself.

- Commands (served by the server handler, NOT the engine — the
  handler alone can load another player's save from Redis):
  - `trade offer [username] [item name] [price]` — create an offer
    (price 0 = gift). Validations, ALL server-side: item exists in
    YOUR saved inventory (loaded from Redis, not trusted from the
    client); recipient is not yourself; price 0–$10,000; at most 3
    open offers per player; no trades while incarcerated.
  - `trade list` — offers addressed to you + your open offers.
  - `trade accept [offer id]` — atomic sequence, in this order:
    (1) load offer; missing/expired → fail, nothing moves;
    (2) DELETE the offer first (so a concurrent second accept finds
    nothing — the race closes here); (3) load the SENDER's current
    save from Redis and re-validate the item is still owned — if
    not, the offer is void, nothing moves, acceptor is told;
    (4) remove the item from the sender, add it to the acceptor,
    move price cash acceptor → sender (acceptor cash short →
    abort BEFORE any move, offer already deleted = trade void, no
    duplication, no partial transfer); (5) save both players.
    Any failure before step 4's moves leaves both inventories
    untouched; any failure during step 4's moves is impossible by
    construction (all validations precede all moves).
  - `trade decline [offer id]` — recipient removes an offer.
  - `trade cancel [offer id]` — sender removes their own offer.
- Caps / rate limits: max 3 open offers per player; max 1 completed
  trade per real hour per player (`lastTradeAt` on player state,
  checked server-side); single-item offers only (no bundles — a
  bundle is a duplication surface); item value cap $5,000 (an item
  worth more cannot be offered — no wealth teleporting).
- No-duplication design: offers NEVER reserve or copy items (a
  reservation copy is a duplication path); the item stays in the
  sender's inventory until accept, and accept re-validates against
  the sender's live save. No client-supplied inventory is ever
  trusted — every ownership check reads Redis.
- No-farming-loop design: price caps + hourly rate limit + no
  item duplication + no XP/money created by trading (price cash is
  a transfer, never minted). Trading cannot mint money or items.
- Offer expiry: 7 real days from creation (checked on list/accept;
  expired offers are deleted on sight).
- Harness negative cases (ALL must FAIL CLOSED — no state change):
  double-spend (accept twice → second fails, one item exists
  total); trading what you don't own (sender's item removed before
  accept → accept fails, nothing moves); rapid-fire trades (second
  trade within the hour → refused); 4th open offer → refused;
  self-trade → refused; over-cap price → refused; over-value item
  → refused; acceptor cash short → refused, offer void, nothing
  moves. If ANY part of trading cannot be made safe, it is reported
  as NOT SHIPPED with its reason — never shipped with a hole.
- Rewards: none created. Trading moves existing value only.

---

## §19 — HELP COVERAGE + EVERYTHING-WORKING (Dre's non-negotiables)

- EVERY new or changed command from §1–§18 appears in help with its
  EXACT syntax. No exceptions, no "documented elsewhere" shortcuts.
  Changed commands whose help lines change: `go home` (start-city
  fallback), `lawyer` (defend form), `career` (milestone titles),
  `bank` (savings/loans pointers), `government` (tier forms),
  `court` (cases/investigations lines), `schools` (new courses),
  `profile` (background/trait/start-city lines), `status` (age +
  stage + rank lines). New help sections: Taxes, Court & Police,
  College, Family, Government Tiers, Calendar & Years, Gigs,
  Money & Bank, Life Hard, Character & Starts, Leaderboard,
  Legacy, Challenges, Newspaper, Seasons & Holidays, Trading.
- Usage blocks for every new command match reality exactly (no
  syntax-shaped prose — the .18 `emails` lesson).
- Audit method (extends .18): the .20 harness asserts BOTH
  directions — every parser command appears in help (or a
  help-referenced sub-list) AND every help entry dispatches to
  real output. The harness FAILS if any new command is undocumented
  or any help entry is dead. Final report MUST include the
  help-coverage count: new .20 commands vs documented — they must
  match.
- Working standard (extends .17/.18): every new command, mechanic,
  and screen is proven END-TO-END with real output — state changed,
  correct output shown, money/tax/rank/news/trade actually computed.
  Dispatch-without-"Unknown command" is NOT proof. Any item that
  does not work gets FIXED, not shipped broken; any item that
  genuinely cannot be made to work is reported as NOT SHIPPED with
  its reason, and is NEVER included in the What's New entry or help.
- Final report MUST include a per-item working status for all 18
  items (works yes/no + harness evidence) alongside the
  help-coverage count.

---

## §20 — VERSION, WHAT'S NEW, AND STAGE GATE

- Bump exactly once 0.108.19 → 0.108.20 (package.json,
  src/shared/version.ts GAME_VERSION, server boot log line,
  AGENTS.md header).
- ONE v0.108.20 What's New entry at the TOP of renderUpdatesScreen,
  dated November 1, 2026, covering all SHIPPED items only (.19 entry
  untouched below it). An item reported NOT SHIPPED appears nowhere
  in the entry or help.
- Verify: type-check exit 0, build exit 0, ALL existing harnesses
  green, plus tools/harness-0.108.20.ts (new .20 harness) green.
- STAGE ONLY: no publish, no submit, no publish-0.108.20 log. The
  real-browser inspect gate cannot run against the live Reddit post
  from this VM (Reddit blocks this route) — say so honestly; Dre's
  live playtest is the visual verdict.

---

# APPENDIX A — ROADMAP ITEMS 19–23 (added after §§1–18)

**Scope amendment:** the §19 help-coverage gate and the §20 stage gate
now cover 23 items, not 18. Every rule in §19/§20 applies equally to
§§21–25: exact-syntax help, two-direction audit, real-effect harness
proof, NOT SHIPPED reporting, STAGE ONLY. Section numbers §§21–25
below correspond to roadmap items 19–23 (the §19/§20 numbers are the
gates, not items — do not renumber anything).

## §21 — ITEM 19: DEEPER WORKING (extends: the work shift itself,
## job record, employer data, roster NPCs)

**How this differs from §7 (Jobs and more):** §7 is BREADTH — more
jobs, gigs, overtime, career titles (what work you do, where you
work, how you get paid). §21 is DEPTH INSIDE the workday — the job
you already have, its people, its shifts, its daily events. Nothing
here adds a job listing, a gig, or a pay path; everything here makes
an existing shift feel like a day at work. Building the same thing
twice is forbidden: if a mechanic belongs in §7's lane (a new way to
earn), it does not also appear here.

- Commands:
  - `workplace` — your job, employer, today's workplace event (see
    below), your shift options, and your coworkers.
  - `shift [morning|evening|night]` — choose today's shift BEFORE
    working (default morning when unchosen). Morning: normal pay,
    −35 energy (existing shift). Evening: +10% pay, −40 energy
    (evenings run longer). Night: +20% pay, −45 energy, +5 stress
    (nights are hard). The choice applies to the next `work` only,
    then resets to morning — no stored shift preference, no
    permanent night-shift trap. Refuses cleanly when unemployed.
  - `coworkers` — roster NPCs who work where you work: NPCs whose
    district matches your job's district AND whose role shares your
    job's category family (builder maps job category → role
    keywords from the actual roster data; when no roster NPC
    matches, the output says so plainly — never invented coworkers).
  - `lunch [name]` — a workday meal with a coworker (must be a
    coworker from `coworkers`): 1h, $15, +3 relationship, +5
    happiness. Uses the shared name resolver. This is the
    workplace-flavored social action — it does not duplicate
    `hangout` (which is off-duty, 2h, $25).
- Workplace events (deterministic, one per game-day, from a hash of
  employer + game-date — same input, same event, provable):
  team lunch (+5 happiness, free), deadline week (+15% shift pay
  that day, +5 stress), review day (performance check: job
  performance ≥ 70 → +$50 bonus that day; below → no bonus, no
  penalty — reviews reward, never punish), quiet day (no effect,
  flavor only). `workplace` names today's event; `work` applies it.
- Rewards: shift differentials (+10%/+20%), event bonus ≤$50,
  relationship + happiness — all inside existing scales. No new
  income path: overtime (§7) and shifts (§21) are different levers
  on the same job, never stacked into a new pay grade.

## §22 — ITEM 20: DEEPER CITIZEN (extends: NPC roster + schedules,
## district data, community reputation)

No invented citizens. Every NAMED person is a roster NPC; crowd
descriptions are aggregates (no fake names, no fake counts — crowd
size words only: "a few", "a crowd", never numbers).

- Commands:
  - `citizens` — the living population of your current district,
    RIGHT NOW (time-of-day aware): roster NPCs whose schedule puts
    them in this district at the current game-hour (NPCs carry
    WeeklySchedule data — the builder reads it and matches
    day + hour + district), what the crowd is doing (aggregate
    activity from the district's jobTypes + time of day: morning
    commute, midday commerce, evening leisure, night quiet), and
    district needs (derived, never invented: safety from
    district crimeRate, prosperity from city economicIndex,
    community spirit from district communityRepBonus — shown as
    words: Strained / Steady / Strong).
  - `volunteer` — a 2h community shift in your district: +5
    community reputation, +3 happiness, −10 energy. Increments a
    district "helped" counter (additive, display-only in
    `citizens` — "this district has seen N volunteer shifts").
    No money, no XP — volunteering is civic, not a job.
- Interaction depth: `talk` to any NPC `citizens` names works
  through the existing conversation path (no new dialogue system).
  District needs are OBSERVED, not gamed: no mechanic raises a
  district's safety or prosperity numbers (those come from data).
- Rewards: reputation + happiness only. No money, no items.

## §23 — ITEM 21: CELEBRITIES AND RICH PEOPLE (extends: NPC roster,
## achievements, net-worth computation, events calendar)

No invented real-world celebrities. "Celebrity" and "elite" are
TIERS derived from existing data, applied to roster NPCs and to the
player.

- Notable NPCs (rule, documented — builder surveys the actual
  roster and applies exactly this): a roster NPC counts as a public
  figure if they appear as a local official in `government()` OR
  their role/description marks a public-facing leadership post
  (mayor, council, chief, director of a public body — matched
  against real role strings, listed in the report). A roster NPC
  counts as elite if their role marks ownership of a major
  enterprise or a top professional post (owner/founder/CEO/chief
  roles in the real roster data). The `fame` output names the rule;
  no NPC is hand-promoted outside it.
- Player fame (additive `player.fame`, 0–100, computed from live
  progress — never stored as a separate grind): +2 per achievement
  unlocked, +10 per net-worth tier reached (see below), +10 for
  reaching executive job tier, +5 per passport milestone claimed,
  +2 per community challenge participation payout. Fame is
  displayed, never spent.
- Wealth tiers (computed live from net worth = cash + bankBalance
  + property currentValues + investment currentValues + business
  purchase prices): Comfortable $25k · Wealthy $100k · Elite $250k.
  Tiers are labels in `fame` + `status`, not gates on jobs or prices.
- Commands:
  - `fame` — score, tier, sources (which progress contributed),
    wealth tier + net worth, and what is unlocked.
- Unlocks (modest, real): fame ≥ 25 → local recognition line in
  `status`; fame ≥ 50 → gala events appear in `events` (a gala in
  your city, attendable once per game-week, $10 entry, +10
  happiness, $100 appearance pay — the one above-scale pay in
  this item, capped by the weekly limit); fame ≥ 75 → elite
  circles line + elite NPC greetings gain a recognition flavor
  line (display only, no mechanical bonus).
- Rewards: gala pay $100/week max, happiness — inside scale by the
  weekly cap. No fame-purchased items, no pay-to-fame.

## §24 — ITEM 22: DEEPER COMPANIES (extends: jobs-database employers,
## job lifecycle, city economic data)

**How this differs from §2's business ownership (player-owned small
businesses):** a business is YOURS — you buy it, it pays you monthly
income, you sell it. A company is an ENTITY in the world — it has a
name, an industry, employees, growth, and performance, and it exists
whether or not you work there. You do NOT buy, sell, or run a
company in .20 (that lane stays with business ownership). You
OBSERVE companies and CLIMB inside one. Founding and running are
explicitly NOT in this item — the spec says so rather than
duplicating §2 under a new name.

- Companies derive from jobs-database employers (real data — FedEx,
  AutoZone HQ, First Horizon Bank, hospitals, city departments,
  federal agencies, and every other distinct employer string in the
  database). No invented companies, no invented employers.
- Company facts (all computed, never stored as a parallel economy):
  industry from the listing categories of that employer's jobs;
  employees = count of that employer's listings in jobs-database
  (real, countable); headquarters city = the city of its listings;
  size tier from employee count (Small <5 · Mid 5–14 · Large 15+).
- Growth + performance (deterministic, month-keyed, same rule as
  world events): monthly performance score P(employer, monthKey)
  ∈ 0–100 from a hash (same input → same output, provable, never
  presented as random); revenue figure = base (size tier × city
  economicIndex × $10k) grown by (1 + years-since-2024 × 2%) —
  a display figure that grows with the game clock, not a balance.
- Commands:
  - `companies` — all companies (name, industry, HQ city, size,
    this month's performance word: Struggling <40 · Steady 40–69 ·
    Thriving 70+).
  - `company [name]` — one company in full: industry, HQ,
    employees (listing count), size tier, revenue figure,
    performance history (last 3 game-months, computed), open jobs
    at that company (existing listings, applied to via `apply`).
- Climb path (the player-facing mechanic): reaching executive tier
  at a company (via the §7/.15 promotion path at that employer's
  listings) grants a monthly profit-share in the monthly tick:
  $100 × (performance tier: Struggling 0 · Steady 1 · Thriving 2)
  — $0–$200/mo, inside business-income scale, paid only while
  employed at that company at executive tier. Losing the job ends
  the share (no severance, no penalty).
- Rewards: profit-share $0–$200/mo, executive-tier only, while
  employed. No company ownership income, no stock overlap (§25
  handles market returns separately — a company can appear in both
  systems without double-paying: profit-share is employment income,
  stock returns are investment income, different sources).

## §25 — ITEM 23: WORLD STOCK (extends: the EXISTING investments
## system — not beside it)

Listed companies are the §24 companies (jobs-database employers).
Prices move on game-state rules the spec defines — never random
numbers presented as a market.

- Price rules (deterministic, month-keyed, stated in full):
  base price per company = $20 + (HQ city economicIndex × $1) +
  (size tier: Small $0 · Mid $25 · Large $50) — computable from
  data, e.g. a Large Memphis company bases at $20 + $65 + $50 =
  $135. Monthly change = (performance(employer, monthKey) − 50)
  × 0.1% + (HQ city economicIndex − 75) × 0.02%, clamped to
  ±5%/month. Price at month M = base × Π monthly factors from
  2024-01 to M (recomputed on read from monthKey — no stored price
  series, no RNG, same monthKey → same price for every player).
- Commands (through the investment flow — holdings reuse the
  Investment record shape: { name, shares, buyPrice, currentValue
  recomputed by price rules }):
  - `stocks` — listed companies: price, monthly change, performance
    word. (The existing `invest` list gains a stocks section
    pointing here — one market, two doors, same holdings.)
  - `stock [name]` — one company: price history (last 3
    game-months, computed), performance, HQ, size.
  - `buy stock [name] [amount]` — spend cash for shares at the
    current computed price (fractional shares allowed to cents —
    holdings store shares as a number, not whole units).
  - `sell stock [name] [amount]` — sell shares (or `all`) at the
    current computed price; proceeds to cash.
  - `index` — market indices (computed averages, never invented):
    World index (all listed companies' average monthly change),
    Mid-South index (companies HQ'd in the 4 Mid-South cities),
    plus each index's direction word. `investments` shows stock
    holdings with current values alongside existing investments.
- Rules that keep it a game, not a casino: no margin, no shorting,
  no options, no leverage; holdings recompute on read (sleep ticks
  investments at most once per game-day, same as existing
  investments); selling never mints money — proceeds come from
  price appreciation only, and prices can fall (performance below
  50 drags price down — losses are real and shown as such).
- Rewards: market returns only, bounded by ±5%/month per company.
  No dividends in .20 (a natural deepening for a later version,
  flagged, not built).

---

## "AND MORE" FOR ITEMS 19–23 — ALLOWED ONLY INSIDE THESE ITEMS

- Workplace event flavor lines (inside §21) — allowed.
- District "helped" counter display (inside §22) — allowed.
- Gala weekly cap enforcement (inside §23) — allowed.
- Company revenue display figure (inside §24) — allowed.
- Index direction words (inside §25) — allowed.
- NOT allowed: new cities, new NPCs, real celebrities, company
  founding/running, margin/shorting, fame purchases, district stat
  manipulation. Anything beyond this list is flagged in the report,
  not built.

---

# APPENDIX B — ROADMAP ITEM 24

**Scope amendment 2:** the §19 help-coverage gate and the §20 stage
gate now cover 24 items. §26 below corresponds to roadmap item 24.

## §26 — ITEM 24: DEEPER OWNING BUSINESS AND EMPLOYEE EXPANSION
## (extends: .15 business ownership, NPC roster, monthly tick)

**What is new here versus §7, §21, and §2 — stated exactly so
nothing is built twice or three times:**
- §2 (business ownership) = BUYING a small business that pays net
  monthly income. That base is unchanged: an unstaffed business
  still pays exactly its catalog income.
- §7 (Jobs and more) = jobs YOU TAKE as a worker (listings, gigs,
  overtime, career titles). Item 24 creates NO job listings and NO
  way for the player to work as an employee — player businesses
  never post to the jobs database (that would duplicate §7).
- §21 (Deeper working) = depth inside YOUR workday as an employee
  (shifts, coworkers, workplace events). Item 24 is the OTHER SIDE
  of that coin: you as the EMPLOYER. No new shift types, no new
  coworker mechanics for the player-as-worker.
- What item 24 ADDS: hiring, managing, and paying STAFF for the
  businesses you own — staffing levels, wages, morale, and how
  staff quality moves the business's monthly income. The one
  employee-side addition is visibility: a hired NPC's `profile`
  shows they work at your business (display from the staff record
  — no schedule changes, no new dialogue).

**Staff (drawn from existing data, never invented):** staff are
roster NPCs, hired by name through the shared name resolver
(exact → unique substring → refuse-with-list). A roster NPC can
work for at most one of your businesses at a time (hiring them
elsewhere refuses and names the business). Hiring requires owning
the business; firing is free and immediate (no severance).

**Slots by business type** (from the .15 catalog — bigger
operations hold more staff): Coffee Cart 1 · Food Truck 2 ·
Barbershop 2 · Corner Store 3 · Laundromat 2 · Auto Shop 3.
Hiring beyond slots refuses and names the slot count.

**Wages (proportional, NOT player-set, so wages cannot be gamed to
$0):** each staff's wage = 25% of their business's base monthly
income, rounded to dollars (Coffee Cart $45 · Food Truck $65 ·
Barbershop $95 · Corner Store $130 · Laundromat $160 · Auto Shop
$188), per staff per game-month, deducted in the monthly tick.
Proportional wages keep every business staffable: a flat wage
would exceed small businesses' whole income (a $300 wage on a
$180/mo cart is a trap, not a mechanic).

**Morale and performance (the management loop):** each staff
record carries morale (starts at 50, range 0–100). Monthly tick:
wages paid on time → morale +5 each; wages short (cash short in
the tick) → morale −15 each, itemized in the tick line (no debt,
no seizure — the mortgage-arrears philosophy: a shortfall is
noted, not punished by confiscation). Business income multiplier
from AVERAGE staff morale: ≥70 → ×1.1 · 30–69 → ×1.0 · <30 → ×0.8 ·
no staff → ×1.0 (the .15 base, untouched). Morale 0 staff QUIT
(they leave at the tick, named in the tick line — a neglected
business empties itself, it is never seized).

**Commands:**
- `hire [business] [npc name]` — hire a roster NPC into an open
  slot (validations: business owned, slot open, NPC on the roster,
  NPC not already staff elsewhere, player not incarcerated).
- `fire [business] [npc name]` — remove staff immediately.
- `staff` — all businesses with their staff, wages, morale.
- `staff [business]` — one business's staff in full.
- `raise [business] [npc name]` — +10% to that staff's wage
  (rounded, minimum +$10), +10 morale, once per game-month per
  staff (tracked by monthKey; a second raise in the same month
  refuses and names the rule). Morale caps at 100. Raises cost
  the player more wages, so a raise is only rational when it
  lifts the morale multiplier — the math below proves it stays
  rational (a mid→happy lift beats the raise cost).

**Monthly tick integration:** for each owned business, in the same
tick that already pays business income: deduct total wages → apply
morale changes → pay staffed income → handle quits. Staffed
income formula (checkable — the harness asserts these numbers):
effective income = base × (1 + 0.3 × staffCount) × moraleMult −
totalWages, where moraleMult comes from AVERAGE staff morale
(≥70 → 1.1 · 30–69 → 1.0 · <30 → 0.8) and unstaffed businesses pay
exactly base (the .15 behavior, untouched). Worked examples:
happy single-staff Auto Shop: 750 × 1.3 × 1.1 − 188 = $884.50
(vs $750 base: +$134.50). Mid single-staff Auto Shop:
750 × 1.3 − 188 = $787 (vs $750: +$37). Unhappy single-staff Auto
Shop: 750 × 1.3 × 0.8 − 188 = $592 (vs $750: −$158 — neglect
costs). Happy single-staff Coffee Cart: 180 × 1.3 × 1.1 − 45 =
$212.40 (vs $180: +$32.40). Hiring is net-positive at mid morale
or better, net-negative when neglected, and a raise that lifts
mid→happy pays for itself (Auto Shop: $787 → 750 × 1.3 × 1.1 −
207 = $865.50). Order matters (wages first, then income) and the
tick line itemizes wages, multiplier, and any quits.

---

# APPENDIX C — ROADMAP ITEM 25

**Scope amendment 3:** the §19 help-coverage gate and the §20 stage
gate now cover 25 items. §27 below corresponds to roadmap item 25.

## §27 — ITEM 25: DEEPER DIALOGUE AND CONVERSATION EXPANSION
## (extends: .17/.18 conversation fixes, ConversationEngine shared
## templates, dialogue profiles, per-player dialogue memory)

**HARD CONSTRAINT — TEMPLATE-ONLY, NON-NEGOTIABLE:** the Optra/LLM
path is blocked at platform level (api.optracloud.com domain
exception rejected) and that has not changed. This item adds NO LLM
provider call, makes NO feature depend on an LLM key or domain,
touches NO provider code, and promises NO "AI-powered replies"
anywhere in help or What's New. Every line of new dialogue comes
from templates + NPC profiles + per-player memory. (The stale
v0.108.10 What's New line promising AI replies on key setup is
history and stays untouched — .20 copy simply never repeats the
promise.)

**Structural depth (what "deeper" means here):** conversations gain
(a) topic choices, (b) follow-ups that remember what was said,
(c) relationship-gated topics, (d) mood/personality-driven reply
variation, (e) outcomes that feed the game — all through the
template engine. No new conversation UI, no new NPCs, no new
dialogue provider.

- Conversation flow (unchanged spine): `talk [name]` opens a
  conversation (existing); typed non-command text chats (existing
  .18 rule); `leave` exits (existing). NEW commands below are
  COMMANDS, so they must be added to KNOWN_COMMANDS — otherwise
  the .18 "commands win over chat" rule would swallow them as
  chat text. This is a correctness requirement, not a nicety.
- Commands (only meaningful inside a conversation; outside one
  they answer with "talk to someone first" + the `talk` hint —
  never a crash, never a fake conversation):
  - `topics` — this NPC's available topics RIGHT NOW: each topic
    with its tier requirement and locked/unlocked state. Topics
    derive from NPC data (role, city, district, quests on offer,
    relationship tier) — never invented topics for an NPC who has
    no basis for them.
  - `ask [topic]` — discuss a topic (unique-substring matching,
    refuse-with-list when ambiguous — the shared resolver rule).
    Costs nothing; advances 0 game-hours (topics are talk, not
    actions) but applies the outcome below.
- Topic set (tier-gated — the gate IS the progression):
  - Always open: `greeting` (the NPC's profile greeting),
    `city` (their city/district, from real data), `work` (their
    role and what it involves — role text from the roster).
  - Acquaintance 25+: `hometown` (their background flavor from
    profile data), `news` (their take on this week's world events
    — real event data, template voice).
  - Friend 50+: `personal` (family/dreams from profile data),
    `advice` (a tip: a real district to visit, a real job opening
    in their city, or a real event this week — data-backed hints
    only, never fabricated openings).
  - Close Friend 75+: `secret` (draws on the NPC's OWN secrets
    list from roster data — real NPC secrets, revealed only at
    this tier, template-voiced), `future` (their plans from
    profile/goal data).
  - Partner/Spouse 90+: `future together` (plans with the player
    — only for the Partner/Spouse NPC; refuses for anyone else
    with a plain explanation, never a fake romance line).
- Memory callbacks (via the existing per-player dialogue memory,
  player.dialogueMemory[npcId] — episodic + fact records, never
  shared across players): discussing a topic records it; a LATER
  discussion of any topic with the same NPC can open with a
  callback line when memory holds a matching fact — e.g. "Last
  time you asked about my work…" (topic discussed), "Thanks again
  for the help with [quest]" (quest completed via that NPC),
  "You got me that coffee — I still owe you one" (gift given).
  Callbacks reference ONLY facts recorded in that player's own
  memory for that NPC. No callback fires without a recorded fact
  (no invented shared history).
- Mood/personality variation (template selection, never
  generation): the NPC's currentMood + personalityTraits (real
  roster data) select among template variants for the same topic:
  a happy mood picks the warm variant, a grumpy mood the terse
  variant, a funny trait adds a joke line variant. Same topic +
  same mood + same traits → same reply (deterministic, provable).
  Mood/trait data is READ, never written, by this item.
- Outcomes that feed the game (all through existing hooks):
  relationship +2 per topic discussed (capped at +10 per
  conversation — topics are talk, not a relationship farm);
  `advice` hints point at real game objects (district/job/event);
  quest-giver topics fire the existing questTriggered hook when
  the NPC has a quest on offer (no new quest system);
  hospitality: a Close Friend+ topic can end with the NPC
  treating the player (+10 happiness, no money, no items — nothing
  minted, nothing invented). No outcome grants cash, XP, or items.
- Rewards: relationship + happiness + information + quest hooks
  only. Topics cost no time, no money, no energy — they are the
  reward for the relationship, not a new grind.
- Harness (real output, all of it): memory callback fires (discuss
  → memory records → re-discuss shows the callback line, and the
  SAME discussion with a fresh-memory NPC shows no callback);
  tier gating both sides (locked topic below its tier refuses
  naming the tier; unlocked at the tier answers); mood/trait
  variation (same topic under two moods yields two different
  template variants; same mood twice yields the same reply);
  outcomes apply (relationship +2 recorded, quest hook fires for
  a quest-giver topic, hospitality happiness applied, no cash/XP
  minted); `topics`/`ask` outside a conversation answer with the
  talk-first hint (never a crash); `topics`/`ask` mid-conversation
  dispatch as commands (KNOWN_COMMANDS membership asserted).

---

# APPENDIX D — ROADMAP ITEM 26

**Scope amendment 4:** the §19 help-coverage gate and the §20 stage
gate now cover 26 items. §28 below corresponds to roadmap item 26.

## §28 — ITEM 26: DEEPER PLAYER AND NPC GREETINGS EXPANSION
## (extends: greet command, greetingResponse templates, relationship
## footers, dialogue memory, NPC mood/personality data)

Builds on the relationship footers (.15) — the footer stays exactly
as it is; this item deepens the greeting LINE above it and the
player's choice of how to greet. No new NPCs, no lines contradicting
a character's established profile (a gruff NPC never greets like a
cheerful one; a stranger never greets like a close friend).

**NPC greeting variety (real state drives the line):** the
greeting template pool is keyed by FIVE real dimensions, and
selection is deterministic (same inputs → same line, provable):
time of day (existing greetingWordForTime) × relationship tier
band (stranger <25 · acquaintance 25–49 · friend 50–74 · close 75+ ·
partner/spouse 90+) × NPC mood (currentMood, real roster data) ×
district activity (what the NPC is doing, from schedule data) ×
memory (a callback line when that player's dialogue memory for
this NPC holds a shared fact — e.g. a past quest, a past gift, a
past topic — phrased from the fact, never invented history).
A fresh NPC (no memory, tier stranger, morning) gets the plain
intro line; a close friend in the evening with a shared quest
history gets a warm, specific line. Same NPC at different tiers,
moods, or times MUST yield different lines (harness asserts this);
the same inputs twice yield the same line (no RNG in greetings).

**Player greeting styles (the player picks the tone):** command
form extends, it does not fork: `greet [name]` (default: warm) and
`greet [name] [style]`. Styles:
- warm (default): the standard greeting; relationship change =
  the existing greetingRelChange (unchanged).
- respectful: a formal line; relationship = base change, +1
  community reputation (a respectful citizen is noticed).
- playful: requires relationship ≥ 25 — below that the NPC
  deflects with a cool flavor line and +0 relationship (no
  penalty, no fake warmth); at/above, relationship = base + 1
  and +2 happiness.
- cool: a brief nod; +0 relationship, flavor only (a roleplay
  choice for players who do not want to invest in this NPC).
Style words come from template pools (same deterministic
selection); a style never produces a line contradicting the NPC's
mood/traits (a grumpy NPC answers a playful greeting tersely —
the deflection above is the floor, not an exception).

**Anti-farming (the exploit rule):** relationship/reputation
effects from greetings apply at most ONCE per NPC per game-day
(tracked on the relationship record as lastGreetDate = game-date
string). Repeat greetings the same day still show a varied line
(the line variety is free) but carry NO effect, and the output
marks this plainly ("— already greeted today") so no player is
confused about why nothing changed. Greetings can never be a
relationship farm: the daily cap + the small base change make
grinding greetings strictly worse than gifts, hangouts, and topics.

**Help + harness:** help's `greet` line gains the style forms and
the daily-cap note. Harness (real output): greeting varies by
tier (same NPC, two tiers → two lines), by mood (two moods → two
lines), by time (morning vs evening → two lines), by memory
(shared fact → callback line present; fresh NPC → absent);
player styles apply exactly their effects (warm = base,
respectful = base +1 community rep, playful below 25 = +0 with
deflection, playful at 25+ = base +1 and +2 happiness, cool =
+0); second greet same day same NPC = line shown, effects +0,
"already greeted today" marker present; next game-day greet
applies effects again.

---

# APPENDIX E — ROADMAP ITEM 27 (FIX, NOT A FEATURE)

**Scope amendment 5:** the §19 help-coverage gate and the §20 stage
gate now cover 27 items. §29 below corresponds to roadmap item 27.
This item rides .20 because .19 is already submitted and cannot be
amended. It is listed in the .20 What's New entry as a FIX.

## §29 — ITEM 27: WEST MEMPHIS HAS NOBODY (LIVE BUG FIX)

**Symptom (live .17, Dre's playtest):** `people` in West Memphis
returns "No one around right now. Try exploring or visiting
different districts."

**ROOT CAUSE — DIAGNOSED (hypothesis (a), proven in-tree):** the
NPC roster simply assigns NOBODY to west_memphis. A count of
`city:` assignments across the roster (social-engine.ts) shows
every other city populated — Tokyo 35, London 24, Memphis 23,
Paris 22, Dubai 21, Berlin 20, Sydney 19, Toronto 18, Mexico City
17, Little Rock 11, New York 10, Southaven / Los Angeles /
Chicago 8 each, New Orleans / Nashville / Houston / Atlanta 4
each, Miami / Dallas 3 each, Vegas / Seattle / Phoenix / Philly /
Detroit / Charlotte 1 each — and west_memphis ABSENT (0). The
`people()` filter itself is SOUND: it prefers the player's
district and falls back to city-wide (game-engine.ts `people()`),
and `nearby()` shares that pattern. No filter fix is needed —
a district fallback cannot rescue a city with zero residents.
(The `hqCity: 'west_memphis'` faction record is a faction HQ,
not an NPC, and does not count.)

**Why it matters beyond one command:** West Memphis is the
starting city (every new player begins there) and the go-home
default. The first social command a new player tries returns
emptiness. The .18 nearby-display work improved how people
RENDER; it could not fix a city with no people underneath.

**Fix (same precedent as .18 adding West Memphis property
listings where none existed):** populate west_memphis in the
EXISTING roster record format (builder mirrors a current NPC
record field-for-field: id, name, city, district, role, age,
gender, personalityTraits, description, goals, schedule,
relationship fields, quests where the format supports them — no
new record shape, no new system). 8 residents, small-town roles
fitting a border-city town (diner cook, truck-stop cashier,
gas-station attendant, barber, school teacher, river dock worker,
motel clerk, local mechanic — roles as roster-style role strings,
assigned to the three REAL districts: 3 Broadway, 3 Mississippi
Park, 2 Meadowlake). Names must be ordinary fictional names in
the roster's existing style — no real people, no celebrities,
no duplicates of existing roster NPC ids or names.

**All-cities audit (required, same fix):** run `people` for every
city the player can stand in (all 27). Findings to report:
west_memphis was the ONLY genuinely empty city (fixed above).
Six cities are THIN but non-empty (1 resident each: Vegas,
Seattle, Phoenix, Philly, Detroit, Charlotte) — `people` returns
someone there, so no action is taken on them in .20 (padding
thin cities is out of scope; the audit reports them, it does not
silently expand the roster). Every other city returns residents.

**District note (no extra fix needed):** a fresh player's district
is 'downtown' (a Memphis district, not a West Memphis one), so a
starting player stands in west_memphis with a non-local district.
`people()`'s city fallback already covers this — once residents
exist, `people` from 'downtown' lists them city-wide. The harness
proves this case explicitly rather than adding a district
migration (old saves keep their district values — additive rule).

**Harness (real output):** `people` in West Memphis overall lists
real NPCs with roles; `people` from each of its three districts
(Broadway, Mississippi Park, Meadowlake) lists residents; `people`
from district 'downtown' while in west_memphis lists residents
via the city fallback; the all-cities sweep (all 27) returns
non-empty for every city; `nearby` in West Memphis shows a
populated people section; `talk [new resident name]` dispatches
to a real conversation (the new NPCs are full roster citizens,
not display-only rows).

**Help + What's New:** no new command (this is a data fix), so
help gains no new entry — but the help-coverage gate still
applies (no help line promises people anywhere the fix does not
reach). What's New lists it as a FIX: "West Memphis has people
now — the starting city finally has residents to meet, talk to,
and befriend."

---

# APPENDIX F — ROADMAP ITEM 28 (P0 FIX)

**Scope amendment 6:** the §19 help-coverage gate and the §20 stage
gate now cover 28 items. §30 below corresponds to roadmap item 28.
This is the TOP-PRIORITY fix in .20: player money and progress
vanishing is worse than any missing feature.

## §30 — ITEM 28: BUSINESS PURCHASE LOST ON RELOAD (P0 FIX)

**Symptom (live .17, Dre's playtest):** Dre bought a business (the
.15 feature); after leaving and coming back, it is gone from his
game. Money spent, progress vanished.

**DIAGNOSIS — FULL ROUND-TRIP TRACED (engine exonerated, save
coordination convicted):** the engine round-trip is sound:
buyBusiness pushes the record onto player.businesses; getPlayer()
returns {...this.player} wholesale (no field filtering); loadState
spreads the incoming state (all fields survive, with array
defaults only filling when a field is MISSING); serverSavePlayer
JSON-stringifies the whole player. No engine step drops the field.
The loss happens in the CLIENT ↔ SERVER save coordination, via
three mechanisms in one family — "a stale copy wins":

1. **PRIMARY — server-wins without a freshness check
   (clientDetectSave):** on resume, the client takes the first
   server save found and mirrors it into localStorage,
   OVERWRITING the local copy unconditionally. If the server copy
   is stale — a failed command-path save, a timed-out sync, a
   delayed beacon — the fresh local copy (containing the
   business) is destroyed on next load, and the stale copy then
   re-syncs everywhere as truth. The .12 saveFailed banner WARNS
   about a failed sync but does NOTHING to prevent the next load
   from clobbering the good local copy. Warning without protection
   is how progress "vanishes."
2. **SECONDARY — lowest-slot-wins instead of newest
   (clientCheckServerSaves):** the resume scan checks slots 1→2→3
   and returns the FIRST non-empty slot. If the player's current
   game lives in slot 2/3 but slot 1 holds an older save, Continue
   resumes the older save — the business (in the newer slot)
   appears "gone." (The .12 history already records a slot-1
   migration bug in this family; this is its remaining half.)
3. **ENABLER — the server accepts stale writes:** /api/save and
   the command path persist whatever arrives with no staleness
   check, so a delayed leave-beacon carrying pre-buy state, or a
   stale local migration, can overwrite a newer server save.
   Separately, the /api/init POST no-command path persists
   unconditionally — today no client code sends an empty POST,
   but the endpoint must never be able to save a fresh blank
   player over a real save.

**Fix (root cause, not symptom — all four parts, no partial fix):**

(a) **Last-write-wins on load (client):** compare the server
    player's `lastSaved` (stamped by serverSavePlayer on every
    server write) against the local copy's `savedAt` (stamped by
    clientSave). Take the NEWER. If local wins, migrate it to the
    server (same slot) and surface a "recovered a newer save
    from this device" note. If server wins, mirror to local (the
    current behavior, now earned rather than assumed).
(b) **Newest-slot resume (client):** the resume scan reads ALL
    three server slots and picks the one with the greatest
    `lastSaved` — never the lowest number. The local fallback
    does the same across local slots by `savedAt`.
(c) **Server-side staleness guard (server):** on /api/save AND on
    command-path saves, before persisting, compare the incoming
    player's timestamp (its `savedAt` or `lastSaved`) against the
    stored save's `lastSaved`. If the stored copy is newer by
    more than a 5-second skew tolerance, REJECT the write and
    return the stored player so the client re-syncs to the newer
    copy (same pattern as saveFailed: a flag + a warning line,
    never silent). Incoming players with NO timestamp are treated
    as current (never reject a save that cannot be compared —
    old objects must not break). This kills the beacon race: a
    pre-buy beacon arriving after a post-buy server save is
    rejected, and the business survives.
(d) **No-command POST guard + create-slot fix (server + client):**
    an /api/init POST with no input AND no player AND no create
    action returns current state WITHOUT persisting — it must
    never save a fresh player over a slot. And the create POST
    sends `state.activeSlot` (today it sends no slot, so creation
    always writes slot 1) — creation writes the intended slot.

**Architecture (so the fix is provable, not just claimed):** the
pure save-resolution logic lives in ONE testable module shared by
client and server (e.g. src/shared/save-resolution.ts):
`pickNewerSave(serverPlayer, localPlayer)`,
`pickNewestSlot(slots)`, `isStaleWrite(incoming, stored)`.
The client and the server call these (thin wiring only). The
harness proves the pure functions; the wiring is verified by
code inspection (same honest limit as the live-Redis pieces).

**Field round-trip audit (required, same fix):** EVERY field
added in .15, .19, and .20 must survive save → quit → reload
intact. The audit list (builder extends it with every field it
actually added — the list below is the floor, not the ceiling):
.15: businesses, dailyGoals, journalLog, fines, jobTenure,
promotions, vehicle upgrades (vehicle.upgrades). .19: property
furniture lists, relationship partner flags, passportMilestones,
attendedEvents. .20 (as built): taxYear, taxAnnualIncome, taxOwed,
taxPlan, cases, investigations, children, spouse flags, ageYears,
annualStats, credit, loans, savings goals, hardDebt, hardMode,
startCity, traits, legacy, legacyCount, challengeWeek,
challengeContribution, staff records, lastTradeAt, fame, stock
holdings, workplace state, greeting lastGreetDate, dialogue
memory. Mechanism note: because loadState spreads the whole
incoming state and getPlayer returns the whole player, the audit
is expected to PASS for most fields — the audit's job is to
PROVE that per field, and to catch any field that some path
rebuilds, strips, or defaults away (any field that fails gets
FIXED, not noted-and-shipped).

**Save-failure surfacing audit (required):** verify the buy/save
paths actually use the .12 saveFailed path end to end: buy
business goes through handleCommand → /api/init POST → on Redis
failure the handler returns saveFailed + the warning line, and
the client shows the banner (existing wiring, re-verified, not
assumed). PLUS the new guard: a rejected stale write returns
the stored player + a stale flag + a warning line, and the client
re-syncs to the newer copy instead of displaying the stale one.
A save failure must NEVER again present as silent progress loss.

**Harness (real output):** buy business → getPlayer → loadState
into a fresh engine → same business (type, price, income);
one round-trip case per audited field (mutate → getPlayer →
fresh-engine loadState → field intact, values equal);
newer-local-wins (local savedAt > server lastSaved → local
chosen + migration flagged); newest-slot (slot 1 older, slot 2
newer → slot 2 chosen); stale-write rejection (pre-buy beacon
vs post-buy stored save → rejected, stored copy returned,
nothing overwritten); no-command POST never persists (guard
returns no-save); save-failure warning (Redis-failure branch
returns saveFailed/stale flag + warning line — pure part in
harness, Redis branch by code inspection, stated honestly).
Old-save compatibility: a save with none of the new fields loads
and saves without gaining phantom data or losing old data.

**Help + What's New:** no new command (this is a save-system
fix), so no new help entry — but the coverage gate still
applies. What's New lists it FIRST as a P0 fix: "Fixed: bought
businesses (and all other progress) could vanish after leaving
and coming back — saves now keep the newest copy, on every slot,
and a stale save can no longer overwrite a newer one."

---

# APPENDIX G — ROADMAP ITEM 29 (FIX)

**Scope amendment 7 (part 1):** the §19 help-coverage gate and the
§20 stage gate now cover 31 items. §31 below corresponds to
roadmap item 29. It is listed in the .20 What's New entry as a FIX.

## §31 — ITEM 29: MAIL READ PATH REJECTS NATURAL PHRASING (FIX)

**Symptom (live .17 screenshot, main sub):** bare `emails` lists
the inbox correctly (Inbox (1), "Welcome to West Memphis!", id
email_1793594414702_jo1jl, hint 'Read one with "email read
[id]"'). But the natural follow-up `read email_1793594414702_jo1jl`
answers `Unknown command: "read". Did you mean "rest"?` — two
failures: (1) `read [id]` is not accepted though it is the obvious
way to follow the inbox's own hint; (2) the did-you-mean suggestion
is nonsense ("rest" has nothing to do with reading mail).

**Fix (narrow, exact):**
- Add `read [id]` as a real alias for `email read [id]` (keep
  `email read [id]` working — both forms read the same mail).
  Implementation: extract the read logic from email() into a
  shared readEmail(id) helper used by both forms (no duplicated
  read paths to drift apart).
- `read` MUST be added to KNOWN_COMMANDS — otherwise the .18
  "commands win over chat" rule is inverted for it: typed `read`
  mid-conversation would go to the NPC as chat instead of
  dispatching. (This is also why the old failure suggested
  "rest": `read` was not a known command at all.)
- Update the inbox hint to name BOTH forms: 'Read one with
  "email read [id]" or "read [id]".'
- `read` with no id → a helpful mail error ('Usage: read [id]
  — or "emails" to list your inbox.'), never a suggestion.
  `read <bad id>` → 'Email not found.' (same as email read),
  never a did-you-mean. Once `read` is a known command, the
  suggestion path cannot fire for it — the fix removes the
  nonsense suggestion by making the command real, not by
  retuning the suggester (out of scope).

**Discrepancy resolution (earlier log vs screenshot):** an
earlier live log showed bare `emails` printing the usage block
instead of the inbox. Current-tree audit: case 'emails' AND case
'inbox' both call emails() (lists); bare `email` shows the usage
block BY DESIGN (it is the help form, and its usage block
correctly points at `emails`). The earlier log is consistent
with the PRE-.18 dispatch (case 'emails' → email(rawArgs)),
which .18 replaced — a version artifact, not a live fork. .20's
job is to guarantee no regression: the builder MUST grep-verify
every caller/route to email()/emails() (switch cases, quick
buttons, phone actions, conversation routing — `emails` is in
KNOWN_COMMANDS so mid-conversation dispatch works) and eliminate
any path that still routes bare `emails` to usage. If such a path
is found, it is fixed and reported; if none is found, the report
says so plainly.

**REQUIRED SUB-FIX — mail persistence (without this, the alias
is theater):** diagnosis: the comm hub is constructed fresh per
engine (new CommHub() + generateInitialMessages in the
constructor), the server creates a FRESH engine per request, and
getPlayer()/loadState() never carry mail — so mail ids are
EPHEMERAL across requests in production (each request regenerates
the welcome email with a NEW id). A `read [id]` copied from one
request's inbox list can never match the next request's
regenerated ids. The alias alone would pass an in-process harness
and fail every real player. Therefore item 29 REQUIRES:
getPlayer() includes the comm email array; loadState() restores
comm mail from state.emails when present, REPLACING the
constructor-generated initials (no duplicates); initial messages
generate only for fresh characters (no saved mail). Old saves
(no emails field) get initials exactly as today. This is a
save-shape addition (additive, same rule as everything else).
SMS/voicemail share the same ephemerality (same root cause) but
are OUT of item 29's scope — flagged as follow-ups in the report,
not silently fixed and not silently ignored.

**Harness (real output, production-shaped):** `read <real-id>`
returns the email body; `email read <real-id>` still works;
`read` with no id gives the helpful error (assert NO "rest"
suggestion in the output); `read <bad id>` gives 'Email not
found.'; bare `emails` lists the inbox; `emails` with trailing
junk still lists (never usage); bare `email` shows usage WITH
the `emails` pointer; TWO-ENGINE round-trip (engine A receives
mail → getPlayer → engine B loadState → same mail, SAME ids →
`read [id]` returns the body — this is the production shape:
separate engine instances, like separate requests); initials
not duplicated on reload (welcome email count stays 1 after a
round-trip); `read` dispatches mid-conversation (KNOWN_COMMANDS
membership asserted).

**Help + What's New:** help's mail section gains `read [id]`
(alongside `email read [id]`). What's New lists it as a FIX:
"Mail reads work the natural way now — `read [id]` opens a
message, and your inbox survives leaving and coming back."

---

# APPENDIX H — ROADMAP ITEMS 30–31

**Scope amendment 7 (part 2):** the §19 help-coverage gate and the
§20 stage gate now cover 31 items. §§32–33 below correspond to
roadmap items 30–31.

## §32 — ITEM 30: MAIL AND DELIVERY EXPANSION (extends: comm-hub
## mail, item 29's mail persistence — DEPENDS ON IT)

Item 30 builds on item 29's persistence: packages, notices, and
bills as mail only work if mail survives reload (same ids, same
records). Build §31 first, then this section. No invented
carriers, no addresses outside the game's cities, no invented
lore — delivery is city-local between real roster NPCs.

**Mail kinds:** every email record gains `kind`: 'letter' |
'bill' | 'notice' | 'package' (default 'letter' for all old mail
and all existing sends unless specified). The `emails` list shows
kind icons (letter ✉️ · bill 🧾 · notice 🏛️ · package 📦) and
the inbox hint names the new mail commands.

**Notices (automatic, real triggers — read-only info, never a new
payment flow):** when the engine creates the underlying record,
it also posts a notice email via receiveEmail (kind 'notice')
from the matching civic sender, naming the amount and the
EXISTING command that handles it: tax assessment → "City Tax
Office" (amount + 'file taxes'); fine issued → "City Court"
(amount + 'pay fine all'); case opened → "City Court" (case id +
'case [id]'); loan payment missed → "City Bank" (amount + 'loan
pay'). Notices never invent amounts — every number comes from
the record just created.

**Bills (payable mail, hard mode only):** hard-mode monthly bills
arrive as bill emails (kind 'bill', amount, linked to hardDebt).
`pay bill [id]` pays that bill from cash (reduces hardDebt by
the amount; refuses when cash is short or the bill is already
paid — paid bills are marked paid, not deleted, so the record
stays auditable). Non-hard-mode players receive no bill emails
(consistent: bills exist only under hard mode). Tax and fines do
NOT become bill emails — they have their own commands, and
notices point there. No duplicate payment flows.

**Packages (three flows, one tracking system):**
- OUTGOING — `send package [npc] [item]`: send one of YOUR
  inventory items to a roster NPC (shared resolver for the NPC;
  item matched from player inventory by name,
  unique-substring/refuse-with-list). Cost $5 postage. Delivery
  in 1 game-day (arriveDate = next calendar date, stored on the
  package record). A delivery-check step inside
  processCommandInner (before dispatch) flips due packages to
  delivered and applies the outcome ONCE (tracked by a delivered
  flag): recipient relationship +5. Status computed from
  game-date on read — no background jobs, no invented carriers.
- INCOMING — relationship-tier crossings (50/75/90 with an NPC,
  once per NPC per tier) generate an incoming package email from
  that NPC containing a small generic good from a CLOSED list
  (coffee beans $10 · flowers $15 · book $20 · snacks $25 —
  everyday objects, modest values, inside scale — not lore, not
  a catalog). `claim package [id]` moves the item into inventory
  exactly once (second claim refuses); unclaimed packages stay
  in the inbox.
- COURIER WORK (delivery work the player can DO) — `packages`
  also lists available courier jobs, generated deterministically
  per game-day (date hash — same jobs for everyone that day):
  sender NPC → recipient NPC in the SAME city (real roster +
  district data), pay $40 same-district / $60 cross-district,
  2h, one active courier job at a time. `deliver [id]` completes
  it (pay + journal line). No cross-city courier fiction, no
  invented senders/recipients.
- TRACKING — `track [id]` shows any package (incoming, outgoing,
  courier): status, sender → recipient, ETA game-date or
  delivered date. `packages` lists all three groups plus
  available courier jobs.

**Commands:** `mail` (kind counts + pointers), `packages`,
`track [id]`, `send package [npc] [item]`, `claim package [id]`,
`deliver [id]`, `pay bill [id]`. All in help (mail section).

**Harness (real output):** kinds display correctly (one of each
kind listed with its icon); notice posted on a real fine
assessment (amount matches the fine, command pointer correct);
send package removes the item + charges $5 + tracking shows
in-transit then delivered after a game-day with +5 relationship
applied exactly once; claim moves the item once (second claim
refuses); courier job completes with the correct pay; pay bill
settles hardDebt (refuses when short / already paid); mail
persistence round-trip shared with §31 (two-engine, same ids).

## §33 — ITEM 31: GOVERNMENT SERVICES FOR CITIZENS (extends:
## .15 government/law/court data, city roster, jobs categories)

**How this differs from item 5 — stated exactly:** item 5 is
government TIERS (local/state/federal views) + jobs WORKING FOR
government (apply to listings, civic titles). Item 31 is the
CITIZEN side: services a citizen USES. No job listings, no tier
views, no civic titles here (those stay in §5). `government`
stays tiers+jobs; `services` is the citizen counter. Shared data
(officials, enforcement, court) is read-only in this section.

**Commands and mechanics:**
- `services` — citizen services directory for the current city:
  permits held, fees due, benefit eligibility, registrations
  held, utility accounts. One screen, everything a citizen
  needs, no tier views.
- PERMITS (one-time purchases, small permanent bonuses, NONE
  gating an existing feature — a permit never unlocks something
  that was free): business license $200 → +5% business income
  (multiplier in the monthly tick); driver's license $50 →
  roadtrip fuel $15 → $10; food handler permit $75 → cook meals
  +2 energy each. `permit [type]` buys; `permits` lists held +
  available. Buying a held permit refuses (already held).
- FEES (annual, per-asset, assessed at the year crossing on the
  §6 hook): vehicle registration fee $40/vehicle/year; property
  record fee $25/property/year. `fees` shows outstanding;
  `pay fees [all|amount]` settles oldest first; unpaid past 2
  game-months gains a $10 late fee (itemized, small). No seizure,
  no arrest for unpaid fees — consistent philosophy.
- BENEFITS (means-tested safety net): `benefits` shows
  eligibility + status; `benefits claim` pays $200 once per
  game-month, requires unemployed OR cash < $300 (refuses
  otherwise with the reason stated). Monthly cap + means test =
  no farming loop.
- REGISTRATIONS: `register voter` (one-time; +5 community
  reputation — feeds §5's civic titles via rep, no new title
  system; second registration refuses as already registered).
  Vehicle registration EXTENDS the existing `register [name]`
  vehicle command (no duplicate command — builder reads how
  register works and hooks the annual fee + services display to
  it). `records` shows property ownership records from owned
  properties (display only, no new registry).
- UTILITIES: `utilities` shows utility accounts per owned
  property (power/water status). Payment: when hard mode is ON,
  utilities are the $120 bill, paid via `bills pay` (no duplicate
  flow); when hard mode is OFF, utilities show as included (no
  charge — consistent with hard mode being the pressure layer).
  No new utility billing outside hard mode.

**Costs inside scale:** permits $50–$200 one-time; fees
$25–$40/asset/year; benefits $200/mo capped + means-tested. No
new drains beyond annual asset fees.

**Harness (real output):** permit purchase + bonus applies in
the tick (business +5%), roadtrip fuel $10 with license, cook
+2 energy with permit; fees assessed at year crossing + pay
settles + late fee after 2 months; benefits means test both
sides (eligible claims, ineligible refuses) + monthly cap
(second claim same month refuses); voter registration +5 rep +
once-only; records reflect owned properties exactly; utilities
display in both hard-mode states (bill-linked vs included).

---

# APPENDIX I — ROADMAP ITEM 32

**Scope amendment 8:** the §19 help-coverage gate and the §20 stage
gate now cover 32 items. §34 below corresponds to roadmap item 32.

## §34 — ITEM 32: LIVING EXPENSES EXPANSION (extends: monthly tick,
## city cost data, family household data, vehicle ownership)

A concrete recurring cost-of-living system — housing, food,
utilities, transport — charged on the existing monthly tick.
Affordability is a spec requirement, not an afterthought: the
scaling rule below is PROVEN in the harness at entry-level income.

**Scaling rule (stated in full, checkable):**
- City cost multiplier from REAL city data (CITY_METADATA
  economicIndex): index <60 → 0.8× · 60–84 → 1.0× · 85+ → 1.25×.
  (West Memphis 55 → 0.8× · Memphis 65 → 1.0× · New York 100 →
  1.25×.) The multiplier applies to HOUSING and FOOD only —
  utilities and transport are flat (a bus pass costs what it
  costs).
- Housing: own ≥1 property → $100/mo upkeep (you live in your
  home; other properties already carry mortgage/maintenance in
  the property tick — no double charge). Own nothing → $300/mo
  basic rent (you rent a room/studio somewhere — "rented" means
  not-owning; there is no separate rental contract system).
  Housing is then × city multiplier.
- Food: $150/mo × city multiplier, + $50/mo per extra household
  member (spouse + children from §4 family data; no family data
  → 1 person). Food is the household-scaled line.
- Utilities: $80/mo flat + $20/mo per extra household member.
  (No city multiplier — utility rates are flat by design.)
- Transport: $0/mo when the player owns any vehicle (you drive —
  fuel/service already cost elsewhere), else $50/mo flat
  (a transit pass).
- Total for a solo new player: cheap city renter
  (0.8×: 240 + 120 + 80 + 50) = $490/mo · mid-city renter
  (300 + 150 + 80 + 50) = $580/mo · expensive-city renter
  (375 + 187.50 + 80 + 50) = $692.50/mo. Against entry income
  $2,200–$3,200/mo, the worst solo case is 31% of the lowest
  entry pay — the affordability bar is: solo expenses ≤35% of
  $2,200 in the most expensive city. Larger households cost more
  by design (food + utilities scale with members) — the tradeoff
  of family life — but the shortfall rule below prevents any
  household from spiraling.

**Affordability guarantees (all three, all provable):**
1. GRACE PERIOD: no living expenses for the first 2 monthly
   ticks after character creation (tracked from creation month —
   a new player gets time to find work before costs start).
2. PARTIAL PAY + FORGIVENESS (normal mode): if cash is short in
   the tick, pay what you have (cash → $0), log the shortfall +
   stress +5, and FORGIVE the remainder — living expenses are
   pressure, not a loan shark, and a short month never becomes a
   debt spiral. (Hard mode differs — see interaction below.)
3. WARNINGS BEFORE SHORTFALLS: `living` warns when cash covers
   less than 2 months of estimated expenses; the tick line warns
   when cash after payment falls below $200; the estimate itself
   is always visible in `living` (next month's breakdown, not a
   surprise bill).

**How this differs from and interacts with item 10 (Life hard)
— stated exactly, because the two systems touch the same lines:**
Item 32 is the CONCRETE recurring-cost system (the four lines
above, charged to everyone). Item 10 is the DIFFICULTY LAYER
around it (opt-in pressure). They must NOT double-charge food
or utilities. Final rule (this section SUPERSEDES §10's original
food/utilities lines — §10 was specced earlier in this same
unshipped build, so the revision lands before anything ships):
- Hard mode OFF → §34 total only.
- Hard mode ON → §34 total × 1.5 (the pressure surcharge) +
  $50/property + $30/vehicle (asset surcharges — different lines,
  no double count) + the existing hard-mode shortfall rule
  (shortfall → hardDebt + stress +10 + happiness −5, instead of
  normal-mode forgiveness).
- Hard-mode bills display (`bills` command) shows the surcharge
  + asset lines; the §34 base lines show in `living`. One system
  of record per line, never two charges for the same thing.
- Related refinement to §30 (bill emails): with §34 live,
  hard-mode bill emails are NOT a second monthly bill — a bill
  email is posted only when a hard-mode tick CREATES hardDebt
  (the shortfall amount, payable via `pay bill [id]` against
  hardDebt). No shortfall → no bill email. This supersedes §32's
  "monthly bills arrive as bill emails" line.

**Interaction with item 31 (fees/utilities display):** annual
asset fees (§33) are separate (yearly, small) — no conflict.
The `utilities` display (§33) shows the §34 utilities line
(base $80 + members) so the two views agree.

**Commands:** `living` (full breakdown: each line, city
multiplier, household size, next-month estimate, warnings) and
`expenses` as an alias. The monthly tick line itemizes the four
lines (and the hard-mode surcharge + asset lines when on).

**Harness (real output):** tick charges the right amounts for:
solo renter mid-city ($580), solo owner cheap-city (100×0.8=80
+ 120 + 80 + 50 = $330 — owner with vehicle: transport $0 →
$280; assert both variants), expensive-city solo renter
($692.50), household of 3 mid-city (housing 300 + food 250 +
utilities 120 + transport 50 = $720); affordability assertion
(expensive-city solo $692.50 ≤ 35% of $2,200); grace period
(first 2 ticks $0); warnings fire (`living` warns when cash <
2× estimate; tick warns when post-payment cash < $200);
shortfall normal (partial pay + forgiveness, no debt created,
stress +5); shortfall hard mode (remainder → hardDebt, stress
+10, happiness −5); hard-mode math (base × 1.5 + asset lines,
no double food/utilities — assert food appears once).

---

# APPENDIX J — ROADMAP ITEMS 33–42

**Scope amendment 9:** the §19 help-coverage gate and the §20 stage
gate now cover 42 items. §§35–46 below correspond to roadmap
items 33–42. Item 37's spec below INCORPORATES Dre's two
corrections (2026-11-01): real institutions with the real
process, no shortcuts, and the roster question ANSWERED — real
offices filled by the game's own people, NO real politicians'
names anywhere. The earlier "fictional offices" framing is
SUPERSEDED and must not appear in help or What's New.

## §35 — ITEM 33: DEEPER ROUTINES EXPANSION (extends: district
## data, inventory, stats, journal)

Grounding first: NO store catalog exists in the tree (grep:
only district descriptions containing 'shopping' and retail /
luxury_retail jobTypes). Stores are therefore DERIVED, never
invented: a shopping district = a district in the player's
current city whose description contains 'shopping' OR whose
jobTypes include 'retail' / 'luxury_retail'. `stores` lists
exactly those districts (displayName + description). A city
with no such district has no stores — `shop` there refuses
honestly ("No stores in [city] — travel to a shopping
district") instead of inventing one.

**Shopping routines** (closed goods catalog, economy scale):
groceries $40 → happiness +3, energy +5; clothing $60 →
happiness +4; household goods $50 → happiness +3, and property
condition +2 when the player owns property (else happiness
only); plus the §30 package goods (coffee beans $10, flowers
$15, book $20, snacks $25) purchasable into inventory for
gifting/trading. `shop` lists goods; `shop [good]` buys (unique
-substring match, refuse-with-list on ambiguity — the shared
resolver pattern). Every purchase charges cash, adds the good
to inventory (or applies the stat effect for groceries /
clothing / household goods — goods that ARE the effect are
consumed on purchase, not inventoried; package goods ARE
inventoried), and logs a journal line. Cash-short refuses.

**Commercial routines:** `commercial` = the current city's
commercial directory: each shopping district with what can be
done there — its stores (→ `shop`), its real POIs from the
nearby data (schools, listings, tracks in that district, with
their existing commands), never invented venues. `stroll
[district]` visits a commercial district: 1h, energy −5,
happiness +3, journal line; district must be a real district
in the current city (refuse otherwise).

**General daily routines** (each with a time/energy cost and a
REAL effect — no bare flavor lines; each once per game-day,
second attempt same day refuses, so no farming loop):
`errands` — 2h, energy −10, happiness +2, stress −3, journal
line. `chores` — requires owning property: 1h, energy −5,
property condition +3 (primary residence first), happiness +1.
`selfcare` — $20, 2h, energy +15, stress −8, health +2.
`routines` — summary: today's routines done + effects.
Commands: `stores`, `shop [good]`, `commercial`, `stroll
[district]`, `errands`, `chores`, `selfcare`, `routines`.
Harness: shop acquires the good + charges correctly +
inventory contains package goods; shop in a non-shopping city
refuses (test cities surveyed from real data); commercial
resolves to real districts only; stroll moves stats + journal;
chores requires property + condition +3; selfcare once/day +
stats; errands stats; second selfcare same day refuses.

## §36 — ITEM 34: DEEPER HOUSING EXPANSION (extends: property
## engine, goHome, family, listings)

**What is NEW here — stated exactly, no fourth copy:**
.15 property upgrades = upgrade/renovate ACTIONS on owned
properties (value/condition). .19 furnishing = interior items
+ comfort. §32 living expenses = the monthly housing COST line
($100 upkeep / $300 rent). §36 adds NO new monthly housing
charge (the §32 line stands) — it adds the TENURE MODEL,
mortgage deepening, primary residence / moving, household
housing effects, and the market index.
**Tenure** (`housing` shows per property): owned outright
(mortgageRemaining 0) / mortgaged (remaining > 0: payment,
term = ceil(remaining / payment) months, arrears) / renting
(no property → the §32 basic rent). **Mortgage deepening:**
`mortgage [property]` (payment, remaining, term, arrears,
payoff = remaining + arrears); `pay mortgage [property]
[amount]` (extra payment ≥ $100 reduces remaining and term;
amount ≥ payoff clears the loan, payment → 0). **Arrears
consequences — NEW** (the engine today only accrues):
missedMortgagePayments counts CONSECUTIVE misses (reset to 0
on any successful mortgage payment — builder verifies the
engine resets it or adds the reset); 3 missed → warning
notice (mail, kind notice); 5 missed → final warning; 6
consecutive missed → foreclosure: property removed, mortgage
cleared, equity lost, journal + notice. Warnings make it
never a surprise. **Primary residence:** `set home [property]`
(must be owned) sets primaryResidenceId (additive field);
goHome uses PRIMARY first, then first owned, then starting
city, then west_memphis — an extension of the existing
definition, never a break. `set home none` clears back to the
first-owned rule. `move [property]` = set home + travel to
that property's city (and its district when the listing
carries one). **Household housing:** §4 family members live
in the primary residence (else first owned); monthly tick
comfort effect — primary condition ≥ 70 → happiness
+2/member (cap +10); condition < 40 → stress +2/member (cap
+10); no property → neutral (renting carries no effect). NO
new cost (food/utilities already scale in §32). `housing`
shows who lives with you. **Market index:** per-city index,
deterministic from economicIndex + month key (±2%/mo band,
same determinism rule as §23 stocks): `housing market [city?]`
shows index + trend + meaning; NEW listings generated after
.20 multiply base price by the index (builder reads the
listing generator; owned properties and in-flight listings are
NEVER repriced). Harness: mortgage payment/term/payoff math;
extra payment reduces term; arrears warnings at 3/5 +
foreclosure at 6 consecutive (with reset-on-pay proven);
set home changes goHome destination; move updates city;
non-owned set home refuses; primary survives save/load;
household comfort effects both directions; market index
differs by city economy and new listings price with it.

## §37 — ITEM 35a: WILL AND ESTATE (extends: §14 legacy
## retirement, family, assets)

**NO death mechanic — stated explicitly:** the game has no
death mechanic by design and this item does not invent one.
The will executes ONLY on the §14 legacy retirement
transition. **Writing:** `will` shows the current will;
`will heir [npc]` designates the primary heir (roster NPC by
name, shared resolver) or `will heir community` (city
community fund); `will bequeath [cash|properties|businesses|
vehicles] [heir]` records a bequest per asset class (heir =
roster NPC or 'community'; re-bequeathing an asset class
replaces it). Free to write, changeable anytime before
retiring. **Execution on retire:** estate total = bank
balance + property currentValues + business values (stored
buy price when present, else 12 × monthly income — builder
reports which source was used per business) + vehicle values
(stored value or purchase price). The distribution is recorded
in the legacy record (who got what, amounts — visible in the
new life's legacy view). **New-life bonus (within the §14 cap,
non-compounding):** no will → §14 base (+$100 for that
retirement). With will → min($500 global cap, $100 + $50 per
asset class bequeathed (max 4 = +$200) + $50 when the primary
heir is family (spouse/child from §4)). A complete will is
worth more, but never breaches the §14 cap and never
compounds across retirements. Harness: retire with a full will
→ bonus math exact; retire without will → base; distribution
record lists heirs + amounts; will commands refuse unknown
NPCs / bad asset classes; NO death command or mechanic is
added (assert the command list gains no death path).

## §38 — ITEM 35b: INSURANCE (extends: monthly tick, property
## repair, vehicle repair, business tick, health stat)

**Products** (monthly premiums on the tick; lapsed = missed
premium when cash is short → policy lapses + notice;
re-insure anytime): health $30/mo; property $25/mo per
property; vehicle $20/mo per vehicle; business $40/mo per
business. Commands: `insurance` (policies + status), `insure
[type] [target?]` (health = self; others by name), `uninsure
[type] [target?]`, `claim [type] [target?]`. **Claims —
verified real losses ONLY, 1 claim per policy per game-month,
premium current, payout = 80% of verified loss capped:**
property cap $500 (verified loss = a repair actually paid
this month: repair first with cash, then claim refunds 80%);
vehicle cap $300 (same receipt rule via vehicle repair);
business cap $400 (verified loss = a tick-recorded negative
monthly net for that business — builder records last month's
net per business for this check); health flat $150 benefit +
health +10 (NO cash-cost health event exists in the tree —
no doctor/hospital charges found — so the health claim is
stated honestly as a benefit triggered by measured health <
50, not a reimbursement). **Solvency table (single-claim cap
vs annual premium):** property $500 vs $300/yr (1.7×, repairs
infrequent); vehicle $300 vs $240 (1.25×); business $400 vs
$480 (<1×); health $150 vs $360 (<1×) — plus 1/month,
premium-current, and verified-loss-only rules. No claim
without a verified event. Harness: covered claim pays exact
80%-capped amount (all four types); claim with no repair /
no loss / health ≥ 50 → refused; lapsed premium → refused;
second claim same month → refused; uncovered type/target →
refused; premiums tick-charge + lapse on cash-short.

## §39 — ITEM 36: WORK OVERTIME EXPANSION (extends: work()
## shift, pay path, §6 week key)

`overtime [hours]` (1–4 per call). **Rate:** 1.5 × hourly
(hourlyRate = job.hourlyPay || basePay/2080 — the SAME rate
work() uses). **Costs:** energy −5/hr, stress +2/hr, clock
advances hours, exhaustion rule identical to work() (energy
→ 0 → health −3). **Caps (anti-spam, hard):** 4 hrs per
game-day AND 12 hrs per game-week (week key from the §6
calendar; additive tracking fields). Cap refusal shows the
remaining allowance. **Requires employment:** no job →
refuse ("no job"); energy < 5 × hours → refuse ("not enough
energy"). **Pay path (non-negotiable):** money += AND
trackTaxIncome AND challenge earnings contribution — the
SAME path work() uses, so IRS (§1), bank, and living expenses
(§34) all see overtime consistently; overtime never bypasses
tax. Harness: 3 hrs at $20/hr pays exactly $90; energy/stress
move per rule; 5th hour same day refuses; 13th hour same
week refuses; no-job refuses; energy-short refuses; earnings
appear in taxable income (assert via the tax-income record).

## §40 — ITEM 37: MAYOR, GOVERNOR, PRESIDENT, AND ALL
## GOVERNMENT ENTITY JOBS (extends: §5 tiers, §31 services,
## civicTitle, jobs-database)

**Differentiation:** §5 = tier JOBS working IN government
(staff). §31 = services a citizen USES. §40 = LEADERSHIP
OFFICES (elected, term-limited, campaign-gated) + the full
ENTITY JOB CATALOG. Offices are NOT §5 jobs and never appear
in the §5 tier view as hireable jobs.
**The process — REAL, NO shortcuts, NO skipping steps.**
Every office requires its OWN full cycle (filing + campaign +
election); the ladder is earned steps, never a skip. (1)
ELIGIBILITY (checked at filing, every gate must pass, refusal
names the failed gate): Mayor — age ≥ 18 (life stage ≥ Young
Adult) + resident of the city (current city) + civic title ≥
Active Citizen (community rep ≥ 25) + holds no office.
Governor — resident of the state (current city's state) +
rep ≥ 50 (Community Leader) + a COMPLETED Mayor term (held
to term end; resignation mid-term earns NO credit) + filing
fee. President — rep ≥ 75 (Public Servant) + a COMPLETED
Governor term + filing fee. (2) FILING: `file [office]`
(mayor/governor/president) pays the fee (Mayor $250, Governor
$1,000, President $5,000) and opens the candidacy (office,
jurisdiction, filing date recorded). (3) CAMPAIGNING:
`campaign rally` ($200, +8 score, energy −10), `campaign
canvass` (+5 score, energy −5), `campaign ad` ($500, +12
score). Minimum events before an election is allowed: Mayor
≥ 2, Governor ≥ 3, President ≥ 4 (any mix). (4) ELECTION:
`election` (refuses before the minimum). Deterministic
resolution, no randomness presented as democracy: player
score = communityRep + campaignScore + 10 × prior completed
terms + 5 incumbency bonus when re-running for the SAME
office; each rival's score = job-tier rank + district
communityRepBonus + name-hash mod 20 (stable per rival per
office). Player wins iff the player score STRICTLY EXCEEDS
both rivals (ties lose). Loss → candidacy closes; re-filing
the same office requires a 3-game-month cooldown + a new fee
(no free retries). (5) TERMS: 48 game-months (4 real years)
for all three offices. Salary via the monthly tick +
trackTaxIncome (IRS sees it): Mayor $5,000/mo, Governor
$8,000/mo, President $15,000/mo. Office REPLACES the job
slot (office is the occupation); on vacating office the
player is unemployed and must re-apply — stated plainly, not
hidden. (6) DUTIES: one `decide [option]` per game-month —
infrastructure (rep +5), community event (happiness +5, rep
+3), tax relief (next tax bill −10%, hooks the §1 tax calc).
Missed month → rep −2 (neglect). Term end → office vacates;
REELECTION is a full new filing + campaign + election (no
auto-renew, no incumbency shortcut beyond the +5 in the
score formula). `resign` ends a term early with NO completed
-term credit. **Entity jobs:** `gov jobs` = the full catalog
grouped by entity (City Hall, State Capitol, Federal Agency,
Courts, Legislature) as a VIEW over jobs-database listings in
categories government / federal / political / emergency,
mapped by category + employer keywords (builder surveys the
database and reports the mapping). Holdable through the
existing apply flow — builder VERIFIES apply covers every
listed job; any listed-but-unapplyable job is EXCLUDED from
the catalog with its reason, never listed as holdable when it
isn't. Commands: `offices`, `file [office]`, `campaign
[rally|canvass|ad]`, `election`, `office`, `decide [option]`,
`resign`, `gov jobs`. Harness: every eligibility gate
refuses with its reason; filing fee charged; campaign minimum
enforced; election win case + loss case (low rep) both
resolve with real scores; term salary ticks + is taxable;
duty effects + missed-duty rep −2; resign → no term credit;
reelection requires new filing; office replaces job; gov jobs
listable + holdable via apply.

## §41 — ITEM 37 ROSTER: REAL OFFICES, GAME'S OWN PEOPLE
## (extends: NPC roster, social-engine data)

**Dre's decision, LOCKED:** the real institutions (Mayor,
Governor, President) with the real §40 process, filled by the
game's own generated people from the existing NPC roster /
data. NO real politicians' names anywhere — no hardcoded
name literals in the office module (names come ONLY from
roster lookups; harness asserts every incumbent/rival name ∈
roster names). **Incumbents** (shown by `offices` when the
player holds no office): per city Mayor = deterministic
roster pick — a government-job NPC in that city, highest job
tier, tie → lowest roster index (stable, no randomness);
Governor per state = same rule across the state's cities;
President = one national incumbent (roster NPC with a
federal/political job, same tie-break). **Rivals:** 2 per
election from the same jurisdiction scope (city / state /
national), government jobTypes preferred, else any roster
NPC in scope, deterministic roster-index order, never the
player, never duplicates. **Fallback chain (never invent a
person):** government-job NPC in scope → any roster NPC in
scope → "Vacant (no candidate filed)". Harness: incumbents
and rivals resolve from roster data in three scopes; rival
names ∈ roster; fallback shows Vacant rather than an invented
name; no real-politician name literal exists in the office
code path (builder self-checks by construction: roster-only
lookups).

## §42 — ITEM 38: REGULAR JOBS AND CAREER EXPANSION, COLLEGE
## UPDATED TO REFLECT THE CHANGES (extends: jobs-database,
## SCHOOLS, applyForJob cert gating, §3, §44 GPA)

**Differentiation:** §3 = education breadth (more programs,
college life). §38 = the LINKAGE (career paths + the
job↔education mapping table + gates that enforce it). §39 =
institutions. §40 = performance inside courses. **Career
paths** (ladders over jobs-database jobs; builder SURVEYS
jobs-database for real ids — the table below is the required
SHAPE, the builder fills surveyed ids and reports them):
minimum 6 paths — Retail, Trades, Healthcare support,
Tech, Services/hospitality, Finance — each entry → skilled →
career (→ elite where the database supports it). A rung job
missing from the database is ADDED in JobListing shape in a
real city/district ONLY to fill a ladder gap (builder reports
each added job). **Mapping table (required columns, one row
per rung):** path | rung | job id (surveyed) | required cert
(SCHOOLS course rewardCertification, or none for entry rungs)
| GPA bar (elite rungs: GPA ≥ 3.0 per §44; absent GPA on an
old save = 2.5 neutral-below-bar, documented not hidden) |
school(s) offering it. **Gates:** applyForJob ALREADY checks
certs via requirement-text keyword matching — §38 WIRES the
mapping into that check explicitly: a mapped job refuses
without its cert, naming the course + school (the mapping
wins wherever keyword matching would miss or misfire).
**College side reflects it:** the `schools` listing gains
"leads to: [careers]" lines per course (from the mapping);
`careers` shows paths + your certs + GPA + next rung + what
is missing. **No unreachable careers:** every cert in the
mapping ∈ SCHOOLS rewardCertifications, and every mapped
career has its required course in the catalog — asserted
from data in the harness (a mapping row pointing at a
nonexistent course fails the harness). Harness: mapped career
holdable WITH cert; same career refused WITHOUT cert
(message names course + school); schools listing shows
career lines; careers command shows progress + next rung;
mapping completeness asserted from data (no dead rows).

## §43 — ITEM 39: MORE COLLEGES AND COMMUNITY COLLEGES
## (extends: SCHOOLS, enroll chain, §42 mapping)

**Differentiation:** §3 = program breadth; §38 = linkage;
§39 = MORE INSTITUTIONS, including the community-college
tier. **New institutions** (city-generic names — NO
real-institution claims; districts must be REAL district ids
in those cities, verified by the builder from WORLD_DISTRICTS
— never invented): 2 universities in cities that currently
have no school + 3 community colleges (one in west_memphis
— districts broadway / mississippi_park / meadowlake are
real — and two more in cities with real districts). Builder
finalizes names/districts from real data and reports them.
**Tier field:** School gains additive `tier`:
'university' | 'community' (existing 7 schools = university).
**Community-college programs:** 60–80 hrs, $600–$3,000
(cheaper than university equivalents — asserted: each CC
program costs less than its mapped university program),
associate credential (ASSOC_*). **Transfer (no dead ends):**
holding the mapped associate → the mapped university program
enrolls at −25% hours AND −25% cost (advanced standing,
shown at enroll with its reason). Every CC credential maps
to ≥ 1 career OR ≥ 1 transfer (harness asserts from data —
a credential leading nowhere fails). `schools` listing shows
tier + transfer lines. Harness: new colleges enrollable
(enroll → study → graduate chain works there); CC programs
graduate and transfer (discount applies, transfer program
completes); CC credentials open their mapped careers
(apply succeeds with the associate where the mapping says
so); CC costs < university equivalents.

## §44 — ITEM 40: DEEPER SCHOOL EXPANSION — GPA, TESTING,
## GRADUATIONS (extends: enroll → study → graduate chain,
## §42 mapping)

**Differentiation:** §3 = program breadth; §38 = linkage;
§39 = institutions; §40 = the ACADEMIC PERFORMANCE SYSTEM
inside any school. **GPA** (0.0–4.0, additive field on
enrolledCourse, starts 3.0 on enroll; old saves without it
read as 2.5 for gate purposes per §42): study session with
energy ≥ 50 → +0.05 (cap 4.0); energy 20–49 → +0.02; energy
< 20 → −0.05 (floor 0.0). Library study also moves GPA +0.02
(the recovery path). **Attendance:** sessions attended vs
game-days since enrollment (enroll date recorded additive;
days = 0 → 100%); displayed by `gpa`; below 50% at exam time
→ exam score −10 (a consequence, not a hard gate).
**Testing:** `exam` available only when hoursCompleted ≥
totalHours (early exam refuses). Score = min(100, 40 + GPA ×
10 + skillLevel × 5) where skillLevel = the player's level
in the course's requirement skill (0 when none). Pass ≥ 60.
Fail → GPA −0.1 + remediation: 10 more study hours required
before re-exam (hours may exceed totalHours; eligibility =
hours ≥ total + 10 × fails). **Graduation:** pass → $100
graduation fee auto-deducted; cash short → credential HELD
(status "credential pending — $100 fee due"), `graduate`
retries payment and awards the cert. Graduation event:
journal line + message + community rep +2; GPA ≥ 3.8 →
honors note + rep +5. **Consequences (never a bare number):**
GPA ≥ 3.0 opens §42 elite rungs; GPA ≥ 3.5 = honors
standing (graduation distinction); GPA < 2.0 → probation:
cannot enroll in NEW courses until GPA ≥ 2.0 (refusal names
the recovery path: library study). Commands: `gpa` (GPA,
attendance, exam status), `exam`, `graduate`. Harness: study
moves GPA both directions per rule; early exam refuses;
fail blocks + remediation hours required; pass awards cert
+ opens the mapped career (apply succeeds); fee-held
credential + `graduate` pays and awards; probation blocks
enroll; honors at 3.8.

## §45 — ITEM 41: BETTER CITIZEN NAME GENERATION — USA AND
## OTHER COUNTRIES (extends: NPC roster, §20 population)

**Pools per country** (from the CITY_METADATA country field
— 19 USA cities + UK, Japan, France, Germany, UAE, Mexico,
Canada, Australia = all 27 cities): one first-name pool +
one last-name pool per country, ≥ 30 + ≥ 30 names each
(≥ 900 combinations), real common names, respectful and
plausible, no joke names, no stereotypes. The USA pool is
diverse (names common across US demographics — no
caricatures). **Engine compatibility:** records keep
firstName (given) + lastName (family) fields; display order
follows the country's convention — Japan family-first
("Tanaka Yuki"), all others given-first. **Deterministic
-friendly:** seeded pick (seed = city + citizen index); the
generated name is STORED on the citizen record so it never
re-rolls across reloads. **Existing NPCs UNTOUCHED:** the
improved generator applies ONLY to newly generated citizens
(and the §20 population); roster names are byte-identical
before/after (harness asserts a roster snapshot). **Never
empty:** fallback = pool[0] on any lookup failure; the
generator asserts non-empty output. **Help:** no
player-facing command surfaces this (system improvement) —
What's New note only; the help-coverage count honestly
records zero new commands for this item. Harness: generated
citizens in several countries (USA + at least Japan, France,
Mexico) receive names from the RIGHT pools (membership
asserted); 500 generations → zero empties, zero
placeholders; 100 USA draws → ≥ 90 unique full names;
roster snapshot unchanged; same seed → same name.

## §46 — ITEM 42: NEWS TICKER STRIP BETWEEN CHAT AND HUD,
## WITH A COMMAND TOGGLE (extends: §16 newspaper, game
## screen layout, save shape)

**UI:** a fixed one-line strip on the game screen positioned
BETWEEN the conversation/chat area and the stats HUD (layout
rule: chat flexes, strip fixed-height, HUD fixed — the strip
never squeezes either). True-black-flat styling (the game's
flat direction — no gradients or shadows breaking it).
Rotating headlines: one headline at a time + a mode label
(LOCAL / WORLD), rotating client-side on a timer (~8s).
Compact mode: same strip at compact text scale; expanded
mode: same strip at full scale — same height in both, so
neither layout breaks. **Data — SAME generator as §16, no
second news source:** the strip renders headlines from the
shared newspaper function. LOCAL = headlines filtered to the
player's CURRENT city (+ its events); WORLD = headlines
across all cities. Empty state (never invented filler):
LOCAL with no city news → "No news right now in [city].";
WORLD with nothing → "No news across the world right now."
**Toggle (exact commands):** `ticker` (status + usage),
`ticker local`, `ticker world`, `ticker off`. Persisted:
player.tickerMode (additive, default 'local'), surviving
save/load (harness round-trip). Off → strip hidden (client
hides the container; payload empty). **Harness:** local
payload ⊆ current-city headlines only; world payload spans
≥ 2 cities (given multi-city state); toggle flips + persists
through save/load; off → empty payload; client markup check:
the strip container exists in client source order BETWEEN
the chat and HUD containers + the client bundle builds.
**Honest limit:** the live visual check is Dre's playtest
(the VM cannot render the Reddit post) — the harness proves
payload, persistence, and markup order, not pixels.

---

# APPENDIX K — ROADMAP ITEMS 43–44 (LIVE PLAYTEST FIXES)

**Scope amendment 10:** the §19 help-coverage gate and the §20
stage gate now cover 44 items. §§47–48 below correspond to
roadmap items 43–44, both from Dre's live playtest log on
0.108.17 (same session, pasted twice — read once).

## §47 — ITEM 43: PROPERTY BUY PARSING BROKEN — P0, CORE LOOP
## (extends: buyProperty, property-engine listings, help)

**Root cause — PROVEN from the code, not guessed:** the
display path and the buy path use DIFFERENT listing sources.
`getListingsByCity()` (the real-estate screen) includes
`PROPERTIES_WEST_MEMPHIS` — so Dre correctly saw "Broadway
Starter Home - $52,000". But `buyProperty()` resolves names
against `getAllListings()`, and `getAllListings()` does NOT
spread `PROPERTIES_WEST_MEMPHIS` (Memphis, Little Rock,
Southaven, International, Nashville, Atlanta, Chicago, New
York, Los Angeles, Miami, Houston, Dallas, Phoenix, Expansion
— no West Memphis). The .18 addition put West Memphis
listings in the display map and never in the buy map. The
listing was visible but unbuyable by construction. The fix
below addresses the root cause AND the parser gaps the log
exposes — not just the symptom.
**Fix (all four, in buyProperty + property-engine):**
(a) ONE-LINE ROOT FIX: add `...PROPERTIES_WEST_MEMPHIS` to
`getAllListings()` so the display map and the buy map agree
for every city (audit: every array in the by-city map must
appear in getAllListings — harness asserts West Memphis
listings ∈ getAllListings). (b) SUFFIX STRIP, CASE-
-INSENSITIVE: the current strip (`endsWith(' cash')` /
`endsWith(' mortgage')`) is case-sensitive — "Mortgage" or
"CASH" would not strip and would poison the name. Strip the
trailing cash/mortgage token case-insensitively (lowercase
the tail for comparison, keep the name's original casing for
display). (c) BRACKET TOLERANCE: players copy help's
brackets literally. After suffix-strip and trim, strip ONE
surrounding pair of `[` `]` from the name (covers both
`buy property [Broadway Starter Home] mortgage` and
`buy property Broadway Starter Home mortgage`). The name
shown in errors is the CLEANED name, never the bracketed
raw input. (d) CURRENT-CITY-FIRST MATCHING: resolve the
cleaned name against the current city's listings FIRST
(getListingsByCity(player.city)), falling back to all
listings — so a same-name listing elsewhere never shadows
the local one. Remote buying is PRESERVED (fallback), not
removed; local wins ties. resolveNamed itself is sound
(exact-then-substring, case-insensitive) and is kept.
**Affordability — DECISION, stated plainly:** the funds rule
stays CASH ONLY (the existing engine rule: purchaseProperty
checks `player.money`, never bankBalance). Changing it to
cash+bank would silently let bank savings double as down
payments and bypass the deposit/withdraw loop the game
already teaches. What changes is the ERROR: all three
affordability messages (smart-default, mortgage-short,
cash-short) must state the rule + the remedy, e.g.:
"Need $10,400 (20%) for a mortgage on Broadway Starter Home.
Down payments come from cash on hand only — bank savings do
not count. You have $X cash (+ $Y in bank). Use `withdraw
[amount]` to move bank money to cash, then buy." The
`withdraw` command EXISTS (case 'withdraw') — the error
points at a real action, never a dead end. A name that
matches but funds fall short returns this AFFORDABILITY
error, never "not found" — the two failure modes are kept
distinct by construction (match first, then funds).
**Help fix:** the help entry (`buy property [name]
[cash|mortgage]`) and the real-estate footer BOTH gain a REAL
example first — `buy property Broadway Starter Home
mortgage` — with the generic pattern after it, so players
see a copy-pasteable form instead of bracket-shaped syntax
alone. **Harness (West Memphis listing = the broken case,
plus a Memphis regression case):** plain name (smart
default); +cash; +mortgage; bracket-wrapped name +mortgage;
case variants ("BROADWAY STARTER HOME MORTGAGE", "Buy
Property Broadway Starter Home Mortgage" via dispatch
casing); affordability path — cash $5,000 + bank $6,000 →
affordability error naming cash-only + bank + withdraw
(NOT "not found", NO silent bank dip); then `withdraw`
moves money to cash and the SAME buy succeeds end-to-end;
already-owned refuses; ambiguous substring refuses with the
list. **Priority:** P0 alongside item 28 — buying property
is a core loop, and this bug made the starting city's
listings unbuyable.

## §48 — ITEM 44: `view` VERB (extends: command dispatch,
## KNOWN_COMMANDS, screen commands)

Dre typed `View inbox` → `Unknown command: "view"`. (The
verb itself lowercases correctly in dispatch — the verb
simply has no case.) **Fix:** add a `view` case routing to
EXISTING no-arg screens only — no new screens, no invented
mappings: `view inbox` / `view emails` → the emails list
(same as `emails`); `view properties` → properties screen;
`view vehicles` → vehicles screen; `view investments` →
investments screen; `view status` → status screen;
`view schools` → schools listing; `view real-estate` →
real-estate listings; `view bank` → bank screen;
`view government` → government view. Add `view` to
KNOWN_COMMANDS so mid-conversation `view inbox` dispatches
under the .17/.18 commands-win rule instead of going to the
NPC as chat. **No dead ends:** bare `view` → usage listing
what can be viewed; `view [unknown]` → the same helpful
list (never a bare unknown-command answer for a `view`
input). Case-insensitive thing matching (unique-substring,
refuse-with-list on ambiguity — the shared resolver
pattern). **Harness:** `view inbox` lists the inbox;
each mapped `view [thing]` reaches its screen (assert a
screen marker, not just dispatch); bare `view` → usage;
`view [nonsense]` → helpful list, no unknown-command text;
mid-conversation `view inbox` dispatches (KNOWN_COMMANDS
membership asserted).
**Confirmations from the same log — NO ACTION, health
noted:** the work/sleep/exhaustion loop, daily-goal
payouts, weather-varying pay ($277.88 vs $326.92), level-up,
and the monthly tick (+$25 bank interest on $5,000) all
behave correctly; typo suggestions work ("slee"/"psleep" →
"sleep"). The log ALSO re-confirms items 27 (`people` →
"No one around", `talk` → "No one stands out nearby" in
West Memphis) and 28 (businesses screen: "You don't own any
businesses yet" — his bought business is still gone);
both are already in this build — no new action.

---

# APPENDIX L — v0.108.21 FOLLOW-UP (six previously-not-shipped items)

**Scope amendment 11:** the §19 help-coverage gate and the §20 stage
gate now cover these six items, and the stage gate is LIFTED for
.21 only: unlike .20 (stage only), .21 is SUBMITTED for standard
UNLISTED review (0.15.0 CLI from the Dispatch tree,
DEVVIT_ALLOW_SOURCE_UPLOAD=1, explicit --version 0.108.21; never
bare publish, never --public, never a new app, never touch
devvit.json's name field). Bump exactly once 0.108.20 → 0.108.21
(package.json, src/shared/version.ts GAME_VERSION, server boot
log line, AGENTS.md header). ONE v0.108.21 What's New entry at
the TOP of renderUpdatesScreen, dated November 1, 2026, covering
all six (.20 entry untouched below it). Global constraints carry
over unchanged: additive only, no new currencies, no new external
services, expanded mode stays a player option, the .18 menu/theme
untouched, dialogue stays template-only (no LLM calls, no
AI-reply promises anywhere in help or What's New).

Each item below names what .20 left out and why, so the .21 work
lands ON the existing system instead of beside it.

## §49 — ITEM 1: SMS/VOICEMAIL PERSISTENCE (extends: item 29's mail
## persistence — the exact same root cause, the exact same fix)

.20 fixed mail persistence (getPlayer/loadState round-trip,
constructor initials replaced, no duplicates) and explicitly
flagged SMS/voicemail as sharing the same ephemerality, out of
item 29's scope. .21 closes it with the identical mechanism —
no new system, no new shape:

- CommHub gains restoreSMS() and restoreVoicemails(), mirroring
  restoreEmails(): wholesale replace, deduplicated by id (first
  occurrence kept), so a reload can never double a message.
- getPlayer() includes the SMS array (`sms`) and the voicemail
  array (`voicemails`) alongside `emails`; loadState() restores
  each from state when present as an array. Old saves (no sms /
  voicemails field) keep today's initials exactly: the welcome
  SMS from Uncle Ray, and an empty voicemail box (no initial
  voicemail exists today, and none is invented).
- Commands: `messages` already lists SMS (unchanged). NEW:
  `voicemails` lists voicemails (sender, transcript, listened
  state) and marks them listened on listing — the list IS the
  listen action, stated in its output. `phone` already shows
  unread SMS/voicemail counts; its counts now reflect persisted
  state instead of per-request regenerations.
- Harness (production-shaped, two-engine): engine A sends a text
  (via `text [name] [message]`) and receives a voicemail →
  getPlayer → engine B loadState → both present with the SAME
  ids and content; a second round-trip adds no duplicates; the
  welcome SMS count stays 1 after reload; an old save with
  neither field loads with today's initials and no crash.

## §50 — ITEM 2: STOCK DIVIDENDS (extends: §25 world stock —
## holdings reuse the Investment record shape, same as .20)

.20's §25 states it plainly: "No dividends in .20 (a natural
deepening for a later version, flagged, not built)." .21 builds
that deepening, on the §25 price rules, with no new mechanics
around it: no margin, no shorting, no options, no leverage —
that exclusion stands, it was never part of this item.

- Dividend rule: every stock holding (type 'stock', shares > 0)
  pays 0.25% of its current value per game-month in the monthly
  tick — 3% annualized, inside the economy scale (worked
  example: 100 shares at $135 = $13,500 holding → $33.75/mo,
  below one shift's pay and far below rent). The rate is a
  constant (DIVIDEND_MONTHLY_RATE = 0.0025) in
  features-0.108.21.ts, not a per-company promise: every listed
  company pays the same rate, so no holding is a dividend trap
  and no yield is ever invented per company.
- Payment (monthly tick, same tick that already pays bank
  interest): per holding, dividend = round(shares × current
  computed price × 0.0025) to cents; the sum lands in cash,
  counts as taxable income (trackTaxIncome, same path as work
  and business income, so §1 sees it), and the tick line
  itemizes it ("dividends $X (N holdings)"). Each holding
  records `lastDividend` (amount) and `dividendMonthKey`
  (month paid) — the portfolio view reads those fields, never
  a recomputation. Holdings recompute their currentValue on
  read first (recomputeStockHoldings, existing), so the
  dividend is always on the current price.
- Qualify: holdings held at the tick. Shares bought mid-month
  qualify at the next tick (no pro-rating, no back-pay —
  stated in `dividends` output). Sold shares stop paying the
  month after sale. A holding with 0 shares pays $0 and is
  never listed as paying.
- Commands: `dividends` — every stock holding with shares,
  current price, monthly dividend at the rule rate, last payout
  (amount + month), and the next payout note ("paid in the
  monthly tick"). `investments` gains a dividend line per stock
  holding ("last dividend $X (month) · 0.25%/mo"); `stock
  [name]` gains the same line for a held stock. No new command
  buys or sells — `buy stock` / `sell stock` are unchanged.
- Harness: dividend math exact (100 shares at a known computed
  price → shares × price × 0.0025); tick pays it to cash and
  to taxable income; `dividends` shows it; a sold holding pays
  nothing further; a 0-share holding pays $0; old saves (no
  lastDividend fields) pay correctly on the first .21 tick.

## §51 — ITEM 3: FOUNDING AND RUNNING COMPANIES (extends: §24
## companies, §26 staff hiring, the .15 business tick)

.20's §24 states it plainly: "You do NOT buy, sell, or run a
company in .20... Founding and running are explicitly NOT in
this item." .21 completes the arc the task names: owning a
small business (§2) → climbing inside a company (§24) →
founding and running one of your own. Player companies are a
NEW record on the player (additive `player.playerCompanies`),
but they reuse every existing rule they touch: §24's
deterministic performance hash, §26's one-NPC-one-employer
rule, the business tick's cash/tax path, the shared name
resolver, and roster NPCs only (never invented employees).

- Founding: `found [name]` (industry defaults to General
  Services) or `found [name] in [industry]` where industry is
  one of the closed §24 industry labels (Logistics, Banking &
  Finance, Healthcare, Public Safety, Education, Government,
  Retail, Technology, Hospitality & Food, General Services).
  Cost $5,000 cash, payable from cash on hand (same cash-only
  rule as business purchases — bank savings do not count; the
  error says so and points at `withdraw`). Validations: cash
  ≥ $5,000, name non-empty (letters/spaces), no existing
  player company with that name (case-insensitive), not
  incarcerated. HQ city = current city; founded month =
  current month key; status 'active'; employees []; debt $0.
  The founding cost is sunk (no refund on closure — stated
  at founding).
- Running — the monthly tick (same tick as business income,
  its own tick line): for each active player company with
  n employees (cap 5 — hire refuses beyond 5):
  performance = companyPerformance(company id, monthKey)
  (the §24 hash, same bands: Thriving 70+ · Steady 40–69 ·
  Struggling <40); revenue = (300 + 150 × n) × (Thriving 1.2
  · Steady 1.0 · Struggling 0.8), rounded; expenses = $100 × n
  wages + $100 overhead; net = revenue − expenses.
  Net > 0: debt is paid first (debt −= min(debt, net)), the
  remainder lands in cash and counts as taxable income.
  Net < 0: cash covers what it can, the shortfall becomes
  company debt (cash never goes negative for a company loss).
  Worked examples (the harness asserts these): 1 employee,
  Steady: revenue $450, expenses $200, net +$250/mo (beside
  Food Truck $260 — a company is a business-scale income, not
  a money printer). 5 employees, Thriving: revenue $1,260,
  expenses $600, net +$660/mo (below top rent scale). 0
  employees, Struggling: revenue $240, expenses $100, net
  +$140/mo (a solo founder still earns, slowly).
- Hiring: `company hire [company] [npc]` — roster NPC via the
  shared resolver (exact → unique substring → refuse-with-
  list); the NPC must not already work at a player business
  (§26 staff) or another player company (one employer per
  NPC, naming the conflict); the company must be active and
  under the 5-employee cap; not incarcerated. `company fire
  [company] [npc]` releases immediately, no severance (same
  as §26 firing). Hiring/firing cost nothing beyond the
  $100/mo wage the tick charges.
- Failure and closure: debt > $2,000 at a month end counts
  one bad month (debt ≤ $2,000, or $0, resets the count);
  TWO consecutive bad months → the company FAILS: status
  'closed', employees released, company debt dies with the
  company (the loss IS the company + the sunk $5,000 — no
  further bill follows the player), journal line + notice
  mail naming the failure. Voluntary closure: `company
  close [name]` — same release, no penalty, no proceeds.
  Closed companies stay listed in `mycompanies` as closed
  (history, never revived — a new company needs a new
  `found`).
- Commands: `found [name] [in industry]`, `mycompanies`
  (player companies only: status, HQ, employees, last net,
  debt, performance word), `company hire/fire/close` forms
  (routed inside the existing `company` case — a player
  company name resolves BEFORE the world-company lookup, so
  `company [own name]` shows the founded/running detail:
  industry, HQ, employees with wages, last net, debt, bad
  months, performance history). `companies` gains a "Your
  companies" section at the top (empty state says so
  plainly); its header no longer claims founding/running are
  absent. Help's Companies section is rewritten to cover
  founding + running; the §24 climb path (executive
  profit-share) is unchanged and still described there.
- Harness: founding charges $5,000 + refuses when short /
  duplicate name / bad industry / incarcerated; hire fills
  slots to 5 and the 6th refuses; hire conflict (staffed NPC,
  double-company NPC) refuses naming the conflict; tick math
  exact for the three worked examples (net to cash + tax);
  debt accumulates on losses and TWO bad months close the
  company (employees released, journal + notice present);
  voluntary close releases with no proceeds; old saves (no
  playerCompanies field) found and run cleanly.

## §52 — ITEM 4: REPRICING OWNED AND IN-FLIGHT LISTINGS
## (extends: §36 housing market index — and corrects its note)

.20's §36 says new listings price with the index, but the
shipped §36 note is honest about what actually happened:
"the game's listings are fixed catalog data — no listings are
generated at runtime, so no listing is repriced by the index."
.21 is therefore the FIRST version that reprices anything,
and it covers both sides the task names. "In-flight" is
defined here, precisely, because this tree has no separate
in-flight listing state (there is no player-listed-for-sale
flow): in-flight = listings currently on the market, available
to buy (the real-estate screen). Owned = properties the
player already holds. Both reprice; neither reprices silently.

- Schedule: the monthly tick, once per ticked month, using the
  §36 index (housingMarketIndex, deterministic per city +
  monthKey, ±2%/month band — the band is the volatility cap,
  so no month ever reprices a home by more than ~2%).
- Available listings: `listingPriceNow(listing, monthKey)` =
  round(catalog price × index(city, monthKey)). The
  real-estate screen shows adjusted prices AND a line naming
  the index ("Prices include today's housing index (×1.03)").
  The buy path charges the adjusted price end to end
  (affordability, 20% down payment, mortgage, purchase record,
  rental economics) — display and buy never disagree. A
  listing's catalog price is never overwritten (the catalog
  stays the base; the adjustment is computed on read).
- Owned properties: each ticked month, newValue = round(old
  currentValue × index(city, month) / index(city, previous
  month)). The property stores `lastReprice` ({ month,
  oldValue, newValue, oldIndex, newIndex }) — additive, so
  old properties gain it on their first .21 tick (one month's
  move only; no historical catch-up is invented). Mortgage
  balances, payments, rent, and condition are untouched by
  repricing — only currentValue moves, so a sale (`sell
  property`) realizes the repriced value and nothing else
  changes.
- TRANSPARENCY (the hard requirement — a silent overnight
  change to something the player owns is a bug, not a
  feature): (1) every repriced property gets its own tick
  line stating old price, new price, and why ("Repriced:
  [name] $85,000 → $86,700 (housing index 1.02 → 1.04 in
  Memphis — market movement, not a fee)"). Months with no
  index change produce no line (nothing changed, nothing to
  disclose — and the `repricing` command says so). (2) The
  NEW `repricing` command lists every owned property with
  its last repricing (old → new, index move, month) plus the
  current index per owned city and the listing adjustment
  for the current city. (3) The real-estate screen's index
  line (above) covers the in-flight side before any purchase.
  No repricing is ever posted only to a notice, only to a
  journal line, or nowhere at all.
- Harness (transparency cases, all asserted on real output):
  owned value moves by exactly the index ratio; the tick line
  contains the old price, the new price, AND the index move;
  the `repricing` command shows the same figures; a buy after
  repricing charges the adjusted price (affordability math
  uses it, purchase record carries it); a month with a flat
  index produces no repricing line and `repricing` says no
  change; old saves (no lastReprice field) reprice cleanly.

## §53 — ITEM 5: PADDING THE SIX THIN CITIES (extends: §29's
## all-cities audit — the cities .20 reported and left alone)

.20's §29 audit found six cities THIN but non-empty (1
resident each: Vegas, Seattle, Phoenix, Philly, Detroit,
Charlotte) and explicitly took no action on them ("padding
thin cities is out of scope; the audit reports them, it does
not silently expand the roster"). .21 takes the action: 4
new residents per city (24 total, ids npc_347–npc_370), in
the EXISTING roster record format field-for-field (id, name,
city, district, role, age, gender, personality, description,
firstName, lastName — the format the tree actually uses;
schedule/relationship/mood/memories/quests are attached by
the existing initializer, exactly as for the .20 West Memphis
eight). Rules carried from §29: ordinary fictional names
only, no real people, no celebrities, no duplicates of
existing roster ids or names, every resident assigned to a
REAL district of their city (from WORLD_CITIES districts):

- Las Vegas, NV (districts: downtown_generic, suburbs;
  existing: Lucky Luciano, downtown_generic): casino dealer
  (downtown_generic), hotel housekeeper (suburbs), taxi
  driver (downtown_generic), wedding chapel clerk (suburbs).
- Seattle, WA (downtown_generic, suburbs, industrial;
  existing: Jodie Chen, downtown_generic): barista
  (downtown_generic), dock worker (industrial), teacher
  (suburbs), bike courier (downtown_generic).
- Phoenix, AZ (downtown_generic, suburbs; existing: Rosa
  Saguaro, suburbs): pool technician (suburbs), nurse
  (downtown_generic), diner cook (downtown_generic),
  landscaper (suburbs).
- Philadelphia, PA (downtown_generic, suburbs, uptown;
  existing: Tony Cheesesteak, downtown_generic): teacher
  (uptown), firefighter (suburbs), museum guide
  (downtown_generic), deli clerk (uptown).
- Detroit, MI (downtown_generic, industrial, suburbs;
  existing: Marcus Motor, industrial): assembly worker
  (industrial), jazz musician (downtown_generic), librarian
  (suburbs), food truck owner (downtown_generic).
- Charlotte, NC (downtown_generic, suburbs, uptown;
  existing: Barbara Banker, uptown): bank teller (uptown),
  barbecue cook (downtown_generic), nurse (suburbs), real
  estate agent (uptown).
- Harness: `people` in each of the six returns a real group
  (≥5 residents via the roster count, and the `people`
  output itself lists more than one person — the single-
  resident failure is asserted gone); the all-27-cities sweep
  stays non-empty for every city; `talk [new resident]`
  dispatches to a real conversation (full roster citizens,
  not display-only rows); no new name duplicates any existing
  roster name (asserted from data).

## §54 — ITEM 6: SEIZURE/ARREST FOR UNPAID FEES (extends: §33
## annual asset fees — and SUPERSEDES its no-seizure line)

.20's §33 ends with a philosophy line: "No seizure, no arrest
for unpaid fees — consistent philosophy." That line is
SUPERSEDED by this item, for FEES ONLY, by explicit order.
Scope is narrow and stated everywhere it matters: this ladder
applies ONLY to §33 annual asset fees (vehicle $40 /
property $25 per year, assessed at the year crossing). It
does NOT touch tax (§1 — its own penalties stand), fines
(§2 — pay fine flow stands), loans (§8 — late fee + credit
only), hard-mode debt (§34 — forgiveness/debt rules stand;
hard-mode copy still says never arrest, never seizure, and
that remains true for hard debt), or mortgages (§36 —
foreclosure stands on its own ladder). A player who reads
`fees` sees exactly which debt this ladder is about.

FAIRNESS BAR (Dre's order — a strict requirement, not a
softening): the ladder must not drive players away. Five
rules, each provable in the harness:
(1) LONG, CLEAR WARNING SEQUENCE — every step is notified
in advance with the exact amount owed, the deadline, and how
to resolve it; no consequence ever arrives as a surprise.
(2) GRACE AND RECOVERY AT EVERY STEP — a payment plan or a
partial payment halts escalation; arrest, when it happens,
is short, bounded, and has clear exits (pay, serve the short
time, or appeal). (3) PROPORTIONALITY — seizure targets
what is owed, never a wipe-everything punishment; first
offenses get warnings, not the maximum penalty.
(4) NO DEATH SPIRAL — a broke player can recover: seizure
never removes the ability to earn their way out (no
seize-the-job, seize-everything, owe-more loop).
(5) PLAYER AGENCY ALWAYS VISIBLE — at every stage the game
shows the way out (pay all, pay part, payment plan, or
other resolution) before the next step triggers.
If any part of the ladder cannot meet this bar, it is
reported explicitly rather than shipped as a quit-moment.

- The ladder (game-months past the assessment month key;
  every step is announced BEFORE its consequence lands):
  assessment (year crossing, existing): feesDue set, notice
  in the crossing lines, `fees` shows the amount + the
  deadline schedule below. +2 months (existing, unchanged):
  +$10 late fee, itemized. +3 months: WARNING 1 — notice
  mail from City Court + tick line, naming the exact amount
  owed, the +4-month final warning, and the +5-month
  seizure/arrest consequence, plus the ways out (below).
  +4 months: WARNING 2 (FINAL) — notice + tick line, naming
  the exact amount, the seizure order (cheapest vehicle,
  else cheapest non-primary property, else arrest as a last
  resort), and the ways out. +5 months and beyond, once per
  seizure window while fees remain unpaid: SEIZURE of ONE
  asset only (see proportionality) — the tick line + notice
  name the asset, its value, the amount applied to feesDue,
  and the remainder. If feesDue reaches $0, the ladder
  resets completely. If NO seizable asset remains and fees
  are still unpaid: ARREST as a last resort (see below).
  The arrest fires once per ladder (a flag), not once per
  month, and every fresh annual assessment starts a fresh
  ladder (warnings first again — a repeat assessment never
  jumps straight to seizure or arrest).
- Ways out, available at EVERY stage (shown in `fees` output
  at every stage, and in every warning notice):
  pay all (`pay fees all`); pay part (`pay fees [amount]`
  — ANY payment, even partial, halts escalation: it restarts
  the warning clock from the payment month with the warning
  stage reset to 0, so a player who starts paying is never
  seized or arrested on the old deadlines); or a payment
  plan (`fees plan` — see below). Partial payment is not an
  exploit that avoids payment: each payment reduces the
  debt, and the clock restarts only because money moved.
- Payment plan (`fees plan`): splits the current feesDue
  into 3 equal monthly installments (rounded, the last
  installment takes the remainder), auto-deducted in the
  monthly tick before ladder evaluation. While a plan is
  active the ladder is FROZEN: no warning advances, no
  seizure, no arrest. A missed installment (cash short in
  the tick) breaks the plan with NO penalty fee (an
  owe-more loop is forbidden here — the tax plan's 5%
  break penalty is deliberately NOT copied) and the warning
  sequence restarts from the break month, so the player is
  warned again before any consequence. `fees plan` refuses
  when nothing is owed or a plan is already active; paying
  fees directly while on a plan is allowed, and clearing the
  debt clears the plan and the ladder together.
- Proportionality (what can and cannot be seized):
  seizure takes exactly ONE asset per seizure window, the
  cheapest seizable asset: cheapest owned vehicle first
  (by value), else cheapest owned property that is NOT the
  primary residence (by currentValue; mortgage cleared
  with it, equity lost — the §36 foreclosure shape). The
  seized value is APPLIED to feesDue (floor $0) — seizure
  settles debt, it never creates new debt. After a seizure
  that leaves a balance, the next seizure cannot happen
  for 2 game-months (cooldown, stored as
  feesNextSeizureMonthKey), and a notice is posted at once
  stating the remaining balance and the earliest next
  seizure month — so the second seizure is also never a
  surprise. NEVER seized, under any circumstances: the
  player's job/employment (work is never touched), the
  primary residence (shelter is never seized), businesses
  (an income source is never seized), bank savings (the
  player keeps their savings to pay their way out),
  inventory items, and skills. First offenses get warnings
  only: no seizure or arrest can fire before the +3/+4
  warnings have fired for that assessment.
- Arrest (last resort, short and bounded): fires only when
  fees are unpaid at a seizure-eligible month AND no
  seizable asset exists AND no plan is active. It uses the
  existing sentence machinery: incarcerated on the standard
  3-day sentence, with the existing exits — `prison`,
  `prison work` (reduces the sentence), `lawyer appeal`,
  and sentence expiry — PLUS the fee-specific exit: paying
  fees in full while incarcerated releases immediately (see
  gate exceptions below). Bounded by design: a fee arrest
  does NOT add a criminal-record entry and does NOT
  increment prisonRecord.arrests (so it cannot block trusted
  jobs forever), and release from a fee arrest does NOT set
  parole (no hidden tail). It is recorded only as a fee
  arrest (flag + journal + notice + `fees` display), and
  the player's job, home, businesses, and bank balance are
  untouched throughout. To make the pay exit reachable, the
  incarceration command gate gains narrow exceptions that
  apply ONLY while incarcerated for fees (feeArrestActive):
  `fees` (read-only view), `pay fees` (the exit), and
  `withdraw` (so bank savings can fund the exit) are
  allowed; every other incarceration restriction stands,
  and crime incarcerations keep the old gate exactly.
- `fees` view rewrite (the communication surface): amount
  due, assessment month, plan status (active: next
  installment + remaining), current stage (current / late
  fee applied / warning 1 / final warning / seizure window
  / arrest risk), next deadline with its consequence in
  plain words, what would be seized first right now (asset
  name + value, or "no seizable assets — arrest is the last
  resort"), and the ways-out block (pay all / pay part and
  what it does / payment plan and what it does). The old
  "No seizure, no arrest for unpaid fees" sentence is
  REMOVED from `fees` (it is false now) and replaced by the
  ladder summary. `services` keeps its fees pointer;
  hard-mode copy is untouched (different debt).
- Harness (the bar, proven — all on real output): (a) FULL
  LADDER WALKTHROUGH: assessment → +2 late fee → warning 1
  at +3 naming amount + deadline + ways out → final warning
  at +4 naming the seizure order → seizure at +5 naming
  asset + value + remainder, one asset only. (b) RECOVERY:
  pay part mid-ladder → escalation stops (old deadlines
  produce no seizure/arrest; the clock restarts from the
  payment month); start a plan mid-ladder → ladder frozen
  (no warning/seizure while active); missed plan
  installment → plan breaks with NO penalty and warnings
  restart. (c) BROKE-PLAYER RECOVERY: a broke player (low
  cash, job held, primary residence owned) who suffers a
  seizure keeps the job + primary residence + businesses +
  bank balance, then works shifts, earns, and pays fees in
  full → ladder cleared, never incarcerated, no spiral;
  and an asset-less broke player who IS arrested exits via
  pay-in-full release (and, separately, via sentence expiry
  without a parole tail and without a criminal record).
  (d) NO-SURPRISE: in the walkthrough run, every seizure
  and every arrest is preceded in the notice/journal/tick
  record by a notice naming that consequence; `fees` output
  at every stage names the NEXT stage's consequence before
  that stage fires. (e) PROPORTIONALITY: primary residence,
  job, businesses, and bank balance are unchanged after a
  seizure; only one asset leaves per seizure window.

## §55 — ITEM 7: NEWS TICKER REDESIGN (replaces the .20 static
## ticker — .21 is the vehicle, since .20 is already submitted)

.20's §46 ticker is STATIC: one headline at a time, swapped by
a timer every ~8s, sourced only from the §16 newspaper's world
events. That design is submitted and cannot be amended; .21
replaces it wholesale. Three requirements, all mandatory, plus
what is KEPT from .20.

- (1) MOVEMENT — the ticker text SCROLLS continuously like a
  beeper/pager message. Implementation: the fixed-height strip
  (28px, unchanged) keeps overflow hidden; inside it, a track
  element carries the FULL headline sequence joined with
  separators, duplicated once for a seamless loop, animated by
  a CSS marquee keyframes rule (translateX 0 → −50%, linear,
  infinite, duration scaled to content length with a 40s
  floor). No timer, no headline swapping, no setInterval
  rotation — the old rotation code is REMOVED from the
  client. Hovering pauses the scroll (animation-play-state),
  so a headline can be read; releasing resumes it. The strip
  keeps its exact position (between the stats HUD above and
  the chat/conversation area below — source order unchanged)
  and its true-black-flat styling (no gradients, no shadows).
- (2) VOLUME — at least 100 GENERATED BASIC headlines in the
  pool, all derived from REAL in-game activities. The pool is
  produced by a single generator, generateTickerHeadlines(ctx)
  (new module src/server/ticker-headlines.ts — pure from real
  state, no RNG, no stored series), called by the engine's
  tickerPayload(). Sections, in fixed order (the ticker
  cycles the full pool in sequence and loops — it NEVER shows
  just one segment; the client renders every headline in the
  payload, joined, not one at a time):
  world events this week (one per city, 27 — label + activity
  from worldEventsThisWeek); per-city economy + patrol (27
  cities × 2 = 54 — economicIndex word via needWordProsperity
  + patrolLevel from the real crimeRate); per-company stock
  moves (one per §24 listed company — computed price +
  monthly change from the §25 rules); market indices (world
  + Mid-South averages, computed); player activity (one per
  owned business — name + monthly income + city; one per
  owned property — name + currentValue + city; one per stock
  holding — shares + value; job line when employed; office /
  candidacy line when held; court docket line when cases or
  fines are open — counts only, from real records);
  milestones (fame/wealth tier line when fame ≥ 25 or wealth
  tier above Getting by, from live computation); season +
  next holiday (from the game clock); community challenge
  goal this week (deterministic from weekKey); current-city
  weather (temp + condition from getWeather). Leaderboard
  headlines (community top 3, "leads the community with X
  lifetime XP") are appended by the /api/ticker handler in
  index.ts, which alone can see the Redis community store —
  best-effort, never blocking (a failed board read appends
  nothing, never invented names). The pool count is asserted
  from FIXTURE state WITHOUT the leaderboard append (so the
  ≥100 bar holds even when the board is unavailable): a
  fixture player in Memphis with one business, one property,
  and one stock holding must yield ≥100 DISTINCT headlines
  (deduplicated by exact text — duplicates never pad the
  count). Empty state stays literal: LOCAL with nothing →
  "No news right now in [city]."; WORLD with nothing → "No
  news across the world right now." — rendered as the single
  scrolling item, never invented filler.
- (3) VOICE — headlines read LIKE REAL-WORLD NEWS about
  what's happening in-game, in news style ("markets rally",
  "city welcomes", "election results" phrasing where the fact
  supports it). Every headline traces to a real game-state
  fact named in §55's section list above: city names come
  from WORLD_CITIES, company names from jobs-database
  employers, event labels from the real event templates,
  numbers from computed prices/indices/values. No invented
  events, no fabricated quotes, no "sources say", no
  rumor lines, no real-world news. Templates fill slots
  ONLY from computed values — a template whose fact is
  absent emits nothing (never a placeholder headline).
- KEPT from .20, unchanged: strip position (above); LOCAL /
  WORLD toggle command with persistence (ticker local /
  ticker world / ticker off; tickerMode saved on the player
  and surviving save/load; off hides the strip); the
  real-state-only content rule; compact (12px) and expanded
  (14px) modes at the same 28px height, neither layout
  broken. The toggle command's help line and the ticker
  status text are updated to describe the scrolling marquee
  and the full pool (the old "rotating one headline at a
  time" wording is removed wherever it appears in help /
  status output — the .20 What's New entry itself stays
  untouched, as history).
- Harness (new .21 harness, all on real output): pool ≥100
  DISTINCT headlines from fixture state (no leaderboard
  append); payload (engine tickerPayload) contains MULTIPLE
  headlines IN GENERATOR ORDER (first headlines are event
  headlines, market headlines follow city headlines — order
  asserted, not just count); client markup check: the client
  source contains the marquee track container, the keyframes
  rule, and the animation reference, and contains NO
  8-second rotation timer for the ticker; local filtering
  (LOCAL payload ⊆ current-city + player headlines only;
  WORLD payload spans ≥2 cities); toggle persistence
  (ticker world → save → reload → mode world; ticker off →
  empty payload); empty-state literals. Visual scroll verdict
  = Dre's playtest (a node harness cannot prove pixels —
  stated honestly, as with every other visual item).

## §56 — ITEM 8: "SERVER SAVE FAILED" PERSISTS ON LIVE .20
## (extends: item 28's save-resolution fix — which made failures
## safer and visible, but did not stop the underlying failure)

Symptom (live .20, Dre's report, both subs): the banner
"Server save failed — progress is stored on this device only
and may not survive a refresh" persists. .20's item 28 fix
(last-write-wins, newest-slot resume, stale guard, no-command
guard) is NOT reverted — it stays, and this item fixes what it
left open. The investigation below is stated honestly: the VM
cannot reach the live Reddit post, so the live trigger cannot
be proven from here — what IS proven (harness, pure guard
level) is that the guard rejects device-clock-based writes,
and the fix removes EVERY permanent-reject path regardless of
which trigger Dre hit, while specific warnings make the next
report diagnosable.

- PRIME SUSPECT — VERDICT: the stale guard compares the
  incoming write's timestamp against the stored server stamp
  with a 5-second tolerance (isStaleWrite, STALE_SKEW_MS =
  5000), and playerTimestamp prefers lastSaved but FALLS BACK
  to savedAt — the DEVICE clock. The steady-state command
  path carries server stamps (serverSavePlayer stamps
  lastSaved on every write, and the response player carries
  it back), so ordinary skew does not loop there. But ANY
  path that sends a player WITHOUT a server stamp — an old
  local save, a restored copy, a first save after a failed
  sync — is gated on the device clock alone: a device behind
  server time by more than 5 seconds gets EVERY such write
  rejected, and the rejection surfaces only as the generic
  banner (the command-path stale text exists, but the
  banner — the thing Dre sees — says only "Server save
  failed"). Two more failure amplifiers ride alongside it:
  (1) /api/save responses carry NO new stamp, so the
  client's lastSaved lags the stored stamp by one save
  forever (latency-sized, but it keeps the guard live on
  every write); (2) clientSave's server sync aborts at 5
  seconds with NO retry, so a slow first request (cold
  start, slow mobile link) reports failure even when the
  server later saved — and every later autosave repeats the
  same abort. Any one of these can hold the banner up for a
  whole session; together they explain persistence without
  any single exotic bug.
- FIX (all parts, no partial fix):
  (a) SERVER-STAMP-ONLY GATING: isStaleWrite compares ONLY
  server stamps. An incoming write with NO lastSaved is
  NEVER stale-rejected, however far its device savedAt
  sits from server time — device clocks must never gate a
  server write. Genuine stale writes (incoming lastSaved
  older than stored by >5s — delayed beacons, racing
  commands) are still rejected exactly as before, and a
  rejected write NEVER overwrites newer server state.
  (b) STAMP ADOPTION: /api/save returns the new server
  stamp (lastSaved) on success, and clientSave writes it
  into state.player.lastSaved AND the local slot — the
  client's next write always carries the latest server
  stamp, closing the one-save lag. Command responses
  already carry lastSaved (unchanged).
  (c) COMMAND-PATH SINGLE RETRY: on a stale rejection in
  the command path, the server reloads from the stored copy
  and re-runs the command EXACTLY ONCE on fresh state, then
  saves again. The first attempt never persisted (that is
  what stale means), so the retry applies the command
  exactly once, never twice. A second stale result falls
  back to today's reject + resync behavior. Handler
  commands (leaderboard/trade) are untouched — they do not
  use this save path.
  (d) SPECIFIC WARNINGS (no more generic line): failure
  classes, agreed by server and client (shared module,
  importable by both + the harness): stale (server holds a
  newer copy — re-synced; the command was not applied),
  transport (could not reach the server — 5s abort / fetch
  failure), redis (server storage failed — 500), payload
  (save too large — 413 over 512KB; normal saves are tens
  of KB, so this class should never fire in real play).
  /api/save returns the class; the command path returns
  saveFailure on its catch branch; the client banner shows
  the class-specific text (exact strings in the shared
  module), never the old generic line.
  (e) AUTOMATIC RETRY: clientSave's server sync attempts
  TWICE (initial + one retry after 1.5s) for transport /
  redis failures before settling on local-only + banner.
  Stale is never blindly retried — stale re-syncs instead.
  (f) PLAYER RECOVERY ACTION: the banner carries two
  explicit choices, wired by document-level delegation so
  they survive re-renders: "Retry save" (runs clientSave
  now) and "Use server copy" (fetches /api/load, adopts
  the server copy as the session + local slot, and clears
  the banner on success — labeled as replacing this
  device's copy, so the choice is informed). Local-only
  drift is never silent again: the banner stays up until a
  save succeeds or the player chooses.
- What is NOT changed: last-write-wins load choice,
  newest-slot resume, the no-command guard, the 90-day
  expiry, and the rule that a stale write never overwrites
  newer state. The 5-second skew tolerance itself is kept
  for server-stamped writes (it is the beacon/race guard).
- Harness (pure + source checks, stated honestly — the live
  Redis/Devvit legs are verified by code review + Dre's
  playtest, as with every server wiring item): skewed
  device-only write (no lastSaved, device clock 60s behind)
  is NOT rejected by the guard (the fix); a genuine stale
  server-stamped write IS still rejected; a rejected write
  leaves the stored copy byte-identical (never overwrites);
  each failure class maps to a DISTINCT banner text (all
  four asserted different, none equal to the old generic
  line); client source contains the retry loop, the stamp
  adoption, and both banner buttons; server source contains
  the command-path single retry and the stamp in the /api
  /save success response.

## §57 — ITEM 9: INVESTMENT POSITIONS MUST FOLD, NOT DUPLICATE
## (extends: the .15 investment system + §25 world stock)

Symptom (Dre's live portfolio): TWO Bitcoin lines ($1,000
invested → $1,121, and $4,000 → $3,953) and TWO Ethereum
lines ($1,000 → $960, $4,000 → $3,330); totals $9,364 /
P/L −$636 are correct but the display is wrong. Root cause:
purchaseInvestment creates a fresh record on every buy and
makeInvestment pushes it unconditionally — buying more of
an asset you already own appends a second line instead of
adding to the position. (World-stock buys already merge by
company in buyStock; only the generic invest path lacks the
merge, and legacy duplicates of either kind can still sit in
old saves.)

- (1) BUY PATH: a buy of an asset already held merges into
  that position: invested (purchasePrice) += amount, shares
  += amount (generic positions carry shares = dollars
  invested), currentValue += amount (new money enters at
  current value, so the merge itself leaves P/L unchanged:
  value + amount, invested + amount). The buy message names
  the merge ("added $X to your existing position — one
  line, merged, not duplicated"). The minimum-investment
  check still applies to the new money. Stock buys keep
  their existing company merge (fold-first, below).
- (2) MIGRATION: on load AND on display, duplicate positions
  for the same asset fold into one line automatically.
  Fold key: stock holdings by company (case-insensitive),
  everything else by type + normalized name. Folding SUMS
  invested, shares, and current value (never averages), so
  totals are preserved exactly — Dre's screen becomes:
  Bitcoin one line ($5,000 invested, $5,074 value, +$74);
  Ethereum one line ($5,000, $4,290, −$710); totals still
  $9,364 / −$636. Stock dividend display on a folded line:
  same-month payouts sum, otherwise the most recent month's
  payout is kept (a summed cross-month figure would
  overstate one month's payout). Fold runs at the end of
  loadState (the migration), at the start of investments()
  (display can never render a double), and at the start of
  every buy/sell entry point (operations always see the
  merged position).
- (3) SELL PATH: sells operate on the merged position.
  "sell investment [name]" sells all (the old behavior —
  proceeds = currentValue, line removed). NEW: "sell
  investment [name] [amount]" sells part in dollars at
  current value: invested and shares scale down by the
  remaining fraction, currentValue drops by the amount,
  proceeds land in cash; selling the full value removes the
  line. Exact-name match is tried before amount parsing,
  so "S&P 500 Index Fund" (whose name contains a number)
  never misparses as name + amount. Stock sells are
  unchanged in form (sell stock [name] [shares|all]) and
  now fold-first, so a legacy duplicate stock line cannot
  strand a second line beside a sell.
- (4) WORLD STOCK: the same folding rule covers stock
  positions (company key) — buyStock/sellStock fold first,
  and stockDetail/dividends read the merged holding.
  Dividends on a merged holding pay once on merged shares
  (the rate is linear, so the payout equals the sum of the
  parts up to cent-rounding).
- Harness: buy → buy again same asset → exactly one line
  with summed invested/shares and correct P/L; duplicate
  legacy positions (Dre's exact Bitcoin/Ethereum figures)
  fold on load with totals preserved ($9,364 / −$636) and
  the two merged lines matching $5,074/+$74 and $4,290/
  −$710; partial sell reduces the merged line (invested +
  value scaled, proceeds to cash); sell-all removes it;
  stock positions fold identically (two same-company lines
  → one with summed shares); "S&P 500 Index Fund" still
  sells all without misparsing.

## §58 — Item 10: Help + What's New presentation redesign
(presentation and structure ONLY — no content cut, no commands
dropped, no changelog entry rewritten)

COMPLAINT (live .20): both screens are a long unorganized wall —
help is ~266 bullets from the .17 rewrite plus .18/.20 additions;
What's New is one endless scroll of 60 version entries.

HELP — what changes:
- Bare `help` keeps EVERY bullet, but reorganized into 12
  system sections in this order: Getting Started, Money & Bank,
  Work & Careers, Home & Property, Life & Family, World & Travel,
  Government & Law, Business & Companies, Education & Self,
  Community & Social, Info & Time, Dialogue. Every pre-existing
  section block moves whole under its new section (bullets
  verbatim, original relative order kept); old section headers
  are dropped — the 12 new headers are the sections.
- Section index at the TOP of bare `help`: a numbered list
  (`1. Getting Started — help getting started`, etc.). Index
  lines are NOT `• ` bullets, so the .20 help-coverage audit
  (which parses `• ` lines) is unaffected.
- Jumps: `help [section]` shows ONLY that section (by number,
  exact name, or alias — e.g. `help movement` → Getting Started,
  `help stocks` → Business & Companies, `help court` →
  Government & Law, `help ticker` → World & Travel). The index
  entries name the jump command, so the index IS the jump list.
- Filter: `help [word]` that matches no section filters bullets
  instead — every bullet whose text contains the word
  (case-insensitive), grouped under its section header. No match
  → the no-match text plus the section index (never a dead end).
- Consistent formatting: every command bullet is already in the
  uniform `• <command> — <description>` form (command leading,
  em-dash separator, description after); the reorg preserves
  that form for every bullet and moves no bullet's text. (Bolding
  the command was considered and REJECTED: the .20 audit parses
  bullets by splitting on ` — `, and `**` markers would break
  its command extraction — distinctness stays positional, and
  the audit keeps passing unmodified.)
- Incarcerated `help` still returns the full help (unchanged).
- Gate: the .20 two-direction help audit (every parser command
  documented AND every help bullet dispatching to real output)
  must pass UNMODIFIED after the redesign; the .21 harness adds
  index-covers-sections, drill-down, and filter checks.

WHAT'S NEW — what changes:
- A version index at the TOP of the screen: one button per
  version present, in entry order. Clicking a button opens that
  version's card (if collapsed) and scrolls it into view
  (`data-action="goto-update"`, wired beside the existing back
  button in renderUpdatesScreen).
- The latest entry (.21) renders fully shown (`<details open>`);
  every older entry renders as a collapsed card (`<details>` with
  a `<summary>` carrying version + date). The `<div
  class="update-item">` block inside each card is BYTE-IDENTICAL
  to before — structure wraps content, never rewrites it.
  Baseline: tools/updates-baseline-item10.txt (60 blocks,
  snapshotted before the redesign, depth-matched extraction).
  The .21 entry is the only exception: it gains the item-10 and
  item-11 lines (current-version additions, not history edits),
  so its check is superset (all baseline lines present + the two
  new lines), while all 59 history entries compare byte-identical
  by position (note: v0.92.0 legitimately appears twice in the
  original order — position comparison handles it).
- Styling: true-black-flat direction (seed 472829175), same
  tokens as the .13 Update Logs redesign in public/game.css —
  flat surfaces, no gradients, no shadows; index buttons and
  summaries inherit the screen's type scale so compact AND
  expanded modes stay readable. No layout break in either mode.
- Visual verdict = Dre's playtest (node harness cannot prove
  pixels, as with every other visual item).

Harness (.21): help index lines == the 12 section headers
(exact sets); `help <section>` output contains that section's
bullets and NOT another section's unique bullet; `help <query>`
filter output contains the matching bullet and excludes a
non-matching bullet; What's New index lists every version
present (60, in order); history entries byte-identical to the
baseline; .21 entry superset + new lines present.

## §59 — Item 11: leaderboard + challenge writes, and honest
messages (live .20 bug)

SYMPTOM (live .20, Dre): the Leaderboard screen shows BOTH
"The board is unavailable right now — try again shortly" AND
"You are not ranked yet — play a command and you will appear",
plus Community Challenge "Work Shifts — community total: 0 /
No contributions yet this week" — while Dre HAS been playing.
The nudge blames a player who played; the zero is a write
failure, not a quiet week.

WRITE-PATH FINDINGS (code, not live-Redis proof — the VM cannot
reach the live Reddit post):
- The write path itself is correct in form: the command path in
  src/server/index.ts records AFTER a successful save —
  recordLeaderboard (zAdd, score = lifetimeXP, an idempotent SET)
  and, when the engine result carries challengeContributions,
  recordChallengeContribution (total += amount, per-user set) —
  and SKIPS recording on stale rejection (correct: an unapplied
  command must not record; the increment-based challenge write
  must run exactly once per applied command, so its placement
  after a successful save is load-bearing and is NOT moved).
- The shared-layer failure: on a save throw, the code jumps to
  the catch (saveFailed) and the recording block NEVER RUNS. So
  every save failure in the item-8 family is also a leaderboard
  + challenge write failure, by construction. The item-8 fix
  (server-stamp-only gating, stamp adoption, command-path retry)
  is therefore the shared-layer fix for these writes too — when
  saves land, writes land. This is stated as the mechanism, not
  as a live-Redis proof: live confirmation is Dre's playtest.
- Diagnosability gap (fixed here): the recording block's catch
  swallowed errors silently (`catch { /* best-effort */ }`), so
  a community-store-only failure was invisible even in server
  logs. It now logs the error (server log only, never
  player-facing); gameplay still never blocks on it.

MESSAGE-HONESTY FIX (client renderLeaderboardScreen + the
`leaderboard` command text):
- Board fetch failed (board null OR board.unavailable): show
  ONLY "The board is unavailable right now — try again shortly."
  — NEVER the "not ranked yet — play a command" nudge beside it.
- Board loaded + identified player + genuinely no rank: the
  nudge appears (this is its only case).
- Board loaded + rank present: "Your rank: #N (X lifetime XP)".
- Board loaded + player NOT identifiable (the `player` fallback
  identity, where me can never resolve): NO nudge — an
  unverifiable rank is not "genuinely no rank". The
  /api/leaderboard response gains `identified` (username !==
  "player") so the client can tell these cases apart; the
  `leaderboard` command text takes the same flag via
  renderLeaderboardText (unidentified → no me-line at all).
- Top-list empty state, board loaded: "No ranked players yet —
  be the first." (not the unavailable line — an empty board is
  not a failed fetch).
- Challenge: unavailable (fetch failed OR challenge.unavailable)
  now renders an EXPLICIT "Challenge data unavailable right now
  — try again shortly." card instead of silently omitting the
  section; a loaded zero total keeps "No contributions yet this
  week." (a genuine zero, now distinguishable from unavailable).

Harness (.21, MemoryCommunityStore + real community functions):
played command → recordLeaderboard → getLeaderboard returns the
player's rank with lifetimeXP score; played work command →
result carries challengeContributions (shifts 1) →
recordChallengeContribution → getChallenge total increments by
that amount and accumulates on a second contribution; client
source: the me-line is gated on board availability AND
identified AND me; challenge-unavailable branch renders the
explicit unavailable line; command-path source: recording sits
after a successful save inside the !staleRejected branch and
its catch logs. Live Redis legs verified by Dre's playtest.

# APPENDIX M — v0.108.23 (three expansions + Help body presentation)

Bounded batches, additive only. Economy scale unchanged (entry jobs
~$26k–$38k/yr, rents ~$800–$3,500/mo, bank 0.5%/mo). No new cities,
no new currencies, no new services, no dialogue changes, no real
people/celebrities/politicians/institutions. Existing saves load:
every new player field is optional and defaults empty.

## §60 — TRAVEL EXPANSION (extends: travelTo, roadtrip, passport,
TRAVEL_ROUTES, WORLD_DISTRICTS, world events, listings)

Travel gains memory, planning, and a collectible — all from data
that already exists. No fare changes: travelTo fares, the $50/3h
bus fallback, and roadtrip fuel ($15, $10 with a driver's license)
are untouched.

STATE (additive, on the player):
- travelStats?: { trips: number; faresPaid: number;
  visitsByCity: Record<string, number> } — counted in travelTo
  (go home flows through travelTo, so it counts as a trip) and
  in roadtrip (fuel counts as fare paid). Old saves start empty.
- souvenirs?: string[] — city ids with a bought souvenir, once
  per city, in visit order.

COMMANDS (all in KNOWN_COMMANDS, all in help §6 World & Travel):
- `trips` — travel journal: total trips, total fares paid, every
  visited city in first-visit order with its visit count, and the
  most-visited city ("home away from home" line). Empty state:
  "No trips yet — travel to start your journal."
- `journey [city]` — trip preview BEFORE paying: fare, time,
  method (route data or the $50/3h bus fallback, stated as such),
  the city's districts, this game-week's events in that city, and
  how many property listings are on the market there (from
  getAllListings, current-city pricing rules unchanged). Unknown
  city → refuse-with-list via resolveNamed, same as travelTo.
  Read-only: previews never move, charge, or advance time.
- `souvenirs` — the collection: one line per owned souvenir
  (city display name), count out of 27, and the next unvisited
  city hint (same "next stop" idea as passport, no new data).
- `souvenir [city]` — buy a souvenir from a city ($25 cash):
  ONLY the player's current city can be bought (you must be
  there — no remote shopping), once per city (repeat → "already
  have one"), +2 happiness, journal line. Cash-short → refuse
  with the price and the balance. Souvenirs are display-only
  collectibles: no resale, no stat effect beyond the +2 on buy.

HARNESS: travelTo twice to the same city → trips shows 2 trips,
fares summed, visitsByCity 2; roadtrip counts trips + fuel;
journey preview matches travelTo's fare/time/method for a routed
pair AND for an unrouted pair ($50/3h bus); journey never moves
the player or charges; souvenir buy in current city → listed,
+2 happiness, $25 charged; repeat buy refused; souvenir for a
non-current city refused; old save (no travelStats/souvenirs)
runs all four commands cleanly.

## §61 — PROPERTIES EXPANSION (extends: property tick, occupancy,
leases, .21 repricing, citizen-names pools)

Properties gain management choices and tenant life. NO retroactive
repricing beyond what .21 ships (owned moves still only via the
monthly tick, one transparent line each); NO seizure of a primary
home outside the .21 fee ladder (the fairness bar stands — nothing
here seizes anything).

STATE (additive, on each property):
- openHouseMonth?: string — the monthKey an open house buys.
- leaseUntil?: string — the last monthKey a lease covers
  (inclusive). Compared with monthDiff (features-0.108.21).

TICK RULES (property-engine runMonthlyTick, in order):
- A property with leaseUntil >= tick monthKey is OCCUPIED and
  pays 90% of rentalIncome (rounded) — stability over upside.
  Lease overrides the 85% roll; it never stacks with it.
- A property with openHouseMonth === tick monthKey is OCCUPIED
  at full rent — the open house guarantees next month only.
- Otherwise the .12 deterministic 85% roll stands unchanged.
- Lease expiry is silent: when the month passes leaseUntil, the
  property returns to the roll with no notice spam (the `tenants`
  screen shows the lease end date, so the player can see it).

TENANT NAMES (display only, never NPCs): a tenant line shows a
name deterministically picked from the citizen-names pools by
hash(property name | monthKey) — same month = same tenant, a new
month may show a new tenant. No roster lookup, no relationship,
no quests, no persistence beyond the display computation.

COMMANDS (all in KNOWN_COMMANDS, all in help §4 Home & Property):
- `tenants` — per owned property: occupancy this month (leased /
  open-house / roll result for the current monthKey), tenant
  display name, rent expected this month, lease end date if any.
  No properties → the real-estate pointer (never an empty lie).
- `open house [property]` — $50 cash, 2 game-hours, sets
  openHouseMonth to NEXT monthKey (the month the tick will
  honor). Already set for next month → refuse ("already
  scheduled"). Cash-short → refuse with price + balance.
- `lease [property]` — signs a 3-month lease starting NEXT
  monthKey (leaseUntil = +3 months inclusive). Already leased
  (leaseUntil >= current monthKey) → refuse. No fee to sign.
- `break lease [property]` — ends a lease early, $100 fee,
  leaseUntil cleared. Not leased → refuse ("not leased").
  Cash-short → refuse with fee + balance.

HARNESS: lease → next three tick months occupied at 90% rent
(proven with exact figures), fourth month back on the roll;
open house → next tick month occupied at full rent, month after
back on the roll; tenants screen shows lease/open-house/roll
states correctly; tenant name stable within a monthKey; break
lease charges $100 and clears; all refuses (already leased,
already scheduled, not leased, cash-short) proven; old save
(no lease/openHouse fields) ticks unchanged.

## §62 — LIVING YOUR HOME EXPANSION (extends: .19 furnishing +
comfort, .20 housing/routines/family, sleep)

Home life gains a screen, two daily home routines, a household
view, and a sleep record — all from state that already exists.
No new monthly charge, no new currency, no comfort rework:
comfort tiers, sleep recovery, and household cost rules stand.

STATE (additive, on the player):
- lastSleep?: { energy: number; health: number; happy: number;
  comfort: number } — what the last restful sleep recovered
  (deltas, not totals), plus the home-comfort tier that applied.
  Rested (already-full) sleeps do NOT overwrite it — only a
  genuine restful sleep records.

COMMANDS (all in KNOWN_COMMANDS; home/morning/evening/household
in help §5 Life & Family):
- `home` — the home screen: primary residence (or first owned
  property, or the "no property yet" pointer), comfort tier +
  furniture count, condition, household members (spouse flag +
  children from the existing family fields), last sleep recovery
  (or "no restful sleep recorded yet"), and today's home
  routines status (morning/evening done or not).
- `morning` — morning routine at home: requires an owned
  property in the CURRENT city (you must be home — the same
  rule as chores' property requirement, stated plainly); 1h,
  +5 energy, +2 happiness, once per game-day via the existing
  routinesDone mechanism (key 'morning'), so it appears in the
  `routines` screen alongside errands/chores/selfcare.
- `evening` — evening at home: same property-in-city
  requirement; 2h, +4 happiness, −5 energy, once per game-day
  (key 'evening'); when household members exist, the result
  names them ("Evening with [spouse/household]") — a line, not
  a relationship change (relationships move only via the
  existing gift/hangout/celebrate paths).
- `household` — who lives with you: spouse (from relationship
  spouse flags), children (existing children field), household
  size, and the effects that already follow from size (living
  costs per §32, tick comfort per §36) — stated, not recomputed
  here. No household members → "just you" + the pointer to
  family systems (partner at 90+ via celebrate/milestones).

SLEEP RECORD (sleep() only): capture energy/health/happiness
before the restful sleep, compute deltas after recovery
(including the comfort-tier happiness), store lastSleep. The
rested-sleep early return is untouched and records nothing.

HARNESS: home screen shows primary + comfort + household +
last sleep after a restful sleep; morning/evening require a
property in the current city (refuse otherwise), apply exact
effects, refuse on repeat the same game-day, reset next game-day
(via the routinesDay mechanism); household lists spouse + children
from existing flags; rested sleep leaves lastSleep untouched;
old save (no lastSleep) shows the empty state cleanly.

## §63 — HELP BODY PRESENTATION FIX (extends: .21 §58 reorg)

DRE'S COMPLAINT (live .21): the reorg gave sections + index, but
section BODIES are still plain text with no presentation. The
constraint that shaped .21 still holds: the .20 coverage audit
parses bullet lines with /^• ([a-z][a-z_-]*)/gm, so bullet text
itself must stay byte-identical — bolding a command token inside
a bullet would break the gate. The presentation therefore lives
in the CLIENT RENDERER, not in the bullet text.

DESIGN (shared pure formatter, src/shared/help-format.ts):
- formatHelpMessage(text): escapes HTML first (the .12 rule —
  never regress it), then renders line by line:
  - section header lines (`**N. Name**`) → a titled block
    (.help-section-title) with a divider rule.
  - bullet lines (`• ...`) → one card per entry
    (.help-entry): the command portion (text up to the first
    " — ") in a styled token (.help-cmd, semibold, monospace,
    lime in dark / darkened lime in light), the rest as
    description (.help-desc, muted). Bullets keep their source
    text verbatim — the formatter only wraps it.
  - index lines (`N. Name — help ...`) and other non-bullet
    lines → quiet note blocks (.help-note / .help-index-line)
    with **bold** still converted.
  - blank lines produce spacing via CSS margins, not empty divs.
- Client: handleCommand routes help responses through the
  formatter (msg.help-msg); history replay keeps the old plain
  path (replayed help reads as text — acceptable, live help is
  the presented one). Non-help messages are untouched:
  formatText is NOT changed.
- CSS (true-black-flat, seed 472829175; both compact and
  expanded — entries are block-level inside the bubble):
  dark: entry surface #111111, border #1a1a1a, radius 12px,
  padding 10px 12px, margin 8px 0; command token lime #c6f24e;
  description #b4b4b4; section title #ffffff with a #1a1a1a
  bottom rule. Light mirrors structure (white surface, ink
  #1e293b, token #4d7c0f, muted #64748b).

GATE (must pass, proven in the .23 harness + the audit run):
- Every source bullet line appears as exactly one .help-entry,
  with its command token intact — count of entries equals count
  of `• ` lines in the source text (277 in .22; .23 adds its new
  bullets, and the count moves with them — the invariant is
  entries == source bullets, never a fixed number).
- The .20 coverage audit (tools/harness-audit-0.108.18.ts) still
  passes unmodified: every bullet's command word dispatches.
- Section index + jump + filter behavior from .21 stands
  unchanged (formatter is render-only).

---

# APPENDIX N — v0.108.24 (nine bounded expansions)

Bounded batches, additive only. Economy scale unchanged (entry jobs
~$26k–$38k/yr, rents ~$800–$3,500/mo, bank 0.5%/mo). No new cities,
no new currencies, no new services, no dialogue changes, no real
people/celebrities/politicians/institutions. Existing saves load:
every new player field is optional and defaults empty. Expanded
mode stays a player option. Dialogue is template-only throughout:
no new free-text or LLM dialogue path is added by any item here.

## §64 — ITEM 1: HELP BODY-TEXT WORDING CLEANUP (extends: .21 §58
## help reorg, .23 §63 presentation renderer, .20 §19 coverage audit)

WORDING ONLY. This item changes no behavior, no command, no
section, no order, and no renderer. .23 did presentation only
(§63: the client formatter wraps bullets into cards); the bullet
TEXT itself was never cleaned. That is this item.

PARITY RULE (non-negotiable): the 289 pre-existing help bullets
all survive. Zero bullets cut, zero bullets merged, zero bullets
moved between sections. Each bullet keeps its exact command token
(the text up to the first " — ") and its section. Only the
description after the " — " may change. New .24 bullets from
§§65–72 are ADDITIONS on top of the 289, counted separately in
the §73 gate — they are not a reason to touch the 289.

UNIFORM FORMAT (every rewritten description, in this order):
what the command does; then cost and/or time; then effect. One
tight clause each, no filler. Example shape (illustrative, not a
new bullet): "• work — Work your job shift, 8h, at your hourly
pay." Descriptions that currently ramble, repeat the token, or
bury the cost are tightened to this shape with the same meaning.

CLEANUP PASS (builder method, in order):
- Snapshot all 289 bullets verbatim before touching anything.
- Diff every bullet token against KNOWN_COMMANDS + the dispatch
  table. A bullet whose description names a removed behavior,
  a renamed command, or an old price/time is STALE: rewrite the
  description to the current behavior (price/time/effect as the
  engine actually computes them), keeping the token.
- Fix typos, doubled words, and inconsistent units ($ vs dollars,
  h vs hours — use $ and h, matching the existing majority).
- Same meaning, always: a rewrite that changes what the player
  understands the command to DO is not a wording fix — it is a
  behavior change and is refused here. If a bullet's meaning
  cannot be preserved because the behavior itself moved, the
  bullet is flagged in the report, not silently rewritten.
- The .23 renderer (§63) is untouched: bullet text stays
  parseable by /^• ([a-z][a-z_-]*)/gm, and the formatter still
  wraps — never edits — source text.

NOT IN SCOPE: no new help sections, no reordering, no section
renames, no renderer/CSS changes, no command renames, no
behavior changes of any kind. A dead token (a bullet whose
command does not dispatch) is NOT fixed by deleting the bullet:
it is reported as an exception with the live command it should
point at, and Dre decides — the parity count does not move
without his say-so.

HARNESS / GATE: bullet count before = bullet count after = 289
for the pre-existing set; the .20 two-direction audit still
passes unmodified (every bullet dispatches, every parser command
is documented); the §63 invariant holds (rendered .help-entry
count equals source bullet count); a before/after diff of the
289 shows description-only changes (tokens + section order
byte-identical). Any token change appears in the report as an
exception, never as a quiet edit.

## §65 — ITEM 2: IDENTIFICATION & ID EXPANSION (extends: §31
## permits, §12 profile, §60 passport milestones, travelTo)

Documents are records, not gates. NOTHING that is free today
becomes gated: travel, gigs, jobs, permits, and services keep
exactly their current requirements. Documents add perks only.

THE THREE DOCUMENTS (additive `player.documents?: { idCard?:
boolean; driversLicense?: boolean; passportDoc?: boolean }`,
all default false on old saves):
- ID card — `id card` issues it for $25 cash. Perk: 10% off all
  later permit purchases (business $200 → $180, food $75 → $68
  rounded, drivers $50 → $45) — the discount is a perk on
  existing costs, never a requirement to buy a permit.
- Driver's license document — the credential the §31 `drivers`
  permit already represents. If the player already holds the
  `drivers` permit, `id license` issues the document FREE (same
  credential, new document view — no double charge, ever). If
  not held, `id license` costs $50 and grants the permit effect
  with it (roadtrip fuel $15 → $10, §31) — one purchase, one
  credential, two views of it. NEW perk beyond §31: rideshare
  gigs (§7) pay +$10 per trip while the document is held.
  Rideshare stays open without it (car + condition 30%+ only,
  unchanged) — the +$10 is a bonus, not a gate.
- Passport document — `id passport` issues it for $75 cash.
  Perks: 10% off ROUTED travelTo fares (TRAVEL_ROUTES cost only;
  the $50/3h bus fallback is untouched, §60's fare promise
  stands); souvenirs (§60) $25 → $20. Passport milestones
  (§60, city-count payouts) are unchanged and ungated — the
  document is not required to claim them.

NO REAL ID NUMBERS: a document shows the character name, the
issuing city (current city at issue), and the game-date of
issue. No serial number, no number-like string, no expiry
mechanic, no renewal fee. Documents never expire, never revoke,
and are never checked by any existing command.

COMMANDS (all in KNOWN_COMMANDS, all in help §2 Character or
the ID section the builder places them in — one section only,
named in the report):
- `id` — your documents: which of the three you hold, issue
  city + game-date each, and the perk each one gives. None held
  → the three issue commands + prices, never a gate warning.
- `id card` — issue the ID card ($25, cash-short refuses with
  price + balance). Already held → refuse ("already issued").
- `id license` — issue the driver's license document (free
  with the `drivers` permit, else $50 including the permit
  effect). Already held → refuse.
- `id passport` — issue the passport document ($75, same
  refuses as above).

NOT IN SCOPE: no real-world ID formats, numbers, photos, or
expiry; no document requirement on travel, jobs, gigs, permits,
banking, or property; no second purchase path for the driver's
permit (the permit command and the document command converge
on the same credential — the builder must not create two
charges for one license); no document loss, theft, or renewal.

HARNESS: issue each document → `id` lists it with city + date
and no number-like field; drivers permit held → `id license`
free and fuel stays $10; no permit → $50 grants fuel $10;
permit prices discount only AFTER the ID card is held; routed
fare discounts 10% with passport document, $50 fallback
unchanged; souvenir $20 with passport document; every
previously-free action (travel without documents, rideshare
without license, milestone claims without passport document)
still works; old save (no documents field) runs all commands
cleanly.

## §66 — ITEM 3: CRIMINAL RECORDS EXPANSION (extends: §2
## court/cases/heat/investigations, §5 trusted-job blocking,
## lawyer clean/appeal)

The record is a VIEW of consequences that already exist, plus
one lawful remedy. FAIRNESS BAR: this item creates NO new
punishment, NO new fine, NO new arrest trigger, NO new block.
Anything the record shows must already exist in §2/§5, and
anything new must be a remedy or a display line. A consequence
with no prior warning in its own command's output is not added
here — it is refused here.

RECORD (computed on read, never a parallel punishment ledger):
from `player.cases` (§2: id, offense, fine, status), open
investigations (§2), and heat. Display tiers are labels only:
Clear (no cases, no investigations) · Minor (resolved cases
only) · Active (any open case or investigation). The tier
label grants nothing and blocks nothing by itself.

CONSEQUENCES SHOWN (all pre-existing, each already warned
where it originates — `record` restates them, it does not
create them): trusted-job blocking per §5 (stated only when
it actually applies); lawyer clean cost including the $200
per-open-investigation surcharge (§2); open fines outstanding.
`record` output carries an explicit line: "Your record adds no
new penalty — fines, heat, and blocks below come from the
cases themselves."

LAWFUL REMEDIES (all via the existing lawyer path):
- `lawyer clean` and `lawyer appeal` — unchanged (§2).
- `lawyer expunge [id]` — NEW. Removes a RESOLVED case from
  the record display and from the trusted-job blocking count.
  Rules: case must exist and be resolved (dismissed, reduced,
  or upheld); dismissed/reduced cases expunge immediately for
  $250; upheld cases require 6 game-months since resolution
  (the patience remedy — a too-early attempt refuses and names
  the month it becomes eligible); cost for upheld cases $500.
  Cash-short refuses with fee + balance. Expunged cases stay
  in the internal case history (auditability) but no longer
  appear in `record`, `court`'s open list, or the blocking
  count. Expunge never touches open cases, never touches
  investigations (those close via heat < 30, §2), and never
  erases fines already paid.

COMMANDS (all in KNOWN_COMMANDS, all in help § Government &
Law):
- `record` — record tier, every case (id, offense, fine,
  status, expunged or not — expunged cases listed in a separate
  "expunged" footnote line only if any exist, never as active
  entries), open investigations, heat, and the consequences
  that currently apply (blocking, clean cost) with their
  sources named.
- `lawyer expunge [id]` — as above. Usage errors refuse with
  the exact rule violated (not resolved / too early + eligible
  month / already expunged / cash short).

NOT IN SCOPE: no new crimes, fines, arrests, or blocks; no
record-based price, job, or travel gate beyond the pre-existing
§5 trusted-job blocking (which expunge can only REDUCE, never
extend); no sealing of open cases; no record decay timer that
quietly erases cases (expunge is always a player action with a
fee); no real criminal-record formats or terminology beyond
the game's own case language.

HARNESS: record with no cases → Clear, no consequences listed;
record with cases → tier + fines + blocking + clean cost match
§2/§5 figures exactly; expunge dismissed case ($250) → gone
from active record, blocking count drops; expunge upheld case
early → refused with eligible month, unchanged; after 6
game-months → $500 expunges; expunge open case → refused;
expunge twice → refused; cash-short → refused, nothing
changes; old save (cases field absent) shows Clear cleanly.

## §67 — ITEM 4: AIRPORT / BUS / TRAIN TRANSIT EXPANSION
## (extends: TRAVEL_ROUTES, travelTo, §60 journey, WORLD_CITIES)

Transit is a planning + place layer over route data that already
exists. It invents no routes, no cities, no stations, no fares.
Booking stays `travelTo` — transit shows, names, and discounts;
it does not duplicate the booking path.

MODES FROM ROUTE DATA (method field, never re-labeled):
- flight → "[City] Airport" (display name from WORLD_CITIES).
- bus → "[City] Bus Station".
- drive → "[City] Transit Hub" (road departures; the word
  "drive" is the route method, the hub is the generic place).
Station names are city-generic ONLY: the pattern above with
the city's real display name. No invented station names, no
named terminals, no real-world airport codes or institutions.

TRAIN — SCOPING CALL, STATED PLAINLY: TRAVEL_ROUTES contains
zero train routes (methods in data are drive, bus, flight
only). Inventing train routes, fares, or times would violate
this spec's own no-invention rule, so .24 does NOT sell train
travel. `stations` lists "[City] Train Station" for the
current city with the honest line "No scheduled trains serve
this city in route data" — a place name, not a service. Train
service is a noted follow-up contingent on real route data
being added first, not built here on invented numbers.

TRANSIT PASS (the one new mechanic, bounded): `transit pass`
costs $30 cash and covers the CURRENT game-week (weekKey):
routed bus + drive fares are 20% off while it holds (flight
fares excluded, $50/3h bus fallback excluded). The pass is a
tracker on the player (`transitPassWeek?: string`), not an
item; it expires silently at the week rollover and `transit`
says so. Cost scale: $30 against routed bus/drive fares
($15–$75) pays for itself only on repeated short trips — a
convenience discount, not a money printer.

COMMANDS (all in KNOWN_COMMANDS, all in help §6 World & Travel):
- `transit` — departures from the current city: every
  TRAVEL_ROUTES row from here (destination display name, mode,
  station name, fare, time), plus the $50/3h bus fallback line
  for unrouted destinations (stated as the fallback, §60), plus
  pass status (held this week or not).
- `transit [city]` — the same board for one destination:
  mode, station names at both ends ("[From] Airport →
  [To] Airport" pattern), fare, time, and the pass-discounted
  fare when a pass holds. Unknown city → refuse-with-list via
  resolveNamed, same as travelTo. Read-only: never moves or
  charges (same rule as `journey`).
- `stations` — the current city's stations: Airport, Bus
  Station, Transit Hub, Train Station (generic names only),
  each with whether a route actually serves it (flight/bus/
  drive rows exist) or — for train — the honest no-service
  line. A city with no outbound routes lists all four names
  with no-service lines, never an invented departure.
- `transit pass` — buy the week's pass ($30, cash-short
  refuses with price + balance). Already held this week →
  refuse ("already held through this week").

NOT IN SCOPE: no new routes, cities, stations, or fares; no
train booking, pricing, or times; no flight/bus schedule times
(beyond the route timeHours that already exist — departures
are "available", never given invented clock times); no
booking through transit (travelTo remains the only booking
command); no pass stacking, refunds, or transfers.

HARNESS: transit board matches TRAVEL_ROUTES rows + fallback
exactly (fare/time/method per row); station names follow the
generic pattern for every city; train station always shows
no-service and has no fare; pass discounts routed bus/drive
20% (rounded to dollars) and leaves flight + fallback
unchanged; pass expires at week rollover; transit preview
never moves or charges; old save (no transitPassWeek) runs
all commands cleanly.

## §68 — ITEM 5: WEATHER EXPANSION (extends: time-engine
## getWeather, work pay modifiers, travelTo, events, sleep,
## property condition)

Weather grows from the existing per-game-day-per-city roll
(cached once per day, § time-engine). No second weather system,
no real-world forecast source, no invented climate data.

NEW CONDITIONS (seasonal pools — builder extends the existing
season branches, keeping the existing six conditions' behavior):
- foggy — spring + autumn mornings flavor; work pay ×0.95,
  travel +1h delay (see below).
- snowy — winter only; work pay ×0.85 (same as stormy/rainy),
  travel +1h delay, counts as SEVERE.
- windy — any season, occasional; work pay ×1.0, no delay,
  flavor only.
Existing modifiers stand: stormy/rainy ×0.85, hot ×0.95, clear/
cloudy/cold ×1.0. Full condition set after .24: clear, cloudy,
rainy, stormy, hot, cold, foggy, snowy, windy.

EFFECTS TABLE (each effect names its system — nothing here
is a free-floating bonus):
- Work: the pay modifier above, applied in the existing work
  computation (same place stormy/rainy already apply).
- Travel: on foggy, stormy, or snowy days, ROUTED travelTo
  trips take +1h (delay line in the result). The $50/3h bus
  fallback is unchanged. Roadtrip fuel is unchanged.
- Events: on severe days, `events` carries a weather-warning
  line for outdoor templates; `attend` still works, grants its
  normal rewards, and shows the warning — severe weather
  never cancels an event or blocks attendance.
- Mood: on a severe game-day, the first `status` or `weather`
  call that day applies −2 happiness once ("severe weather
  gloom"), tracked by a day watermark (`weatherMoodDay?:
  string`) so it cannot repeat within the day. Non-severe
  days apply nothing.
- Property: on a severe game-day, owned properties in the
  CURRENT city lose 1 condition point in the day's first tick
  interaction (builder reads the property-engine condition
  floor and never goes below it; if the engine carries no
  numeric floor, the loss stops at 0 — stated in the report).
  Properties elsewhere are untouched.
- Severe = stormy or snowy ONLY. Rainy, foggy, windy, hot,
  and cold are never "severe" and never trigger mood/property
  effects, whatever the flavor line says.

FORECAST — OUTLOOK LANGUAGE ONLY, NEVER A FABRICATED PRECISE
FORECAST: a forecast is not a second roll and is never
presented as fact about a future day. `forecast` shows TODAY
exactly (the rolled getWeather result: temp + condition) and
the next 2 game-days as OUTLOOK BANDS derived from the
seasonal pool only — e.g. winter: "Cold, with snow possible";
summer: "Hot, storms possible" — with the standing label
"Outlook — not a guarantee." No future temp number, no future
named condition stated as fact, no "will rain Tuesday". The
harness asserts the forecast's future lines contain no temp
and no definitive condition claim.

COMMANDS (all in KNOWN_COMMANDS, all in help §6 World & Travel
or the weather line's existing section — one section only,
named in the report):
- `weather` — today in the current city: temp, condition,
  humidity (existing fields), severe alert line when severe,
  and the day's effects summary (work modifier, travel delay,
  mood/property note when they apply).
- `forecast` — today (exact) + next 2 game-days (outlook
  bands only, labeled as outlook, per the rule above).

NOT IN SCOPE: no real-world weather data or source; no
multi-day precise predictions; no weather-based job, shop, or
service closures; no weather control, insurance, or repair
discount tied to weather (property condition loss is repaired
only through the existing repair path); no new severe
condition beyond stormy/snowy; no retroactive change to
already-rolled days (the day cache stands).

HARNESS: seasonal pools produce the new conditions (proven
by forced-date rolls in the harness, not by waiting for
randomness); modifiers apply exactly (snowy ×0.85, foggy
×0.95, windy ×1.0); routed travel +1h on foggy/stormy/snowy
days, fallback unchanged; severe-day mood −2 once per day
(second call same day: no repeat); severe-day property −1
in current city only, floor respected; forecast today line
matches getWeather, future lines carry no temp and no
definitive condition; old save runs both commands cleanly.

## §69 — ITEM 6: POLICE / FIRE / EMS CAREERS (extends:
## jobs-database government/emergency/federal listings, §7
## promotion path, §21 shift choice, §5 government tiers)

These are CAREER LADDERS inside listings that already exist —
not new employers, not new job posts, not a new hiring path.
Entry is the existing `apply [job]` flow on existing
government/emergency listings; the ladder is what happens
AFTER you are hired, on the existing promotion path.

LADDERS (titles only until the promotion path grants them;
requirements are in existing scales — shifts worked, skill
levels, and listing requirements such as academy strings the
requirement matcher already recognizes):
- Police: Cadet → Officer → Sergeant → Lieutenant → Captain
  → Chief. Sergeant: 25 shifts + fitness 3. Lieutenant: 50
  shifts + fitness 4. Captain: 100 shifts + leadership via
  the existing promotion record (builder maps to the real
  promotion field and names it in the report — no invented
  stat). Chief: 150 shifts + executive tier (§24 climb rule).
- Fire: Recruit → Firefighter → Engineer → Lieutenant →
  Captain → Battalion Chief. Engineer: 25 shifts + fitness 3.
  Lieutenant: 50 shifts + fitness 4. Captain: 100 shifts.
  Battalion Chief: 150 shifts + executive tier.
- EMS: EMT → Paramedic → EMS Supervisor → EMS Captain → EMS
  Director. Paramedic: 25 shifts + intelligence 3. Supervisor:
  50 shifts. Captain: 100 shifts. Director: 150 shifts +
  executive tier.
Rank titles are DISPLAY in `career` + `status` (job line) and
journal lines at each crossing. Pay follows the EXISTING
promotion pay path only — no second pay system, no per-rank
bonus invented here. A rank the player has not earned is
shown as the next rung + its requirements, never as held.

SHIFTS: services work the standard 8h `work` shift — NO
24-hour shift mechanic in .24 (a 24h fire/EMS shift would need
a new shift-length system; noted as a follow-up, not built).
The §21 shift choice applies unchanged: morning normal,
evening +10% pay / −40 energy, night +20% pay / −45 energy /
+5 stress. "Shifts" in a ladder requirement means completed
`work` shifts at that service's listings (counted by employer
category family: government/emergency listings whose employer
or category matches the service — builder maps from the real
listings data and lists the mapping in the report).

COMMANDS (all in KNOWN_COMMANDS, all in help § Government &
Law or § Jobs — one section only, named in the report):
- `careers` — the three ladders at a glance: your service (if
  employed at one), current rank, next rank + requirements,
  and the other services' entry pointers (`apply` + the
  listing category to look under).
- `careers [police|fire|ems]` — one ladder in full: all ranks,
  requirements per rank, your progress toward the next rank.
- `career` — extended (existing command): when employed at a
  service listing, shows the ladder rank line alongside the
  existing career titles (§7). Unchanged for all other jobs.

NOT IN SCOPE: no new job listings, employers, or hiring paths;
no 24-hour shifts, on-call mechanics, or emergency callout
events; no rank-gated prices, discounts, or powers (rank is a
title + promotion-path progress, not a key); no service
vehicles, equipment, or uniforms as items; no change to the
§2 police/heat system (being a police officer does not change
heat, fines, or investigations — the two systems stay
separate and the spec says so).

HARNESS: each ladder's ranks + requirements display from real
listing data (builder lists which listings map to which
service); rank advances exactly at the shift/skill thresholds
via the promotion path; `career` shows the rank line only for
service jobs; shift differentials (§21) apply unchanged to
service shifts; no 24h shift exists to test; old save (no
ladder field — rank computed live from shifts/skills/tier,
never stored as a grind) runs all commands cleanly.

## §70 — ITEM 7: TIME & 24-HOUR EXPANSION (extends: TimeEngine,
## NPC WeeklySchedule, sleep, §22 citizens, §6 calendar)

One clock, still: the existing TimeEngine (actions advance it,
starting 2024-01-01). Nothing here adds a second clock, a
real-time tick, or an idle timer. "24-hour" means the game-day
is now READABLE and FELT hour by hour — not that the game
runs while the player is away.

TIME-OF-DAY BANDS (from TimeEngine.getTimeOfDay, unchanged):
morning 5–12 · afternoon 12–17 · evening 17–21 · night 21–5.
`isDaytime` (6–20) is NOT redefined — the bands and the
daytime flag coexist as they do today, and the spec names
which one each line uses.

DAY/NIGHT DIFFERENCE (real, small, stated):
- Night sleep bonus: a restful sleep STARTING in the night
  band (21–5) recovers +5 energy over the day-sleep recovery
  (builder reads sleep()'s recovery and adds the delta —
  the bonus is a delta on the existing recovery, never a
  rewritten sleep formula). Day sleep is unchanged.
- Night quiet: `citizens` already shows night quiet (§22);
  `time` restates it. No service, shop, event, or command is
  closed at night — night changes flavor and the sleep bonus
  only, never availability. (A night-closure system would gate
  previously-free actions; it is refused here.)
- `events` at night: when no event is listed, the output says
  so with a night line ("Night hours — the city is quiet")
  instead of implying missing data. No new night events.

HOURLY LIFE (display from systems that already track hours):
`time` shows the current hour's picture: game date + time,
band, day/night, season (§6), hours until the next band, the
district activity for this hour (§22's time-of-day activity
rule), and today's routines status (from the routinesDay
mechanism, §62). Nothing new is simulated per hour — the
"hourly" layer is a READING of the clock + schedules that
already exist (NPC WeeklySchedule day + hour + district
matching, §22).

COMMANDS (all in KNOWN_COMMANDS, all in help § Life & Family
or § World & Travel — one section only, named in the report):
- `time` — the clock screen: date, time, band, day/night,
  season, hours to next band, this hour's district activity,
  today's routines done/remaining, and the night-sleep bonus
  note when in the night band.
- `day` — today in review: weather today (§68), events today,
  routines done, work shift done or not, last restful sleep
  (§62 lastSleep) — all from existing state, computed on read.
  Nothing here is a new tracker.
- `wait [hours]` — pass time deliberately: 1–8 game-hours per
  call (builder first checks whether a `wait` command already
  exists — if it does, this item EXTENDS it with the 1–8h
  bound and the rules below instead of adding a second wait).
  No energy/health/happiness change, no money change. Crossing
  a month boundary fires the monthly tick exactly as any
  other clock advance does (same rule as sleep — no special
  wait exemption). Refuses: no number, 0, above 8, or
  non-numeric input (each with the 1–8 rule restated).
  Waiting across a game-day boundary rolls the next day's
  weather normally (the per-day cache, §68).

NOT IN SCOPE: no real-time or idle progression; no second
clock; no night closures or time-gated commands; no new sleep
formula (only the +5 night delta); no hourly simulation loop;
no calendar rewrite (§6 stands); no 24h shift system (see
§69 — the two "24-hour" ideas are different items and neither
invents a shift length).

HARNESS: `time` matches TimeEngine (date/time/band/season)
exactly; night sleep recovers exactly +5 over day sleep with
otherwise identical inputs; `day` reflects weather, events,
routines, and lastSleep from live state; `wait 3` advances
exactly 3h with no stat change; `wait 0` / `wait 9` /
`wait abc` refuse with the rule; month-crossing wait fires
the tick once; old save runs all commands cleanly.

## §71 — ITEM 8: NEWS CATEGORIES (extends: §16 newspaper, §23
## fame/notable/elite rule, §25 stocks/index, §24 companies,
## §40/§41 offices roster, §22 district needs, racing standings)

`news` gains categories. Every category is a FILTER over real
game state — the §16 rule stands in every category: a section
with no data says so plainly, never a fabricated entry. No
real celebrities, politicians, world news, or institutions
appear anywhere: "celebrity" and "politics" below mean the
game's OWN people and offices, by the rules that already
define them.

CATEGORIES (each built only from the source named):
- celebrity — the game's notable + elite roster NPCs per the
  §23 rule (public-facing leadership posts / major-enterprise
  owners / top professional posts, matched against real role
  strings), plus the player's own fame tier line (§23). No
  NPC is hand-promoted outside the §23 rule.
- crime — the current city's patrol level (§2, from
  crimeRate), open investigations count (§2), and heat band
  (word only: Low / Watch / High — thresholds from the
  existing investigation cutoffs, stated in output). No
  invented crimes, incidents, or suspects.
- stocks — §25 computed prices + monthly changes for listed
  companies, and the World / Mid-South index direction words.
  No ticker beyond §25's computed figures.
- sports — racing season standings + recent race results
  ONLY (the racing-service data that already exists). If no
  season is underway and no results exist, the section says
  so — no invented matches, scores, or teams.
- politics — the game's OWN offices per §40/§41: office
  holders are roster NPCs in those roles (builder uses the
  §41 roster mapping, never a real person), plus the player's
  civic title (§5). If the game holds no election state, the
  section lists office holders and says "No election
  underway" — an election is never invented to fill it.
- city — the current city's world events this week, district
  needs words (§22: safety/prosperity/spirit), and this
  week's holiday label when in a holiday week (§17).
- world — the existing §16 world-events + market sections
  (the unfiltered view's spine, kept as a category so a
  filter never strands the player without the general news).

COMMANDS (all in KNOWN_COMMANDS, all in help § News or the
§16 section — one section only, named in the report):
- `news` — unchanged: the full dated feed (§16), all sections
  present only when their data exists.
- `news [celebrity|crime|stocks|sports|politics|city|world]`
  — the same feed filtered to that category (date line kept,
  so a filtered feed is still dated). Unknown category →
  refuse-with-list of the seven tokens.
- Ticker note: the §55 ticker strip is UNCHANGED by this item
  (category-filtered tickers are a follow-up, not built here —
  one news system change per version).

NOT IN SCOPE: no real people, politicians, celebrities,
teams, or world events; no invented headlines, rumors, or
election results; no new news data source (every line traces
to a §16/§23/§25/§40/racing/city source named above); no
opinion, editorial, or commentary lines; no category beyond
the seven tokens (a "gossip" or "international" category
would need a data source this spec does not grant).

HARNESS: each category shows only its named source's data
(celebrity lines ⊆ §23-rule NPCs + player fame; politics
lines ⊆ §41 roster office holders; crime figures match
§2 patrol/investigations/heat exactly; stocks match §25
computed prices; sports ⊆ racing data or the empty line);
empty category → plain "nothing to report" line, never
fabrication; unknown category refused with the token list;
bare `news` output unchanged; old save runs all commands
cleanly.

## §72 — ITEM 9: SOCIAL MEDIA EXPANSION (extends: phone/comms
## systems, comm-hub social feed, existing `social` command,
## roster NPCs, achievements, travel, jobs)

In-game social media on the phone the player already has.
TEMPLATE-ONLY: the player never types free post text. Every
post is a fixed template with slots filled from real state —
the same template discipline as dialogue, applied to posts.
No new dialogue system, no LLM path, no external service.

TEMPLATES (fixed strings; slots fill ONLY from live state,
and a template whose slot data does not exist refuses with
the missing piece named):
- visit — "Just arrived in {city display name}!" (requires
  a visited city — defaults to the current city).
- work — "New shift at {employer}!" (requires employment;
  unemployed → refuse with the `apply` pointer).
- milestone — "Unlocked {achievement name}!" (requires at
  least one unlocked achievement; none → refuse).
- home — "Enjoying {city display name} today!" (always
  available — current city).
No other templates in .24. No hashtags invented beyond the
template text, no mentions of NPCs the player has not met
(posts never name an NPC at all — posts are about the
player's own state, which is why they cannot fabricate a
claim about anyone else).

ROSTER NPCS ONLY: following is roster-only. `follow [name]`
uses the shared name resolver (exact → unique substring →
refuse-with-list); a non-roster name refuses ("not someone
you know in this world"). Followed NPCs' template posts
appear in the feed via comm-hub (their posts are the
comm-hub's existing NPC post generation, surfaced for
followed NPCs — no new NPC authoring). Unfollowing removes
them. No real people, no player-to-player posts (other
players' saves are never read here — unlike §18 trading,
this is single-player feed only).

FEED RULES: `social` (existing) gains two sections above its
current output, never replacing it: "Your posts" (the
player's template posts, newest first, capped at 10 shown)
and "Following" (posts from followed roster NPCs). Player
posts start at 0 likes / 0 comments (honest zeros, never
seeded engagement); followed-NPC posts carry comm-hub's
existing counts. Posts are display only: no like/comment
action in .24 (follow-up, not built), no follower count
mechanic, no monetization, no algorithmic ranking.

COMMANDS (all in KNOWN_COMMANDS, all in help § Phone & Social
or the comms section — one section only, named in the report):
- `post` — list the four templates + what each needs.
- `post [visit|work|milestone|home]` — publish that template
  post (slot filled from live state; missing slot → refuse
  with the reason). One post per command, no batching.
- `follow [name]` — follow a roster NPC (already followed →
  refuse naming them).
- `unfollow [name]` — unfollow (not followed → refuse).
- `following` — who you follow (roster names only) + your
  post count.
- `social` — extended (existing command): your posts +
  following posts + the existing feed, in that order.

NOT IN SCOPE: no free-text posts, comments, likes, DMs, or
follower counts; no real platforms, handles, or people; no
cross-player feeds; no post editing/deletion (a post stands
— deletion is a follow-up, not a quiet extra); no engagement
farming (no reward for posting, no XP/money from posts);
no NPC posts invented outside comm-hub's existing generation.

HARNESS: each template posts with its slot filled from real
state (visit = current city display name, work = real
employer, milestone = real unlocked achievement); missing
slot refuses (unemployed work post, zero-achievement
milestone post); free text (`post hello world`) refuses with
the template list; follow non-roster refuses; follow/unfollow
round-trip reflected in `following` and in `social` sections;
player post shows 0 likes honestly; old save (no posts/
following fields) runs all commands cleanly.

## §73 — HELP COVERAGE + VERSION + STAGE GATE (for Appendix N)

- §19's gate covers .24: EVERY new or changed command in
  §§64–72 appears in help with EXACT syntax. Changed commands
  whose help lines change: `career` (ladder rank line, §69),
  `social` (post/following sections, §72), `news` (category
  filter, §71). New help sections are named per item in the
  builder's report (one section per item's commands — no
  command documented in two sections).
- Coverage count, stated exactly: the 289 pre-existing bullets
  (§64 parity) PLUS the new .24 bullets (counted in the
  report: new commands from §§65–72 + the `news` category
  forms documented as their tokens). The harness asserts BOTH
  directions (§19): every parser command appears in help AND
  every help entry dispatches to real output. The §63
  invariant holds: rendered .help-entry count equals source
  bullet count (289 + new).
- Working standard (§19, unchanged): every new command and
  mechanic in §§64–72 is proven END-TO-END with real effect —
  state changed, money/perk/rank/weather/news/post actually
  computed. Dispatch-without-"Unknown command" is NOT proof.
  Any item that does not work is FIXED, not shipped broken;
  any item that genuinely cannot be made to work is reported
  as NOT SHIPPED with its reason, and appears nowhere in the
  What's New entry or help.
- Version bump exactly once 0.108.23 → 0.108.24 (package.json,
  src/shared/version.ts GAME_VERSION, server boot log line,
  AGENTS.md header). ONE v0.108.24 What's New entry at the TOP
  of renderUpdatesScreen, dated November 2, 2026, covering
  SHIPPED items only (.23 entry untouched below it).
- Verify: type-check exit 0, build exit 0, ALL existing
  harnesses green, plus tools/harness-0.108.24.ts (new .24
  harness) green.
- STAGE ONLY: no publish, no submit, no publish-0.108.24 log.
  Dre reviews the breakdown first, then gives the submit go.

---

## "AND MORE" FOR APPENDIX N — ALLOWED ONLY INSIDE THESE ITEMS

- Help description rewrites inside §64's parity rule — allowed.
- ID perk discounts on existing costs (permits, routed fares,
  souvenirs) — allowed.
- Record tier labels + expunge — allowed.
- Transit pass weekly discount — allowed.
- New weather conditions + outlook bands — allowed.
- Career ladder titles + requirements display — allowed.
- Night-sleep +5 delta + wait 1–8h — allowed.
- News category filters over named sources — allowed.
- Four fixed post templates + follow/unfollow — allowed.
- NOT allowed: new cities, new NPCs, real people/institutions,
  train routes/fares, precise future forecasts, new punishments
  or gates on previously-free actions, 24-hour shifts, night
  closures, free-text posts, fame purchases, company founding.
  Anything beyond this list is flagged in the report, not built.
