---
title: "Central OT session per document"
order: 1
---

A consistent-hash LB routes all editors of a doc to one collaboration server which orders ops, transforms them (OT) and broadcasts; ops appended to a log, snapshots every N ops to object storage.

## Design decisions

Shard by document rather than splitting one OT document across uncoordinated leaders.

Persist edits before ack. OT transforms against the server revision; CRDT exchanges state vectors and missing updates.

Authorize both snapshot access and log replay; a snapshot reduces startup replay work.

## Trade-offs

- Simple total ordering
- Session server is a per-doc bottleneck and needs failover



## Failure handling

Session server fails while editors are typing: Reconnect using the last durable revision/state vector and resend unacknowledged operation IDs. Rebuild from snapshot plus log; fence the old OT leader before admitting writes.
