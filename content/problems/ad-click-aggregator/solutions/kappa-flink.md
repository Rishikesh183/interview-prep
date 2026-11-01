---
title: "Kafka + Flink + OLAP"
order: 1
---

Click service logs click_id + ad_id to Kafka and 302-redirects. Flink dedups by click_id, aggregates in 1-min tumbling windows with watermarks for late events, and writes to an OLAP store (ClickHouse/Pinot) with idempotent upserts. Raw clicks also land in S3; a nightly Spark job recomputes for billing reconciliation.

## Design decisions

Partition ingestion, retain raw events and materialize small window aggregates for queries.

Acknowledge/log durably before counting; duplicate click IDs do not produce duplicate billable events.

Expose the aggregation freshness and late-event correction policy; operational totals and settled billing can differ.

## Trade-offs

- Near-real-time + accurate billing
- Two code paths to keep consistent



## Failure handling

Late or duplicate events change a previously shown count: Dedup by click_id, use event-time windows and publish corrected aggregate versions. Reconcile billing from raw events with a documented cutoff.
