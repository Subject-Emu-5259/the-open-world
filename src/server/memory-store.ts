// THE OPEN WORLD — in-memory SaveStore (TOW PC phase 1).
//
// Backed by a CommunityStore's key/value map — DELIBERATELY the same
// instance the handler uses for community data. Trading reads save
// keys through the community store (createTradeOffer / acceptTradeOffer
// load both players' saves via store.get(saveKey)), so the save store
// and the community store MUST share one key namespace. On Reddit both
// adapters sit on the same Devvit Redis; on PC (phase 1) both sit on
// one MemoryCommunityStore; in phase 2 both sit on one Postgres DB.
//
// Expiry is a no-op here: the memory community store never expires
// keys, and PC saves don't expire anyway (scope §3 — no 90-day
// expiry on PC; the files/database are the player's).
//
// VM smoke testing only — nothing here persists across restarts.
// Phase 2 replaces it with a Postgres SaveStore without changing
// the handler.

import type { CommunityStore } from "./community.js";
import type { SaveStore } from "./handler.js";

export class MemorySaveStore implements SaveStore {
  private readonly kv: CommunityStore;

  constructor(kv: CommunityStore) {
    this.kv = kv;
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }

  async set(key: string, value: string, opts?: { expiration?: Date }): Promise<void> {
    await this.kv.set(key, value);
    // Honour an expiration when the backend supports it; the memory
    // store's expire is a no-op, so this is a no-op here too.
    if (opts?.expiration) {
      const seconds = Math.floor((opts.expiration.getTime() - Date.now()) / 1000);
      if (seconds > 0) await this.kv.expire(key, seconds);
    }
  }

  async del(key: string): Promise<void> {
    await this.kv.del(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.kv.expire(key, seconds);
  }
}
