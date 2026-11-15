// ============================================
// stage-pc.mjs — build the PC game client and stage it for the shell
// ============================================
// Mirrors Dispatch HQ's apps/desktop/scripts/stage-web.mjs:
//
//   1. Builds the PC edition (tools/build.ts --pc) so the staged
//      bundle is always fresh — the client (Devvit imports stubbed,
//      platform 'pc') lands in dist/pc/client/.
//   2. Stages dist/pc/client/ into desktop/client-dist/, where
//      electron-builder picks it up as an extraResource and the shell
//      serves it on the tow:// scheme (see src/main.ts).
//   3. Stamps the BUNDLED game version into client-dist/version.json,
//      read from src/shared/version.ts (GAME_VERSION) — never
//      hardcoded. The shell reads this for the title bar / About
//      panel; it is the DHQ 0.4.2 version-display fix, applied from
//      build one.
//   4. Writes the backend URL config into client-dist/pc-config.json.
//      Resolution order:
//        a. TOW_PC_API_BASE in the environment (the Mac runbook's
//           step — the real Render URL goes here), or
//        b. desktop/backend-url.txt (first non-empty, non-# line), or
//        c. the clearly-marked placeholder
//           https://REPLACE-WITH-BACKEND-URL.invalid (the Render backend
//           does not exist yet — a build stamped with this value
//           MUST NOT ship; the runbook says to stop and wait).
//      The staged URL is also baked into the client build as the
//      __TOW_API_BASE__ define (build.ts reads the same env var),
//      so the build-time and runtime values agree; the runtime
//      config wins in the client either way.
//
// The stage step FAILS if the client bundle is missing after the
// build or the game version cannot be read — a release must never
// be built from a stale or unversioned bundle.

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const DESKTOP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TREE_ROOT = path.resolve(DESKTOP_DIR, '..');
const STAGE_DIR = path.join(DESKTOP_DIR, 'client-dist');
const PC_CLIENT_DIR = path.join(TREE_ROOT, 'dist', 'pc', 'client');

const PLACEHOLDER_API_BASE = 'https://REPLACE-WITH-BACKEND-URL.invalid';

function fail(message) {
  console.error(`stage-pc: ${message}`);
  process.exit(1);
}

// --- 0. backend URL resolution (needed before the build: build.ts bakes
// the same env var into the client as __TOW_API_BASE__) ---
let apiBase = '';
let apiBaseSource = '';
const envBase = (process.env.TOW_PC_API_BASE ?? '').trim();
if (envBase) {
  apiBase = envBase;
  apiBaseSource = 'env TOW_PC_API_BASE';
} else {
  const urlFile = path.join(DESKTOP_DIR, 'backend-url.txt');
  if (fs.existsSync(urlFile)) {
    const line = fs
      .readFileSync(urlFile, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#'));
    if (line) {
      apiBase = line;
      apiBaseSource = 'desktop/backend-url.txt';
    }
  }
}
let isPlaceholder = false;
if (!apiBase) {
  apiBase = PLACEHOLDER_API_BASE;
  apiBaseSource = 'placeholder (no TOW_PC_API_BASE, no backend-url.txt)';
  isPlaceholder = true;
}
if (!/^https?:\/\//.test(apiBase)) {
  fail(`backend URL ${JSON.stringify(apiBase)} is not an http(s) URL — refusing to stage.`);
}

// --- 1. build the PC edition ---
console.log('stage-pc: building the PC edition (tools/build.ts --pc)…');
execFileSync(process.execPath, ['--experimental-strip-types', './tools/build.ts', '--pc'], {
  cwd: TREE_ROOT,
  stdio: 'inherit',
  env: { ...process.env, TOW_PC_API_BASE: apiBase },
});

// --- 2. the bundle must exist after the build ---
for (const required of ['game.html', 'game.js']) {
  if (!fs.existsSync(path.join(PC_CLIENT_DIR, required))) {
    fail(`${path.join(PC_CLIENT_DIR, required)} missing after build --pc — refusing to stage.`);
  }
}

fs.rmSync(STAGE_DIR, { recursive: true, force: true });
fs.cpSync(PC_CLIENT_DIR, STAGE_DIR, { recursive: true });

// --- 3. stamp the bundled game version (from the game's own source) ---
const versionSource = fs.readFileSync(path.join(TREE_ROOT, 'src', 'shared', 'version.ts'), 'utf-8');
const versionMatch = versionSource.match(/GAME_VERSION\s*=\s*'([^']+)'/);
if (!versionMatch) {
  fail('could not read GAME_VERSION from src/shared/version.ts — refusing to stage.');
}
const gameVersion = versionMatch[1];
const shellVersion = JSON.parse(fs.readFileSync(path.join(DESKTOP_DIR, 'package.json'), 'utf-8')).version;
fs.writeFileSync(
  path.join(STAGE_DIR, 'version.json'),
  JSON.stringify({ version: gameVersion, shellVersion, stagedAt: new Date().toISOString() }, null, 2) + '\n',
);
console.log(`stage-pc: bundled game version ${gameVersion} (version.json)`);

// --- 4. write the backend URL config ---
fs.writeFileSync(
  path.join(STAGE_DIR, 'pc-config.json'),
  JSON.stringify({ apiBase, placeholder: isPlaceholder, source: apiBaseSource }, null, 2) + '\n',
);
if (isPlaceholder) {
  console.log('stage-pc: ⚠️  backend URL is the PLACEHOLDER — this build MUST NOT ship.');
  console.log('stage-pc:    deploy the Render backend first, then re-stage with');
  console.log('stage-pc:    TOW_PC_API_BASE=<real Render URL> (see the Mac runbook).');
} else {
  console.log(`stage-pc: backend apiBase ${apiBase} (${apiBaseSource})`);
}

let bytes = 0;
for (const entry of fs.readdirSync(STAGE_DIR, { recursive: true, withFileTypes: true })) {
  if (entry.isFile()) {
    bytes += fs.statSync(path.join(entry.parentPath, entry.name)).size;
  }
}
console.log(`stage-pc: staged ${STAGE_DIR} (${(bytes / 1024 / 1024).toFixed(1)} MiB)`);
