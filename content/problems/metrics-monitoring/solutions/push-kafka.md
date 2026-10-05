---
title: "Push agents → Kafka → TSDB"
order: 1
---

Agents push batches to collectors which write to Kafka; consumers write to a sharded TSDB; a Flink job computes 1-min/1-h rollups; alert evaluator reads recent data from Kafka/stream and notifies via PagerDuty.

## Trade-offs

- Buffering absorbs spikes
- More moving parts
