// THE OPEN WORLD — @devvit/analytics stub for the PC build (TOW PC phase 1).
//
// The PC client bundle aliases '@devvit/analytics/client/reddit' to
// this file (see tools/build.ts, --pc). There is no Journeys telemetry
// outside Reddit, so every call is a no-op and there is never an
// active journey. The game already treats every telemetry call as
// best-effort (try/catch at every call site; journeyMilestone returns
// early when getActiveJourneyId() is null), so the stubs are
// behavior-preserving, not just compile-preserving.
//
// Only the `telemetry` object game.ts imports is stubbed, with only
// the methods game.ts calls. If a future client import needs more,
// the PC build fails loudly at bundle time.

export interface TelemetryProgressOpts {
  progress: number;
  action: string;
}

export interface TelemetryEndOpts {
  complete: boolean;
}

export const telemetry: {
  startJourney: () => Promise<void>;
  appReady: () => Promise<void>;
  getActiveJourneyId: () => string | null;
  progress: (opts: TelemetryProgressOpts) => Promise<void>;
  endJourney: (opts: TelemetryEndOpts) => Promise<void>;
} = {
  startJourney: async (): Promise<void> => { /* No telemetry on PC. */ },
  appReady: async (): Promise<void> => { /* No telemetry on PC. */ },
  getActiveJourneyId: (): string | null => null,
  progress: async (_opts: TelemetryProgressOpts): Promise<void> => { /* No telemetry on PC. */ },
  endJourney: async (_opts: TelemetryEndOpts): Promise<void> => { /* No telemetry on PC. */ },
};
