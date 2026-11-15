#!/usr/bin/env bash
# ============================================================
# publish-itch.sh — push The Open World desktop builds to itch.io
# ============================================================
# Uploads the three platform artifacts from desktop/release/
# (produced by scripts/build-release.sh) to your itch.io project
# via butler, one channel per platform:
#
#   TheOpenWorld-*-universal.dmg  -> <user>/the-open-world:mac
#   TheOpenWorld-*-x64-setup.exe  -> <user>/the-open-world:windows
#   TheOpenWorld-*-x86_64.AppImage -> <user>/the-open-world:linux
#
# --userversion is the GAME version (from src/shared/version.ts),
# not the desktop shell version, so the itch build list reads like
# the game releases (0.108.29, …).
#
# Usage:
#   scripts/publish-itch.sh [user/game] [--preview|--push] [--dry-run]
#
#   [user/game]     your itch project (default:
#                   avok-interactive/the-open-world — matches
#                   https://<user>.itch.io/<game>, all lowercase)
#   --preview       butler push-preview per channel (auth + diff, no upload)
#   --push          real upload (butler push)
#   --dry-run       with --push: list files butler would send, no upload
#   (no mode flag)  prints the exact commands, does nothing
#
# Default is safe: with no --preview/--push it only prints what it would run.
# Requires: butler installed (https://itch.io/butler) + `butler login` once.
# The itch page stays a DRAFT until the first real Mac build is pushed.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TREE_ROOT="$(cd "$APP_DIR/.." && pwd)"
cd "$APP_DIR"

TARGET="avok-interactive/the-open-world"
MODE="print"          # print | preview | push
EXTRA_DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --preview) MODE="preview" ;;
    --push)    MODE="push" ;;
    --dry-run) EXTRA_DRY_RUN=1 ;;
    --*) echo "ERROR: unknown flag $arg" >&2; exit 1 ;;
    */*) TARGET="$arg" ;;
    *) echo "ERROR: target must be user/game (e.g. avok-interactive/the-open-world)" >&2; exit 1 ;;
  esac
done

# --- butler present? (print mode never needs it) ---
if [[ "$MODE" != "print" ]] && ! command -v butler >/dev/null 2>&1; then
  echo "ERROR: butler is not installed. Install it first:" >&2
  echo "  macOS:  brew install butler, or download from https://itchio.itch.io/butler" >&2
  echo "          (unzip to ~/bin, chmod +x, add to PATH)" >&2
  echo "  Or use the itch app (v26.12+) which bundles butler and has a Builds UI:" >&2
  echo "          https://itch.io/app" >&2
  echo "Then authenticate once: butler login" >&2
  exit 1
fi

# --- game version (the --userversion) from the game's own version source ---
GAME_VER="$(node -e "const fs=require('fs');const m=fs.readFileSync('$TREE_ROOT/src/shared/version.ts','utf-8').match(/GAME_VERSION\s*=\s*'([^']+)'/);if(!m)process.exit(1);console.log(m[1])" 2>/dev/null || true)"
if [[ -z "$GAME_VER" ]]; then
  echo "ERROR: could not read GAME_VERSION from src/shared/version.ts" >&2
  exit 1
fi
echo "=== The Open World → itch.io ($TARGET) — game v$GAME_VER ==="

# --- locate artifacts ---
DMG="$(ls release/TheOpenWorld-*-universal.dmg 2>/dev/null | head -1 || true)"
EXE="$(ls release/TheOpenWorld-*-x64-setup.exe 2>/dev/null | head -1 || true)"
APPIMAGE="$(ls release/TheOpenWorld-*-x86_64.AppImage 2>/dev/null | head -1 || true)"

declare -a SLOTS
SLOTS=()
if [[ -n "$DMG" ]]; then      SLOTS+=("$DMG|mac"); fi
if [[ -n "$EXE" ]]; then      SLOTS+=("$EXE|windows"); fi
if [[ -n "$APPIMAGE" ]]; then SLOTS+=("$APPIMAGE|linux"); fi

if [[ ${#SLOTS[@]} -eq 0 ]]; then
  echo "ERROR: no desktop artifacts found in release/. Build them first:" >&2
  echo "  bash scripts/build-release.sh all" >&2
  exit 1
fi

# --- authentication guard: butler's default identity file exists? ---
# `butler status` is NOT an auth probe (it requires a <target>), so check the
# credentials file at butler's default --identity path instead.
if [[ "$(uname -s)" == "Darwin" ]]; then
  BUTLER_CREDS="$HOME/Library/Application Support/itch/butler_creds"
else
  BUTLER_CREDS="$HOME/.config/itch/butler_creds"
fi
if [[ "$MODE" != "print" && ! -f "$BUTLER_CREDS" ]]; then
  echo "ERROR: no butler credentials found at $BUTLER_CREDS" >&2
  echo "       Run: butler login" >&2
  exit 1
fi

echo ""
echo "Channels:"
for slot in "${SLOTS[@]}"; do
  file="${slot%%|*}"; chan="${slot##*|}"
  echo "  $chan <- $file"
done

case "$MODE" in
  print)
    echo ""
    echo "Dry-run of the commands that would run (no upload):"
    for slot in "${SLOTS[@]}"; do
      file="${slot%%|*}"; chan="${slot##*|}"
      printf '  butler push "%s" %s:%s --userversion %s\n' "$file" "$TARGET" "$chan" "$GAME_VER"
    done
    echo ""
    echo "Re-run with --preview to diff against the live build, or --push to upload."
    ;;
  preview)
    echo ""
    for slot in "${SLOTS[@]}"; do
      file="${slot%%|*}"; chan="${slot##*|}"
      echo "--- push-preview $chan ---"
      butler push-preview "$file" "$TARGET:$chan"
      echo ""
    done
    ;;
  push)
    DRY_FLAG=""
    if [[ "$EXTRA_DRY_RUN" -eq 1 ]]; then
      DRY_FLAG="--dry-run"
      echo "--- --dry-run: listing files butler would send (no upload) ---"
    fi
    for slot in "${SLOTS[@]}"; do
      file="${slot%%|*}"; chan="${slot##*|}"
      echo "--- push $chan ---"
      butler push "$file" "$TARGET:$chan" --userversion "$GAME_VER" $DRY_FLAG
      echo ""
    done
    echo "✓ Pushed to https://${TARGET%%/*}.itch.io/${TARGET#*/}"
    echo "  Set the page Kind to 'Downloadable' and each channel's platform tags"
    echo "  (butler names them mac/windows/linux, so tags come pre-set)."
    echo "  The page is FREE — confirm no price is set before publishing the draft."
    ;;
esac
