#!/usr/bin/env -S node --experimental-strip-types

// Bundles sources to dist/ and public/.
//
// build.ts [--minify] [--watch]
// --local  Run development server. Serve on http://localhost:1234 and reload on
//          code change.
// --minify    Minify output.
// --watch     Automatically rebuild whenever an input changes.
// --pc        Build the PC edition instead of the Reddit edition:
//             client -> dist/pc/client (Devvit imports stubbed, platform
//             'pc', api base from TOW_PC_API_BASE), server ->
//             dist/pc/server (pc-server.ts entry, '@devvit/web/server'
//             stubbed out). The static client shell (game.html, game.css,
//             images) is copied into dist/pc/client so the directory is
//             self-contained. The default (Reddit) build is unchanged in
//             behavior: its defines inline the same values the code had
//             before (api base '', platform 'reddit').

import fs from "node:fs";
import path from "node:path";
import type { BuildOptions } from "esbuild";
import esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const pc = process.argv.includes("--pc");
// PC api base: the hosted backend URL. Empty here means the PC client
// uses relative URLs (same-origin serving); the Electron shell can
// also override it at runtime via window.__TOW_PC_CONFIG__.apiBase.
const pcApiBase = process.env.TOW_PC_API_BASE ?? "";

const opts: BuildOptions = {
  bundle: true,
  logLevel: "info", // Print the port and build demarcations.
  metafile: true,
  sourcemap: "linked",
  target: "es2023", // https://esbuild.github.io/content-types/#tsconfig-json
};

const clientOpts: BuildOptions = {
  ...opts,
  // v0.108.12: splash.ts removed — it was an orphaned bundle whose only
  // job was a forced expanded-mode call on a synthetic click. The served
  // entrypoints are game.html only.
  entryPoints: ["src/client/game.ts"],
  format: "esm",
  outdir: "public",
  platform: "browser",
  // Build-time platform defines (game.ts reads them via declare const).
  // Reddit values reproduce the pre-split behavior exactly: relative
  // API URLs and the "Built on Reddit Devvit" footer.
  define: {
    __TOW_API_BASE__: '""',
    __TOW_PLATFORM__: '"reddit"',
  },
};
const serverOpts: BuildOptions = {
  ...opts,
  entryPoints: ["src/server/index.ts"],
  format: "cjs",
  outdir: "dist/server",
  platform: "node",
};

// PC edition: same client + the same handler, different bindings.
// The two client Devvit imports become no-op stubs (the PC window IS
// the app — nothing to expand, no Journeys telemetry), and the server
// entry is pc-server.ts with '@devvit/web/server' stubbed out (the
// only production import of it is the LLM settings read, which the
// stub answers with "no Devvit settings" so keys come from env vars).
const pcClientOpts: BuildOptions = {
  ...opts,
  entryPoints: ["src/client/game.ts"],
  format: "esm",
  outdir: "dist/pc/client",
  platform: "browser",
  alias: {
    "@devvit/web/client": "./src/client/stubs/devvit-client.ts",
    "@devvit/analytics/client/reddit": "./src/client/stubs/devvit-analytics.ts",
  },
  define: {
    __TOW_API_BASE__: JSON.stringify(pcApiBase),
    __TOW_PLATFORM__: '"pc"',
  },
};
const pcServerOpts: BuildOptions = {
  ...opts,
  entryPoints: ["src/server/pc-server.ts"],
  format: "cjs",
  outdir: "dist/pc/server",
  platform: "node",
  // package.json is "type": "module", so a .js CJS bundle would load
  // as ESM and crash on `module` — emit .cjs so plain `node` runs it.
  outExtension: { ".js": ".cjs" },
  alias: {
    "@devvit/web/server": "./src/server/stubs/devvit-server.ts",
  },
};
// Phase 2: the hosted backend entry (Postgres + accounts + WS) and
// the standalone migration runner. Same bundle shape as pc-server.
// `pg-native` is pg's optional native binding (never installed):
// esbuild must treat it as external or the bundle fails resolving
// pg's lazy native require. Nothing in the backend touches pg's
// .native — the pure-JS driver is the whole path.
const pcBackendOpts: BuildOptions = {
  ...opts,
  // Object-form entry points: the script main (pc-backend-main.ts)
  // is emitted as pc-backend.cjs, the name the Dockerfile invokes.
  entryPoints: { "pc-backend": "src/server/pc-backend-main.ts", migrate: "src/server/migrate.ts" },
  format: "cjs",
  outdir: "dist/pc/server",
  platform: "node",
  outExtension: { ".js": ".cjs" },
  external: ["pg-native"],
  alias: {
    "@devvit/web/server": "./src/server/stubs/devvit-server.ts",
  },
};

// Static client shell files copied into dist/pc/client so the PC
// client directory is self-contained (game.html loads game.js + game.css
// relatively; the PC server's static mode and the phase-3 shell both
// serve this directory). game.js itself is the build output, not copied.
const pcStaticFiles = ["game.html", "game.css", "avok-mark.png", "tow-icon.png"];

if (pc) {
  const [client, server, backend] = await Promise.all([
    esbuild.build(pcClientOpts),
    esbuild.build(pcServerOpts),
    esbuild.build(pcBackendOpts),
  ]);
  for (const f of pcStaticFiles) {
    const src = path.join("public", f);
    const dst = path.join("dist", "pc", "client", f);
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
  }
  if (client.metafile)
    fs.writeFileSync("dist/pc/client.meta.json", JSON.stringify(client.metafile));
  if (server.metafile)
    fs.writeFileSync("dist/pc/server.meta.json", JSON.stringify(server.metafile));
  if (backend.metafile)
    fs.writeFileSync("dist/pc/backend.meta.json", JSON.stringify(backend.metafile));
} else if (watch) {
  const clientCtx = await esbuild.context(clientOpts);
  const serverCtx = await esbuild.context(serverOpts);
  await Promise.all([
    watch ? clientCtx.watch() : undefined,
    watch ? serverCtx.watch() : undefined,
  ]);
} else {
  const [client, server] = await Promise.all([
    esbuild.build(clientOpts),
    esbuild.build(serverOpts),
  ]);
  if (client.metafile)
    fs.writeFileSync("dist/client.meta.json", JSON.stringify(client.metafile));
  if (server.metafile)
    fs.writeFileSync("dist/server.meta.json", JSON.stringify(server.metafile));
}
