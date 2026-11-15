# The Open World — desktop shell (TOW PC phase 3)

Electron shell for the PC edition. Modeled directly on Dispatch HQ
desktop (`dispatch-hq-repo/apps/desktop/`). The shell is its own npm
package (shell version 0.1.0); the game version it bundles comes
from `src/shared/version.ts` and is stamped at stage time.

## What it is

- **Bundled client, served on `tow://`.** The `--pc` client build is
  staged into `client-dist/` and served from disk on a custom
  standard/secure scheme. TOW PC authenticates with bearer tokens
  (no cookies), so no https interception is needed — the DHQ
  cookie-preserving shape does not apply here.
- **Backend URL from config, never hardcoded.** `stage-pc.mjs`
  writes `client-dist/pc-config.json` from `TOW_PC_API_BASE` (or
  `backend-url.txt`); the shell exposes it to the game as
  `window.__TOW_PC_CONFIG__.apiBase` via the preload bridge. Until
  the Render backend exists, the value is the clearly-marked
  placeholder `https://REPLACE-WITH-BACKEND-URL.invalid` — a build
  stamped with it MUST NOT ship (see the Mac runbook).
- **Bundled version display.** The title bar + About panel show the
  game version from the staged `version.json` — never the live
  server version (the DHQ 0.4.1/0.4.2 bug, fixed here from build
  one). The server `/health` version is only a drift diagnostic.
- **OTA from build one.** electron-updater, generic provider,
  self-hosted feed at
  `https://avokinteractive.wasmer.app/updates/the-open-world`
  (Route B pattern — the feed files deploy alongside the first itch
  upload; the generic provider never uploads by itself).
- **No server code in the shell.** The game server runs Node 22 on
  Render; the shell is Electron 33 and only serves files + hosts
  the window.

## Build

```bash
npm install                 # shell deps (electron, electron-builder, ...)
npm run build:client        # build --pc + stage into client-dist/
npm run build               # tsc -> dist/
npm start                   # run unpacked (needs a staged client)
bash scripts/build-release.sh all   # all three platforms + smoke gate
```

`TOW_PC_API_BASE=http://127.0.0.1:3101 npm start` points the shell
at a local dev server (`node dist/pc/server/pc-server.cjs` from the
tree root, `TOW_PC_STATIC_DIR` unset — the shell serves the client
itself). The dev server has no accounts, so the client skips auth
and lands on the splash.

## Smoke gate

`TOW_SMOKE=1` runs the render gate: the app must load the BUNDLED
client and show the PC login screen (`#pc-auth-form`) — it renders
even when the backend is unreachable. `TOW_SMOKE_ALLOW_LANDING=1`
also accepts the landing screen (local dev server runs).
`TOW_SMOKE_SCREENSHOT=/path/to.png` saves a screenshot on pass.

## Release

```bash
bash scripts/build-release.sh all     # mac universal + win + linux, gated
bash scripts/publish-itch.sh --preview  # butler diff, no upload
bash scripts/publish-itch.sh --push     # real upload (mac/win/linux)
```

Artifacts live in `desktop/release/` (NOT the tree-root `dist/`,
which is the game build's output). The itch `--userversion` is the
GAME version (0.108.29), read from the game, never hardcoded.

## Icons

`build/icon-source.png` is the OW explorer badge (1600x1600, the
same art KOVA shipped). `python3 scripts/build-icons.py`
regenerates `icon.png` (1024), `icon.ico`, and `icon.icns` from it.

## Files

| File | What it is |
|---|---|
| `src/main.ts` | Main process: tow:// serving, config, version, updater, smoke |
| `src/preload.ts` | Preload bridge: `__TOW_PC_CONFIG__` + `towDesktop` |
| `scripts/stage-pc.mjs` | Build --pc + stage + stamp version + write backend config |
| `scripts/build-release.sh` | All-platform release build + smoke gate + checksums |
| `scripts/publish-itch.sh` | Butler upload (mac/win/linux), game-version userversion |
| `scripts/build-icons.py` | Icon set generator from the OW badge |
| `electron-builder.yml` | Mac universal DMG+zip, Win NSIS, Linux AppImage, generic feed |
| `build/entitlements.mac.plist` | Hardened-runtime entitlements (copied from DHQ desktop) |
