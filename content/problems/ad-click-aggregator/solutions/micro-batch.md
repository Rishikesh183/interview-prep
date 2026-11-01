---
title: "Micro-batch aggregation"
order: 2
---

Clicks land in S3 via Kafka Connect; Spark Structured Streaming aggregates every minute into a warehouse.

## Design decisions

Partition ingestion, retain raw events and materialize small window aggregates for queries.

Acknowledge/log durably before counting; duplicate click IDs do not produce duplicate billable events.

Expose the aggregation freshness and late-event correction policy; operational totals and settled billing can differ.

## Trade-offs

- Simpler ops
- Minute-level latency floor



## Failure handling

Late or duplicate events change a previously shown count: Dedup by click_id, use event-time windows and publish corrected aggregate versions. Reconcile billing from raw events with a documented cutoff.
