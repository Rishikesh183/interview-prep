---
title: "Push agents → Kafka → TSDB"
order: 1
---

Agents push batches to collectors which write to Kafka; consumers write to a sharded TSDB; a Flink job computes 1-min/1-h rollups; alert evaluator reads recent data from Kafka/stream and notifies via PagerDuty.

## Design decisions

Control label cardinality; downsample historical blocks and separate ingestion from expensive queries.

Apply query cost limits; choose raw or rolled-up resolution based on requested time span.

Acknowledge after WAL/stream append and reject excessive label cardinality.

## Trade-offs

- Buffering absorbs spikes
- More moving parts



## Failure handling

A target disappears or ingestion backs up: Track scrape failures and missing series separately from zero values. Alert on collection health, cap buffers, and expose dropped-sample counters rather than hiding data gaps.
