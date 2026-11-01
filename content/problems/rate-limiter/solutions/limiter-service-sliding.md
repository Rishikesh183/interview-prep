---
title: "Dedicated limiter tier, sliding window"
order: 2
---

A separate rate-limiter tier sits in front of services and keeps a sliding window counter (current + previous window weighted) in Redis using atomic INCR with EXPIRE.

## Design decisions

Shard by subject/policy, use atomic scripts and account for hot-subject contention.

Gateway middleware may invoke this internally; the separate limiter variant exposes the same internal contract. Define whether retries consume quota again.

The backend executes only after the admission decision; use a coarse emergency local cap during shared-store outages.

## Trade-offs

- Smoother than fixed windows, cheaper than sliding logs
- Extra hop, but independently scalable and reusable
- Fail closed for expensive endpoints, fail open elsewhere



## Failure handling

The shared counter store is unreachable: Choose fail-open for availability-oriented reads with a local emergency cap; fail-closed for expensive or sensitive operations. Bound the decision timeout and return a documented retry response.
