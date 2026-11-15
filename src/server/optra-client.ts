// THE OPEN WORLD — Optra Client (v0.108.10)
//
// OpenAI-compatible chat-completions client for the Optra endpoint.
//
// SECURITY — NON-NEGOTIABLE:
// - The API key is NEVER written, copied, echoed, embedded, or logged
//   anywhere by this module — not in full, not in part, not encoded.
// - The key is read ONLY at runtime from (in order): an injected
//   settings getter (production: Devvit app settings, global secret
//   `optraApiKey`), then process env (OPTRA_API_KEY, local runs only).
// - The model name is NEVER guessed or hardcoded: it comes from the
//   `optraModel` app setting (or OPTRA_MODEL env). Dre sets it to the
//   model name shown in his Optra dashboard. If key or model is missing,
//   this client reports "not configured" and the caller falls back to
//   local templates — the game never fails because of a missing key.
// - Base URL is configurable (optraBaseUrl setting / OPTRA_BASE_URL env)
//   and defaults to the Optra endpoint. The domain must ALSO be listed
//   in devvit.json permissions.http.domains, or Devvit blocks the fetch
//   even with a valid key.
// - Logs here are generic booleans only ('optra ok' / 'optra failed').
//   NEVER log the key, the model request body, prompts, or player data.
// - This client sends ONLY the requesting user's own prompt. It receives
//   no other user's data from callers, and it keeps no cache of prompts
//   or replies — every call is stateless.

export interface OptraConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type SettingsGetter = (key: string) => Promise<unknown>;

const DEFAULT_BASE_URL = 'https://api.optracloud.com/v1';
const REQUEST_TIMEOUT_MS = 6000;

async function readDevvitSetting(getter: SettingsGetter | undefined, key: string): Promise<string> {
  if (!getter) return '';
  try {
    const value = await getter(key);
    return typeof value === 'string' ? value : value != null ? String(value) : '';
  } catch {
    return '';
  }
}

/**
 * Resolve Optra config. `settingsGetter` is injected by callers that run
 * inside Devvit (wired in dialogue-engine.ts via a lazy dynamic import so
 * plain-node harnesses never need the Devvit runtime). When no getter is
 * given, only env vars are consulted. Returns empty key/model when
 * unconfigured — callers MUST check isOptraConfigured() first.
 */
export async function getOptraConfig(opts?: {
  settingsGetter?: SettingsGetter;
  env?: Record<string, string | undefined>;
}): Promise<OptraConfig> {
  const env = opts?.env ?? process.env;
  const apiKey =
    (await readDevvitSetting(opts?.settingsGetter, 'optraApiKey')) ||
    env.OPTRA_API_KEY ||
    '';
  const baseUrl =
    (await readDevvitSetting(opts?.settingsGetter, 'optraBaseUrl')) ||
    env.OPTRA_BASE_URL ||
    DEFAULT_BASE_URL;
  // NOTE: no hardcoded model. The model name comes from Dre's Optra
  // dashboard via the optraModel setting (or OPTRA_MODEL env).
  const model =
    (await readDevvitSetting(opts?.settingsGetter, 'optraModel')) ||
    env.OPTRA_MODEL ||
    '';
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ''), model };
}

export function isOptraConfigured(config: OptraConfig): boolean {
  return Boolean(config.apiKey && config.model && config.baseUrl);
}

export type FetchImpl = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * One stateless chat completion. Returns reply text, or null on ANY
 * failure (not configured, timeout, non-200, malformed body). Never
 * throws to the game command path — callers fall back to templates.
 * The key travels ONLY in the Authorization header of this one request.
 */
export async function optraChatCompletion(opts: {
  config: OptraConfig;
  system: string;
  user: string;
  fetchImpl?: FetchImpl;
  timeoutMs?: number;
}): Promise<string | null> {
  const { config } = opts;
  if (!isOptraConfigured(config)) return null;
  const fetchFn: FetchImpl =
    opts.fetchImpl ??
    ((url, init) => fetch(url, init) as unknown as Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        temperature: 0.8,
        max_tokens: 220,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn('[optra-client] request failed');
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn('[optra-client] empty reply');
      return null;
    }
    return text;
  } catch {
    console.warn('[optra-client] request failed');
    return null;
  } finally {
    clearTimeout(timer);
  }
}
