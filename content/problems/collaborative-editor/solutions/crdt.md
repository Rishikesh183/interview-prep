---
title: "CRDT with pub/sub relay"
order: 2
---

Clients apply CRDT ops locally (Yjs/Automerge) and send them through any WebSocket node; Redis pub/sub relays per doc; ops stored in a KV log; snapshots compacted periodically.

## Design decisions

Shard by document rather than splitting one OT document across uncoordinated leaders.

Persist edits before ack. OT transforms against the server revision; CRDT exchanges state vectors and missing updates.

Authorize both snapshot access and log replay; a snapshot reduces startup replay work.

## Trade-offs

- Offline edits merge naturally
- Metadata overhead of CRDTs grows; needs compaction



## Failure handling

Session server fails while editors are typing: Reconnect using the last durable revision/state vector and resend unacknowledged operation IDs. Rebuild from snapshot plus log; fence the old OT leader before admitting writes.
