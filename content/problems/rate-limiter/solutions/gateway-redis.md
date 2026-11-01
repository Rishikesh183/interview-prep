---
title: "Gateway middleware + Redis token bucket"
order: 1
---

The API gateway runs the limiter as middleware. Token buckets per API key live in a Redis cluster and are refilled lazily inside a Lua script (atomic read-modify-write). Over-limit → 429 with Retry-After.

## Design decisions

Shard by subject/policy, use atomic scripts and account for hot-subject contention.

Gateway middleware may invoke this internally; the separate limiter variant exposes the same internal contract. Define whether retries consume quota again.

The backend executes only after the admission decision; use a coarse emergency local cap during shared-store outages.

## Trade-offs

- No extra network hop beyond Redis
- Token bucket allows bursts up to bucket size
- Fail open if Redis is unavailable to protect availability



## Failure handling

The shared counter store is unreachable: Choose fail-open for availability-oriented reads with a local emergency cap; fail-closed for expensive or sensitive operations. Bound the decision timeout and return a documented retry response.
