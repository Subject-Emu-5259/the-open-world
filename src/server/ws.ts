// THE OPEN WORLD — WebSocket sync for the PC hosted backend
// (TOW PC phase 2).
//
// Minimal, modeled on Dispatch HQ's game-server WebSocket
// (servers/game-server/src/websocket/wsServer.ts): presence (who is
// online), roster broadcast, and community event push. The game
// itself is turn-based and stateless (per-request engine) — the
// socket carries presence + live community updates ONLY, never game
// commands. Polling stays the fallback: the client re-fetches the
// leaderboard / challenge views on push, and those fetches work
// with no socket at all.
//
// Protocol (all messages are JSON text frames):
//   Client -> server:
//     { type: "auth", token }            — only when the socket was
//       opened without ?token=; the first message must authenticate
//       within 10s or the server closes the socket (4001).
//     { type: "ping", clientTime? }      — answered with a pong.
//     { type: "presence_update", activity?, city? } — activity is
//       "idle" | "playing" (anything else reads as "idle"); city is
//       the player's current in-game city. Updates the roster and
//       re-broadcasts presence.
//   Server -> client:
//     { type: "auth_ok", playerId, username }
//     { type: "pong", clientTime, serverTime }
//     { type: "presence", online, players: [{ username, activity,
//       city, connectedAt }] } — on join / leave / presence_update,
//       and every 30s.
//     { type: "community", event, at } — event is "leaderboard" |
//       "challenge_progress" | "trade_offer". A refresh hint, not
//       data: the client re-fetches the relevant view. The
//       trade_offer push is a broadcast (the server cannot tell the
//       recipient from the offers key alone); the client checks its
//       own incoming offers with the existing `trade list` path.
//     { type: "error", reason } — sent before closing on an auth
//       failure (code 4001).
//
// Auth: the session token, as a `?token=` query parameter on the
// connect URL (the browser WebSocket API cannot set headers) or as
// the first {"type":"auth"} message. Validated against the same
// AccountStore the HTTP routes use.
//
// No `ws` dependency: Node has no built-in WebSocket SERVER (only
// the client, since 22), so this file implements the server side of
// RFC 6455 directly — handshake, frame parsing (fragmentation,
// masking, ping/pong/close, extended lengths), and unmasked server
// frames. It is deliberately small (~300 lines) and is proven
// against Node's built-in WebSocket client in tools/
// harness-pc-backend.ts. If the protocol ever needs extensions
// (permessage-deflate, subprotocols), swap this module for the `ws`
// package — the TowWsServer interface (broadcast / presence) is
// the seam.

import { createHash } from "node:crypto";
import type { Server, IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { CommunityStore } from "./community.js";
import { LEADERBOARD_KEY, TRADE_OFFERS_KEY } from "./community.js";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_MESSAGE_BYTES = 64 * 1024;
const AUTH_TIMEOUT_MS = 10_000;
const PRESENCE_INTERVAL_MS = 30_000;
const PING_INTERVAL_MS = 30_000;
const IDLE_CLOSE_MS = 90_000;

export interface WsAccount {
  id: string;
  username: string;
}

export interface TowWsDeps {
  /** Validate a session token (AccountStore.validateSession). */
  validateSession: (token: string) => Promise<WsAccount | null>;
}

export interface PresenceEntry {
  username: string;
  activity: string;
  city: string | null;
  connectedAt: number;
}

export type CommunityEventType = "leaderboard" | "challenge_progress" | "trade_offer";

export interface CommunityEvent {
  event: CommunityEventType;
  at: number;
}

// --- RFC 6455 frame codec ---

const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

/** Encode one server frame (FIN set, unmasked — servers never mask). */
function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

interface ParsedFrame {
  opcode: number;
  fin: boolean;
  payload: Buffer;
  /** Bytes consumed from the input buffer. 0 = need more data. */
  consumed: number;
}

/** Parse one frame from the head of `buf`. Returns consumed=0 when
 *  the buffer does not yet hold a complete frame. Throws on a
 *  protocol violation (unmasked client frame, absurd length). */
function parseFrame(buf: Buffer): ParsedFrame {
  if (buf.length < 2) return { opcode: 0, fin: false, payload: Buffer.alloc(0), consumed: 0 };
  const b0 = buf[0] as number;
  const b1 = buf[1] as number;
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  if (!masked) throw new Error("Unmasked client frame — RFC 6455 requires clients to mask.");
  let len = b1 & 0x7f;
  let offset = 2;
  if (len === 126) {
    if (buf.length < 4) return { opcode: 0, fin: false, payload: Buffer.alloc(0), consumed: 0 };
    len = buf.readUInt16BE(2);
    offset = 4;
  } else if (len === 127) {
    if (buf.length < 10) return { opcode: 0, fin: false, payload: Buffer.alloc(0), consumed: 0 };
    const big = buf.readBigUInt64BE(2);
    if (big > BigInt(MAX_MESSAGE_BYTES)) throw new Error("Frame payload exceeds the size limit.");
    len = Number(big);
    offset = 10;
  }
  if (len > MAX_MESSAGE_BYTES) throw new Error("Frame payload exceeds the size limit.");
  if (buf.length < offset + 4 + len) return { opcode: 0, fin: false, payload: Buffer.alloc(0), consumed: 0 };
  const mask = buf.subarray(offset, offset + 4);
  const maskedPayload = buf.subarray(offset + 4, offset + 4 + len);
  const payload = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    payload[i] = (maskedPayload[i] as number) ^ (mask[i % 4] as number);
  }
  return { opcode, fin, payload, consumed: offset + 4 + len };
}

// --- One connection ---

interface TowConnection {
  socket: Socket;
  accountId: string | null;
  username: string | null;
  activity: string;
  city: string | null;
  connectedAt: number;
  lastSeenAt: number;
  authed: boolean;
  buffer: Buffer;
  fragments: Buffer[];
  fragmentOpcode: number;
  closing: boolean;
}

export class TowWsServer {
  private readonly deps: TowWsDeps;
  private readonly connections = new Map<Socket, TowConnection>();
  private presenceTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private authTimers = new Set<NodeJS.Timeout>();

  constructor(server: Server, deps: TowWsDeps) {
    this.deps = deps;
    server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
      void this.handleUpgrade(req, socket, head);
    });
    this.presenceTimer = setInterval(() => this.broadcastPresence(), PRESENCE_INTERVAL_MS);
    this.presenceTimer.unref?.();
    this.pingTimer = setInterval(() => this.pingAll(), PING_INTERVAL_MS);
    this.pingTimer.unref?.();
  }

  onlineCount(): number {
    let n = 0;
    for (const c of this.connections.values()) if (c.authed) n++;
    return n;
  }

  getPresence(): PresenceEntry[] {
    const out: PresenceEntry[] = [];
    for (const c of this.connections.values()) {
      if (!c.authed || !c.username) continue;
      out.push({ username: c.username, activity: c.activity, city: c.city, connectedAt: c.connectedAt });
    }
    out.sort((a, b) => a.username.localeCompare(b.username));
    return out;
  }

  broadcastPresence(): void {
    this.broadcast({
      type: "presence",
      online: this.onlineCount(),
      players: this.getPresence(),
    });
  }

  broadcastCommunity(event: CommunityEvent): void {
    this.broadcast({ type: "community", event: event.event, at: event.at });
  }

  sendTo(accountId: string, message: Record<string, unknown>): void {
    for (const c of this.connections.values()) {
      if (c.authed && c.accountId === accountId) this.send(c, message);
    }
  }

  broadcast(message: Record<string, unknown>): void {
    for (const c of this.connections.values()) {
      if (c.authed) this.send(c, message);
    }
  }

  close(): void {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const t of this.authTimers) clearTimeout(t);
    this.authTimers.clear();
    for (const c of this.connections.values()) {
      try { c.socket.destroy(); } catch { /* already gone */ }
    }
    this.connections.clear();
  }

  private send(conn: TowConnection, message: Record<string, unknown>): void {
    if (conn.closing) return;
    try {
      conn.socket.write(encodeFrame(OP_TEXT, Buffer.from(JSON.stringify(message), "utf8")));
    } catch { /* a dead socket is reaped on close */ }
  }

  private sendRaw(conn: TowConnection, opcode: number, payload: Buffer): void {
    if (conn.closing) return;
    try {
      conn.socket.write(encodeFrame(opcode, payload));
    } catch { /* dead socket */ }
  }

  private closeWith(conn: TowConnection, code: number, reason: string): void {
    if (conn.closing) return;
    conn.closing = true;
    try {
      const body = Buffer.alloc(2 + Buffer.byteLength(reason));
      body.writeUInt16BE(code, 0);
      body.write(reason, 2, "utf8");
      conn.socket.write(encodeFrame(OP_CLOSE, body));
    } catch { /* already gone */ }
    setTimeout(() => { try { conn.socket.destroy(); } catch { /* already gone */ } }, 1000).unref?.();
  }

  private pingAll(): void {
    const now = Date.now();
    for (const c of this.connections.values()) {
      if (now - c.lastSeenAt > IDLE_CLOSE_MS) {
        this.closeWith(c, 1001, "Idle timeout");
        continue;
      }
      this.sendRaw(c, OP_PING, Buffer.alloc(0));
    }
  }

  private removeConnection(conn: TowConnection): void {
    const wasAuthed = conn.authed;
    this.connections.delete(conn.socket);
    if (wasAuthed) this.broadcastPresence();
  }

  private async handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): Promise<void> {
    let pathname = "";
    let token: string | null = null;
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      pathname = url.pathname;
      const q = url.searchParams.get("token");
      token = q && q.length > 0 ? q : null;
    } catch { /* malformed URL — falls through to the 400 below */ }
    const upgrade = (req.headers.upgrade ?? "").toLowerCase();
    const connection = (req.headers.connection ?? "").toLowerCase();
    const key = req.headers["sec-websocket-key"];
    const version = req.headers["sec-websocket-version"];
    if (pathname !== "/ws" || upgrade !== "websocket" || !connection.includes("upgrade")
      || typeof key !== "string" || key.length === 0 || version !== "13") {
      try {
        socket.write("HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nContent-Length: 22\r\n\r\nExpected a /ws upgrade.");
        socket.destroy();
      } catch { /* already gone */ }
      return;
    }
    // Auth: query token first (the PC client always sends it). A
    // token that is present but INVALID is rejected immediately —
    // only a MISSING token gets the 10s auth-message grace period.
    let account: WsAccount | null = null;
    if (token) {
      account = await this.deps.validateSession(token).catch(() => null);
      if (!account) {
        try {
          socket.write("HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 14\r\n\r\nInvalid session.");
          socket.destroy();
        } catch { /* already gone */ }
        return;
      }
    }
    const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
    try {
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      );
    } catch {
      return;
    }
    const now = Date.now();
    const conn: TowConnection = {
      socket,
      accountId: account ? account.id : null,
      username: account ? account.username : null,
      activity: "idle",
      city: null,
      connectedAt: now,
      lastSeenAt: now,
      authed: account !== null,
      buffer: Buffer.alloc(0),
      fragments: [],
      fragmentOpcode: OP_TEXT,
      closing: false,
    };
    this.connections.set(socket, conn);
    if (account) {
      this.send(conn, { type: "auth_ok", playerId: account.id, username: account.username });
      this.broadcastPresence();
    } else {
      // No query token: the first message must be {"type":"auth"}.
      const timer = setTimeout(() => {
        this.authTimers.delete(timer);
        if (!conn.authed) {
          this.send(conn, { type: "error", reason: "Authentication required." });
          this.closeWith(conn, 4001, "Authentication required");
        }
      }, AUTH_TIMEOUT_MS);
      timer.unref?.();
      this.authTimers.add(timer);
    }
    socket.on("data", (chunk: Buffer) => {
      void this.onData(conn, chunk);
    });
    socket.on("close", () => this.removeConnection(conn));
    socket.on("error", () => this.removeConnection(conn));
    if (head.length > 0) void this.onData(conn, head);
  }

  private async onData(conn: TowConnection, chunk: Buffer): Promise<void> {
    conn.lastSeenAt = Date.now();
    conn.buffer = Buffer.concat([conn.buffer, chunk]);
    for (;;) {
      let frame: ParsedFrame;
      try {
        frame = parseFrame(conn.buffer);
      } catch (err) {
        this.closeWith(conn, 1002, err instanceof Error ? err.message : "Protocol error");
        return;
      }
      if (frame.consumed === 0) return; // need more data
      conn.buffer = conn.buffer.subarray(frame.consumed);
      await this.onFrame(conn, frame);
      if (conn.closing) return;
    }
  }

  private async onFrame(conn: TowConnection, frame: ParsedFrame): Promise<void> {
    switch (frame.opcode) {
      case OP_CLOSE: {
        this.closeWith(conn, 1000, "");
        return;
      }
      case OP_PING: {
        this.sendRaw(conn, OP_PONG, frame.payload);
        return;
      }
      case OP_PONG: {
        return; // liveness only — lastSeenAt already updated
      }
      case OP_BINARY: {
        this.closeWith(conn, 1003, "Binary frames are not supported.");
        return;
      }
      case OP_TEXT:
      case OP_CONTINUATION: {
        if (frame.opcode === OP_TEXT) {
          if (conn.fragments.length > 0) {
            this.closeWith(conn, 1002, "New text frame inside a fragmented message.");
            return;
          }
          conn.fragmentOpcode = OP_TEXT;
        }
        conn.fragments.push(frame.payload);
        const total = conn.fragments.reduce((n, b) => n + b.length, 0);
        if (total > MAX_MESSAGE_BYTES) {
          this.closeWith(conn, 1009, "Message too large.");
          return;
        }
        if (!frame.fin) return;
        const data = Buffer.concat(conn.fragments);
        conn.fragments = [];
        await this.onMessage(conn, data.toString("utf8"));
        return;
      }
      default: {
        this.closeWith(conn, 1002, "Unknown opcode.");
        return;
      }
    }
  }

  private async onMessage(conn: TowConnection, text: string): Promise<void> {
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
      message = parsed as Record<string, unknown>;
    } catch {
      this.send(conn, { type: "error", reason: "Invalid JSON." });
      return;
    }
    const type = message.type;
    if (!conn.authed) {
      if (type !== "auth" || typeof message.token !== "string") {
        this.send(conn, { type: "error", reason: "Authentication required." });
        this.closeWith(conn, 4001, "Authentication required");
        return;
      }
      const account = await this.deps.validateSession(message.token).catch(() => null);
      if (!account) {
        this.send(conn, { type: "error", reason: "Invalid or expired session." });
        this.closeWith(conn, 4001, "Invalid session");
        return;
      }
      conn.accountId = account.id;
      conn.username = account.username;
      conn.authed = true;
      this.send(conn, { type: "auth_ok", playerId: account.id, username: account.username });
      this.broadcastPresence();
      return;
    }
    switch (type) {
      case "ping": {
        this.send(conn, {
          type: "pong",
          clientTime: typeof message.clientTime === "number" ? message.clientTime : null,
          serverTime: Date.now(),
        });
        return;
      }
      case "presence_update": {
        const activity = message.activity === "playing" ? "playing" : "idle";
        const city = typeof message.city === "string" && message.city.length > 0 && message.city.length <= 100
          ? message.city : null;
        if (conn.activity !== activity || conn.city !== city) {
          conn.activity = activity;
          conn.city = city;
          this.broadcastPresence();
        }
        return;
      }
      case "auth": {
        // Already authed — re-auth is a no-op ack.
        this.send(conn, { type: "auth_ok", playerId: conn.accountId, username: conn.username });
        return;
      }
      default: {
        this.send(conn, { type: "error", reason: "Unknown message type." });
        return;
      }
    }
  }
}

// --- Community event push: a notifying CommunityStore decorator ---

/** Wrap a CommunityStore so community writes also emit a push
 *  event (debounced: at most one emit per event type per 2s, so a
 *  burst of commands does not spam every socket). The wrapped
 *  store's behavior is unchanged — the emit is fire-and-forget and
 *  can never throw into the game path.
 *
 *  Key classification: the lifetime board + the weekly/monthly/
 *  wealth/fame boards (tow:lb:*) are "leaderboard"; challenge
 *  totals + contribution sets (tow:challenge:*) are
 *  "challenge_progress"; the trade-offers list is "trade_offer".
 *  Save-key writes never emit (they are not community events). */
export function withCommunityNotifications(
  store: CommunityStore,
  emit: (event: CommunityEvent) => void,
): CommunityStore {
  const lastEmit = new Map<CommunityEventType, number>();
  const maybeEmit = (event: CommunityEventType): void => {
    try {
      const now = Date.now();
      const last = lastEmit.get(event) ?? 0;
      if (now - last < 2000) return;
      lastEmit.set(event, now);
      emit({ event, at: now });
    } catch { /* push must never break the game path */ }
  };
  const classify = (key: string): CommunityEventType | null => {
    if (key === LEADERBOARD_KEY || key.startsWith("tow:lb:")) return "leaderboard";
    if (key.startsWith("tow:challenge:")) return "challenge_progress";
    if (key === TRADE_OFFERS_KEY) return "trade_offer";
    return null;
  };
  const afterWrite = (key: string): void => {
    const event = classify(key);
    if (event) maybeEmit(event);
  };
  return {
    get: (key: string): Promise<string | null> => store.get(key),
    set: async (key: string, value: string): Promise<void> => {
      await store.set(key, value);
      afterWrite(key);
    },
    del: (key: string): Promise<void> => store.del(key),
    zAdd: async (key: string, member: string, score: number): Promise<void> => {
      await store.zAdd(key, member, score);
      afterWrite(key);
    },
    zTop: (key: string, n: number): Promise<{ member: string; score: number }[]> => store.zTop(key, n),
    zRank: (key: string, member: string): Promise<number | null> => store.zRank(key, member),
    zScore: (key: string, member: string): Promise<number | null> => store.zScore(key, member),
    zIncrBy: async (key: string, member: string, amount: number): Promise<number> => {
      const next = await store.zIncrBy(key, member, amount);
      afterWrite(key);
      return next;
    },
    incrBy: async (key: string, amount: number): Promise<number> => {
      const next = await store.incrBy(key, amount);
      afterWrite(key);
      return next;
    },
    expire: (key: string, seconds: number): Promise<void> => store.expire(key, seconds),
  };
}
