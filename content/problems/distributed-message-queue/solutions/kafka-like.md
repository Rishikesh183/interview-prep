---
title: "Partitioned logs with ISR replication"
order: 1
---

Each partition is an append-only segment log on a leader broker with followers; producers with acks=all wait for the ISR; a Raft-based controller assigns leaders; consumer groups commit offsets to an internal topic.

## Trade-offs

- Sequential disk IO is fast
- Rebalances pause consumers
