---
title: "CRDT with pub/sub relay"
order: 2
---

Clients apply CRDT ops locally (Yjs/Automerge) and send them through any WebSocket node; Redis pub/sub relays per doc; ops stored in a KV log; snapshots compacted periodically.

## Trade-offs

- Offline edits merge naturally
- Metadata overhead of CRDTs grows; needs compaction
