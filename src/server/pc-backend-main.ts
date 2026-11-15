// THE OPEN WORLD — PC hosted backend script main (TOW PC phase 2).
//
// Separated from pc-backend.ts on purpose: the library file has no
// side effects when a harness imports it (a require.main guard in
// the library would fire inside a CJS test bundle, where the bundle
// IS the main module). tools/build.ts --pc bundles this file as
// dist/pc/server/pc-backend.cjs.
//
//   DATABASE_URL=... node dist/pc/server/pc-backend.cjs

import { startPcBackend } from "./pc-backend.js";
import type { PcBackendHandle } from "./pc-backend.js";
import { GAME_VERSION } from "../shared/version.js";

// Render sends SIGTERM on deploy / spin-down: shut down cleanly
// (in-flight requests finish, the pool closes) instead of dying
// mid-write.
let handle: PcBackendHandle | null = null;
const shutdown = (): void => {
  console.log("[tow-backend] Shutting down.");
  void (handle ? handle.close().then(() => process.exit(0)) : Promise.resolve().then(() => process.exit(0)));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startPcBackend()
  .then((started: PcBackendHandle): void => {
    handle = started;
    console.log(`[tow-backend] THE OPEN WORLD PC backend v${GAME_VERSION} listening on ${started.host}:${started.port}`);
    console.log(`[tow-backend] Health: http://${started.host}:${started.port}/health — WS: ws://${started.host}:${started.port}/ws`);
  })
  .catch((err: unknown): void => {
    console.error("[tow-backend] Failed to start:", err);
    process.exit(1);
  });
