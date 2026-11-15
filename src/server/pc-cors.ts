// THE OPEN WORLD — CORS for the PC bootstraps (TOW PC phase 2).
//
// The game handler (handler.ts) already answers CORS with
// `Access-Control-Allow-Origin: *` — but its preflight only allows
// the Content-Type header, and the PC client sends an Authorization
// bearer header on every call. A browser preflight for Authorization
// would fail against the handler's header list, so BOTH PC
// bootstraps (pc-server.ts local dev + pc-backend.ts hosted)
// intercept OPTIONS before the handler and answer with the full
// header list. The Reddit path is untouched: the Devvit bootstrap
// never calls this file.
//
// Policy: Allow-Origin `*`. This is safe HERE because the API uses
// bearer tokens, not cookies — there is no ambient credential for a
// cross-origin page to ride on (Dispatch HQ needs an origin
// allowlist precisely because it uses auth cookies). The desktop
// client has no meaningful Origin anyway (Electron loads the client
// from a local file, so Origin is `file://` or null); an allowlist
// would add config without adding security. The token itself is
// the secret, and it only ever lives in the PC client's storage.

import type { IncomingMessage, ServerResponse } from "node:http";

export const PC_CORS_ALLOW_HEADERS = "Content-Type, Authorization";
export const PC_CORS_ALLOW_METHODS = "GET, POST, OPTIONS";

export function applyPcCorsHeaders(rsp: ServerResponse): void {
  rsp.setHeader("Access-Control-Allow-Origin", "*");
  rsp.setHeader("Access-Control-Allow-Methods", PC_CORS_ALLOW_METHODS);
  rsp.setHeader("Access-Control-Allow-Headers", PC_CORS_ALLOW_HEADERS);
  rsp.setHeader("Access-Control-Max-Age", "86400");
}

/** Answer a CORS preflight (OPTIONS) request. Returns true when
 *  the request was a preflight (and was answered), false otherwise
 *  (the caller continues to its normal routing). */
export function tryHandlePreflight(req: IncomingMessage, rsp: ServerResponse): boolean {
  if ((req.method ?? "GET") !== "OPTIONS") return false;
  applyPcCorsHeaders(rsp);
  rsp.writeHead(204);
  rsp.end();
  return true;
}
