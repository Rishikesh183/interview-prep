---
title: "Leader per range (Raft)"
order: 2
---

Key ranges are split into Raft groups; leader handles writes; ranges split/merge and rebalance automatically; metadata in an etcd-like store.

## Design decisions

Quorum overlap alone does not give linearizability with concurrent writes; choose causal reconciliation or consensus explicitly.

Return causal context for Dynamo reconciliation, or a committed leader-read version for range consensus.

Acknowledge only after the required replica quorum; retry using the same operation ID or version precondition.

## Trade-offs

- Strong consistency per key
- Unavailable for a range during leader election



## Failure handling

A replica or leader is unavailable: Dynamo can use hinted handoff and repair with explicit conflict semantics. Range consensus needs a reachable majority; elect a fenced leader and repair followers from the log.
