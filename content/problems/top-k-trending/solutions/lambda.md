---
title: "Lambda: fast approximate + slow exact"
order: 2
---

Streaming path as above for the 1-hour view; hourly/daily Spark jobs compute exact counts for longer windows.

## Design decisions

Choose sketch error/confidence and window granularity explicitly; retain raw data for exact historical repair.

Dedup event IDs within the policy window; separate event time from processing time.

Expose window and approximation/freshness semantics; do not recompute a global sort on every query.

## Trade-offs

- Accurate long windows
- Two pipelines to maintain



## Failure handling

Late events arrive after a window was published: Use a watermark and an allowed-lateness policy; publish corrected window versions if supported. Keep approximate live and exact batch outputs distinguishable.
