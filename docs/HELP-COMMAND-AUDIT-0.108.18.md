# HELP vs COMMANDS AUDIT — v0.108.18 (STAGED ONLY, not submitted)

**Scope:** systematic two-direction audit Dre ordered for .18. (1) Every
command the parser accepts, run with valid fixture state, asserting REAL
output — dispatch without "Unknown command" is NOT enough. (2) Everything
help (and every usage block) lists, checked against reality. Fixed both
directions: real-but-undocumented → documented; documented-but-broken →
the command fixed; documented-but-nonexistent → removed or implemented.
**HOLD STANDS:** this tree is staged for the Life and World expansion
(big update). Do NOT publish .18 separately.

**Proof totals:** type-check exit 0, build exit 0, harnesses green —
0.108.3 (18/18), 0.108.9 (45/45), 0.108.15 (39/39), 0.108.17 (139/139,
updated — see note at bottom), dialogue (36/36), 0.108.18 features
(135/135), audit (352/352). Total 764 checks.

**Install state at audit close (2026-11-01 evening CT, `devvit list
installs`): v0.108.17 LIVE in both subs** — the .16/.17 queue cleared
since the last check. .18 builds on live .17.

**Legend:** Help Y/N = documented in help before/after .18. Works Y/N =
proven real output before/after .18. "Worked" for pre-.18 means the code
path was already correct and the audit harness now proves it (no .18
change to that path); "FIXED" means .18 changed the code.

## Movement / Navigation
**Strength (expand from this):** the full loop is real and proven —
travel → districts → goto → explore → go home, over real city/district
data, with display names everywhere. No invented places anywhere.
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| travel [city] | Y → Y | Y → Y | — |
| travel to [city] | N → Y | N → FIXED | Parser swallowed "to" into the city name ("City to Memphis not found"). Now strips leading "to"/"to the"; help documents the form; bare-travel usage names both forms. |
| explore | Y → Y | Y → Y | — |
| explore [district] | N → Y | N → Y (.18 feature) | New in .18: moves via goto, then explores there. |
| goto [district] | Y → Y | Y → FIXED | "goto to [district]" tolerance added (same "to" strip). |
| go home / home | Y → Y | Y → Y | Added .17, re-proven. |
| districts / district | districts Y (.18) / district N → Y (alias note) | Y → Y | districts new in .18; singular alias documented. |
| where / location | N → Y / alias note | N → Y (.18 feature) | New in .18. |
| nearby / places | N → Y / alias note | N → Y (.18 feature) | New in .18, real roster/venue data only. |
| go (bare) | usage hint → same | Y → Y | "Go where? Try go home." — real, unchanged. |

## Work & Money
**Strength:** full job lifecycle proven — listings → hire (with real
gates: degree/experience rejections are correct, not bugs) → shifts →
career → promotion (15 shifts + skill 3, max 3/job).
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| apply / apply [job] | Y → Y | Y → Y | Hire proven by trying listed titles; gated jobs correctly reject. |
| work | Y → Y | Y → Y | — |
| career | Y → Y | Y → Y | — |
| promote / promotion | promote Y / promotion N → Y (alias note) | Y → Y | — |
| bank | Y → Y | Y → Y | — |
| deposit [amount] / withdraw [amount] | Y → Y (forms widened to [amount\|all]) | Y → Y | "all" forms were real but undocumented; help now says so. |
| status / skills / gym | Y → Y | Y → Y | — |
| sleep / rest | sleep Y / rest N → Y (alias note) | Y → Y | — |

## Government & Law / Crime / Prison
**Strength:** the heat → crime → arrest → prison → appeal/work loop is
fully wired and proven, with a real fine schedule. Prison work genuinely
shortens sentences (1 day/shift).
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| laws / law | laws Y / law N → Y (alias note) | Y → Y | — |
| court / pay fine [all\|amount] | Y → Y | Y → Y | Pay-fine-all proven by fines state emptying. |
| government / gov | government Y / gov N → Y (alias note) | Y → Y | — |
| lawyer [clean\|appeal] | N → Y | Y → Y | Was working, undocumented. |
| record | N → Y | Y → Y | Was working, undocumented. |
| laylow / lay | N → Y (lay alias note) | Y → Y | Was working, undocumented. |
| crime (bare menu) | N → Y | N → FIXED | The crime() risk/options menu was DEAD code — bare crime fell into commitCrime('') whose usage listed only 3 of 6 types. Bare crime now shows the menu. |
| crime [type] | N → Y | Y → Y | All six types documented (pickpocket, shoplift, scam, robbery, grand_theft_auto, heist); invalid-type usage already listed all six. |
| rob / scam | N → Y | Y → Y | Were working, undocumented. Execution proven by heat/incarceration state (rolls are random). |
| prison | N → Y | partial → FIXED | Incarcerated path was branch-handled and worked; free players got "Unknown command" despite prisonStatus() existing. Switch case added — free players now get the clean "You aren't in prison." |
| prison work | N → Y | Y → Y | Was branch-handled; now also switch-dispatched and documented. |

## Property & Wealth
**Strength:** buy → own → repair/renovate/upgrade → sell proven
end-to-end; occupancy (85%) + bank interest (0.5%/mo) make it a real
economy, not a price list.
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| real-estate / realestate / properties_list | Y / aliases N → Y (noted) | Y → Y | — |
| buy / sell property, properties | Y → Y | Y → Y | Full chain proven on one engine. |
| renovate / upgrade property | Y → Y | Y → Y | — |
| repair property | N → Y | Y → Y | Was working, undocumented. |
| businesses / business | businesses Y / business N → Y (alias note) | Y → Y | — |
| buy / sell business | Y → Y | Y → Y | — |
| sell investment | N → Y | Y → Y | Was working, undocumented. |
| invest / invest options | Y → Y | Y → Y | "options" is a same-output alias of bare invest — covered by the parent line (recorded, not a separate bullet). |
| invest [name] [amount] | N → Y | Y → Y | Was working, undocumented. |
| investments | Y → Y | Y → Y | — |
| buy / sell (bare) | usage hints → same | Y → Y | "Buy what? / Sell what?" — real, unchanged. |

## Vehicles & Racing
**Strength:** full garage lifecycle proven (buy → inspect → maintain →
service → fuel → register → customize → upgrade → repair → sell);
race entry, season, and standings all dispatch; placement is random by
design, entry-fee and vehicle gates proven.
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| vehicles, buy / sell vehicle | Y → Y | Y → Y | Full chain proven. |
| inspect, maintain, register, repair vehicle, customize, upgrade vehicle | Y → Y | Y → Y | — |
| fuel / refuel | fuel Y / refuel N → Y (alias note) | Y → Y | Full-tank case returns a real "full" result, not an error. |
| tow / emergency | tow Y / emergency N → Y (alias note) | Y → Y | Proven with a condition-0 vehicle. |
| service [vehicle] [service] | N → Y | Y → Y | Was working, undocumented. |
| race / races / race [track] / race season / race standings | race Y / races N → Y (alias note) | Y → Y | Track list includes local tracks; season/standings dispatch; race entry proven with vehicle + fee gates. |

## Social & Comms
**Strength:** the NPC roster is deep (roles, relationships, quests,
schedules) and talk/greet/gift/hangout/profile now resolve names ONE
way — exact → unique substring → refuse-with-list. No more "not found"
for a name that matched two people.
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| people | Y → Y | Y → Y | Header now uses display names ("Downtown Memphis"). |
| talk [name] | Y → Y | Y → Y | Partial-name + ambiguous-list proven (pre-existing .12 behavior). |
| greet [name] | Y → Y | Y → Y | Delegates to talk. |
| leave / bye / end / exit / goodbye | leave Y + bye/end/exit noted / goodbye N → Y (noted) | partial → FIXED | Typed leave-family mid-conversation answered "You're not in a conversation" because the dispatch cleared state before endConversation() could read it. Leave-family now skips the pre-clear, so the goodbye + "commands work again" hint print. |
| contacts / phone | Y → Y | Y → Y | Talk auto-adds contacts; phone lists real comms commands. |
| assist [name] | Y → Y | Y → Y | — |
| factions | Y → Y | Y → Y | Non-member empty state ("haven't joined any") is the CORRECT result; member list proven separately. |
| influence | Y → Y | Y → Y | — |
| support [id] / sabotage [id] | Y → Y | Y → Y | Support proven (+influence); sabotage outcome random (success or arrest — both real). |
| chat [id] | Y → Y | Y → Y | Proven with a seeded group chat. |
| emails | Y → Y | N → FIXED | Bare emails printed the usage block (the inbox lister was dead code — the case routed to email()). Now lists the inbox: id, sender, subject, unread state, all messages (old 5-cap removed). |
| inbox | N → Y | N → Y (.18 feature) | New alias for the inbox list. |
| email read / compose / delete | N → Y | Y → Y | Were working, undocumented; proven end-to-end with a listed id. |
| email (bare usage) | usage block → REWRITTEN | N → FIXED | Old block listed "emails - View inbox" as if it were email syntax; typing it back failed with "Unknown email command". New block lists real syntax only; unknown-subcommand error names the valid subcommands. |
| text [name] [message] | Y → Y | Y → Y | — |
| messages | N → Y | N → FIXED | Phone output documented "messages - View texts" but NO parser case existed (method was dead). Case + KNOWN_COMMANDS + help added. |
| search [query] | N → Y | Y → Y | Phone documented it; help did not. Was working. |
| social | N → Y | Y → Y | Was working, undocumented. |
| quests / quest | quests Y / quest N → Y (alias note) | Y → Y | — |
| gift / hangout | Y → Y | partial → FIXED | Ambiguous first names ("Marcus" matches two NPCs) wrongly returned "not found". Now refuse-with-list like talk. Full-name paths proven. |
| friends / relationships | friends Y / relationships N → Y (alias note) | Y → Y | — |
| profile [name] | Y → Y | partial → FIXED | Same ambiguous-name fix as gift/hangout (shared resolver). |
| profile (bare) | Y → Y (note preserved) | Y → Y | Bare profile shows own status. |

## Education & Self
**Strength:** 7 schools / 13 courses of REAL data (ids, hours, costs,
requirements); enroll → study hours → graduate chain proven. The
catalog command closes the discoverability gap that made enroll
unusable from West Memphis (no local schools).
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| schools | N → Y | N → Y (.18 feature) | NEW command: full catalog with ids, hours, cost, requirements. |
| enroll [school_id] [course_id] | Y → Y | Y → Y | Bare-enroll usage now points at "schools" (was a dead end). |
| study (bare) | N → Y | Y → Y | Was working, undocumented (lists city schools). |
| study library | N → Y | Y → Y | Was working, undocumented ($25, INT +2, 3h). |
| study hours [n] | Y → Y | Y → Y | — |
| gym / skills | Y → Y | Y → Y | — |

## Info & Time / Meta
**Strength:** status/help/sleep/goals/journal/achievements all proven;
event choice proven with a seeded event (live events trigger from
explore/work; the no-event error is the correct result otherwise).
| Command | Help before → after | Works before → after | What was fixed |
|---|---|---|---|
| status / help / sleep | Y → Y | Y → Y | — |
| event | Y → Y | Y → Y | No-event message is the correct result. |
| event choice [id] | N → Y | Y → Y | Was working, undocumented; proven with a seeded event + outcome effects. |
| goals / goal | goals Y / goal N → Y (alias note) | Y → Y | — |
| journal / story | Y → Y (story alias already noted) | Y → Y | — |
| achievements / achievement | achievements Y / achievement N → Y (alias note) | Y → Y | — |
| clear_conv | N → Y | Y → Y | Was working, undocumented (utility: unstick a conversation). |

## Usage blocks audited (all must be real syntax — all pass)
travel bare (now names "travel to [city]"), buy/sell/repair/renovate/
upgrade/pay/fuel/register/tow/customize/service bare usages, email
usage (rewritten), enroll usage (points at schools), crime invalid-type
usage (all six types), deposit/withdraw usages (name the "all" forms),
support/sabotage/chat/text/search bare usages, phone screen command
list (every line now dispatches: emails + messages fixed), gift bare
(gift list + usage), lawyer bare usage, study-hours usage. No
syntax-shaped prose remains: the "emails - View inbox" line that Dre
typed back verbatim is now a working command (emails lists the inbox
regardless of trailing words).

## Test maintenance (not a game change)
harness-0.108.17.ts updated to the .18 contract: its section 3
("typed commands still chat") is superseded by the .18 rule (commands
win over chat) and now asserts the new behavior, with the non-command
chat proof kept; its people marker updated to the display-name header
("People in Downtown Memphis"). The .18 harness is the full proof of
the new rule.

## Deliberately NOT changed
- No balance, save, economy, or visual-system changes beyond the menu
  presentation overhaul (already in .18) and the fixes above.
- `invest options` stays a same-output alias of bare `invest` (parent
  line covers it) rather than a second bullet.
- Help stays scannable: aliases are notes on parent lines, not new
  lines; the full catalogs live behind `schools` / `emails`, not pasted
  into help.
- The real-browser visual gate for menus cannot run from this VM
  (Reddit blocks the route) — Dre's live playtest is the visual
  verdict for the 10/10 menu call.
