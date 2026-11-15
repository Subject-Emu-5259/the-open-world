# v0.108.25 spec — Leaderboard revamp, compact menu fit, Avok studio branding

Why .25, not .24: v0.108.24 was already SUBMITTED for review when these
three additions arrived (2026-11-02). A submitted Devvit version is
immutable, so the additions queue as v0.108.25. The .24 What's New entry
is therefore NOT edited for them; the .25 entry lists them instead.
Everything below is additive only; no new cities, currencies, or
external services; economy at the established scale; expanded mode
stays a player option; dialogue stays template-only.

## 1. Leaderboard revamp (§74)

Current state (kept): lifetime-XP top 10 + own rank + newspaper top-3,
written by the .21/.22 path — best-effort `zAdd` on command-path saves
via `recordCommandOutcome` (each channel retries once, never blocks the
response, never throws into gameplay). That write path is EXTENDED, not
replaced.

New boards (all read from the same real Redis store, never invented):
- `lifetime` — existing `tow:leaderboard`, lifetime XP (unchanged).
- `weekly` — `tow:lb:week:<UTC-Monday YYYY-MM-DD>`: XP GAINED in that
  real-world week. Deltas against the last lifetime XP the write path
  saw (`tow:lb:lastxp:<user>`). The lastxp value is set BEFORE the
  increments, so a retry after a partial write can undercount a bucket
  but never double-count it (best-effort channel, same loss class as
  the existing path). Week sets expire after 14 days (challenge
  pattern); only players who played that week appear.
- `monthly` — `tow:lb:month:<YYYY-MM>`, same delta rule, 62-day expiry.
- `wealth` — `tow:lb:wealth`: current `specNetWorth` snapshot at save
  time (`zAdd`, like lifetime).
- `fame` — `tow:lb:fame`: current `fameScore(player, unlocked count)`
  snapshot at save time (unlocked count from the save's own
  `achievements.unlocked` array; 0 when absent).

Commands (handler-owned, engine never sees Redis — same as the existing
`leaderboard` command):
- `leaderboard` — lifetime top 10 + own rank, byte-identical behavior.
- `leaderboard [weekly|monthly|wealth|fame]` — that board's top 10 +
  own rank on it. `leaderboard lifetime` = bare.
- Unknown board word → usage line listing the five boards (answered,
  not an error state).
- Failed fetch → the existing unavailable line, no nudge, no entries.

Client Leaderboard screen: board tabs (Lifetime / This week / This
month / Wealth / Fame) fetching `/api/leaderboard?board=X`. The
endpoint keeps the old shape for back-compat (entries carry both `xp`
and `score`; `me` carries both). Challenge section untouched.
Newspaper top-3 stays lifetime.

Message honesty (.21 rules stand): empty board says so ("No ranked
players yet…" / board-specific line) — never fabricated entries; the
not-ranked nudge appears ONLY for an identified player on a LOADED
board with genuinely no rank; an unavailable fetch shows ONLY the
unavailable line.

Richer rank display: rank number + username + board score with its own
label (XP / XP this week / XP this month / net worth $ / fame), plus
the viewer's own rank line per board.

Help: the existing `leaderboard` bullet is reworded to list the board
filters (same token, no count change).

## 2. Compact/inline menu fit (§75) — live UI bug fix

Scope is COMPACT/INLINE mode ONLY. Both menus overflow a short Reddit
frame: the main menu (`.menu-screen`, 40px padding, five ~70px buttons,
no overflow rule, `#game-root` overflow hidden) and the pause menu
(`.game-screen .game-menu-content`, 32px padding, no max-height, no
overflow — expanded already has 90vh + scroll from the old rule).

Fix — two new rules appended at the end of `public/game.css`, nothing
else in the file touched:
- `body:not(.tow-expanded) .menu-screen { overflow-y: auto; padding: 24px; }`
- `body:not(.tow-expanded) .menu-screen .menu-content { margin: auto; }`
  (auto margins = safe centering: the menu still centers when it fits
  and scrolls fully when it doesn't, unlike justify/align centering
  which clips the top on overflow.)
- `.game-screen:not(.fullscreen) .game-menu-content { max-height: 92vh;
  max-height: 92dvh; overflow-y: auto; padding: 24px; }`

Why expanded cannot change: `body:not(.tow-expanded)` cannot match
expanded mode (body carries `tow-expanded` there), and
`.game-screen:not(.fullscreen)` cannot match the fullscreen panel
(it carries `fullscreen`). The expanded rule blocks
(`.game-screen.fullscreen .game-menu-content`, both the old 90vh one
and the newer wide-panel one) are byte-identical by diff against the
.24 baseline, and no new rule targets a positive expanded selector.

Per-mode verification (explicit, rule-level — a node harness cannot
prove pixels; Dre's playtest is the visual verdict):
- Compact main menu: compact rule present (overflow-y auto + 24px
  padding + margin auto on content).
- Compact pause menu: compact rule present (92vh/92dvh max-height +
  overflow-y auto).
- Expanded pause menu: expanded rule blocks diff-clean vs baseline.
- Expanded main menu: no expanded-specific main-menu rule existed
  before and none is added; base `.menu-screen` rules diff-clean.
- Menu items: main-menu buttons in the same order (About appended
  last, see §3 — an ordered addition, not a reorder); pause-menu items
  unchanged in count and order. Presentation-only for the fix itself.

## 3. Avok Interactive in-game branding (§76)

Studio surfaces only: main menu footer, About/credits screen, loading
screen splash. The logo NEVER replaces the game's own art, icon, cover,
banner, or tile anywhere. Asset: the canonical
`avok-mark-clean.png` (geometric cyan "A", 1600×1600), bundled as a
footer/splash-sized copy `public/avok-mark.png` (256×256, display size
set by CSS, never full-size).

Placements:
- Main menu footer: logo mark (28px) + "Avok Interactive" publisher
  credit + "Copyright © 2026 Avok Interactive. All Rights Reserved."
  alongside the existing version / Built-on-Devvit line.
- About/credits screen (new client screen, `about`): same mark +
  credit + copyright, reachable from a new main-menu button appended
  AFTER the existing buttons (order of existing buttons unchanged).
  Server `about` command renders the same credit + notice as text.
- Loading screen splash (Rockstar-style): mark (120px) + name +
  copyright inside the existing probe-tied loading screen, shown while
  the game loads. No timer, no artificial delay, no blocking hold
  beyond the real load — the existing probe flow is untouched.

Help: one new bullet for `about` (321 → 322 bullets total, audit gate
re-proven). Footer/splash are UI, not commands, so they take no help
bullets. Wording year = current year (2026).
