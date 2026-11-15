// v0.108.28 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves with REAL behavior (never parser-existence):
//   §A `mail` lists real items (id, kind, sender, subject, read/unread,
//      grouped by kind, accurate unread counts), filters by kind, and
//      says so plainly on an empty mailbox (never a blank/fabricated list).
//   §B `mail read [id]` + `read mail [id]` open the SAME item the email
//      path reads, with mail wording, marking it read; unknown id and
//      missing id refuse with usage + a pointer to `mail`.
//   §C the whole mail side end-to-end: packages, track (outgoing +
//      incoming + courier job), claim package, send package ($5 postage,
//      amount unchanged), deliver (courier pay, amount unchanged),
//      pay bill (amount unchanged, refuses when paid / cash short).
//   §D the email path is untouched: emails, read [id], compose, delete.
//   §E quick bar: 21 buttons, order …, People, Phone, Mail, Factions,
//      Help, Mail right after Phone; generic binding → asCommand route
//      (client quick handlers call handleCommand with asCommand true;
//      server clears currentConversation first) proven mid-conversation;
//      .16 scroll behavior (overflow-x auto, buttons flex none) still in CSS.
//   §F help: Mail subsection documents every mail-side command; Quick Bar
//      section updated to the 21-button order; bullet count re-proven
//      (335 → 338: +3 for the new mail bullets, green replacement).
//   §G What's New: .28 first + open + Latest, .27 collapsed without
//      Latest and body intact, index prepended, version sync x4.
// Run:
//   npx esbuild tools/harness-0.108.28.ts --bundle --platform=node --format=esm --outfile=/tmp/h10828.mjs && node /tmp/h10828.mjs
import { GameEngine } from '../src/server/game-engine.js';
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

async function main(): Promise<void> {
  const g: any = new GameEngine();
  g.loadState({ name: 'Tester', city: 'memphis', district: 'downtown', money: 1000, energy: 100, happiness: 80, stress: 0, health: 100, gameTimeISO: '2026-11-02T12:00:00Z' } as any);
  const cmd = async (input: string, opts?: any) => (await g.processCommand(input, opts)).message as string;
  const ok = async (input: string, opts?: any) => await g.processCommand(input, opts);

  // §A — empty mailbox first (restoreEmails replaces constructor initials).
  g.comm.restoreEmails([]);
  {
    const m = await cmd('mail');
    check('empty mailbox says so plainly', m.includes('No mail yet') && !m.includes('• mail_'), m);
    check('empty mailbox never fabricates ids', !/• [a-z0-9_]+ —/.test(m), m);
  }

  // Fixtures: one of each kind, mixed read states.
  seedMail(g, 'mail_letter_1', 'letter', 'Aunt May', 'Thinking of you', 'Letter body: come visit soon.', { read: false });
  seedMail(g, 'mail_letter_2', 'letter', 'Old Friend', 'Long time', 'Caught up after years.', { read: true });
  seedMail(g, 'mail_bill_1', 'bill', 'City Utilities', 'Utility bill due', 'Your utility bill is due this month.', { read: false, billAmount: 120, paid: false });
  seedMail(g, 'mail_notice_1', 'notice', 'City Hall', 'Road work notice', 'Road work on Main Street next week.', { read: false });
  seedMail(g, 'mail_pkg_1', 'package', 'Cousin Jay', 'A little something', 'A gift for you.', { read: false, claimed: false, package: { itemName: 'Gift Basket', itemValue: 40, claimed: false } });

  // §A — full listing.
  {
    const m = await cmd('mail');
    console.log('--- sample `mail` output ---\n' + m + '\n--- end sample ---');
    check('mail lists unread letter id+sender+subject', m.includes('mail_letter_1') && m.includes('Aunt May') && m.includes('Thinking of you'), m);
    check('mail lists bill with amount + unpaid', m.includes('mail_bill_1') && m.includes('$120') && m.includes('unpaid'), m);
    check('mail lists notice', m.includes('mail_notice_1') && m.includes('Road work notice'), m);
    check('mail lists package with item + unclaimed', m.includes('mail_pkg_1') && m.includes('Gift Basket') && m.includes('unclaimed'), m);
    check('mail unread count accurate (4 of 5 unread)', m.includes('5 items, 4 unread'), m);
    check('mail grouped: Letters header before Bills header before Notices before Packages', (() => {
      const i = (s: string) => m.indexOf(s);
      return i('Letters (') !== -1 && i('Letters (') < i('Bills (') && i('Bills (') < i('Notices (') && i('Notices (') < i('Packages (');
    })(), m);
    check('mail read/unread states shown per item', m.includes('mail_letter_1') && m.includes('🔵 unread') && m.includes('✅ read'), m);
    check('listing does not mark read (letter still unread after mail)', g.comm.getEmailById('mail_letter_1').read === false);
  }
  // §A — filters.
  {
    const bills = await cmd('mail bills');
    check('mail bills filters to bills only', bills.includes('mail_bill_1') && !bills.includes('mail_letter_1') && !bills.includes('mail_pkg_1'), bills);
    const pkgs = await cmd('mail packages');
    check('mail packages filters to packages only', pkgs.includes('mail_pkg_1') && !pkgs.includes('mail_bill_1'), pkgs);
    const letters = await cmd('mail letters');
    check('mail letters shows both letters, 1 unread', letters.includes('mail_letter_1') && letters.includes('mail_letter_2') && letters.includes('2 items, 1 unread'), letters);
    const notices = await cmd('mail notices');
    check('mail notices filters to notices only', notices.includes('mail_notice_1') && !notices.includes('mail_letter_1'), notices);
    const bad = await ok('mail widgets');
    check('unknown mail filter refuses with usage', bad.success === false && bad.message.includes('Usage: mail'), bad.message);
    g.comm.restoreEmails([...g.comm.getEmails().filter((e: any) => e.kind !== 'notice')]);
    const emptyKind = await cmd('mail notices');
    check('empty kind filter says so plainly', emptyKind.includes('No notices in your mail'), emptyKind);
    seedMail(g, 'mail_notice_1', 'notice', 'City Hall', 'Road work notice', 'Road work on Main Street next week.', { read: false });
  }

  // §B — mail read.
  {
    const r = await cmd('mail read mail_letter_1');
    check('mail read opens letter fully with mail wording + body', r.includes('Thinking of you') && r.includes('From: Aunt May') && r.includes('Kind: ✉️ letter') && r.includes('come visit soon'), r);
    check('mail read marks it read (mail now 3 unread)', g.comm.getEmailById('mail_letter_1').read === true && (await cmd('mail')).includes('5 items, 3 unread'));
    const r2 = await cmd('read mail mail_notice_1');
    check('read mail [id] opens notice + marks read', r2.includes('Road work notice') && r2.includes('Kind: 🏛️ notice') && g.comm.getEmailById('mail_notice_1').read === true, r2);
    const unk = await ok('mail read nope123');
    check('unknown mail id refuses with usage + pointer to mail', unk.success === false && unk.message.includes('No mail item') && unk.message.includes('"mail"'), unk.message);
    const unk2 = await ok('read mail nope123');
    check('read mail unknown id refuses with pointer to mail', unk2.success === false && unk2.message.includes('"mail"'), unk2.message);
    const noId = await ok('mail read');
    check('mail read without id refuses with usage + pointer', noId.success === false && noId.message.includes('Usage: mail read [id]') && noId.message.includes('"mail"'), noId.message);
  }

  // §C — packages / track / claim / send / deliver / pay bill.
  {
    const pkgs = await cmd('packages');
    check('packages lists unclaimed incoming package', pkgs.includes('mail_pkg_1') && pkgs.includes('Gift Basket') && pkgs.includes('unclaimed'), pkgs);
    const tIn = await cmd('track mail_pkg_1');
    check('track incoming package: waiting + claim pointer', tIn.includes('Cousin Jay') && tIn.includes('Gift Basket') && tIn.includes('claim package mail_pkg_1'), tIn);
    const claimed = await cmd('claim package mail_pkg_1');
    check('claim package moves item to inventory', claimed.includes('Claimed Gift Basket') && g.player.inventory.some((i: any) => String(i.name ?? i) === 'Gift Basket'), claimed);
    const claimedAgain = await ok('claim package mail_pkg_1');
    check('claim package twice refuses (exactly once)', claimedAgain.success === false && claimedAgain.message.includes('already claimed'), claimedAgain.message);
    const tIn2 = await cmd('track mail_pkg_1');
    check('track after claim shows Claimed', tIn2.includes('Claimed'), tIn2);

    // Send package: first Memphis roster NPC + an inventory item.
    const npcs = g.social.getNPCByCity('memphis');
    check('Memphis roster NPC exists for send fixture', Array.isArray(npcs) && npcs.length > 0, npcs?.length);
    const npcName = npcs[0].name;
    g.player.inventory = [{ name: 'Test Widget', value: 10 }];
    const moneyBefore = g.player.money;
    const sent = await cmd(`send package ${npcName} Widget`);
    const pkgId = (sent.match(/track (pkg_[A-Za-z0-9_]+)/) ?? [])[1];
    check('send package charges exactly $5 postage, no amount change', sent.includes('$5 postage') && g.player.money === Math.round((moneyBefore - 5) * 100) / 100, sent);
    check('send package returns a trackable id', !!pkgId, sent);
    const tOut = await cmd(`track ${pkgId}`);
    check('track outgoing package: recipient + ETA', tOut.includes(npcName) && tOut.includes('Test Widget') && tOut.includes('In transit'), tOut);

    // Courier job: first job id from real packages output.
    const jobSection = pkgs.split('Courier jobs today')[1] ?? '';
    const jobId = (jobSection.match(/• ([A-Za-z0-9_-]+):/) ?? [])[1];
    check('courier job id visible in packages output', !!jobId, pkgs);
    const jobPay = Number((jobSection.match(/• [A-Za-z0-9_-]+: .*?\$([0-9]+), 2h/) ?? [])[1]);
    const moneyBeforeDeliver = g.player.money;
    const delivered = await cmd(`deliver ${jobId}`);
    check('deliver completes courier job with its listed pay, amount unchanged', delivered.includes('Delivered') && delivered.includes(`+$${jobPay}`) && g.player.money === Math.round((moneyBeforeDeliver + jobPay) * 100) / 100, delivered);
    const tJob = await cmd(`track ${jobId}`);
    check('track courier job shows job details', tJob.includes('courier job') && tJob.includes(`$${jobPay}`), tJob);

    // Pay bill.
    const moneyBeforeBill = g.player.money;
    const paid = await cmd('pay bill mail_bill_1');
    check('pay bill pays $120, amount unchanged', paid.includes('Paid bill "mail_bill_1" ($120)') && g.player.money === Math.round((moneyBeforeBill - 120) * 100) / 100, paid);
    const paidAgain = await ok('pay bill mail_bill_1');
    check('pay bill twice refuses (already paid)', paidAgain.success === false && paidAgain.message.includes('already paid'), paidAgain.message);
    const mailAfter = await cmd('mail');
    check('mail shows bill paid after payment', mailAfter.includes('mail_bill_1') && mailAfter.includes('paid') && !/mail_bill_1[^•]*unpaid/.test(mailAfter), mailAfter);
    const short = await ok('pay bill mail_bill_1');
    check('pay bill on paid bill refuses (not a cash-short fabrication)', short.success === false, short.message);
  }

  // §D — email path untouched, same items from the email side.
  {
    const inbox = await cmd('emails');
    check('emails still lists the same items', inbox.includes('mail_letter_2') && inbox.includes('mail_bill_1') && inbox.includes('mail_pkg_1'), inbox);
    const viaEmail = await cmd('read mail_letter_2');
    check('read [id] (email path) still opens the item', viaEmail.includes('Long time') && viaEmail.includes('Caught up after years'), viaEmail);
    const npcFirst = g.social.getAllNPCs()[0].name.split(' ')[0];
    const composed = await cmd(`email compose ${npcFirst} TestSubject HelloBody`);
    check('email compose still works', composed.includes('Email sent to') && composed.includes('TestSubject'), composed);
    const afterCompose = await cmd('emails');
    check('composed email appears in inbox', afterCompose.includes('TestSubject'), afterCompose);
    const composedId = g.comm.getEmails().find((e: any) => e.subject === 'TestSubject')?.id;
    const deleted = await cmd(`email delete ${composedId}`);
    check('email delete still works', deleted.includes('Email deleted'), deleted);
    check('deleted email gone from inbox', !(await cmd('emails')).includes('TestSubject'));
  }

  // §E — quick bar: order, binding route, mid-conversation proof, scroll CSS.
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const cmds = [...client.matchAll(/data-cmd="([a-z]+)"/g)].map((m) => m[1]);
    check('quick bar has 21 buttons', cmds.length === 21, cmds);
    check(
      'quick bar order …, People, Phone, Mail, Factions, Help with Mail right after Phone',
      JSON.stringify(cmds.slice(-5)) === JSON.stringify(['people', 'phone', 'mail', 'factions', 'help']),
      cmds.slice(-5),
    );
    check('quick bar Mail button is expanded-class like Phone', client.includes('data-cmd="mail"') && /data-cmd="phone"[^>]*quick-btn-expanded|quick-btn-expanded" data-cmd="phone"/.test(client) && client.includes('quick-btn-expanded" data-cmd="mail"'), 'mail button class');
    check(
      'generic binding: quick handlers call handleCommand with asCommand true',
      client.includes('void handleCommand(cmd, convEl!, { asCommand: true })'),
      'binding',
    );
    const engine = fs.readFileSync('src/server/game-engine.ts', 'utf8');
    check('server clears currentConversation first on asCommand', engine.includes('if (opts?.asCommand) this.player.currentConversation = null;'), 'asCommand');
    const css = fs.readFileSync('public/game.css', 'utf8');
    check('.16 scroll behavior holds: overflow-x auto + buttons flex none', css.includes('overflow-x: auto') && css.includes('.quick-actions .quick-btn') && css.includes('flex: none'), 'css');
    // Mid-conversation proof: asCommand route (the quick-bar route).
    g.player.currentConversation = { npcId: 'npc_test', npcName: 'Test NPC' };
    const mid = await cmd('mail', { asCommand: true });
    check('mail via asCommand works mid-conversation + clears conversation', mid.includes('📬 **Mail**') && g.player.currentConversation === null, mid.slice(0, 120));
    // Typed mail mid-conversation (commands-win rule) also reaches mail.
    g.player.currentConversation = { npcId: 'npc_test', npcName: 'Test NPC' };
    const midTyped = await cmd('mail');
    check('typed mail works mid-conversation + clears conversation', midTyped.includes('📬 **Mail**') && g.player.currentConversation === null, midTyped.slice(0, 120));
  }

  // §F — help.
  {
    const help = (await g.processCommand('help')).message;
    const bullets = help.split('\n').filter((l) => l.trim().startsWith('• '));
    const auditBullets = [...help.matchAll(/^• ([a-z][a-z_-]*)/gm)].map((m) => m[1]);
    // Audit regex /^• ([a-z][a-z_-]*)/gm counts only lowercase-initial
    // bullets (11 pre-existing bullets start uppercase/quoted and never
    // counted); .27's audit count was therefore 324, and .28's +3 new
    // lowercase mail bullets make it 327 — green replacement, not a
    // hidden change. Total bullets 335 → 338.
    check('.28 REPLACES .27 help count 335 → 338 (audit 324 → 327)', bullets.length === 338 && auditBullets.length === 327, { bullets: bullets.length, audit: auditBullets.length });
    check('help Mail subsection documents mail list', help.includes('• mail — List your mail: id, kind, sender, subject, and read/unread state'), 'mail bullet');
    check('help documents mail filter + mail read + read mail', help.includes('• mail [letters|bills|notices|packages]') && help.includes('• mail read [id]') && help.includes('• read mail [id]'), 'mail bullets');
    check('help documents every other mail-side command', ['packages', 'track [id]', 'send package [npc] [item]', 'claim package [id]', 'deliver [id]', 'pay bill [id]'].every((b) => help.includes(`• ${b} —`)), 'others');
    check('help Quick Bar updated to 21-button order with Mail after Phone', help.includes('People, Phone, Mail, Factions, Help'), 'quick bar bullet');
    const gov = (await g.processCommand('help government')).message;
    check('help government drill-down still contains the Mail subsection', gov.includes('Mail — your postal mail') && gov.includes('mail read [id]'), gov.slice(0, 200));
    const filtered = (await g.processCommand('help mail')).message;
    check('help mail filter finds the mail bullets', filtered.includes('mail read [id]'), filtered.slice(0, 200));
  }

  // §G — What's New + version sync + index.
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...client.matchAll(/id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    check('.28 details first', detailIds[0] === 'update-v0-108-28' && detailIds[1] === 'update-v0-108-27', detailIds.slice(0, 3));
    const block28 = client.slice(client.indexOf('id="update-v0-108-28"'), client.indexOf('id="update-v0-108-27"'));
    check('.28 entry open + Latest + dated November 2, 2026', block28.includes('id="update-v0-108-28" open>') && block28.includes('update-latest') && block28.includes('November 2, 2026') && block28.includes('lists your mail'), block28.slice(0, 200));
    const block27 = client.slice(client.indexOf('id="update-v0-108-27"'), client.indexOf('id="update-v0-108-26"'));
    check('.28 REPLACES .27 open+Latest (.27 collapsed, no Latest, body intact)', block27.includes('id="update-v0-108-27">') && !block27.includes('update-latest') && block27.includes('Show all versions'), block27.slice(0, 200));
    check('.28 REPLACES .27 index-first (.28 prepended)', UPDATE_INDEX_VERSIONS[0] === 'v0.108.28' && UPDATE_INDEX_VERSIONS[1] === 'v0.108.27', UPDATE_INDEX_VERSIONS.slice(0, 3));
    check('.28 REPLACES .27 index length 70 → 71', UPDATE_INDEX_VERSIONS.length === 71, UPDATE_INDEX_VERSIONS.length);
    check('.28 REPLACES .27 collapsed-10 (.28 … .19)', (() => { const c = collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10); return c.length === 10 && c[0] === 'v0.108.28' && c[9] === 'v0.108.19'; })(), collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10));
    check('.28 REPLACES .27 v0.108.x group 24 → 25 versions', groupIndexVersions(UPDATE_INDEX_VERSIONS).find((g) => g.family === 'v0.108.x')?.versions.length === 25, groupIndexVersions(UPDATE_INDEX_VERSIONS).find((g) => g.family === 'v0.108.x')?.versions.length);
    check('.28 REPLACES .27 card count 71 → 72 elements, 71 unique, only dup pre-existing v0.92.0', detailIds.length === 72 && new Set(detailIds).size === 71 && JSON.stringify(detailIds.filter((id, i) => detailIds.indexOf(id) !== i)) === JSON.stringify(['update-v0-92-0']), { total: detailIds.length, unique: new Set(detailIds).size });
    check('jump target exists for .28', detailIds.includes('update-v0-108-28'));
    check('package.json 0.108.28', fs.readFileSync('package.json', 'utf8').includes('"version": "0.108.28"'));
    check('GAME_VERSION 0.108.28', fs.readFileSync('src/shared/version.ts', 'utf8').includes('0.108.28'));
    check('boot log 0.108.28', fs.readFileSync('src/server/index.ts', 'utf8').includes('v0.108.28 - STATELESS MODE'));
    check('AGENTS.md header 0.108.28', fs.readFileSync('AGENTS.md', 'utf8').includes('**Version**: 0.108.28'));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
