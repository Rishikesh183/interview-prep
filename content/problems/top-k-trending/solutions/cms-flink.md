---
title: "Count-min sketch per window"
order: 1
---

Kafka partitions events by item; Flink keeps a count-min sketch + min-heap per partition per 1-min bucket, emits partial top-K; an aggregator merges partials and writes top-100 per window to Redis.

## Design decisions

Choose sketch error/confidence and window granularity explicitly; retain raw data for exact historical repair.

Dedup event IDs within the policy window; separate event time from processing time.

Expose window and approximation/freshness semantics; do not recompute a global sort on every query.

## Trade-offs

- Bounded memory
- Approximate; overcounts rare items slightly



## Failure handling

Late events arrive after a window was published: Use a watermark and an allowed-lateness policy; publish corrected window versions if supported. Keep approximate live and exact batch outputs distinguishable.
