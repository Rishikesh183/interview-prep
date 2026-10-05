---
title: "Micro-batch aggregation"
order: 2
---

Clicks land in S3 via Kafka Connect; Spark Structured Streaming aggregates every minute into a warehouse.

## Trade-offs

- Simpler ops
- Minute-level latency floor
