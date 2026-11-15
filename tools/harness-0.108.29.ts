// v0.108.29 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves with REAL behavior (never parser-existence):
//   §A outcome logging: enroll → study → exam → graduate each carry a
//      real outcomeLog (enrolled course, hours advanced, exam pass/fail,
//      graduation); invest carries one on new + merged positions; a
//      restful sleep that ticks the market carries one with before →
//      after values; refusals, no-op study, rested sleep, and a
//      same-game-day restful sleep carry none.
//   §B "invest all": "invest all into [name]", "invest all [name]",
//      and "invest [name] all" all invest the full cash balance; "invest
//      all" with no name refuses with usage; zero cash refuses plainly;
//      the minimum still applies; "invest all into google" now fails on
//      the option lookup (Google is not an offered investment), NOT on
//      the amount parse; the NLP pattern maps "put all into [name]" to
//      invest [name, all] ("invest"-starting inputs take the direct-
//      command path and never reach the patterns — the engine dispatch
//      resolves them instead).
//   §C `mail read [n]` opens the nth item in the order `mail` lists
//      them (kind-grouped display order, not arrival order); `read mail
//      [n]` is the same; ids still win; 0 / out-of-range / unknown id /
//      bare read refuse with usage + a pointer to `mail`.
//   §D help: bullet count re-proven (338 → 340, audit 327 → 329: the
//      two new [n] bullets); the invest bullet documents "all"; the
//      [id] bullets are intact; `help mail` and the government
//      drill-down find the new bullets.
//   §E What's New: .29 first + open + Latest, .28 collapsed without
//      Latest and body intact, index prepended, version sync x4, and
//      the server outcome-log line wired in index.ts (source check —
//      the live log line itself is only provable from a post-publish
//      log pull; the engine side is proven behaviorally in §A).
// Run:
//   npx esbuild tools/harness-0.108.29.ts --bundle --platform=node --format=esm --outfile=/tmp/h10829.mjs && node /tmp/h10829.mjs
import { GameEngine } from '../src/server/game-engine.js';
import { parseNaturalInput } from '../src/server/nlp.js';
import { UPDATE_INDEX_VERSIONS, collapsedIndexVersions, groupIndexVersions } from '../src/shared/updates-index.js';
import * as fs from 'node:fs';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} :: ${JSON.stringify(extra)}`);
  }
}

function seedMail(g: any, id: string, kind: string, fromName: string, subject: string, body: string, extra: Record<string, unknown> = {}): any {
  const e: any = g.comm.receiveEmail('seed', fromName, subject, body);
  e.id = id;
  e.kind = kind;
  Object.assign(e, extra);
  return e;
}

function fresh(money = 5000): any {
  const g: any = new GameEngine();
  g.loadState({ name: 'Tester', city: 'memphis', district: 'downtown', money, energy: 100, happiness: 80, stress: 0, health: 100, gameTimeISO: '2026-11-12T12:00:00Z' } as any);
  return g;
}

async function main(): Promise<void> {
  // §A — outcome logging: the full TOW-001 close path, live.
  {
    const g = fresh(5000);
    const ok = async (input: string, opts?: any) => await g.processCommand(input, opts);
    const r1 = await ok('enroll maestro_college ai_foundation');
    check('enroll succeeds + outcomeLog names course/cost/hours', r1.success === true && r1.outcomeLog === 'enrolled maestro_college/ai_foundation "AI Foundations" cost $1500 hours 40', r1.outcomeLog);
    const r2 = await ok('study hours 20');
    check('study +20h outcomeLog (20/40, GPA 3.05)', r2.success === true && r2.outcomeLog === 'studied maestro_college/ai_foundation +20h (20/40 hrs, GPA 3.05)', r2.outcomeLog);
    const rSleep = await ok('sleep');
    check('sleep with no investments carries no outcomeLog', rSleep.success === true && rSleep.outcomeLog === undefined, rSleep.outcomeLog);
    const r3 = await ok('study hours 20');
    check('study +20h outcomeLog (40/40, coursework complete)', r3.success === true && r3.outcomeLog === 'studied maestro_college/ai_foundation +20h (40/40 hrs, GPA 3.10) coursework complete', r3.outcomeLog);
    await ok('sleep'); // restore energy so the no-op path (not the energy refusal) is what runs
    const r4 = await ok('study hours 5');
    check('no-op study past completion succeeds but logs nothing', r4.success === true && r4.outcomeLog === undefined && r4.message.includes('Coursework for AI Foundations is complete'), r4.message.slice(0, 120));
    const r5 = await ok('exam');
    check('exam pass → graduation outcomeLog (exam 71, AI_BASICS)', r5.success === true && r5.outcomeLog === 'graduated ai_foundation cert AI_BASICS (exam 71, GPA 3.10)', r5.outcomeLog);
    check('graduation state is real (cert held, course cleared)', (g.player.certifications ?? []).includes('AI_BASICS') && !g.player.enrolledCourse, { certs: g.player.certifications, enrolled: g.player.enrolledCourse });
  }

  // §A — exam fail + graduate (pending credential) outcomes.
  {
    const g = fresh(5000);
    await g.processCommand('enroll maestro_college ai_foundation');
    g.player.enrolledCourse.hoursCompleted = 40;
    g.player.enrolledCourse.gpa = 1.0;
    const r = await g.processCommand('exam');
    check('exam fail outcomeLog (score 50, GPA 0.90, fails 1)', r.success === true && r.outcomeLog === 'exam failed maestro_college/ai_foundation score 50 (GPA 0.90, fails 1)', r.outcomeLog);
    check('exam fail state is real (fails 1, still enrolled)', g.player.enrolledCourse.examFails === 1 && g.player.enrolledCourse.gpa === 0.9, g.player.enrolledCourse);
  }
  {
    const g = fresh(500);
    g.player.pendingCredential = { schoolId: 'maestro_college', courseId: 'ai_foundation', cert: 'AI_BASICS', gpa: 3.0 };
    const r = await g.processCommand('graduate');
    check('graduate outcomeLog names fee payment, no fake exam score', r.success === true && r.outcomeLog === 'graduated maestro_college/ai_foundation cert AI_BASICS (fee paid, GPA 3.00)', r.outcomeLog);
    check('graduate state is real (cert held, $100 paid)', (g.player.certifications ?? []).includes('AI_BASICS') && g.player.money === 400, { money: g.player.money, certs: g.player.certifications });
  }

  // §A — invest outcomes (new + merged) and refusals logging nothing.
  {
    const g = fresh(5000);
    const r1 = await g.processCommand('invest bitcoin 1000');
    check('invest new position outcomeLog', r1.success === true && r1.outcomeLog === 'invested $1000 in Bitcoin (new position, $1000 invested)', r1.outcomeLog);
    const r2 = await g.processCommand('invest bitcoin 500');
    check('invest merge outcomeLog (now $1500 invested)', r2.success === true && r2.outcomeLog === 'invested $500 in Bitcoin (merged, now $1,500 invested, $1,500 value)', r2.outcomeLog);
    check('merge keeps one line', (g.player.investments ?? []).length === 1, g.player.investments?.length);
    const r3 = await g.processCommand('invest bitcoin 10');
    check('below-minimum invest refuses and logs nothing', r3.success === false && r3.outcomeLog === undefined && r3.message.includes('Minimum investment'), r3.message);
    const r4 = await g.processCommand('enroll bad_school bad_course');
    check('failed enroll logs nothing', r4.success === false && r4.outcomeLog === undefined, r4.outcomeLog);
    const r5 = await g.processCommand('study hours 5');
    check('study with no enrollment refuses and logs nothing', r5.success === false && r5.outcomeLog === undefined, r5.message.slice(0, 80));
  }

  // §A — sleep tick outcome: values before → after, once per game-day.
  // Seeded at midnight so the second restful sleep still ENDS on the
  // same game-date (the tick stamps the post-sleep date): sleep #1
  // ends 08:00 and ticks, gym moves to 10:00, sleep #2 ends 18:00
  // same day and must NOT tick.
  {
    const g: any = new GameEngine();
    g.loadState({ name: 'Tester', city: 'memphis', district: 'downtown', money: 5000, energy: 100, happiness: 80, stress: 0, health: 100, gameTimeISO: '2026-11-12T00:00:00Z' } as any);
    await g.processCommand('invest bitcoin 1000');
    g.player.energy = 50;
    const r1 = await g.processCommand('sleep');
    check('restful sleep ticks + outcomeLog names position + portfolio', r1.success === true
      && typeof r1.outcomeLog === 'string'
      && r1.outcomeLog.startsWith('sleep investment tick: Bitcoin $1,000→$')
      && r1.outcomeLog.includes('(portfolio $1,000→$'), r1.outcomeLog);
    check('tick date stamped', g.player.lastInvestmentTickDate === g.time.formatDate(), g.player.lastInvestmentTickDate);
    await g.processCommand('gym');
    const r2 = await g.processCommand('sleep');
    check('same-game-day restful sleep ticks nothing, logs nothing', r2.success === true && r2.outcomeLog === undefined, r2.outcomeLog);
    const r3 = await g.processCommand('sleep');
    check('rested sleep (energy 100) ticks nothing, logs nothing', r3.success === true && r3.outcomeLog === undefined && r3.message.includes('already rested'), r3.outcomeLog);
  }

  // §B — "invest all" phrasings.
  {
    const g = fresh(5000);
    const r = await g.processCommand('invest all into bitcoin');
    check('"invest all into bitcoin" invests the full balance', r.success === true && g.player.money === 0 && (g.player.investments ?? [])[0]?.currentValue === 5000, { money: g.player.money, inv: g.player.investments });
    check('"invest all into" outcomeLog', r.outcomeLog === 'invested $5000 in Bitcoin (new position, $5000 invested)', r.outcomeLog);
  }
  {
    const g = fresh(5000);
    const r = await g.processCommand('invest bitcoin all');
    check('"invest bitcoin all" invests the full balance', r.success === true && g.player.money === 0 && (g.player.investments ?? [])[0]?.currentValue === 5000, { money: g.player.money });
  }
  {
    const g = fresh(5000);
    const r = await g.processCommand('invest all bitcoin');
    check('"invest all bitcoin" (no preposition) invests the full balance', r.success === true && g.player.money === 0, { money: g.player.money });
  }
  {
    const g = fresh(5000);
    const r = await g.processCommand('invest all');
    check('"invest all" with no name refuses with usage', r.success === false && r.message.includes('Invest all in what?'), r.message);
    const g2 = fresh(0);
    const r2 = await g2.processCommand('invest all into bitcoin');
    check('"invest all" with zero cash refuses plainly', r2.success === false && r2.message === 'You have no cash to invest.', r2.message);
    const g3 = fresh(500);
    const r3 = await g3.processCommand('invest all into startup');
    check('"invest all" still honors the minimum', r3.success === false && r3.message.includes('Minimum investment for Startup Investment is $1000'), r3.message);
    const g4 = fresh(5000);
    const r4 = await g4.processCommand('invest all into google');
    check('"invest all into google" fails on the option lookup, NOT the amount', r4.success === false && r4.message.includes('Investment "google" not found') && !r4.message.includes('Invalid amount'), r4.message);
  }
  {
    // parseNaturalInput checks direct commands FIRST: an input starting
    // with "invest" returns the raw split args and never reaches the
    // patterns — the ENGINE dispatch resolves it (proven by the dispatch
    // checks above). The patterns fire for "put" phrasings, which are
    // not direct-command words.
    const nlp1 = parseNaturalInput('Invest all into google');
    check('NLP direct-command path: "Invest all into google" → invest + raw args', nlp1.command === 'invest' && JSON.stringify(nlp1.args) === JSON.stringify(['all', 'into', 'google']), nlp1);
    const nlp2 = parseNaturalInput('Put all into bitcoin');
    check('NLP pattern path: "Put all into bitcoin" → invest [bitcoin, all]', nlp2.command === 'invest' && JSON.stringify(nlp2.args) === JSON.stringify(['bitcoin', 'all']), nlp2);
    const nlp3 = parseNaturalInput('Put $500 into bitcoin');
    check('NLP digit pattern unchanged → invest [bitcoin, 500]', nlp3.command === 'invest' && JSON.stringify(nlp3.args) === JSON.stringify(['bitcoin', '500']), nlp3);
  }

  // §C — mail read by list position.
  {
    const g = fresh(1000);
    g.comm.restoreEmails([]);
    seedMail(g, 'mail_letter_1', 'letter', 'Aunt May', 'Thinking of you', 'Letter body: come visit soon.', { read: false });
    seedMail(g, 'mail_letter_2', 'letter', 'Old Friend', 'Long time', 'Caught up after years.', { read: true });
    seedMail(g, 'mail_bill_1', 'bill', 'City Utilities', 'Utility bill due', 'Your utility bill is due this month.', { read: false, billAmount: 120, paid: false });
    seedMail(g, 'mail_notice_1', 'notice', 'City Hall', 'Road work notice', 'Road work on Main Street next week.', { read: false });
    seedMail(g, 'mail_pkg_1', 'package', 'Cousin Jay', 'A little something', 'A gift for you.', { read: false, claimed: false, package: { itemName: 'Gift Basket', itemValue: 40, claimed: false } });
    const listing = (await g.processCommand('mail')).message as string;
    check('mail footer mentions reading by number', listing.includes('mail read [n]'), listing.slice(-160));
    const r1 = await g.processCommand('mail read 1');
    check('mail read 1 opens the first listed item (letter 1)', r1.success === true && r1.message.includes('Thinking of you') && r1.message.includes('come visit soon'), r1.message.slice(0, 120));
    check('mail read 1 marks it read', g.comm.getEmailById('mail_letter_1').read === true);
    const r3 = await g.processCommand('mail read 3');
    check('mail read 3 opens the bill (grouped order)', r3.success === true && r3.message.includes('Utility bill due') && r3.message.includes('Bill: $120'), r3.message.slice(0, 160));
    const r5 = await g.processCommand('mail read 5');
    check('mail read 5 opens the package', r5.success === true && r5.message.includes('A little something') && r5.message.includes('Gift Basket'), r5.message.slice(0, 160));
    const r2 = await g.processCommand('read mail 2');
    check('read mail 2 (alias) opens the second letter', r2.success === true && r2.message.includes('Long time'), r2.message.slice(0, 120));
    const rId = await g.processCommand('mail read mail_notice_1');
    check('mail read by id still works', rId.success === true && rId.message.includes('Road work notice'), rId.message.slice(0, 120));
    const r0 = await g.processCommand('mail read 0');
    check('mail read 0 refuses with the count', r0.success === false && r0.message.includes('No mail item at position 0 — you have 5 items'), r0.message);
    const r6 = await g.processCommand('mail read 6');
    check('mail read 6 (out of range) refuses with the count', r6.success === false && r6.message.includes('No mail item at position 6 — you have 5 items'), r6.message);
    const rU = await g.processCommand('mail read nope123');
    check('mail read unknown id refuses as before', rU.success === false && rU.message.includes('No mail item "nope123"'), rU.message);
    const rB = await g.processCommand('mail read');
    check('bare mail read refuses with usage + position note', rB.success === false && rB.message.includes('Usage: mail read [id]') && rB.message.includes('list position'), rB.message);
  }
  {
    // Position follows DISPLAY order (kind-grouped), not arrival order:
    // package arrives first, letter second, bill third — the list still
    // shows letter (1), bill (2), package (3).
    const g = fresh(1000);
    g.comm.restoreEmails([]);
    seedMail(g, 'x_pkg', 'package', 'Cousin Jay', 'Pkg first', 'Package body.', { read: false, package: { itemName: 'Gift', itemValue: 10, claimed: false } });
    seedMail(g, 'x_letter', 'letter', 'Aunt May', 'Letter second', 'Letter body.', { read: false });
    seedMail(g, 'x_bill', 'bill', 'City Utilities', 'Bill third', 'Bill body.', { read: false, billAmount: 50, paid: false });
    const r1 = await g.processCommand('mail read 1');
    check('position 1 is the letter (display order), not the first arrival', r1.success === true && r1.message.includes('Letter second'), r1.message.slice(0, 120));
    const r3 = await g.processCommand('mail read 3');
    check('position 3 is the package (display order)', r3.success === true && r3.message.includes('Pkg first'), r3.message.slice(0, 120));
  }

  // §D — help.
  {
    const g = fresh(1000);
    const help = (await g.processCommand('help')).message;
    const bullets = help.split('\n').filter((l) => l.trim().startsWith('• '));
    const auditBullets = [...help.matchAll(/^• ([a-z][a-z_-]*)/gm)].map((m) => m[1]);
    check('.29 REPLACES .28 help count 338 → 340 (audit 327 → 329)', bullets.length === 340 && auditBullets.length === 329, { bullets: bullets.length, audit: auditBullets.length });
    check('help documents mail read [n] + read mail [n]', help.includes('• mail read [n] — Same, by list position') && help.includes('• read mail [n] — Same as "mail read [n]"'), 'mail [n] bullets');
    check('help [id] bullets intact', help.includes('• mail read [id] — Open one mail item in full') && help.includes('• read mail [id] — Same as "mail read [id]"'), 'mail [id] bullets');
    check('help invest bullet documents "all"', help.includes('• invest [name] [amount]') && help.includes('"all" invests all your cash'), 'invest bullet');
    const filtered = (await g.processCommand('help mail')).message;
    check('help mail filter finds the [n] bullets', filtered.includes('mail read [n]'), filtered.slice(0, 200));
    const gov = (await g.processCommand('help government')).message;
    check('help government drill-down still contains the Mail subsection + [n]', gov.includes('Mail — your postal mail') && gov.includes('mail read [n]'), gov.slice(0, 200));
    const inv = (await g.processCommand('help invest')).message;
    check('help invest filter finds the "all" wording', inv.includes('"all" invests all your cash'), inv.slice(0, 200));
  }

  // §E — What's New + version sync + index.
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...client.matchAll(/id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    check('.29 details first', detailIds[0] === 'update-v0-108-29' && detailIds[1] === 'update-v0-108-28', detailIds.slice(0, 3));
    const block29 = client.slice(client.indexOf('id="update-v0-108-29"'), client.indexOf('id="update-v0-108-28"'));
    check('.29 entry open + Latest + dated November 12, 2026', block29.includes('id="update-v0-108-29" open>') && block29.includes('update-latest') && block29.includes('November 12, 2026') && block29.includes('invest all') && block29.includes('mail read [n]'), block29.slice(0, 200));
    const block28 = client.slice(client.indexOf('id="update-v0-108-28"'), client.indexOf('id="update-v0-108-27"'));
    check('.29 REPLACES .28 open+Latest (.28 collapsed, no Latest, body intact)', block28.includes('id="update-v0-108-28">') && !block28.includes('update-latest') && block28.includes('lists your mail'), block28.slice(0, 200));
    check('.29 REPLACES .28 index-first (.29 prepended)', UPDATE_INDEX_VERSIONS[0] === 'v0.108.29' && UPDATE_INDEX_VERSIONS[1] === 'v0.108.28', UPDATE_INDEX_VERSIONS.slice(0, 3));
    check('.29 REPLACES .28 index length 71 → 72', UPDATE_INDEX_VERSIONS.length === 72, UPDATE_INDEX_VERSIONS.length);
    check('.29 REPLACES .28 collapsed-10 (.29 … .20)', (() => { const c = collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10); return c.length === 10 && c[0] === 'v0.108.29' && c[9] === 'v0.108.20'; })(), collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10));
    check('.29 REPLACES .28 v0.108.x group 25 → 26 versions', groupIndexVersions(UPDATE_INDEX_VERSIONS).find((g) => g.family === 'v0.108.x')?.versions.length === 26, groupIndexVersions(UPDATE_INDEX_VERSIONS).find((g) => g.family === 'v0.108.x')?.versions.length);
    check('.29 REPLACES .28 card count 72 → 73 elements, 72 unique, only dup pre-existing v0.92.0', detailIds.length === 73 && new Set(detailIds).size === 72 && JSON.stringify(detailIds.filter((id, i) => detailIds.indexOf(id) !== i)) === JSON.stringify(['update-v0-92-0']), { total: detailIds.length, unique: new Set(detailIds).size });
    check('jump target exists for .29', detailIds.includes('update-v0-108-29'));
    check('package.json 0.108.29', fs.readFileSync('package.json', 'utf8').includes('"version": "0.108.29"'));
    check('GAME_VERSION 0.108.29', fs.readFileSync('src/shared/version.ts', 'utf8').includes('0.108.29'));
    check('boot log 0.108.29', fs.readFileSync('src/server/index.ts', 'utf8').includes('v0.108.29 - STATELESS MODE'));
    check('AGENTS.md header 0.108.29', fs.readFileSync('AGENTS.md', 'utf8').includes('**Version**: 0.108.29'));
    check('server outcome-log line wired in index.ts', fs.readFileSync('src/server/index.ts', 'utf8').includes('[server] Outcome user='));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
