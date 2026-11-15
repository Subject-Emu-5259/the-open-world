// THE OPEN WORLD — save response texts (v0.108.22, audit F10/F13/F19).
// Pure builders, no Devvit imports, so the harness proves the exact
// player-facing wording: a genuine stale rejection shows ONLY the
// warning (never the unapplied command's result text); a save
// failure LEADS with the failure (never trails it); a no-command,
// no-player, no-create POST returns an explicit no-player shape,
// never a blank fresh player that a caller could autosave over a
// real save.

/** Genuine stale rejection text (F10). No result text appended —
 *  the result describes an outcome that was NOT saved. */
export function staleRejectionText(crossInstall: boolean, installName?: string | null): string {
  if (crossInstall) {
    const where = installName ? ` in ${installName}` : '';
    return `⚠️ Another session${where} has a newer copy of your game. Re-synced to the newer save; the last command was not applied. Try it again.`;
  }
  return '⚠️ Stale save rejected — the server holds a newer copy of your game. Re-synced to the newer save; the last command was not applied. Try it again.';
}

/** Command-path save-failure text (F13). The failure LEADS; the
 *  command's result follows it, so "You earned $X" can never read
 *  as fact before the player learns it was not saved. */
export function saveFailureText(resultMessage: string): string {
  return `⚠️ Server storage failed — your progress was NOT saved to the server. It is stored on this device only and may not survive a refresh.\n\n${resultMessage}`;
}

/** No-player shape for a no-command /api/init POST with no player
 *  and no create action (F19). Any caller that would have adopted
 *  the old blank player must see player: null instead. */
export function noPlayerResponse(): { type: string; player: null; dashboard: string; text: string } {
  return { type: 'no-player', player: null, dashboard: '', text: '' };
}
