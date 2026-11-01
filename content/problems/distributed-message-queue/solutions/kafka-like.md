---
title: "Partitioned logs with ISR replication"
order: 1
---

Each partition is an append-only segment log on a leader broker with followers; producers with acks=all wait for the ISR; a Raft-based controller assigns leaders; consumer groups commit offsets to an internal topic.

## Design decisions

Partition count must cover throughput and consumer parallelism; retention dominates disk sizing.

acks=all waits for the in-sync replica set subject to min ISR; it is not an end-to-end exactly-once guarantee.

Consumer groups own partition assignments; keep commit progress separate from fetch position.

## Trade-offs

- Sequential disk IO is fast
- Rebalances pause consumers



## Failure handling

A broker crashes after append but before the producer receives an ack: The producer retries with the same identity and sequence. Elect only an eligible replica; consumers may reprocess records after a rebalance, so sinks must dedup.
