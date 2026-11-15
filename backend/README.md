# THE OPEN WORLD — PC Hosted Backend (TOW PC phase 2)

The server PC players connect to: the **same game handler as Reddit**
(`src/server/handler.ts`), bound to Postgres accounts + Postgres
stores + WebSocket sync, on one HTTP server on one port. PC players
share leaderboards, challenges, and trading **with each other**;
Reddit keeps its own (separate player pools, no cross-play — Dre's
call, scope §8 decision #1 revised). The game is FREE on PC; this
backend is the only recurring cost (see "What it costs").

**Status: code + config only. No Render service, database, or paid
resource has been created — creating hosted infrastructure is gated
for Dre. The deploy steps below are Dre-executable.**

## Architecture

One Node process serves everything. A request arrives at the HTTP
server (`src/server/pc-backend.ts`): CORS preflight is answered
first, then `/health`, then the account routes
(`src/server/accounts.ts`), then everything else falls through to
the shared game handler. The handler resolves identity from the
`Authorization: Bearer <token>` header (account session), loads the
player's save from Postgres, runs one command through a fresh
per-request engine, saves the result, and records the leaderboard /
challenge outcome — all through two adapters over **one Pool on one
database** (`src/server/postgres-store.ts`): `PostgresSaveStore`
(saves) and `PostgresCommunityStore` (leaderboards, challenge,
trading). They share one key namespace by design — trading reads
save keys through the community store, so splitting them would
break trades. A WebSocket server (`src/server/ws.ts`) shares the
same HTTP server on `/ws` and pushes presence + community refresh
hints; community writes flow through a notifying store decorator so
a trade offer, leaderboard move, or challenge contribution reaches
every connected PC client within ~2s (debounced).

```
PC client (Electron shell, phase 3)
  │  https://<backend>/api/*   (Bearer token)
  │  wss://<backend>/ws?token=…  (presence + push)
  ▼
pc-backend.ts ──► handler.ts (shared with Reddit)
  │                 ├─► PostgresSaveStore ─┐
  │                 └─► PostgresCommunityStore ─┤ ONE Pool, ONE DB
  ├─► accounts.ts (register/login/me/logout)  │
  └─► ws.ts (presence/roster/community push)  ▼
                                          tow_kv / tow_zset /
                                          tow_accounts / tow_sessions
```

NPC dialogue is **templates-only**: the backend passes an env-only
LLM settings getter, and with no keys set anywhere the game falls
back to local template replies. **No LLM keys ship in the app or in
this backend's config — Dre's keys never appear here, in any form.**

## Files

| File | What it is |
|---|---|
| `src/server/postgres-store.ts` | `PostgresKvStore` + `PostgresSaveStore` + `PostgresCommunityStore`; pool creation; migration loader |
| `src/server/accounts.ts` | `AccountStore` (register/login/logout/validate), scrypt hashing, session tokens, identity resolver, HTTP account routes, auth rate limiter |
| `src/server/ws.ts` | Hand-rolled RFC 6455 WebSocket server (presence/roster/push) + the notifying `CommunityStore` decorator |
| `src/server/pc-backend.ts` | Production entry: env-driven boot, routing, `/health`, hourly sweep, graceful shutdown |
| `src/server/pc-backend-main.ts` | Script main (separate so the library has no side effects in tests) |
| `src/server/migrate.ts` | Standalone migration runner |
| `src/server/pc-cors.ts` | CORS preflight helper shared by both PC bootstraps |
| `backend/migrations/001_init.sql` | Schema (idempotent; safe to re-run) |
| `backend/render.yaml` | Render Blueprint: Docker web service + Postgres |
| `backend/Dockerfile` | Node 22 image: install, build `--pc`, migrate, serve |
| `tools/harness-pc-backend.ts` | Adapter + account + trade + HTTP/WS harness (92 checks, pg-mem) |

## Environment variables

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `DATABASE_URL` | **yes** | — | Postgres connection string. The server **refuses to boot** without it (a deploy that silently boots against the wrong database is a data-integrity failure). On Render, the Blueprint wires this from the database automatically. |
| `PORT` | no | `3101` | Port to listen on. Render injects its own — never set it on Render. |
| `HOST` | no | `0.0.0.0` | Bind host. |
| `TOW_SESSION_DAYS` | no | `30` | Session lifetime in days. |
| `TOW_PG_SSL` | no | on | TLS to Postgres. **On by default** (Render requires it; `rejectUnauthorized: false` — Render's own documented Node pattern). Set `false` only for a local Postgres without TLS. |
| `TOW_MIGRATIONS_DIR` | no | — | Override for the migration SQL location. Default resolution: `<cwd>/backend/migrations`, then relative to the bundle. |

No secrets are hardcoded anywhere. There is no session secret to
set: sessions are random bearer tokens stored hashed (see below),
not signed JWTs, so there is nothing to rotate and no secret that a
restart can orphan.

## Accounts + identity

**Model (minimal, mirroring Dispatch HQ's web auth shape):**
display name + password. No email, no OAuth.

- **Username:** 3–30 chars (letters, digits, space, `_`, `-`),
  unique **case-insensitively** (`username_lower` UNIQUE) —
  "Alice" and "alice" can never both exist. The display name keeps
  its registered case.
- **Password:** 6–128 chars, hashed with `scrypt` (16-byte salt,
  64-byte hash, `saltHex:hashHex` — the same shape Dispatch HQ
  uses). Passwords are never stored or logged in any other form.
- **Session:** `crypto.randomBytes(32)` hex (64 chars), returned to
  the client exactly once (register / login). Only its **SHA-256
  hash** is stored in `tow_sessions` — a database leak never yields
  a usable session token. Expiry: 30 days (see `TOW_SESSION_DAYS`).
  The client sends it as `Authorization: Bearer <token>` and stores
  it in localStorage.
- **Identity:** a valid token resolves to `{ userId: "pc:<uuid>",
  username: <display name>, installTag: "pc" }`; anything else is
  all-nulls and the handler rejects writes with "A PC account is
  required to …". Save keys are `tow:pc:<uuid>:save:<slot>` — stable
  even if display names ever become changeable.
- **Rate limiting:** register/login are limited to 10 attempts per
  IP per 15 minutes (in-memory; this backend runs one instance).

**Endpoints** (`src/server/accounts.ts`):

| Endpoint | Method | Success | Errors |
|---|---|---|---|
| `/api/account/register` | POST `{username, password}` | `201 {account, token}` | `400` bad username/password, `409` username taken, `429` rate-limited |
| `/api/account/login` | POST `{username, password}` | `200 {account, token}` | `400` missing fields, `401` invalid credentials (unknown username and wrong password are indistinguishable on purpose), `429` rate-limited |
| `/api/account/logout` | POST (Bearer) | `200 {success: true}` (always — a missing token is a no-op) | — |
| `/api/account/me` | GET (Bearer) | `200 {account}` | `401` not logged in / expired |

**Known gaps (do not promise these to players):**
- **No password reset.** There is no email on the account, so a
  forgotten password has no recovery path today. The account is
  not locked out of the *game* — but its saves are unreachable
  without the password. A reset flow needs an email channel Dre
  has not ordered; it is a future addition, not a launch feature.
- **No account deletion, no username change, no password change.**
  None is implemented; none is promised.
- **Sessions are not revocable per-device** (no "log out
  everywhere" — logout kills one token).

## WebSocket protocol

One endpoint: `/ws` on the same port as the HTTP API (like
Dispatch HQ's `/ws`). Auth is the session token, as a `?token=`
query parameter (the browser WebSocket API cannot set headers) or
as the first `{"type":"auth"}` message within 10s. A present-but-
invalid token is rejected at the handshake (HTTP 401, no upgrade);
a missing token gets the 10s auth-message grace period, then the
socket closes (code 4001).

All messages are JSON text frames. The game itself is turn-based
and stateless — the socket carries presence + live community
updates **only**, never game commands. Polling stays the fallback:
the client re-fetches the leaderboard / challenge views on push,
and those fetches work with no socket at all.

**Client → server:**

| Message | Meaning |
|---|---|
| `{"type":"auth","token"}` | Authenticate (only when opened without `?token=`). |
| `{"type":"ping","clientTime"?}` | Answered with `pong`. |
| `{"type":"presence_update","activity"?,"city"?}` | `activity` is `"idle"` \| `"playing"` (anything else reads as `"idle"`); `city` is the player's current in-game city. Updates the roster and re-broadcasts presence. |

**Server → client:**

| Message | Meaning |
|---|---|
| `{"type":"auth_ok","playerId","username"}` | Authenticated. |
| `{"type":"pong","clientTime","serverTime"}` | Ping answer. |
| `{"type":"presence","online","players":[{"username","activity","city","connectedAt"}]}` | Roster. Sent on join / leave / presence_update, and every 30s. |
| `{"type":"community","event","at"}` | Refresh hint: `event` is `"leaderboard"` \| `"challenge_progress"` \| `"trade_offer"`. The client re-fetches the relevant view. The `trade_offer` push is a broadcast (the server cannot tell the recipient from the offers key alone); the client checks its own incoming offers with the existing `trade list` path. Debounced to at most one emit per event type per 2s. |
| `{"type":"error","reason"}` | Sent before closing on an auth failure (code 4001). |

**Liveness:** the server sends a WS ping frame every 30s and
closes sockets silent for 90s. The client reconnects with
backoff (5s, doubling to 60s) while logged in.

**Implementation note:** Node has no built-in WebSocket *server*
(only the client, since 22), so `ws.ts` implements the server side
of RFC 6455 directly — handshake, frame parsing (fragmentation,
masking, ping/pong/close, extended lengths), unmasked server
frames. No `ws` dependency was added. If the protocol ever needs
extensions (permessage-deflate, subprotocols), swap that module
for the `ws` package — the `TowWsServer` interface (broadcast /
presence) is the seam. The hand-rolled server is proven against
Node's built-in WebSocket client in the harness (§D).

**Single-instance limit:** the presence roster is in-memory, so
the service must run **one instance** (`numInstances: 1` in
render.yaml). Do not scale past 1 without a shared presence store.

## CORS

`Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`,
headers `Content-Type, Authorization` (see `pc-cors.ts`). `*` is
safe **here** because the API uses bearer tokens, not cookies —
there is no ambient credential for a cross-origin page to ride on
(Dispatch HQ needs an origin allowlist precisely because it uses
auth cookies). The desktop client has no meaningful Origin anyway
(Electron loads the client from a local file, so Origin is
`file://` or null); an allowlist would add config without adding
security. The token itself is the secret, and it only ever lives
in the PC client's storage.

The game handler's own preflight only allows `Content-Type`, so
both PC bootstraps intercept `OPTIONS` before the handler and
answer with the full header list. The Reddit path is untouched.

## Deploy (Dre-executable)

**Step 0 — the repo (Dre, one time).** Render deploys from a Git
repo, and the TOW tree (`~/workspace/the-open-world-original/`) is
not a git repo today. Before anything below can run, the tree must
be pushed to GitHub (new repo, e.g. `the-open-world` — the repo
name is Dre's call; the Blueprint only needs the repo to exist).
Creating the repo + pushing is an account action, so it is Dre's
step (or Melo's in Dre's session on his word). The tree contains
no secrets — the only credentials are env vars set in Render, never
files — so pushing it is safe.

**Step 1 — create the Blueprint.** In the Render Dashboard: New →
Blueprint → pick the repo → Render reads `backend/render.yaml`
and shows the two resources it will create (web service
`tow-pc-backend` + database `tow-pc-db`). Confirm. Render builds
the Docker image (Node 22), runs the migration, and starts the
server. First build takes a few minutes.

**Step 2 — verify.** Open `https://tow-pc-backend.onrender.com/health`
(or the URL Render assigned). Expect:
`{"status":"ok","game":"The Open World","version":"0.108.29","edition":"pc","db":"ok","timestamp":"…"}`.
A `503` with `"db":"error"` means the database link failed — check
the `DATABASE_URL` env var on the service (the Blueprint wires it
automatically; a hand-created service needs it set by hand).

**Step 3 — point the PC client at it.** The client reads its API
base from the build-time `TOW_PC_API_BASE` or the runtime
`window.__TOW_PC_CONFIG__.apiBase` (phase 3's Electron shell sets
the runtime value). Set it to the Render URL (no trailing slash).
The client derives the WebSocket URL from the same base
(`https://…` → `wss://…`).

**Step 4 — upgrade before day 30 (if staying on free).** The free
Postgres **expires 30 days after creation** (see the cost table).
If the backend is serving real players by then, upgrade the
database to `basic-256mb` in the dashboard **before** the expiry
— after the 14-day grace period Render deletes it with all data.
The web service can stay free longer (it just sleeps), but a
sleeping backend means a ~1 minute cold start for the first player
after 15 idle minutes.

**Migration step.** The migration (`backend/migrations/001_init.sql`)
runs automatically on every boot (idempotent — every statement is
`IF NOT EXISTS`), and the Dockerfile also runs it explicitly
before starting the server (`migrate.cjs`, Dispatch HQ's shape).
To apply it by hand (or verify a database): `DATABASE_URL=…
node dist/pc/server/migrate.cjs`. To apply it with psql:
`psql "$DATABASE_URL" -f backend/migrations/001_init.sql`.

## What it costs

Researched 2026-11-14 from Render's own docs (Deploy for Free,
read 2026-11-14/15 — crawled 2026-11-15 01:49 UTC) plus Render's
pricing page as quoted by multiple independent trackers checked
Oct–Nov 2026 (all agree on the paid figures; Render's pricing page
itself did not surface a direct fetch, so re-check it at deploy
time — prices change). All figures USD/month, before tax.

| | Free (Blueprint default) | Cheapest paid |
|---|---|---|
| **Workspace** | Hobby $0 (1 seat, 25 services, 5 GB bandwidth, 500 build min/mo) | Hobby $0 — no workspace upgrade needed |
| **Web service** | $0 — 0.1 CPU / 512 MB. **Spins down after 15 min idle** (~1 min cold start). 750 free instance hours/month per workspace (spun-down services consume none; run out and Render suspends all free web services until next month). | Starter $7/mo — 0.5 CPU / 512 MB, **always-on**, no sleep, no hour cap |
| **Postgres** | $0 — 256 MB RAM, 1 GB storage, one per workspace, no backups, no connection pooling. **Expires 30 days after creation**; 14-day grace to upgrade, then Render **deletes it with all data**. | Basic-256mb $6/mo compute + $0.30/GB storage. Basic's default disk is 15 GB → $4.50/mo storage → **$10.50/mo all-in** for the database |
| **Total** | **$0/mo** (prove the deploy; do not put real players on it — Render's own docs say "Do not use them for production applications") | **$17.50/mo** ($7 web + $10.50 database) on the $0 Hobby workspace — or $13/mo quoting compute only, before the $4.50 disk |
| **Next steps up** | — | Standard web $25/mo (1 CPU / 2 GB); Basic-1gb Postgres $19/mo compute |

Bandwidth past the included 5 GB is $0.15/GB; build minutes past
500/mo are $5 per 1,000. Neither should bite at launch (the game
is text; a command is a few KB).

**Recommendation:** deploy free to prove it, then move to the
$17.50/mo paid pair before real players arrive — the free database
expiring mid-launch would delete every PC save. The upgrade is a
dashboard plan change on each service, not a redeploy.

## Node / Electron call

**Electron 33 (Node 20) is fine for the shell; the server runs
Node 22 on Render.** Verified, not assumed:

- The server's runtime code imports only `node:http`,
  `node:crypto`, `node:fs`, `node:path`, `node:net` — all stable
  since Node ≤14. A grep across `src/` finds **zero** Node-22-only
  APIs (no `Promise.withResolvers`, `Array.fromAsync`,
  `Object.groupBy`, `toSorted`/`toReversed`, new `Set` methods,
  `node:sqlite`). `fetch` / `AbortSignal.timeout` appear only in
  the LLM provider files (Node 18+ / 17.3+ — and unused on PC,
  where no keys are set).
- `package.json` wants Node ≥22.6 for the **dev toolchain only**
  (`--experimental-strip-types` for `tools/build.ts` + the
  harnesses). The shipped server is a pre-built esbuild bundle —
  it needs no type stripping at runtime.
- The PC client bundle is browser JS: the built
  `dist/pc/client/game.js` contains **zero** Node-isms (no
  `process.env`, `require(`, `__dirname`, `Buffer`). The Electron
  shell (phase 3) runs that bundle + Electron APIs; with Option B
  the shell does **not** run the server, so Electron's Node version
  never touches server code.
- The Dockerfile pins `node:22-bookworm-slim` for build + run, so
  the hosted server always runs Node 22 regardless of the shell.

## Testing — and what it does NOT prove

`tools/harness-pc-backend.ts` — **92 checks, all passing**
(type-check, build, and `build --pc` also green; all 18 existing
harnesses match baseline — see the phase-2 report).

- **The adapter is tested against pg-mem** (in-memory Postgres
  emulator, devDependency), **not real Postgres** — no Postgres
  runs on the dev VM (no `psql`, no server binary, no Docker).
  The SQL avoids the two constructs pg-mem cannot parse (regex
  `~`, `COLLATE`) so the tests exercise the real statements, and
  the migration runs from the real SQL file. **The live Render
  Postgres is the final proof** — the first deploy's `/health`
  check (`db: "ok"`) plus a register → play → leaderboard pass
  against it is the verification this phase could not do from the
  VM. Do not claim production-Postgres verification until then.
- **pg-mem gaps found while testing** (all worked around in the
  shipped code, not in the tests): no regex `~` operator, no
  `COLLATE`, no row locking (`SELECT … FOR UPDATE` does not
  serialize — the shipped `incrBy` is a single atomic upsert
  instead), and a `DELETE` on a table with a foreign-key cascade
  throws ("No execution context available" — the migration omits
  the sessions FK for this reason; see the SQL file's comment).
- **The PC client auth/WS UI is not verified in a real browser or
  Electron window** — the client builds clean (Reddit + PC) and
  the server side of every call it makes is proven over HTTP/WS,
  but the login form rendering and the socket lifecycle in the
  real shell are phase 3's smoke gate.

## Known limitations

- **Concurrent trade acceptance can double-report success.**
  Pre-existing in `community.ts` (same on Redis — no harness
  asserts exactly-one-success): two accepts that both pass the
  pre-check before either deletes the offer can both report
  "Trade complete". The end state stays consistent (racing accepts
  are always the same acceptor computing identical writes from the
  same pre-state — item moved once, money moved once, offer gone;
  proven in the harness §C). A real fix needs a lock around accept
  in `community.ts` (shared with Reddit — out of scope for
  phase 2).
- **`incrBy` throws on a non-numeric stored value** (the
  `::double precision` cast) instead of parsing as 0 like the
  in-memory store. Counters are only ever written numerically, so
  this only fires on a hand-corrupted database; the caller logs it
  and the game plays on.
- **PC saves never expire** (scope §3): `SaveStore.set` ignores
  its expiration argument, and `CommunityStore.expire` is a no-op
  for save keys (the trade path's 90-day TTL does not apply on
  PC). The username index (365 days), challenge totals, trade
  offers, and weekly/monthly boards DO expire.
- **One instance only** (in-memory WS presence roster — see above).
- **No password reset, no account deletion** (see "Known gaps").

## Request flow (one command, end to end)

1. PC client: `POST /api/init` with the bearer token + player
   state + `input: "work"`.
2. `pc-backend.ts`: CORS preflight? No. `/health`? No. Account
   route? No → game handler.
3. Handler resolves identity (session token → account), loads the
   save from `tow_kv`, runs `work` through a fresh engine, saves
   the result (staleness-guarded), records the leaderboard /
   challenge outcome through the notifying store.
4. The notifying decorator emits a `leaderboard` community event
   (debounced); the WS server pushes it to every connected PC
   client, which re-fetches the board. Polling (the client's own
   leaderboard fetch) would show the same result without the push.
5. Response: command text + updated player + server stamp/sequence.
