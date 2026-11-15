// THE OPEN WORLD — @devvit/web/client stub for the PC build (TOW PC phase 1).
//
// The PC client bundle aliases '@devvit/web/client' to this file
// (see tools/build.ts, --pc). On PC the game window IS the app, so
// there is nothing to expand: the expanded-mode calls are no-ops,
// the mode is always 'inline', and no listener ever fires. The game
// already treats every expanded-mode call as fallible (try/catch at
// every call site), so the stubs are behavior-preserving, not just
// compile-preserving.
//
// Only the four names game.ts imports are stubbed. If a future client
// import needs more, the PC build fails loudly at bundle time.

export type DevvitWebViewMode = 'inline' | 'expanded';

export function requestExpandedMode(_e: MouseEvent, _entry: string): void {
  // No-op on PC: the window is already the whole app.
}

export function exitExpandedMode(_e: MouseEvent): void {
  // No-op on PC: there is no expanded mode to leave.
}

export function getWebViewMode(): DevvitWebViewMode {
  return 'inline';
}

export function addWebViewModeListener(_cb: (mode: DevvitWebViewMode) => void): void {
  // No-op on PC: the mode never changes.
}
