// ============================================
// The Open World — Desktop App (Electron main)
// ============================================
// TOW PC phase 3. Modeled directly on Dispatch HQ desktop
// (dispatch-hq-repo/apps/desktop/src/main.ts): same shape — bundled
// client served from disk, staged version.json, electron-updater
// wiring, smoke gate — with two deliberate differences, both driven
// by how TOW PC authenticates:
//
//   1. The bundled client is served on a custom `tow://` scheme, NOT
//      by intercepting https. DHQ intercepts https because its server
//      issues SameSite=Strict auth cookies that only flow on the
//      production origin. TOW PC uses bearer tokens (Authorization
//      header, no cookies) and the backend answers CORS `*`
//      (src/server/pc-cors.ts), so the document origin does not
//      matter — a standard, secure custom scheme is the honest
//      shape here. The scheme origin (tow://app) is stable across
//      launches, so the session token in localStorage persists.
//   2. There is no wake-aware connect loop / offline status page.
//      DHQ needs one because its game cannot render without the
//      server. The TOW PC client renders its own login screen even
//      when the backend is unreachable (pcBoot shows "Could not
//      reach the server" and offers Play offline), so a shell-level
//      block would hide the offline path. The game is the UI.
//
// The backend URL comes from the staged pc-config.json (written by
// scripts/stage-pc.mjs from TOW_PC_API_BASE at stage time, or a
// backend-url.txt file) and is exposed to the client as
// window.__TOW_PC_CONFIG__.apiBase via the preload bridge — the
// runtime value wins over the build-time __TOW_API_BASE__ define.
// The Render backend does not exist yet: until it is deployed, the
// config carries a clearly-marked placeholder (PLACEHOLDER_API_BASE)
// and the runbook says to STOP before shipping, not to ship a shell
// pointing at a placeholder. TOW_PC_API_BASE at RUNTIME overrides
// the staged value, so a local dev server (pc-server.ts on :3101)
// works for testing with no rebuild.
//
// Version display follows the DHQ 0.4.2 fix exactly: the title bar
// and the "now running" toast report the BUNDLED game version from
// version.json (stamped at stage time from src/shared/version.ts),
// NEVER the live server version. The server's /health version is
// fetched only as a drift diagnostic in the log.
//
// Updates: electron-updater against the self-hosted generic feed
// (Route B pattern — feed at updates/the-open-world/ on the Avok
// site; see electron-builder.yml). No server code runs in the shell:
// the game server runs Node 22 on Render; this shell is Electron 33
// (Node 20) and only serves files + hosts the window.

import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

/** The custom scheme the bundled client is served on. */
const APP_SCHEME = 'tow';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const APP_URL = `${APP_ORIGIN}/game.html`;

/** Where players re-download the app (the updater's fallback surface). */
const ITCH_PAGE = 'https://avok-interactive.itch.io/the-open-world';

/**
 * Placeholder backend URL, used ONLY until the Render backend is
 * deployed and its real URL is known. `.invalid` is a reserved TLD
 * (RFC 2606) — it can never resolve, so a shell carrying this value
 * fails loudly (login screen: "Could not reach the server") instead
 * of silently pointing at someone else's server. The Mac runbook
 * forbids shipping a build stamped with this value.
 */
const PLACEHOLDER_API_BASE = 'https://REPLACE-WITH-BACKEND-URL.invalid';

// Dev override: an explicit URL (e.g. http://localhost:3101) restores
// "load the remote site" behavior and disables bundling entirely.
// (The PC dev server serves the client itself in static mode, so
// pointing here at a running pc-server.ts is a full local loop.)
const REMOTE_OVERRIDE = process.env.TOW_APP_URL?.trim() || '';
const BUNDLED = !REMOTE_OVERRIDE;

// TOW_SMOKE=1 runs the render gate used by scripts/build-release.sh:
// load the game, wait for the PC login screen, print SMOKE_OK and
// exit 0 (or exit 1 on any load failure/timeout) so a packaged app
// that can't render fails the release.
const SMOKE = process.env.TOW_SMOKE === '1';
// TOW_SMOKE_ALLOW_LANDING=1 also accepts the landing screen as a
// pass — needed when smoking against a local dev server, whose
// pcBoot skips auth entirely (no accounts there) and lands straight
// on the splash. The release gate never sets this: against the real
// backend (or an unreachable one) the login screen is the proof.
const SMOKE_ALLOW_LANDING = process.env.TOW_SMOKE_ALLOW_LANDING === '1';
// TOW_SMOKE_SCREENSHOT=/path/to.png saves a screenshot of the
// rendered game right after SMOKE_OK (proof artifact, VM runs).
const SMOKE_SCREENSHOT = process.env.TOW_SMOKE_SCREENSHOT?.trim() || '';

// Last-seen version + a tiny log live in userData so updates are never
// re-nagged and any check failure is diagnosable.
const UPDATE_STATE_FILE = 'update-state.json';
const UPDATE_LOG_FILE = 'desktop-updates.log';

let mainWindow: BrowserWindow | null = null;
let currentGameVersion: string | null = null;
/** Absolute path of the bundled client dist, when bundled mode is active. */
let bundledClientDir: string | null = null;
/** The backend URL this launch is using (staged config or env override). */
let apiBase: string = PLACEHOLDER_API_BASE;
let apiBaseIsPlaceholder = true;
let apiBaseSource = 'placeholder';

interface UpdateState {
  lastSeenVersion?: string;
  /** App version for which the "get it from itch" fallback already fired. */
  updaterFallbackFor?: string;
}

function userDataPath(file: string): string {
  return path.join(app.getPath('userData'), file);
}

function readUpdateState(): UpdateState {
  try {
    return JSON.parse(fs.readFileSync(userDataPath(UPDATE_STATE_FILE), 'utf-8')) as UpdateState;
  } catch {
    return {};
  }
}

function patchUpdateState(patch: Partial<UpdateState>): void {
  try {
    const next = { ...readUpdateState(), ...patch };
    fs.writeFileSync(userDataPath(UPDATE_STATE_FILE), JSON.stringify(next, null, 2));
  } catch (err) {
    logUpdate(`failed to persist update state: ${(err as Error).message}`);
  }
}

function writeUpdateState(state: { lastSeenVersion: string }): void {
  patchUpdateState(state);
}

function logUpdate(line: string): void {
  try {
    fs.appendFileSync(
      userDataPath(UPDATE_LOG_FILE),
      `${new Date().toISOString()}  ${line}\n`,
    );
  } catch {
    /* log is best-effort */
  }
}

// ── Bundled client dist + staged config ──────────────────────────────────────
// Packaged builds carry the PC client as an electron-builder
// extraResource (process.resourcesPath/client-dist). In a dev checkout
// it sits next to the compiled shell (desktop/client-dist, produced
// by scripts/stage-pc.mjs).

function resolveClientDistDir(): string | null {
  const candidates: string[] = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'client-dist'));
  candidates.push(path.join(__dirname, '..', 'client-dist'));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'game.html'))) return dir;
  }
  return null;
}

/**
 * The version of the game client actually bundled in this app, from
 * the version.json stage-pc.mjs stamps into client-dist/ at build
 * time. The version comes from src/shared/version.ts (GAME_VERSION)
 * — the same source the running client reports in its footer. Null
 * in remote-override mode (no bundle) or for a bundle staged without
 * version.json (which stage-pc.mjs refuses to produce).
 */
function readBundledGameVersion(): string | null {
  if (!bundledClientDir) return null;
  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.join(bundledClientDir, 'version.json'), 'utf-8'),
    ) as { version?: string };
    const v = String(parsed.version ?? '').trim();
    return v || null;
  } catch {
    return null;
  }
}

interface PcConfig {
  apiBase?: string;
  placeholder?: boolean;
  source?: string;
}

/**
 * Resolve the backend URL for this launch. Precedence:
 *   1. TOW_PC_API_BASE at runtime (local dev server testing — no rebuild).
 *   2. The staged pc-config.json (written at stage time).
 *   3. The placeholder (loudly logged; the runbook forbids shipping it).
 */
function resolveApiBase(): void {
  const envBase = process.env.TOW_PC_API_BASE?.trim() || '';
  if (envBase) {
    apiBase = envBase.replace(/\/+$/, '');
    apiBaseIsPlaceholder = apiBase === PLACEHOLDER_API_BASE;
    apiBaseSource = 'env TOW_PC_API_BASE';
    return;
  }
  if (bundledClientDir) {
    try {
      const cfg = JSON.parse(
        fs.readFileSync(path.join(bundledClientDir, 'pc-config.json'), 'utf-8'),
      ) as PcConfig;
      const staged = String(cfg.apiBase ?? '').trim();
      if (staged) {
        apiBase = staged.replace(/\/+$/, '');
        apiBaseIsPlaceholder = cfg.placeholder === true || apiBase === PLACEHOLDER_API_BASE;
        apiBaseSource = `staged pc-config.json (${cfg.source ?? 'stage'})`;
        return;
      }
    } catch {
      /* no usable staged config — fall through to the placeholder */
    }
  }
  apiBase = PLACEHOLDER_API_BASE;
  apiBaseIsPlaceholder = true;
  apiBaseSource = 'placeholder (no staged config found)';
}

// The preload bridge asks for the config synchronously before the
// game script runs, so window.__TOW_PC_CONFIG__ is set by the time
// game.js reads it. Registered at module scope so it exists before
// any window is created.
ipcMain.on('tow:get-config', (event) => {
  event.returnValue = { apiBase };
});

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
};

/** Map a URL pathname to a file inside the dist, refusing escapes. */
function resolveDistFile(distDir: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const rel = decoded.replace(/^\/+/, '');
  if (!rel) return null;
  const abs = path.normalize(path.join(distDir, rel));
  if (!abs.startsWith(distDir + path.sep)) return null; // traversal guard
  try {
    if (fs.statSync(abs).isFile()) return abs;
  } catch {
    /* miss — caller falls back */
  }
  return null;
}

function serveDistFile(filePath: string): Response {
  const ext = path.extname(filePath).toLowerCase();
  const headers: Record<string, string> = {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
  };
  // Entry points must never be served stale after an app update; hashed
  // assets are immutable by name and may cache freely.
  if (filePath.endsWith('game.html')) {
    headers['Cache-Control'] = 'no-cache';
  }
  return new Response(new Uint8Array(fs.readFileSync(filePath)), { status: 200, headers });
}

/**
 * tow:// handler: serve the staged client from disk. The game is a
 * single page — any extensionless path falls back to game.html;
 * a missing path that looks like a file is a genuine 404.
 */
async function handleTow(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.host !== APP_HOST || !bundledClientDir) {
    return new Response('Not found', { status: 404 });
  }
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  const file = resolveDistFile(bundledClientDir, url.pathname);
  if (file) return serveDistFile(file);

  const lastSegment = url.pathname.split('/').pop() ?? '';
  if (/\.[a-z0-9]+$/i.test(lastSegment)) {
    return new Response('Not found', { status: 404 });
  }
  return serveDistFile(path.join(bundledClientDir, 'game.html'));
}

// ── Window ──────────────────────────────────────────────────────────────────

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [];
  if (isMac) {
    template.push({
      label: 'The Open World',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  } else {
    template.push({
      label: 'File',
      submenu: [{ role: 'quit' }],
    });
  }
  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  });
  template.push({
    label: 'Window',
    submenu: [{ role: 'minimize' }, { role: 'close' }],
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: 'The Open World',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    // Smoke mode runs headless (offscreen renderer is enough) — except
    // when a screenshot is requested: a hidden window's compositor can
    // lag a frame behind the DOM, and the screenshot must show the
    // screen the gate just proved, not the one before it.
    show: !SMOKE || Boolean(SMOKE_SCREENSHOT),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = win;

  // Guard navigation: the game origin is home — in bundled mode that
  // is tow://app, in override mode it is the remote site. Everything
  // external opens in the system browser.
  const allowedOrigin = BUNDLED ? APP_ORIGIN : new URL(REMOTE_OVERRIDE).origin;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(allowedOrigin)) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(allowedOrigin)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // A failed main-frame load in bundled mode is a packaging bug —
  // log it loudly. (Aborted loads (-3) are navigation churn, not
  // failures.) The smoke gate installs its own did-fail-load
  // listener and still fails the release on trouble.
  win.webContents.on('did-fail-load', (_e, errorCode, desc, _url, isMainFrame) => {
    if (BUNDLED && isMainFrame && errorCode !== -3) {
      logUpdate(`main-frame load failed: ${errorCode} ${String(desc)}`);
      console.error(`[tow] main-frame load failed: ${errorCode} ${String(desc)}`);
    }
  });

  if (BUNDLED && bundledClientDir) {
    void win.loadURL(APP_URL);
  } else {
    // Dev checkout without a staged client bundle: fall back to the
    // remote override (or the live itch page's web build, if neither
    // is set) so `npm start` still does something useful. Packaged
    // builds always carry the bundle.
    const fallback = REMOTE_OVERRIDE || ITCH_PAGE;
    console.warn(`The Open World desktop: no bundled client found — loading ${fallback}.`);
    logUpdate(`bundled client missing — remote fallback engaged (${fallback})`);
    void win.loadURL(fallback);
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Tag the title with the BUNDLED game version once known (also
  // serves as a visible confirmation that the version stamp exists).
  if (currentGameVersion) {
    win.setTitle(`The Open World — v${currentGameVersion}`);
  }
}

// ── Bundled-version check (the DHQ 0.4.2 fix, applied from build one) ───────
// The title bar and the "now running" toast report the BUNDLED game
// version — the game code actually shipped inside this app — never
// the live server version. (DHQ 0.4.1 claimed the server version, so
// it announced v0.55.0 while its bundle was still 0.52.0.) The
// server version is still fetched, but only as a drift diagnostic:
// when the server is newer than the bundle, the player needs a new
// app build (native updater / itch) to get the new client — the app
// never pretends the new client is already running. In
// remote-override (dev) mode there is no bundle and the live site IS
// the running client, so the server version is the honest one there.
async function fetchServerVersion(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    // net.fetch (Chromium's stack) rather than Node's global fetch:
    // it honors the OS/env proxy configuration exactly like the
    // renderer will, so the probe measures the reachability the app
    // actually has.
    const res = await net.fetch(`${apiBase}/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`/health responded ${res.status}`);
    const body = (await res.json()) as { version?: string };
    const serverVersion = String(body.version ?? '').trim();
    if (!serverVersion) throw new Error('no version in /health payload');
    return serverVersion;
  } finally {
    clearTimeout(timer);
  }
}

async function checkForUpdates(): Promise<void> {
  try {
    const bundledVersion = readBundledGameVersion();
    if (apiBaseIsPlaceholder) {
      // No live backend yet — nothing to drift against. The title
      // still gets the bundled version; the server check is skipped.
      logUpdate('version check: backend URL is the placeholder — server check skipped');
      if (bundledVersion) {
        currentGameVersion = bundledVersion;
        mainWindow?.setTitle(`The Open World — v${bundledVersion}`);
        const state = readUpdateState();
        if (state.lastSeenVersion !== bundledVersion) {
          writeUpdateState({ lastSeenVersion: bundledVersion });
          logUpdate(
            `version check: last=${state.lastSeenVersion ?? 'none'} -> running=${bundledVersion} (server=placeholder)`,
          );
        }
      }
      return;
    }
    const serverVersion = await fetchServerVersion();

    // The running client is the bundle in bundled mode; in
    // remote-override (dev) mode there is no bundle and the live
    // site is the client.
    const runningVersion = bundledVersion ?? (BUNDLED ? null : serverVersion);
    if (runningVersion) {
      const state = readUpdateState();
      const wasFresh = state.lastSeenVersion === runningVersion;
      currentGameVersion = runningVersion;
      mainWindow?.setTitle(`The Open World — v${runningVersion}`);
      if (!wasFresh) {
        const wasKnown = Boolean(state.lastSeenVersion);
        writeUpdateState({ lastSeenVersion: runningVersion });
        logUpdate(
          `version check: last=${state.lastSeenVersion ?? 'none'} -> running=${runningVersion} (server=${serverVersion})`,
        );
        // Announce only when the BUNDLED client actually changed
        // (i.e. the player installed a new app build). A server-only
        // release never fires this — the bundle on disk is unchanged.
        if (wasKnown && Notification.isSupported()) {
          new Notification({
            title: 'The Open World updated',
            body: `You're now running v${runningVersion} — the latest build is live.`,
          }).show();
        }
      } else {
        logUpdate(`version check: running=${runningVersion} (server=${serverVersion})`);
      }
    } else {
      // Bundled mode with no version.json (a bundle staged without
      // one): claim no version — the title stays unversioned and
      // nothing is announced. The drift line below still records
      // the server version.
      logUpdate(
        `version check: bundled game version unknown (no version.json in bundle); server=${serverVersion}`,
      );
    }

    // Drift diagnostic: the server ships independently of the
    // desktop bundle. A newer server means a new client exists that
    // this app does not have yet — the native updater / itch is the
    // path to it.
    if (bundledVersion && serverVersion !== bundledVersion) {
      logUpdate(
        `version drift: server=${serverVersion} bundled=${bundledVersion} — app update needed for the new client`,
      );
    }
  } catch (err) {
    logUpdate(`version check failed: ${(err as Error).message}`);
    // Offline or server hiccup — the game still opens as-is.
  }
}

// Re-check hourly while running so a mid-session release is noticed.
setInterval(() => void checkForUpdates(), 60 * 60 * 1000);

// ── Native OTA updates (electron-updater, self-hosted generic feed) ─────────
// Configured by the publish block in electron-builder.yml, which
// embeds a generic provider into the packaged app's app-update.yml.
// Inert in dev (not packaged), in smoke mode, and until the feed
// files are actually deployed — a missing feed is logged, never
// surfaced. Checks run shortly after launch and every 4 hours;
// downloads happen in the background; a downloaded update offers
// restart-to-apply. If an ANNOUNCED update fails to download/apply
// (the classic case: an unsigned macOS build cannot replace itself),
// the player gets one notification per version pointing at the
// itch page.

let announcedUpdateVersion: string | null = null;

function initAutoUpdater(): void {
  if (!app.isPackaged || SMOKE) return;
  try {
    autoUpdater.logger = {
      info: (msg: unknown) => logUpdate(`updater: ${String(msg)}`),
      warn: (msg: unknown) => logUpdate(`updater warn: ${String(msg)}`),
      error: (msg: unknown) => logUpdate(`updater error: ${String(msg)}`),
      debug: (msg: unknown) => logUpdate(`updater debug: ${String(msg)}`),
    };
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      announcedUpdateVersion = info.version;
      logUpdate(`updater: update available v${info.version}`);
    });
    autoUpdater.on('update-not-available', () => {
      logUpdate('updater: no update available');
    });
    autoUpdater.on('update-downloaded', (info) => {
      logUpdate(`updater: update downloaded v${info.version}`);
      if (Notification.isSupported()) {
        new Notification({
          title: 'The Open World update ready',
          body: `Version ${info.version} has been downloaded and will install on restart.`,
        }).show();
      }
      void dialog
        .showMessageBox({
          type: 'info',
          title: 'Update ready',
          message: `The Open World v${info.version} has been downloaded.`,
          detail: 'Restart the app now to apply the update, or keep playing — it will install the next time you quit.',
          buttons: ['Restart now', 'Later'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((result) => {
          if (result.response === 0) autoUpdater.quitAndInstall();
        })
        .catch(() => {
          /* the notification above already told the player */
        });
    });
    autoUpdater.on('error', (err) => {
      logUpdate(`updater: error: ${err.message}`);
      // Only nag when an update was actually announced and then failed —
      // a missing/unreachable feed before the first release is routine.
      if (!announcedUpdateVersion) return;
      if (readUpdateState().updaterFallbackFor === announcedUpdateVersion) return;
      patchUpdateState({ updaterFallbackFor: announcedUpdateVersion });
      if (Notification.isSupported()) {
        const note = new Notification({
          title: 'The Open World update needs a manual download',
          body: `Version ${announcedUpdateVersion} couldn't be installed automatically. Click to get it from itch.io.`,
        });
        note.on('click', () => void shell.openExternal(ITCH_PAGE));
        note.show();
      }
    });

    const runCheck = (): void => {
      autoUpdater.checkForUpdates().catch((err: Error) => {
        logUpdate(`updater: check failed: ${err.message}`);
      });
    };
    setTimeout(runCheck, 20_000);
    setInterval(runCheck, 4 * 60 * 60 * 1000);
  } catch (err) {
    logUpdate(`updater: init failed: ${(err as Error).message}`);
  }
}

// ── App lifecycle ───────────────────────────────────────────────────────────

// The custom scheme must be registered as privileged BEFORE the app
// is ready: standard (stable origin, DOM storage), secure, and able
// to fetch across origins (the game calls the backend over HTTPS).
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.whenReady().then(async () => {
  // Hardened defaults: no mixed content, no permission prompts the game
  // doesn't need, and the session cookie/profile persists across launches.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications');
  });

  if (BUNDLED) {
    bundledClientDir = resolveClientDistDir();
    if (bundledClientDir) {
      protocol.handle(APP_SCHEME, handleTow);
    } else {
      // Dev checkout without a staged client bundle: fall back to the
      // remote load in createWindow (run stage-pc.mjs for the real
      // bundled experience). Packaged builds always carry the bundle.
      console.warn('The Open World desktop: no bundled client found — falling back to remote load.');
      logUpdate('bundled client missing — remote fallback engaged');
    }
  }

  // Resolve the backend URL now (staged config or env override) so
  // the preload bridge can answer synchronously, and stamp the
  // bundled version for the title bar before the window opens.
  resolveApiBase();
  if (apiBaseIsPlaceholder) {
    console.warn(`[tow] backend URL is the PLACEHOLDER (${apiBase}) — source: ${apiBaseSource}. Do not ship this build.`);
    logUpdate(`backend URL is the placeholder (${apiBaseSource}) — do not ship`);
  } else {
    logUpdate(`backend URL: ${apiBase} (${apiBaseSource})`);
  }
  const bundledVersion = readBundledGameVersion();
  if (bundledVersion) {
    currentGameVersion = bundledVersion;
    logUpdate(`bundled game version: ${bundledVersion}`);
  } else if (BUNDLED) {
    console.warn('[tow] no version.json in the bundled client — title will be unversioned.');
    logUpdate('bundled game version unknown (no version.json)');
  }

  buildMenu();
  createWindow();
  void checkForUpdates();
  initAutoUpdater();
  if (SMOKE) runSmoke();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ── Smoke test (TOW_SMOKE=1) ─────────────────────────────────────────────────
// Release gate: the packaged app must actually render the BUNDLED
// game, not merely launch. Guards (the DHQ lessons, applied):
//   1. Main-process bundled guard: if TOW_APP_URL is set (remote
//      override) or no bundled client was found, the gate fails
//      immediately instead of proving a remote page renders.
//   2. Version-stamp guard: a bundle without version.json fails —
//      the release must carry the stamp the title bar reads.
//   3. Game-DOM check: the gate requires the real game document —
//      the tow:// origin, a mounted #game-root with children, the
//      PC login form (#pc-auth-form), and the config injection
//      (window.__TOW_PC_CONFIG__.apiBase non-empty). The login
//      screen renders even when the backend is unreachable (pcBoot
//      shows "Could not reach the server" + Play offline), so the
//      gate works before the backend exists. Against a local dev
//      server pcBoot skips auth — TOW_SMOKE_ALLOW_LANDING=1 accepts
//      the landing screen there instead.
// Any load failure, renderer crash, or stall exits 1 — the release fails.
function runSmoke(): void {
  const win = mainWindow;
  if (!win) {
    console.error('SMOKE_FAIL no-window');
    app.exit(1);
    return;
  }
  const fail = (why: string): void => {
    console.error(`SMOKE_FAIL ${why}`);
    app.exit(1);
  };
  if (!BUNDLED || !bundledClientDir) {
    fail('not-bundled');
    return;
  }
  if (!readBundledGameVersion()) {
    fail('no-version-stamp');
    return;
  }
  const hardTimeout = setTimeout(() => fail('timeout'), 60_000);
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    fail(`did-fail-load ${code} ${String(desc)}`);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    fail(`renderer-gone ${details.reason}`);
  });
  win.webContents.once('did-finish-load', () => {
    const deadline = Date.now() + 45_000;
    const poll = (): void => {
      if (Date.now() > deadline) {
        fail('render-timeout');
        return;
      }
      win.webContents
        .executeJavaScript(
          '(() => { const root = document.getElementById("game-root"); const cfg = window.__TOW_PC_CONFIG__; return { url: window.location.href, isTow: window.location.protocol === "tow:", hasRoot: !!root, rootChildren: root ? root.childElementCount : 0, hasAuthForm: !!document.getElementById("pc-auth-form"), hasLanding: !!document.querySelector(".landing-screen"), apiBase: (cfg && typeof cfg.apiBase === "string") ? cfg.apiBase : "", text: (document.body && document.body.innerText || "").trim().length }; })()',
        )
        .then(
          (r: {
            url: string;
            isTow: boolean;
            hasRoot: boolean;
            rootChildren: number;
            hasAuthForm: boolean;
            hasLanding: boolean;
            apiBase: string;
            text: number;
          }) => {
            const screenOk = r.hasAuthForm || (SMOKE_ALLOW_LANDING && r.hasLanding);
            if (
              r.isTow &&
              r.hasRoot &&
              r.rootChildren > 0 &&
              r.apiBase.length > 0 &&
              r.text > 100 &&
              screenOk
            ) {
              clearTimeout(hardTimeout);
              const screen = r.hasAuthForm ? 'login' : 'landing';
              console.log(
                `SMOKE_OK screen=${screen} url="${r.url}" apiBase="${r.apiBase}" rootChildren=${r.rootChildren} textLen=${r.text}`,
              );
              if (SMOKE_SCREENSHOT) {
                // Let the compositor paint the proved frame before
                // capturing — capturePage can otherwise return the
                // previous frame (e.g. the "Checking your login…"
                // state the login form just replaced).
                setTimeout(() => {
                  win.webContents
                    .capturePage()
                    .then((image) => {
                      fs.writeFileSync(SMOKE_SCREENSHOT, image.toPNG());
                      console.log(`SMOKE_SCREENSHOT ${SMOKE_SCREENSHOT}`);
                      app.exit(0);
                    })
                    .catch((err: Error) => {
                      console.error(`SMOKE_FAIL screenshot ${err.message}`);
                      app.exit(1);
                    });
                }, 1500);
              } else {
                app.exit(0);
              }
            } else {
              setTimeout(poll, 500);
            }
          },
        )
        .catch(() => setTimeout(poll, 500));
    };
    setTimeout(poll, 500);
  });
}

// Standard macOS lifecycle: keep the app alive when all windows close.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.setAboutPanelOptions({
  applicationName: 'The Open World',
  applicationVersion: currentGameVersion ?? app.getVersion(),
  version: app.getVersion(),
  credits: 'A life simulation — the full game, bundled; PC multiplayer served live.',
});
