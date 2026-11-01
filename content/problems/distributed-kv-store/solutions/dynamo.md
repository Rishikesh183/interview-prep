---
title: "Dynamo-style leaderless"
order: 1
---

Consistent hashing with vnodes; any node coordinates; N=3, W=2, R=2; vector clocks with client-side merge; hinted handoff, read repair and Merkle-tree anti-entropy; gossip for membership.

## Design decisions

Quorum overlap alone does not give linearizability with concurrent writes; choose causal reconciliation or consensus explicitly.

Return causal context for Dynamo reconciliation, or a committed leader-read version for range consensus.

Acknowledge only after the required replica quorum; retry using the same operation ID or version precondition.

## Trade-offs

- Writes remain available only when the configured acknowledgements can be reached; sloppy quorums trade stronger semantics for availability
- Clients may see siblings



## Failure handling

A replica or leader is unavailable: Dynamo can use hinted handoff and repair with explicit conflict semantics. Range consensus needs a reachable majority; elect a fenced leader and repair followers from the log.
