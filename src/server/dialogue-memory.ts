// THE OPEN WORLD — Dialogue Memory (v0.108.10)
//
// Per-NPC dialogue memory for the conversation engine.
//
// ISOLATION DESIGN — READ BEFORE TOUCHING THIS FILE:
// - Memory NEVER lives on a shared singleton. NPC objects on the social
//   engine are shared across requests (one GameEngine, one NPC roster), and
//   their mutable fields (relationship, memories, mood, lastTopic) are
//   overwritten per request — so this module NEVER reads or writes them.
// - Memory lives ONLY inside the requesting player's own state object, under
//   `player.dialogueMemory[npcId]`. That object travels with the player's
//   save (getPlayer() spreads ...this.player; loadState() spreads ...state;
//   server saves are namespaced per user), so one user's memories physically
//   cannot be read by another user's request: the other request loads a
//   different player object that simply does not contain them.
// - Every function here is PURE: it takes a player object and an npcId and
//   touches nothing else. No imports of engines, no globals, no caches.
// - The scoped key (userId + installId + npcId) is the canonical identity
//   for this memory in logs, assertions, and any future standalone store.
//   Install scope: Devvit's web-server context exposes no stable installId
//   field in this codebase, so the server derives install scope from
//   subredditName (one install per subreddit); see index.ts. The key format
//   is fixed regardless of which store backs it.

export interface DialogueScope {
  /** Reddit user id, else username, else LOID — never a display name alone. */
  userId: string;
  /** Install scope: subredditName from request context, else 'default'. */
  installId: string;
  /** Static NPC id (e.g. 'npc_001'), never a name. */
  npcId: string;
}

/** Canonical scoped key. Segments are encoded so ':' can never collide. */
export function dialogueMemoryKey(scope: DialogueScope): string {
  const enc = (s: string) => encodeURIComponent(String(s ?? ''));
  return `tow:dialogue:${enc(scope.userId)}:${enc(scope.installId)}:${enc(scope.npcId)}`;
}

export type EpisodeKind =
  | 'exchange'
  | 'promise'
  | 'insult'
  | 'gift'
  | 'favor'
  | 'rumor';

export interface DialogueEpisode {
  /** Game-date string at the time (e.g. 'Monday, January 1, 2024'). */
  at: string;
  kind: EpisodeKind;
  summary: string;
}

export interface DialogueThread {
  id: string;
  topic: string;
  question: string;
  status: 'open' | 'answered';
  /** Quest this thread can start when the player says yes (optional). */
  questId?: string;
  answer?: string;
  openedAt: string;
  answeredAt?: string;
}

export interface NpcDialogueMemory {
  /** Facts the NPC knows about THIS player: job, city, likes, etc. */
  facts: Record<string, string>;
  /** Dated exchanges, newest last, capped at 30. */
  episodes: DialogueEpisode[];
  /** Open/answered conversational threads with this NPC. */
  threads: DialogueThread[];
}

export function emptyNpcMemory(): NpcDialogueMemory {
  return { facts: {}, episodes: [], threads: [] };
}

type PlayerLike = { dialogueMemory?: Record<string, NpcDialogueMemory> };

/** Read this player's memory for one NPC. Never returns shared state. */
export function getNpcMemory(player: PlayerLike | null | undefined, npcId: string): NpcDialogueMemory {
  const mem = player?.dialogueMemory?.[npcId];
  if (mem && typeof mem === 'object') {
    return {
      facts: { ...(mem.facts ?? {}) },
      episodes: [...(mem.episodes ?? [])],
      threads: (mem.threads ?? []).map((t) => ({ ...t })),
    };
  }
  return emptyNpcMemory();
}

/** Write this player's memory for one NPC, into this player's object only. */
export function putNpcMemory(player: PlayerLike, npcId: string, mem: NpcDialogueMemory): void {
  if (!player.dialogueMemory || typeof player.dialogueMemory !== 'object') {
    player.dialogueMemory = {};
  }
  player.dialogueMemory[npcId] = {
    facts: { ...mem.facts },
    episodes: [...mem.episodes],
    threads: mem.threads.map((t) => ({ ...t })),
  };
}

const MAX_EPISODES = 30;

export function recordEpisode(
  player: PlayerLike,
  npcId: string,
  episode: DialogueEpisode,
): NpcDialogueMemory {
  const mem = getNpcMemory(player, npcId);
  mem.episodes.push(episode);
  if (mem.episodes.length > MAX_EPISODES) {
    mem.episodes = mem.episodes.slice(-MAX_EPISODES);
  }
  putNpcMemory(player, npcId, mem);
  return mem;
}

export function rememberFact(
  player: PlayerLike,
  npcId: string,
  key: string,
  value: string,
): NpcDialogueMemory {
  const mem = getNpcMemory(player, npcId);
  mem.facts[key] = value;
  putNpcMemory(player, npcId, mem);
  return mem;
}

export function openThreads(mem: NpcDialogueMemory): DialogueThread[] {
  return mem.threads.filter((t) => t.status === 'open');
}

/** Open a thread, unless one with the same topic is already open. */
export function openThread(
  player: PlayerLike,
  npcId: string,
  topic: string,
  question: string,
  questId?: string,
): NpcDialogueMemory {
  const mem = getNpcMemory(player, npcId);
  if (mem.threads.some((t) => t.topic === topic && t.status === 'open')) {
    return mem;
  }
  mem.threads.push({
    id: `${topic}:${Date.now()}`,
    topic,
    question,
    status: 'open',
    questId,
    openedAt: new Date().toISOString(),
  });
  putNpcMemory(player, npcId, mem);
  return mem;
}

/** Answer the oldest open thread and remember the answer as an episode. */
export function answerOpenThread(
  player: PlayerLike,
  npcId: string,
  answer: string,
  gameDate: string,
): { mem: NpcDialogueMemory; thread: DialogueThread | null } {
  const mem = getNpcMemory(player, npcId);
  const thread = mem.threads.find((t) => t.status === 'open') ?? null;
  if (!thread) return { mem, thread: null };
  thread.status = 'answered';
  thread.answer = answer;
  thread.answeredAt = new Date().toISOString();
  mem.episodes.push({
    at: gameDate,
    kind: 'exchange',
    summary: `Player answered "${thread.question}" with: ${answer}`,
  });
  if (mem.episodes.length > MAX_EPISODES) {
    mem.episodes = mem.episodes.slice(-MAX_EPISODES);
  }
  putNpcMemory(player, npcId, mem);
  return { mem, thread };
}
