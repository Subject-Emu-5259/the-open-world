#!/usr/bin/env bash
# ============================================================
# build-release.sh — build ALL The Open World desktop artifacts.
#
# Platforms (usage: bash scripts/build-release.sh [all|mac|win|linux]):
#   macOS   universal (arm64 + x64) DMG + zip   -> release/
#   Windows NSIS x64 setup.exe                  -> release/
#   Linux   AppImage x64                        -> release/
#
# Signing / notarization (macOS, auto-detected):
#   - Signs with a Developer ID when an identity exists (CSC_NAME, or
#     CSC_LINK + CSC_KEY_PASSWORD, or a cert in the login keychain).
#   - Notarizes + staples when APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and
#     APPLE_TEAM_ID are ALL set AND the app is genuinely signed.
#   - Otherwise builds an unsigned (ad-hoc) universal DMG — the pipeline
#     never hard-fails on a machine with no Apple credentials.
#
# Backend URL: stage-pc.mjs (step 0) reads TOW_PC_API_BASE from the
# environment or desktop/backend-url.txt. If neither is set, the
# build is stamped with the PLACEHOLDER backend URL and MUST NOT
# ship — the Render backend must be deployed and its URL known
# BEFORE a shippable build is made. See the Mac runbook.
#
# Release gate:
#   Runs the packaged app with TOW_SMOKE=1 and FAILS the release
#   if the PC login screen does not render (the "app must render"
#   gate). On macOS the packaged universal app is gated; on a Linux
#   host the unpacked Linux binary is gated instead.
#
# Output (all in desktop/release/ — NOT the tree-root dist/, which
# is the game build's output):
#   release/ + release/SHA256SUMS.txt + release/README.txt
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TREE_ROOT="$(cd "$APP_DIR/.." && pwd)"
cd "$APP_DIR"

TARGET="${1:-all}"
VERSION="$(node -p "require('./package.json').version")"
GAME_VERSION="$(node -e "const fs=require('fs');const m=fs.readFileSync('$TREE_ROOT/src/shared/version.ts','utf-8').match(/GAME_VERSION\s*=\s*'([^']+)'/);if(!m){console.error('cannot read GAME_VERSION');process.exit(1)}console.log(m[1])")"

echo "=== The Open World desktop release build — shell v$VERSION, game v$GAME_VERSION ($TARGET) ==="

# --- 0. compile the shell + stage the bundled game ---
echo "--- tsc ---"
npm run build
echo "--- stage bundled game (tools/build.ts --pc + stage-pc.mjs) ---"
node scripts/stage-pc.mjs

# --- 1. signing / notarization detection (macOS only) ---
IDENTITY_ARGS=""
NOTARIZE_ARGS=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  ID_COUNT="$(security find-identity -v -p codesigning 2>/dev/null | sed -n 's/^ *\([0-9][0-9]*\) valid identities found.*/\1/p')"
  if [[ -z "$ID_COUNT" || "$ID_COUNT" -eq 0 ]]; then
    IDENTITY_ARGS="-c.mac.identity=null"
    echo "⚠️  No Developer ID identity found — building unsigned (ad-hoc) macOS app."
  else
    echo "✓ Developer ID identity found ($ID_COUNT) — the macOS app will be signed."
  fi
  if [[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" && -z "$IDENTITY_ARGS" ]]; then
    NOTARIZE_ARGS="-c.notarize=true"
    echo "✓ APPLE_* credentials present — will notarize + staple."
  else
    echo "⚠️  Missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID (or unsigned) — skipping notarization."
  fi
fi

# --- 2. clean previous release output ---
rm -rf release
mkdir -p release

# --- 3. build macOS universal DMG + zip ---
MAC_OK=0
if [[ "$TARGET" == "all" || "$TARGET" == "mac" ]]; then
  echo "--- electron-builder: macOS universal (dmg + zip) ---"
  # shellcheck disable=SC2086  # empty IDENTITY_ARGS/NOTARIZE_ARGS expand to nothing
  npx electron-builder --mac --universal $IDENTITY_ARGS $NOTARIZE_ARGS
  MAC_OK=1
  # electron-builder >=25 lands DMG/zip at release/ root; older versions put
  # them under release/mac-universal/. Accept both so the pipeline is
  # version-agnostic.
  DMG=""
  for cand in release/*.dmg release/mac-universal/*.dmg; do
    [ -e "$cand" ] && { DMG="$cand"; break; }
  done
  echo "--- verify universal binary (expect: x86_64 arm64) ---"
  lipo -info "release/mac-universal/The Open World.app/Contents/MacOS/The Open World"
  echo "--- verify DMG ---"
  hdiutil verify "$DMG"
fi

# --- 4. build Windows NSIS (x64) — tolerated failure on non-Windows hosts ---
WIN_OK=0
if [[ "$TARGET" == "all" || "$TARGET" == "win" ]]; then
  echo "--- electron-builder: Windows NSIS (x64) ---"
  # No CLI target/arch args: the yml win.target arch (x64) must drive the
  # build, otherwise `--win nsis` on an arm64 host silently builds arm64.
  if npx electron-builder --win; then
    WIN_OK=1
  else
    echo "⚠️  Windows NSIS build failed on this host. It may need wine (macOS) or a"
    echo "    Windows runner. Run it there with: npm run package:win"
  fi
fi

# --- 5. build Linux AppImage (x64) ---
LINUX_OK=0
if [[ "$TARGET" == "all" || "$TARGET" == "linux" ]]; then
  echo "--- electron-builder: Linux AppImage (x64) ---"
  # Same reasoning as Windows: let the yml linux.target arch (x64) drive it.
  if npx electron-builder --linux; then
    LINUX_OK=1
  else
    echo "⚠️  Linux AppImage build failed on this host."
  fi
fi

# --- 6. RELEASE GATE — the packaged app must render the PC login screen ---
if [[ "${SKIP_SMOKE:-0}" == "1" ]]; then
  echo "⚠️  SKIP_SMOKE=1 — skipping the packaged-app render gate."
else
  SMOKE_BIN=""
  if [[ "$MAC_OK" -eq 1 ]]; then
    SMOKE_BIN="release/mac-universal/The Open World.app/Contents/MacOS/The Open World"
  elif [[ "$LINUX_OK" -eq 1 ]]; then
    SMOKE_BIN="release/linux-unpacked/the-open-world"
  fi
  if [[ -n "$SMOKE_BIN" ]]; then
    echo "--- smoke gate: packaged app must render the PC login screen ---"
    set +e
    # No TOW_APP_URL: the gate must exercise the BUNDLED build (the thing
    # that ships), not the remote-load override. No TOW_PC_API_BASE
    # either: the gate runs against the STAGED backend URL, so a
    # placeholder-stamped build still proves the login screen renders
    # (pcBoot shows it even when the backend is unreachable).
    # TOW_SMOKE_ARGS passes extra flags to the app binary (VM runs use
    # --no-sandbox: Electron refuses to run as root without it).
    # shellcheck disable=SC2086  # TOW_SMOKE_ARGS intentionally word-splits
    SMOKE_OUT="$(TOW_SMOKE=1 "$SMOKE_BIN" $TOW_SMOKE_ARGS 2>&1)"
    SMOKE_RC=$?
    set -e
    if [[ $SMOKE_RC -ne 0 ]] || ! grep -q 'SMOKE_OK' <<<"$SMOKE_OUT"; then
      echo "❌ SMOKE GATE FAILED — the packaged app could not render the login screen (exit $SMOKE_RC)."
      tail -20 <<<"$SMOKE_OUT"
      exit 1
    fi
    grep 'SMOKE_OK' <<<"$SMOKE_OUT"
  else
    echo "⚠️  No packaged app to smoke-gate (no platform build succeeded) — nothing to gate."
  fi
fi

# --- 7. regenerate SHA256SUMS.txt + README.txt (in release/) ---
cd "$APP_DIR/release"
echo "--- regenerate SHA256SUMS.txt + README.txt ---"
{
  find . -maxdepth 1 -type f -not -name '.DS_Store' -not -name 'SHA256SUMS.txt' -not -name 'README.txt' 2>/dev/null | sort
} | while read -r f; do
  [ -n "$f" ] && shasum -a 256 "$f"
done > SHA256SUMS.txt

cat > README.txt <<EOF
============================================================
 The Open World — Release Artifacts (desktop shell v$VERSION)
============================================================
This folder holds every distributable build of The Open World
desktop app. The app BUNDLES the full PC game client (game
v$GAME_VERSION) — the client is installed on your machine like
any other PC game, and app updates arrive over the air
(electron-updater, self-hosted feed at
avokinteractive.wasmer.app/updates/the-open-world) with a
restart-to-apply prompt. The game is a shared PC multiplayer
world, so an internet connection is required to play online:
accounts, saves, leaderboards, challenges, and trading run on
the hosted backend. (Offline play with local saves only is
available from the login screen.) The app version (shell) and
the game version are tracked independently; the game version is
shown in the app's window title.

WHAT'S HERE
------------------------------------------------------------
TheOpenWorld-<shell>-universal.dmg
  Installable macOS app. Universal binary — runs on
  Apple Silicon AND Intel Macs.
  Install: open the DMG, drag "The Open World" into Applications.
  First launch on a fresh Mac: right-click -> Open if Gatekeeper
  complains about an unsigned build.

TheOpenWorld-<shell>-x64-setup.exe
  Windows installer (NSIS).
  Install: double-click, follow the wizard (optional: change the
  install directory). An unsigned build shows a SmartScreen
  warning — click "More info" -> "Run anyway".

TheOpenWorld-<shell>-x86_64.AppImage
  Portable Linux app (no install).
  Run: chmod +x the file, then
  ./TheOpenWorld-<shell>-x86_64.AppImage
  (most distros also open it by double-clicking).

latest.yml / latest-mac.yml / latest-linux.yml
  The electron-updater feed manifests (one per platform). These
  + the updater artifacts (mac .zip, win .exe, linux .AppImage)
  are the OTA feed — deployed to the Avok site, never to itch.

REQUIREMENTS
------------------------------------------------------------
- Internet connection for online play (accounts and the shared
  PC world live on the hosted backend).
- macOS: any Intel or Apple Silicon Mac on macOS 11+.
- Windows: Windows 10/11 (x64).
- Linux: glibc-based distro (Ubuntu, Fedora, Debian…).

HOW TO VERIFY DOWNLOADS (SHA-256)
------------------------------------------------------------
Each release ships a SHA256SUMS.txt listing every artifact's
checksum. Verify a file before installing:

  macOS / Linux:
      cd <this folder>
      shasum -a 256 -c SHA256SUMS.txt          # checks ALL files
      shasum -a 256 TheOpenWorld-<shell>-universal.dmg   # or one file
      # compare the hash to the matching line in SHA256SUMS.txt

  Windows (PowerShell):
      cd <this folder>
      Get-FileHash .\TheOpenWorld-<shell>-x64-setup.exe -Algorithm SHA256
      # compare to the matching line in SHA256SUMS.txt

If a hash does not match, the download is corrupt or tampered
with — delete it and re-download.
============================================================
EOF
echo "✓ Published:"
find . -maxdepth 1 -type f 2>/dev/null | sort | sed 's/^/    /'
echo "✓ SHA256SUMS.txt + README.txt regenerated."

if [[ "$TARGET" == "all" && "$WIN_OK" -eq 0 ]]; then
  echo ""
  echo "⚠️  WINDOWS BUILD WAS SKIPPED/FAILED on this host — build it on a Windows"
  echo "    runner: npm run package:win"
fi
if [[ "$TARGET" == "all" && "$LINUX_OK" -eq 0 ]]; then
  echo ""
  echo "⚠️  LINUX BUILD WAS SKIPPED/FAILED on this host — build it on a Linux"
  echo "    runner: npm run package:linux"
fi
echo ""
echo "=== desktop release build complete (shell v$VERSION, game v$GAME_VERSION) ==="
