# LIFE AND WORLD EXPANSION — SPEC v0.108.19

**Status:** SPEC FIRST, then built to it. One big update stacking on
v0.108.18 (staged, never submitted). v0.108.17 is live.

**Design rule (from the .18 audit):** expand from STRENGTH, not from
broken systems. Every pillar below builds on a system the .18 audit
proved working with real output: the navigation loop, the job
lifecycle, the property economy (85% occupancy + 0.5%/mo bank
interest), the NPC roster + unified name resolver, the schools
catalog, the vehicle garage lifecycle, the crime/law loop, and the
event engine. No pillar touches a system the audit flagged as weak.

**Global constraints (all pillars):**
- Additive only. Existing saves keep loading; every new player field
  is optional and defaulted on read (same rule as .15/.18).
- Existing command/state/tick architecture only. No new services, no
  Optra/dialogue changes, no new currencies.
- Economy scale (never break it): entry jobs ~$26k–$38k/yr
  (~$2,200–$3,200/mo), owned rents ~$800–$3,500/mo on occupied units
  only, bank interest 0.5%/mo. Every new cash reward sits at or below
  this scale, and every new cash cost is payable from ordinary play.
- No invented lore beyond existing world data. City/event names derive
  from the cities' own data (display names, regions, modifiers).
- Expanded mode stays a player option. No changes to .18 menu work or
  theme. Help documents every new command.

---

## LIFE PILLARS (deepen the lived life)

### L1 — Bonds & Milestones (builds on: NPC roster + resolver + .15 depth)
Relationship tiers already exist (25 Acquaintance, 50 Friend, 75 Close
Friend). The expansion completes the ladder and makes it visible:
- New top tier: **Partner at 90+** — recorded as a `partner` flag on
  the relationship record; shown in `friends`, `profile`, and the new
  `milestones` view. No behavior change to gifts/hangouts other than
  the label; Partner is a status, not a power.
- New command `milestones` — every NPC the player has met, with
  current tier, value, and the next tier + how far away it is.
- New command `celebrate [name]` — spend an evening with someone you
  know (value ≥ 25): costs $50, advances 2 game-hours, −10 energy,
  +8 relationship, +5 happiness. Uses the shared name resolver
  (exact → unique substring → refuse-with-list), same as talk/gift.
- Rewards: relationship + happiness only. No money, no XP farm
  (cost + energy + time keep it honest).

### L2 — Home Life (builds on: property buy → own → upgrade → sell)
Owning a home currently pays rent and nothing else. Furniture makes a
house a home:
- New command `furnish` — shows the furniture catalog and, for each
  owned property, what is already in it.
- New command `furnish [property] [item]` — buy an item for a property
  you own. Catalog (cash prices, all within ordinary play):
  Cozy Bed $300, Reading Chair $150, Kitchen Set $600, Work Desk
  $400, TV & Sound $900, Art Collection $1,500.
- Comfort: each property's comfort tier = 0–3 from furniture count
  (0 items = 0, 1–2 = 1, 3–4 = 2, 5+ = 3). Comfort is stored on the
  property record itself (additive `furniture` list; old properties
  read as empty).
- Effect: restful sleep recovers better at home — sleep happiness
  bonus becomes +5 base + comfort tier (max +8), and stress drops an
  extra 5 at comfort ≥ 2. Only when sleeping in a city where you own
  a furnished property (you sleep where you live; travel does not
  carry comfort). No rent change, no sell-price change.
- `properties` output shows each property's furniture + comfort tier.

### L3 — Home Cooking (builds on: skills + energy + cash loop)
The cooking skill exists but nothing in the game uses it. Cooking
turns cash + time into energy and skill:
- New command `cook [meal]` — five meals, cash cost = ingredients,
  no inventory needed:
  Home Soup $10 (+15 energy, +2 happiness, +10 cooking XP),
  Pasta Night $18 (+22 energy, +3 happiness, +15 cooking XP),
  Sunday Roast $30 (+30 energy, +4 happiness, +20 cooking XP,
  requires cooking level 2), City Feast $40 (+38 energy, +5
  happiness, +25 cooking XP, requires cooking level 4).
  Each meal advances 1 game-hour and costs 5 energy to prepare
  (cooking is work, not free energy).
- `cook` with no argument lists the meals + requirements. Uses the
  existing skill-XP path (same as gym's fitness XP).
- Rewards: energy + happiness + skill XP only. No money earned.

## WORLD PILLARS (deepen the world)

### W1 — World Events Calendar (builds on: event engine + city data)
Events currently arrive by surprise from explore/work. The calendar
makes the world's life visible and plannable:
- New command `events` — this game-week's events across the world,
  derived deterministically from the game-date + each city's own
  modifiers (e.g. a blues night where the city carries a music
  modifier, a food market where it carries a food modifier, a
  lakeside fair for a small-town modifier). Same date = same events
  for every player; no invented cities, no invented venues.
- New command `attend [event]` — attend an event in the city you are
  currently in (events elsewhere say so and name the city). Attending
  advances 2 game-hours, costs $10 (entry), grants +5 happiness and
  $25–$75 appearance money scaled by the city's economic index
  (within the daily-goal reward scale). One attendance per event per
  player (tracked on the event id + game-week, additive field).
- `events` output names the city in display form, never a raw id.

### W2 — Road Trips (builds on: vehicle garage + travel pricing)
Travel is currently abstract fares. A road trip spends your car, not
a ticket:
- New command `roadtrip [city]` — drive your best-condition owned
  vehicle to another city. Requirements: own a vehicle (bicycles
  excluded, same as performance upgrades), condition ≥ 30.
  Cost: $15 fuel (flat, below the $50 generic bus fare — the car is
  the investment that earns the discount) + 2 vehicle condition,
  time = the normal route time (route hours or 3h fallback, same as
  travel). Grants +20 driving XP and a roadside flavor line.
  Destination, fare-check-before-moving, and visited-city tracking
  reuse travel's rules exactly (broke players stay put; same-city
  road trips refuse like travel does).
- No vehicle → the error names `travel` as the fallback. No new
  travel economy: fuel is a flat fee, not a fuel system.

### W3 — Passport & World Journey (builds on: navigation loop +
  visitedCities)
`visitedCities` is already tracked by travel. The passport makes the
journey itself a goal:
- New command `passport` — every city visited (display names, in
  visit order), count out of 27, and the next milestone.
- Milestone rewards (one-time each, tracked by an additive
  `passportMilestones` count on the player): 5 cities $100, 10
  cities $250, 15 cities $400, 20 cities $600, all 27 cities
  $1,000. Claimed automatically on `passport` when reached, never
  twice. Top reward $1,000 one-time is below one month's rent scale
  and far below job income — a memento, not an economy.
- `passport` also lists the next unvisited region hint (region of
  the nearest unvisited city by the existing region field) so the
  journey always has a next step.

## Commands added (8)
`milestones`, `celebrate [name]`, `furnish [property] [item]`,
`cook [meal]`, `events`, `attend [event]`, `roadtrip [city]`,
`passport`. All documented in help under a new "Life & World"
section. Aliases: none beyond existing conventions (no new alias
proliferation).

## What this expansion deliberately does NOT do
- No marriage/family simulation beyond the Partner status label
  (no children, no household NPCs — that is a future spec, not
  crammed in here).
- No new map, no new cities, no new NPCs — the world deepens from
  its own data.
- No recurring costs, no new drains — the .15 no-recurring-tax call
  stands.
- No dialogue/Optra changes, no theme/menu changes, no save-format
  break.
