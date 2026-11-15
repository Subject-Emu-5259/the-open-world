// THE OPEN WORLD — Devvit Redis adapter for the community store
// (v0.108.22, audit F5/F15).
//
// The adapter contract comes from node_modules/@devvit/redis
// (RedisClient.d.ts / redisCompression.d.ts) and is NOT the shape
// the old code used:
//   zAdd(key, ...members: ZMember[])   — VARIADIC objects, never an array-wrap
//   zRange(...) -> {member, score}[]  — OBJECTS, never string[]
//   zScore(key, member) -> number | undefined
//   zRank(key, member)  -> number | undefined (ascending order —
//     NO reverse option exists on this adapter, so highest-first
//     rank is computed from a reverse zRange + findIndex, exactly
//     as before but over objects)
//   zIncrBy(key, member, value), incrBy(key, value), expire(key, seconds)
//
// The client is INJECTED (constructor arg), never imported here:
// the harness passes a fake implementing the same signatures and
// asserts the call shapes, which is what the old in-memory-mock-only
// tests could never catch. Production passes the real redisCompressed.

import type { CommunityStore } from './community.js';

export interface RedisAdapterLike {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, options?: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  zAdd(key: string, ...members: { member: string; score: number }[]): Promise<unknown>;
  zRange(key: string, start: number | string, stop: number | string, options?: { by?: string; reverse?: boolean }): Promise<{ member: string; score: number }[]>;
  zScore(key: string, member: string): Promise<number | undefined>;
  zRank(key: string, member: string): Promise<number | undefined>;
  zIncrBy(key: string, member: string, value: number): Promise<number>;
  incrBy(key: string, value: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

export class RedisCommunityStore implements CommunityStore {
  private readonly redis: RedisAdapterLike;
  constructor(redis: RedisAdapterLike) { this.redis = redis; }

  async get(key: string): Promise<string | null> {
    const v = await this.redis.get(key);
    return typeof v === 'string' ? v : null;
  }
  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  async zAdd(key: string, member: string, score: number): Promise<void> {
    // Variadic object — NOT [{member, score}]. The array-wrap was F5.
    await this.redis.zAdd(key, { member, score });
  }
  async zTop(key: string, n: number): Promise<{ member: string; score: number }[]> {
    // zRange already returns {member, score}[] — consume it directly.
    // No per-member zScore round-trip (the old code treated the
    // objects as strings and scored garbage).
    const rows = await this.redis.zRange(key, 0, n - 1, { by: 'rank', reverse: true });
    return (rows ?? []).map((r) => ({ member: r.member, score: r.score }));
  }
  async zRank(key: string, member: string): Promise<number | null> {
    // No reverse option on zRank, so rank comes from the reverse
    // range (highest first), exactly like zTop. This is O(N) by
    // adapter necessity — documented, not hidden.
    const rows = await this.redis.zRange(key, 0, -1, { by: 'rank', reverse: true });
    const idx = (rows ?? []).findIndex((r) => r.member === member);
    return idx === -1 ? null : idx;
  }
  async zScore(key: string, member: string): Promise<number | null> {
    const v = await this.redis.zScore(key, member);
    return typeof v === 'number' ? v : null;
  }
  async zIncrBy(key: string, member: string, amount: number): Promise<number> {
    return this.redis.zIncrBy(key, member, amount);
  }
  async incrBy(key: string, amount: number): Promise<number> {
    return this.redis.incrBy(key, amount);
  }
  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }
}
