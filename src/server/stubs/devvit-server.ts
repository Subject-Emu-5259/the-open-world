// THE OPEN WORLD — Devvit server stub for the PC build (TOW PC phase 1).
//
// The PC server bundle aliases '@devvit/web/server' to this file
// (see tools/build.ts, --pc), so the PC server ships NO Devvit code.
// The only production code that imports '@devvit/web/server' is the
// LLM settings read (llm-provider.ts, static; dialogue-engine.ts,
// dynamic) — and both treat an unavailable settings read as "no
// Devvit settings", falling back to environment variables. This stub
// makes that explicit: every settings read resolves undefined, so
// keys come from env vars only. With no keys set, NPC dialogue falls
// back to local templates — the templates-only PC launch.
//
// The stub intentionally exports ONLY `settings`: nothing else from
// '@devvit/web/server' is reachable from the PC bundle (the Devvit
// bootstrap in index.ts is not a PC entrypoint). If a future PC
// import needs more, this file fails loudly at bundle time.

export const settings: { get: (key: string) => Promise<undefined> } = {
  get: async (_key: string): Promise<undefined> => undefined,
};
