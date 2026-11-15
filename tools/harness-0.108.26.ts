// v0.108.26 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves with REAL behavior (never parser-existence):
//   §A general work activities (task/mentor/meeting/breakroom/report/cover)
//      with exact effects + refusals (no job, incarcerated, low energy,
//      repeat same day, non-coworker) and old-save compatibility;
//   §B emergency-track activities (patrol/drill/respond/training/ridealong)
//      for a Cadet-state player, incl. wrong-track refusals;
//   §C shift expansion (weekend/split/oncall pay/energy/stress, weekend
//      weekday refusal, preference persistence + one-shot override,
//      night-streak fatigue at 3+ and reset);
//   §D the apply-listing fix (Cadet visible in Memphis, entry first,
//      by-name hire still works);
//   §E quick bar 20 (exact order, Home/Sleep plain buttons, scroll rules,
//      20-button x 2-state engine matrix) + help 335 + version/What's New.
// Run:
//   npx esbuild tools/harness-0.108.26.ts --bundle --platform=node --format=esm --outfile=/tmp/h10826.mjs && node /tmp/h10826.mjs
import { GameEngine } from '../src/server/game-engine.js';
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

const MONDAY = '2026-11-02T12:00:00Z'; // a Monday
const SATURDAY = '2026-11-07T12:00:00Z'; // a Saturday
function baseState(over: Record<string, unknown> = {}): any {
  return {
    name: 'Tester', city: 'memphis', district: 'downtown', money: 10000,
    energy: 100, happiness: 80, stress: 0, health: 100,
    reputation: { professional: 0, social: 0, criminal: 0, community: 0 },
    skills: { cooking: { level: 1, xp: 0 }, fitness: { level: 1, xp: 0 } },
    gameTimeISO: MONDAY,
    ...over,
  };
}
function fresh(over: Record<string, unknown> = {}): GameEngine {
  const g = new GameEngine();
  g.loadState(baseState(over));
  return g;
}
const DINER_JOB = { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking', city: 'memphis', district: 'downtown', category: 'entry', tier: 'entry' };
const CADET_JOB = { id: 'mem_police_cadet', title: 'Police Cadet', employer: 'Memphis Police Department', hourlyPay: 25.6, skill: 'fitness', city: 'memphis', district: 'downtown', category: 'emergency', tier: 'entry' };

// Find a roster NPC whose role matches the entry coworker family, and
// build the job around that NPC's city/district so the pool is non-empty.
function coworkerFixture(): { npc: any; job: any } {
  const probe = fresh({});
  const all = (probe as any).social.getAllNPCs();
  const keys = ['owner', 'vendor', 'clerk', 'cashier', 'cook', 'chef', 'driver', 'messenger', 'attendant', 'worker', 'associate', 'handler', 'stocker'];
  const npc = all.find((n: any) => keys.some((k) => String(n.role ?? '').toLowerCase().includes(k)));
  if (!npc) throw new Error('no entry-keyword NPC found');
  return { npc, job: { ...DINER_JOB, city: npc.city, district: npc.district } };
}

async function main(): Promise<void> {
  console.log('=== §A: general work activities ===');
  {
    const g = fresh({ job: { ...DINER_JOB } });
    const v = await g.processCommand('task');
    check('task view shows a pool task', /Tidy|paperwork|Help a customer|inventory|checklist|cleanup/.test(v.message), v.message.slice(0, 120));
    const v2 = await g.processCommand('task');
    check('task stable within the same game-day', v2.message.includes(v.message.split('\n')[1] ?? '???'), v2.message.slice(0, 120));
    const before = (g as any).player;
    const money0 = before.money; const energy0 = before.energy;
    const r = await g.processCommand('task complete');
    const after = (g as any).player;
    check('task complete: +$25, -5 energy, +10 cooking XP', r.success && after.money === money0 + 25 && after.energy === energy0 - 5 && after.skills.cooking.xp === 10, r.message.slice(0, 160));
    const r2 = await g.processCommand('task complete');
    check('task complete repeat same day refuses', !r2.success && r2.message.includes('already done'), r2.message.slice(0, 120));
  }
  {
    const g = fresh({});
    const r = await g.processCommand('task complete');
    check('task complete with no job refuses', !r.success && r.message.includes("don't have a job"), r.message.slice(0, 120));
    const g2 = fresh({ job: { ...DINER_JOB }, incarcerated: true });
    const r3 = await g2.processCommand('meeting');
    check('meeting while incarcerated refuses (global gate)', !r3.success && r3.message.includes('incarcerated'), r3.message.slice(0, 120));
    const g3 = fresh({ job: { ...DINER_JOB }, energy: 3 });
    const r4 = await g3.processCommand('meeting');
    check('meeting with 3 energy refuses', !r4.success && r4.message.includes('Too tired'), r4.message.slice(0, 120));
  }
  {
    const g = fresh({ job: { ...DINER_JOB } });
    const m = await g.processCommand('meeting');
    const p = (g as any).player;
    check('meeting: +5 XP, +2 happiness, -5 energy', m.success && p.skills.cooking.xp === 5 && p.happiness === 82 && p.energy === 95, m.message.slice(0, 140));
    const m2 = await g.processCommand('meeting');
    check('meeting repeat same day refuses', !m2.success && m2.message.includes('already sat'), m2.message.slice(0, 120));
  }
  {
    const g = fresh({ job: { ...DINER_JOB }, energy: 50, happiness: 80 });
    const b = await g.processCommand('breakroom');
    const p = (g as any).player;
    check('breakroom: +10 energy, +2 happiness', b.success && p.energy === 60 && p.happiness === 82, b.message.slice(0, 120));
  }
  {
    const g = fresh({ job: { ...DINER_JOB } });
    const r = await g.processCommand('report');
    const p = (g as any).player;
    check('report (civilian job): Shift report, +3 pro rep, +5 XP', r.success && r.message.includes('Shift report') && p.reputation.professional === 3 && p.skills.cooking.xp === 5, r.message.slice(0, 160));
  }
  {
    const { npc, job } = coworkerFixture();
    const g = fresh({ job, city: npc.city, district: npc.district });
    const m = await g.processCommand(`mentor ${npc.name}`);
    const p = (g as any).player;
    check('mentor coworker: +4 rel, +3 pro rep', m.success && p.relationships[npc.id].value === 4 && p.reputation.professional === 3, m.message.slice(0, 160));
    const m2 = await g.processCommand('mentor Nobody Here');
    check('mentor non-coworker refuses', !m2.success && m2.message.includes("isn't one of your coworkers"), m2.message.slice(0, 120));
    const g2 = fresh({ job, city: npc.city, district: npc.district, jobTenure: 5, workDaysCompleted: 10 });
    const c = await g2.processCommand(`cover ${npc.name}`);
    const p2 = (g2 as any).player;
    check('cover: 4h base pay $80, -20 energy, +3 rel, tenure untouched', c.success && p2.money === 10080 && p2.energy === 80 && p2.relationships[npc.id].value === 3 && p2.jobTenure === 5 && p2.workDaysCompleted === 10, c.message.slice(0, 180));
  }
  {
    // Old-save compatibility: no .26 fields at all.
    const g = new GameEngine();
    g.loadState({ name: 'Old', city: 'memphis', district: 'downtown', money: 100, energy: 100, happiness: 80, stress: 0, health: 100, job: { ...DINER_JOB } });
    const r = await g.processCommand('task complete');
    check('old save without .26 fields runs task complete', r.success, r.message.slice(0, 120));
  }

  console.log('=== §B: emergency-track activities (Cadet) ===');
  {
    const g = fresh({ job: { ...CADET_JOB } });
    const pPre = (g as any).player;
    const money0 = pPre.money; const energy0 = pPre.energy; const xp0 = pPre.skills.fitness.xp;
    const r = await g.processCommand('patrol');
    const p = (g as any).player;
    check('patrol (Cadet): +$30, -10 energy, +10 fitness XP', r.success && p.money === money0 + 30 && p.energy === energy0 - 10 && p.skills.fitness.xp === xp0 + 10, r.message.slice(0, 160));
    const r2 = await g.processCommand('patrol');
    check('patrol repeat same day refuses', !r2.success && r2.message.includes('already did'), r2.message.slice(0, 120));
    const t = await g.processCommand('training');
    check('training (Cadet): +15 fitness XP', t.success && (g as any).player.skills.fitness.xp === 25, t.message.slice(0, 140));
    const rl = await g.processCommand('ridealong');
    check('ridealong (Cadet): +5 XP, +2 happiness, -5 energy', rl.success && (g as any).player.skills.fitness.xp === 30 && (g as any).player.happiness === 82 && (g as any).player.energy === 75, rl.message.slice(0, 160));
    const rep = await g.processCommand('report');
    check('report (emergency track): Incident report wording', rep.success && rep.message.includes('Incident report'), rep.message.slice(0, 140));
    const d = await g.processCommand('drill');
    check('drill on police track refuses (fire only)', !d.success && d.message.includes('fire'), d.message.slice(0, 120));
    const e = await g.processCommand('respond');
    check('respond on police track refuses (EMS only)', !e.success && e.message.includes('EMS'), e.message.slice(0, 120));
  }
  {
    const g = fresh({ job: { ...DINER_JOB } });
    const r = await g.processCommand('patrol');
    check('patrol with civilian job refuses (emergency-services)', !r.success && r.message.includes('emergency-services'), r.message.slice(0, 120));
    const g2 = fresh({ job: { ...CADET_JOB }, energy: 5 });
    const r2 = await g2.processCommand('patrol');
    check('patrol with 5 energy refuses', !r2.success && r2.message.includes('Too tired'), r2.message.slice(0, 120));
  }

  console.log('=== §C: shift expansion ===');
  {
    const g = fresh({ job: { ...DINER_JOB } });
    const r = await g.processCommand('shift weekend');
    check('weekend shift on a Monday refuses', !r.success && r.message.includes('Saturday and Sunday'), r.message.slice(0, 120));
    const gs = fresh({ job: { ...DINER_JOB }, gameTimeISO: SATURDAY });
    const rs = await gs.processCommand('shift weekend');
    check('weekend shift on a Saturday sets (x1.15)', rs.success && rs.message.includes('1.15'), rs.message.slice(0, 120));
  }
  async function workWith(shift: string | null, prefer: string | null, iso: string): Promise<{ pay: number; energy: number; stress: number; happy: number; msg: string }> {
    const g = fresh({ job: { ...DINER_JOB }, gameTimeISO: iso });
    if (prefer) await g.processCommand(`shift prefer ${prefer}`);
    if (shift) await g.processCommand(`shift ${shift}`);
    const before = (g as any).player;
    const m0 = before.money; const e0 = before.energy; const s0 = before.stress; const h0 = before.happiness;
    const r = await g.processCommand('work');
    const p = (g as any).player;
    return { pay: Math.round((p.money - m0) * 100) / 100, energy: e0 - p.energy, stress: p.stress - s0, happy: p.happiness - h0, msg: r.message };
  }
  {
    const morning = await workWith(null, null, MONDAY);
    const split = await workWith('split', null, MONDAY);
    check('split pay == morning pay (x1.00)', split.pay === morning.pay, { morning: morning.pay, split: split.pay });
    check('split energy 30 vs morning 35', split.energy === 30 && morning.energy === 35, { split: split.energy, morning: morning.energy });
    check('split happiness +3 vs morning +0 (same event)', split.happy - morning.happy === 3, { split: split.happy, morning: morning.happy });
    const evening = await workWith('evening', null, MONDAY);
    const oncall = await workWith('oncall', null, MONDAY);
    check('oncall pay == evening pay (x1.10)', oncall.pay === evening.pay, { oncall: oncall.pay, evening: evening.pay });
    check('oncall energy 35 vs evening 40, stress +5 more', oncall.energy === 35 && evening.energy === 40 && oncall.stress - evening.stress === 5, { oncall, evening });
    const weekend = await workWith('weekend', null, SATURDAY);
    const night = await workWith('night', null, SATURDAY);
    const eveningSat = await workWith('evening', null, SATURDAY);
    check('weekend pay between evening and night', weekend.pay > eveningSat.pay && weekend.pay < night.pay, { weekend: weekend.pay, evening: eveningSat.pay, night: night.pay });
  }
  {
    const prefEvening = await workWith(null, 'evening', MONDAY);
    const morning = await workWith(null, null, MONDAY);
    const evening = await workWith('evening', null, MONDAY);
    check('preferred evening applies with no one-shot', prefEvening.pay === evening.pay && prefEvening.pay > morning.pay, { pref: prefEvening.pay, evening: evening.pay, morning: morning.pay });
    const override = await workWith('morning', 'evening', MONDAY);
    check('one-shot morning overrides preferred evening', override.pay === morning.pay, { override: override.pay, morning: morning.pay });
    const g = fresh({ job: { ...DINER_JOB } });
    const setNone = await g.processCommand('shift prefer none');
    check('prefer none clears', setNone.success && setNone.message.includes('cleared'), setNone.message.slice(0, 100));
    const show = await g.processCommand('shift prefer');
    check('bare prefer shows current preference', show.success && show.message.includes('Preferred shift'), show.message.slice(0, 100));
    const bad = await g.processCommand('shift prefer bogus');
    check('prefer bogus refuses with usage', !bad.success && bad.message.includes('Usage'), bad.message.slice(0, 100));
  }
  {
    const g = fresh({ job: { ...DINER_JOB } });
    let fatigueSeen = false;
    for (let i = 0; i < 3; i++) {
      (g as any).player.energy = 100;
      await g.processCommand('shift night');
      const r = await g.processCommand('work');
      if (i === 2) {
        fatigueSeen = r.message.includes('fatigue');
        check('3rd consecutive night: fatigue note + energy 45', fatigueSeen && (g as any).player.energy === 45, r.message.slice(0, 200));
      } else {
        check(`night ${i + 1}: no fatigue yet`, !r.message.includes('fatigue'), r.message.slice(0, 120));
      }
    }
    (g as any).player.energy = 100;
    await g.processCommand('work'); // morning resets the streak
    (g as any).player.energy = 100;
    await g.processCommand('shift night');
    const r = await g.processCommand('work');
    check('night after a morning reset: no fatigue', !r.message.includes('fatigue'), r.message.slice(0, 160));
  }

  console.log('=== §D: apply-listing fix ===');
  {
    const g = fresh({ city: 'memphis' });
    const a = await g.processCommand('apply');
    const entryIdx = a.message.indexOf('**ENTRY**');
    const eliteIdx = a.message.indexOf('**ELITE**');
    const execIdx = a.message.indexOf('**EXECUTIVE**');
    check('apply (Memphis) shows Police Cadet', a.message.includes('Police Cadet'), a.message.slice(0, 200));
    check('ENTRY section precedes ELITE/EXECUTIVE sections', entryIdx !== -1 && (eliteIdx === -1 || entryIdx < eliteIdx) && (execIdx === -1 || entryIdx < execIdx), `entry:${entryIdx} elite:${eliteIdx} exec:${execIdx}`);
    const h = await g.processCommand('apply police cadet');
    check('by-name hire still works', h.success && (g as any).player.job?.title === 'Police Cadet', h.message.slice(0, 140));
  }

  console.log('=== §E: quick bar 20 + help + version ===');
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const cmds = [...client.matchAll(/data-cmd="([a-z]+)"/g)].map((m) => m[1]);
    const expected = ['status', 'home', 'work', 'sleep', 'explore', 'talk', 'goals', 'journal', 'quests', 'skills', 'achievements', 'bank', 'properties', 'businesses', 'investments', 'vehicles', 'people', 'phone', 'factions', 'help'];
    check('quick bar: exact 20-button order Status, Home, Work, Sleep, ...', JSON.stringify(cmds) === JSON.stringify(expected), cmds);
    const homeLine = client.split('\n').find((l) => l.includes('data-cmd="home"')) ?? '';
    const sleepLine = client.split('\n').find((l) => l.includes('data-cmd="sleep"')) ?? '';
    check('Home + Sleep are plain buttons (both modes, not expanded-only)', !homeLine.includes('quick-btn-expanded') && !sleepLine.includes('quick-btn-expanded'), { homeLine, sleepLine });
    const css = fs.readFileSync('public/game.css', 'utf8');
    check('scroll rules still present (overflow-x auto, buttons flex none)', css.includes('.quick-actions') && css.includes('overflow-x: auto') && css.includes('.quick-actions .quick-btn'), 'css');
  }
  {
    // 20-button matrix, both states (markers from live command output).
    const BUTTONS: Array<{ cmd: string; marker: string | null; setup?: Record<string, unknown> }> = [
      { cmd: 'status', marker: 'Net Worth' },
      { cmd: 'home', marker: 'Heading home', setup: { city: 'nashville', money: 10000 } },
      { cmd: 'work', marker: 'Worked 8hr shift', setup: { job: { employer: 'Test Diner', hourlyPay: 20, skill: 'cooking' }, energy: 100 } },
      { cmd: 'sleep', marker: null, setup: { energy: 50 } },
      { cmd: 'explore', marker: 'Exploring downtown' },
      { cmd: 'talk', marker: 'Who do you want to talk to?' },
      { cmd: 'goals', marker: 'Daily Goals' },
      { cmd: 'journal', marker: 'Your Journal' },
      { cmd: 'quests', marker: 'Active Quests' },
      { cmd: 'skills', marker: 'YOUR SKILLS' },
      { cmd: 'achievements', marker: 'Achievements' },
      { cmd: 'bank', marker: 'THE OPEN WORLD BANK' },
      { cmd: 'properties', marker: "You don't own any properties yet" },
      { cmd: 'businesses', marker: 'Businesses' },
      { cmd: 'investments', marker: "You don't have any investments" },
      { cmd: 'vehicles', marker: "You don't own any vehicles" },
      { cmd: 'people', marker: 'People in Downtown Memphis' },
      { cmd: 'phone', marker: 'Phone OS v2.0' },
      { cmd: 'factions', marker: 'Factions' },
      { cmd: 'help', marker: 'THE OPEN WORLD — Commands' },
    ];
    function inConversation(g: GameEngine): void {
      const npc = (g as any).social.getNPCByCity('memphis')[0];
      (g as any).player.currentConversation = { npcId: npc.id, npcName: npc.name };
    }
    for (const b of BUTTONS) {
      const g = fresh(b.setup ?? {});
      const r = await g.processCommand(b.cmd);
      const ok = b.marker ? r.message.includes(b.marker) && !(r as any).npcName : (g as any).player.energy === 100 && !(r as any).npcName;
      check(`(a) ${b.cmd} -> command output`, ok, r.message.slice(0, 120));
    }
    for (const b of BUTTONS) {
      const g = fresh(b.setup ?? {});
      inConversation(g);
      const r = await g.processCommand(b.cmd, { asCommand: true });
      const convCleared = (g as any).player.currentConversation === null;
      const ok = b.marker ? r.message.includes(b.marker) && !(r as any).npcName && convCleared : (g as any).player.energy === 100 && !(r as any).npcName && convCleared;
      check(`(b) ${b.cmd} mid-conversation -> command output, conversation exited`, ok, r.message.slice(0, 120));
    }
  }
  {
    const g = fresh({});
    const help = (await g.processCommand('help')).message;
    const bullets = help.split('\n').filter((l) => l.trim().startsWith('• '));
    check('help bullets 335 = 322 + 13', bullets.length === 335, bullets.length);
    for (const s of ['task complete', 'shift prefer', 'patrol', 'ridealong', 'breakroom', 'cover [name]', 'Status, Home, Work, Sleep, Explore, Talk']) {
      check(`help contains "${s}"`, help.includes(s));
    }
  }
  {
    const ver = fs.readFileSync('src/shared/version.ts', 'utf8');
    check('GAME_VERSION 0.108.26', ver.includes('0.108.26'), ver.trim());
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...client.matchAll(/id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    check('.26 details first', detailIds[0] === 'update-v0-108-26' && detailIds[1] === 'update-v0-108-25', detailIds.slice(0, 3));
    const block26 = client.slice(client.indexOf('id="update-v0-108-26"'), client.indexOf('id="update-v0-108-25"'));
    check('.26 entry open + Latest', block26.includes('id="update-v0-108-26" open>') && block26.includes('update-latest'), block26.slice(0, 200));
    const block25 = client.slice(client.indexOf('id="update-v0-108-25"'), client.indexOf('id="update-v0-108-24"'));
    check('.25 entry collapsed, no Latest, bullets intact', block25.includes('id="update-v0-108-25">') && !block25.includes('update-latest') && block25.includes('five boards'), block25.slice(0, 200));
    check('.26 index button prepended', client.includes('data-version="update-v0-108-26">v0.108.26</button> <button class="update-index-btn" data-action="goto-update" data-version="update-v0-108-25"'), 'index buttons');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
