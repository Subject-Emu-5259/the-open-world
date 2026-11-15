# v0.108.26 — Deeper working activities + deeper shift expansion + apply-listing fix

Spec-first, bounded. Builds on live v0.108.25. Additive only; old saves load
(fields default on first use). No new cities/currencies/services. Dialogue
template-only. No real people/celebrities/politicians/institutions. The .21
fee-ladder fairness bar stands wherever penalties exist (no new penalties
here — only energy/time costs and clean refusals).

## Anchors (existing scale, never exceeded)

- Entry hourly pay ~$25.60 (Police Cadet) → 8h shift ~$204.80.
- Shift premiums: morning ×1.00 / evening ×1.10 / night ×1.20 (night is the
  ceiling for any new differential without a matching cost).
- Overtime: 1.5×, hard caps 4h/day and 12h/week (untouched).
- Lunch: 1h, $15, +3 rel, +5 happy. Volunteer: 2h, −10 energy, +5 community
  rep, +3 happy. Overtime hours: −5 energy/hr, +2 stress/hr.
- work() guards: no job → refuse; energy < 20 → refuse; energy 0 after a
  shift → health −3 (existing exhaustion cost, reused, never extended).

## Workstream 1 — Deeper working activities (general, any job)

All require a job and refuse while incarcerated. Every activity is once per
game-day (tracked in player.activityDates[activity] vs the game-date string),
so none can be farmed by repetition. Energy costs refuse cleanly when short
(never drop energy below zero by an activity — activities check first).

| Command | Effect | Cost |
|---|---|---|
| task / tasks | Show today's assigned shift task (deterministic: hash of employer + game-date over a 6-task generic pool; same task all day, new task next game-day) | none (view) |
| task complete | Finish today's task | 1h, −5 energy, +$25 (taxed like work pay), +10 job-skill XP |
| mentor [name] | Mentor a coworker (same roster pool as lunch: job city + district + role family; never invented) | 1h, −5 energy, +4 relationship, +3 professional reputation |
| meeting | Team meeting | 1h, −5 energy, +5 job-skill XP, +2 happiness |
| breakroom | Break-room recovery | 1h, +10 energy (cap 100), +2 happiness |
| report | File a shift report (emergency tracks: incident report wording, same effects) | 1h, −5 energy, +3 professional reputation, +5 job-skill XP |
| cover [name] | Cover a coworker's shift (same pool as lunch) | 4h, −20 energy, 4h base pay (flat hourly, no differential), +3 relationship; NOT a tenure shift, does not count toward promotion |

Task pool (generic, employer-agnostic, no invented specifics):
1. Tidy the work area and restock supplies
2. File the day's paperwork
3. Help a customer with a routine question
4. Check inventory and note shortages
5. Prepare tomorrow's opening checklist
6. Assist with the end-of-day cleanup

## Workstream 1 (required) — Emergency-track activities

Membership = the player's job is on a .24 emergency ladder (rankFor over
police/fire/ems), so Cadet and every rung above it qualify; non-emergency
jobs refuse with a track message. Same once-per-game-day + energy rules.
No real-department claims: activity names are generic patrol/training/
report wording only.

| Command | Track | Effect | Cost |
|---|---|---|---|
| patrol | police only | Patrol activity | 2h, −10 energy, +$30 (taxed), +10 fitness XP |
| drill | fire only | Station drill | 2h, −10 energy, +$30 (taxed), +10 fitness XP |
| respond | EMS only | Call response | 2h, −10 energy, +$30 (taxed), +10 job-skill XP |
| training | police/fire/EMS | Academy/station/medical training | 2h, −10 energy, +15 job-skill XP (no cash) |
| ridealong | police/fire/EMS | Ride along on a routine rotation (no NPC invented — solo generic activity) | 2h, −5 energy, +5 job-skill XP, +2 happiness |

+$30 for 2h sits BELOW 2h base pay at Cadet rate ($51.20) — a bonus
activity, not a shift replacement. This is why Dre's Cadet felt "plain":
the rung had no activities of its own; now it has five.

## Workstream 2 — Deeper shift expansion

New one-shot shift keys (same next-work-only semantics, reset after work):

| Key | Pay | Energy | Stress | Other |
|---|---|---|---|---|
| weekend | ×1.15 | −40 | +2 | Only settable Sat/Sun game-days (refuses weekdays); sits between evening and night, never above night's premium |
| split | ×1.00 | −30 | 0 | +3 happiness (flexibility perk, no pay premium — never strictly better than morning on pay) |
| oncall | ×1.10 | −35 | +5 | Same premium as evening; the cost is stress instead of energy |

- `shift prefer [morning|evening|night|weekend|split|oncall|none]` —
  persistent preference, used by work() only when no one-shot shift is set
  (one-shot always wins). Shown in `workplace`. `shift prefer` bare shows
  the current preference.
- Night-shift fatigue: work() tracks player.nightStreak (consecutive night
  shifts; any non-night work resets it to 0). On the 3rd and later
  consecutive night shift: extra −10 energy and +5 stress with a fatigue
  note. The existing exhaustion rule (energy 0 → health −3) is the only
  health cost — fatigue never adds a new penalty type.
- Weekend validation happens ONLY at set time (shiftSet); work() applies
  whatever pending shift was set, even if midnight crossed — no surprise
  fallback to morning.

## Fix — `apply` listing hides entry jobs

Root cause: formatJobListings sorts executive → entry and slices the first
15, so entry-tier jobs (e.g. Police Cadet, Memphis) never display even in
the right city. Fix (display only, smallest change): sort entry-first
(entry, skilled, career, elite, executive), cap stays 15. Memphis entry
jobs number well under 15, so Cadet is guaranteed visible. NO change to
hiring rules, job data, or pay. By-name hire (`apply police cadet`) keeps
working (it searches the full city list, not the displayed slice).

## Commands added (13 bullets, 335 total)

task, task complete, mentor, meeting, breakroom, report, cover, patrol,
drill, respond, training, ridealong, shift prefer. `shift` bullet and
`apply` bullet reworded (no count change). All new first-words added to
KNOWN_COMMANDS so typed input wins over chat mid-conversation.

## Follow-ups (noted, NOT built)

- Per-tier task variety (tasks keyed to job tier/category).
- Task streaks / weekly task bonuses.
- On-call callout events (deterministic extra work on on-call days).
- Fire/EMS ride-along flavor copy distinct from police (currently generic).
- Shift-swap between two players (multiplayer — needs the relay, out of
  scope for a text-sim version).

## Verification

New harness tools/harness-0.108.26.ts proves with real output: every
activity's effect + refusal (no job, incarcerated, low energy, repeat
same day, wrong track, non-coworker), every new shift key's pay/energy/
stress + weekend weekday refusal + preference persistence + one-shot
override + night-streak fatigue at 3+, Cadet visible in the Memphis apply
listing + by-name hire still working, old-save compatibility (no new
fields required), help 335 bullets.
