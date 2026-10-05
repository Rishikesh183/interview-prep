---
title: "Score-range shards + stream"
order: 2
---

Updates flow through Kafka; consumers write to shards bucketed by score range so top-N only reads the highest shard; ranks = sum of counts in higher shards + local rank.

## Trade-offs

- Scales writes horizontally
- Players move between shards as scores change
