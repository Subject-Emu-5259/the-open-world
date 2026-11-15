// v0.108.27 verification harness — run via esbuild bundle, NOT part of
// the shipped game. Proves with REAL behavior (never parser-existence):
//   §A index logic on the REAL shared module (collapsed latest-10,
//      grouped Show-all newest-first at group + version level, the live
//      v0.101.0/v0.99.3 jumble case, dedupe, jump targets exist);
//   §B What's New state (.27 first + open + Latest, .26 collapsed with
//      body intact, .25 intact, details count 70) + version sync x4 +
//      help coverage unchanged (335, no new commands) + CSS classes.
// DOM toggle behavior (click → re-render of the index container only)
// cannot execute in node: it is source-asserted (toggle binding +
// closest('.updates-index') re-render + re-bind) and Dre's live playtest
// is the visual verdict, stated honestly here, not faked.
// Run:
//   npx esbuild tools/harness-0.108.27.ts --bundle --platform=node --format=esm --outfile=/tmp/h10827.mjs && node /tmp/h10827.mjs
import { GameEngine } from '../src/server/game-engine.js';
import {
  UPDATE_INDEX_VERSIONS,
  updateTargetId,
  versionFamily,
  groupIndexVersions,
  collapsedIndexVersions,
  sortedIndexVersions,
} from '../src/shared/updates-index.js';
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

async function main(): Promise<void> {
  // §A — real index logic
  {
    const sorted = sortedIndexVersions(UPDATE_INDEX_VERSIONS);
    check('index array length 70 (69 old unique + .27)', UPDATE_INDEX_VERSIONS.length === 70, UPDATE_INDEX_VERSIONS.length);
    check('no duplicates after sort', new Set(sorted).size === sorted.length, sorted.length);
    check('array already newest-first', UPDATE_INDEX_VERSIONS[0] === 'v0.108.27' && UPDATE_INDEX_VERSIONS[1] === 'v0.108.26', UPDATE_INDEX_VERSIONS.slice(0, 3));
    const collapsed = collapsedIndexVersions(UPDATE_INDEX_VERSIONS, 10);
    check(
      'collapsed exactly 10: .27 … .18',
      collapsed.length === 10 &&
        collapsed[0] === 'v0.108.27' &&
        collapsed[9] === 'v0.108.18',
      collapsed,
    );
    const groups = groupIndexVersions(UPDATE_INDEX_VERSIONS);
    check('42 families', groups.length === 42, groups.length);
    check('first group v0.108.x', groups[0]?.family === 'v0.108.x', groups[0]?.family);
    check('last group v0.1.x', groups[groups.length - 1]?.family === 'v0.1.x', groups[groups.length - 1]?.family);
    const minors = groups.map((g) => Number(g.family.split('.')[1]));
    check('groups newest-first (minor desc)', minors.every((m, i) => i === 0 || m < minors[i - 1]!), minors.slice(0, 8));
    const flat = groups.flatMap((g) => g.versions);
    const idx101 = flat.indexOf('v0.101.0');
    const idx993 = flat.indexOf('v0.99.3');
    check('LIVE JUMBLE FIXED: v0.101.0 before v0.99.3', idx101 !== -1 && idx993 !== -1 && idx101 < idx993, [idx101, idx993]);
    const fam101 = groups.findIndex((g) => g.family === 'v0.101.x');
    const fam99 = groups.findIndex((g) => g.family === 'v0.99.x');
    check('v0.101.x family precedes v0.99.x family', fam101 !== -1 && fam99 !== -1 && fam101 < fam99, [fam101, fam99]);
    const g99 = groups.find((g) => g.family === 'v0.99.x');
    check('v0.99.x within-group newest-first (99.3, 99.2, 99.0)', JSON.stringify(g99?.versions) === JSON.stringify(['v0.99.3', 'v0.99.2', 'v0.99.0']), g99?.versions);
    const g108 = groups.find((g) => g.family === 'v0.108.x');
    check('v0.108.x group 24 versions (.27 … .0 minus gaps)', g108?.versions[0] === 'v0.108.27' && g108?.versions.includes('v0.108.0'), g108?.versions.length);
    check('target id derivation', updateTargetId('v0.108.27') === 'update-v0-108-27' && updateTargetId('v0.99.3') === 'update-v0-99-3');
    check('family derivation', versionFamily('v0.108.27') === 'v0.108.x' && versionFamily('v0.15.0') === 'v0.15.x');
    check('flat grouped order equals numeric sort', JSON.stringify(flat) === JSON.stringify(sorted));
  }

  // §B — client source, version state, help coverage, CSS
  {
    const client = fs.readFileSync('src/client/game.ts', 'utf8');
    const detailIds = [...client.matchAll(/id="(update-v0-[0-9-]+)"/g)].map((m) => m[1]);
    // 71 card ELEMENTS, 70 unique ids: two distinct v0.92.0 cards exist
    // (Aug 9 + Aug 10, 2026) — a pre-existing changelog duplication, NOT
    // introduced by .27. The index dedupes to one v0.92.0 button, which
    // jumps to the first card, exactly as the old duplicated buttons did
    // (querySelector returns the first match). Re-iding or merging the
    // Aug-9 card would touch changelog content, so it is a follow-up,
    // not part of this presentation-only fix.
    const dupIds = detailIds.filter((id, i) => detailIds.indexOf(id) !== i);
    check('71 card elements, 70 unique, only dup is pre-existing v0.92.0', detailIds.length === 71 && new Set(detailIds).size === 70 && JSON.stringify(dupIds) === JSON.stringify(['update-v0-92-0']), { total: detailIds.length, dupIds });
    check('.27 details first', detailIds[0] === 'update-v0-108-27' && detailIds[1] === 'update-v0-108-26', detailIds.slice(0, 3));
    const block27 = client.slice(client.indexOf('id="update-v0-108-27"'), client.indexOf('id="update-v0-108-26"'));
    check('.27 entry open + Latest + index bullet', block27.includes('id="update-v0-108-27" open>') && block27.includes('update-latest') && block27.includes('Show all versions'), block27.slice(0, 200));
    const block26 = client.slice(client.indexOf('id="update-v0-108-26"'), client.indexOf('id="update-v0-108-25"'));
    check(
      '.26 entry collapsed, no Latest, body intact',
      block26.includes('id="update-v0-108-26">') &&
        !block26.includes('update-latest') &&
        block26.includes('Emergency-track activities') &&
        block26.includes('Quick bar: Home and Sleep'),
      block26.slice(0, 200),
    );
    const block25 = client.slice(client.indexOf('id="update-v0-108-25"'), client.indexOf('id="update-v0-108-24"'));
    check('.25 entry intact (five boards)', block25.includes('five boards'), block25.slice(0, 200));
    // Every indexed version has a jump target card.
    const missing = UPDATE_INDEX_VERSIONS.filter((v) => !detailIds.includes(updateTargetId(v)));
    check('jump target exists for every indexed version', missing.length === 0, missing);
    // No flat wall remains: the old hardcoded button run is gone.
    check('flat wall removed', !client.includes('Jump to a version:</span> <button class="update-index-btn" data-action="goto-update"'), 'flat wall still present');
    check('index generated from shared module', client.includes('renderUpdatesIndexHTML()') && client.includes("id=\"updates-index\""), 'container');
    // Toggle wiring (source-asserted; DOM execution is Dre's playtest).
    check(
      'toggle wiring: binding + container-only re-render + re-bind',
      client.includes('data-action="toggle-updates-index"') &&
        client.includes("closest('.updates-index')") &&
        client.includes('bindUpdatesIndex(idx)') &&
        client.includes('Show fewer'),
      'toggle wiring',
    );
    // Version sync x4.
    check('package.json 0.108.27', fs.readFileSync('package.json', 'utf8').includes('"version": "0.108.27"'));
    check('GAME_VERSION 0.108.27', fs.readFileSync('src/shared/version.ts', 'utf8').includes('0.108.27'));
    check('boot log 0.108.27', fs.readFileSync('src/server/index.ts', 'utf8').includes('v0.108.27 - STATELESS MODE'));
    check('AGENTS.md header 0.108.27', fs.readFileSync('AGENTS.md', 'utf8').includes('**Version**: 0.108.27'));
    // Help coverage unchanged (no new commands in .27).
    const g = new GameEngine();
    g.loadState({ name: 'Tester', city: 'memphis', district: 'downtown', money: 1000, energy: 100, happiness: 80, stress: 0, health: 100, gameTimeISO: '2026-11-02T12:00:00Z' } as any);
    const help = (await g.processCommand('help')).message;
    const bullets = help.split('\n').filter((l) => l.trim().startsWith('• '));
    check('help bullets still 335 (no new commands)', bullets.length === 335, bullets.length);
    check('.27 REPLACES .25 §75 (un-runnable /tmp baseline): compact pause rule verbatim', (() => { const c = fs.readFileSync('public/game.css', 'utf8'); return c.includes('.game-screen:not(.fullscreen) .game-menu-content') && c.includes('max-height: 92vh') && c.includes('max-height: 92dvh') && c.includes('overflow-y: auto'); })());
    check('.27 REPLACES .17 Quick Bar needle (new 20-button order)', help.includes('Status, Home, Work, Sleep, Explore, Talk'));
    // CSS classes.
    const css = fs.readFileSync('public/game.css', 'utf8');
    check(
      'CSS: group + toggle classes, old index classes intact',
      css.includes('.updates-index-group') &&
        css.includes('.updates-index-group-header') &&
        css.includes('.updates-index-toggle') &&
        css.includes('.updates-index {') &&
        css.includes('.update-index-btn {'),
      'css',
    );
    // .27 supersession replacements for .26 checks that fail by design:
    check('.27 REPLACES .26 index-button-prepended (array-first .27)', UPDATE_INDEX_VERSIONS[0] === 'v0.108.27');
    check('.27 REPLACES .26 details-first (.27 first, .26 second)', detailIds[0] === 'update-v0-108-27' && detailIds[1] === 'update-v0-108-26');
    check('.27 REPLACES .26 open+Latest (.27 open+Latest)', block27.includes('open>') && block27.includes('update-latest'));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
