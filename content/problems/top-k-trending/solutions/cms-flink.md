---
title: "Count-min sketch per window"
order: 1
---

Kafka partitions events by item; Flink keeps a count-min sketch + min-heap per partition per 1-min bucket, emits partial top-K; an aggregator merges partials and writes top-100 per window to Redis.

## Trade-offs

- Bounded memory
- Approximate; overcounts rare items slightly
