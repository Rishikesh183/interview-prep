---
title: "Central OT session per document"
order: 1
---

A consistent-hash LB routes all editors of a doc to one collaboration server which orders ops, transforms them (OT) and broadcasts; ops appended to a log, snapshots every N ops to object storage.

## Trade-offs

- Simple total ordering
- Session server is a per-doc bottleneck and needs failover
