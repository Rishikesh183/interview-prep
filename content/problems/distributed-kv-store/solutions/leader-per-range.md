---
title: "Leader per range (Raft)"
order: 2
---

Key ranges are split into Raft groups; leader handles writes; ranges split/merge and rebalance automatically; metadata in an etcd-like store.

## Trade-offs

- Strong consistency per key
- Unavailable for a range during leader election
