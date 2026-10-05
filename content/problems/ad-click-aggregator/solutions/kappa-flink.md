---
title: "Kafka + Flink + OLAP"
order: 1
---

Click service logs click_id + ad_id to Kafka and 302-redirects. Flink dedups by click_id, aggregates in 1-min tumbling windows with watermarks for late events, and writes to an OLAP store (ClickHouse/Pinot) with idempotent upserts. Raw clicks also land in S3; a nightly Spark job recomputes for billing reconciliation.

## Trade-offs

- Near-real-time + accurate billing
- Two code paths to keep consistent
