# Phone Message Expansion + Read-State Fix — v0.108.24 spec (item 10)

## Live bug (Dre, 2026-11-02)

Viewing phone messages leaves them UNREAD, and there is no way to open a
single message the way email works (`email read [id]` / `read [id]`).

## Root cause (verified in-tree, not guessed)

- `GameEngine.messages()` renders SMS with read/unread icons but never
  calls any mark-read primitive — so inbound SMS (`read: false` from
  `CommHub.receiveSMS`) stays unread forever.
- No open/delete command for SMS is wired, and the listing shows no ids,
  so a player cannot even reference a single message.
- The primitives already exist and are unused: `CommHub.markSMSRead`,
  `markAllSMSRead`, `getSMSById`, `deleteSMS`.
- Persistence is sound: `getPlayer()` includes `sms` (with read flags)
  and `loadState()` restores via `restoreSMS` — so once read flags are
  set, they survive save → quit → reload. No persistence work needed.

## Fix (required)

1. `messages` (view) marks the messages it shows as read. The listing
   then shows read state accurately (all shown ✅) and `phone`'s unread
   SMS count drops accordingly.
2. Open-message parity with email: `read message [id]` opens one SMS —
   full content, sender, date — and marks ONLY that message read.
   Unknown id → "Message not found." (never a suggestion, mirroring the
   mail error). `message [id]` is an alias for the same action.
3. Listings show id + read/unread state for every message, so open and
   delete are addressable.

## Expansion (bounded)

4. `threads` — conversations grouped by contact (name, message count,
   unread count, latest snippet, latest first). No invented contacts:
   threads derive only from messages actually present.
5. `thread [name]` — one conversation in full (oldest first), marks
   that thread's messages read.
6. `delete message [id]` — mail-consistent delete (mirrors
   `email delete [id]`); unknown id → "Message not found."

## Commands (all new tokens in KNOWN_COMMANDS)

- `messages` — changed: marks shown messages read (was list-only).
- `read message [id]` / `message [id]` — open one SMS (new).
- `threads` — conversation list (new).
- `thread [name]` — one conversation, marks its messages read (new).
- `delete message [id]` — delete one SMS (new).

## Constraints

- Additive only; SMS shape unchanged (existing `read` flag reused).
- Read-state changes ride the existing save round-trip — no new store.
- No new punishment, cost, or gate: reading is free, as with mail.
- Help updated: new bullets in Life & Family (§5), under the existing
  phone/messages lines; `messages` bullet reworded to state view-marks-read.
- Harness proves: view marks read (unread count drops, listing shows
  ✅); open marks ONLY that message read (siblings stay 🔵); listing
  state correct after both; unread counts accurate before/after;
  threads group correctly with per-thread unread counts; unknown ids
  refuse cleanly; delete removes exactly one message.

## Deliberately not in scope

- Message search across threads (existing `search` covers comms).
- Starring/pinning SMS, message forwarding, group SMS threads.
- Any change to email read behavior (already correct).
