---
title: "Cache stampedes and request coalescing"
kind: pattern
tags: ["caching", "stampede", "singleflight", "reliability"]
components: ["service", "cache", "sql_db"]
related: ["caching-strategies", "hot-partitions", "backpressure-load-shedding", "distributed-locks-consensus"]
---

## What it is

Many requests miss the same cached value together and independently recompute or fetch it, overwhelming the origin. The trigger can be expiry, eviction, deployment or a cold cache, even when ordinary hit-path traffic is safe.

## When to use it

Hot URL mappings, popular product pages, expensive aggregations and metadata lookups where many callers share a result. Design the miss path and origin budget before relying on a high hit ratio.

## How it works

1. Coalesce concurrent refreshes with a per-key single-flight mechanism. Other callers wait under a short deadline or receive an allowed stale value.
2. For a distributed lease, use an owner token, bounded TTL and safe release; a slow old owner must not delete another owner's lease or overwrite a newer version.
3. Jitter expiry across different keys. For a single hot key, also consider early refresh; jitter alone does not coalesce simultaneous requests for that one key.
4. Cap origin concurrency and protect negative lookups with short-lived negative caching where appropriate.

### Worked example

At 10K requests/s for one key and 100 ms origin latency, roughly **1,000 requests** can reach a missing value before the first result returns. Coalescing can reduce that to one refresh per coordination domain. Process-local single-flight still allows one refresh per application instance; choose whether that is within the origin budget or a shared lease is worth its extra failure modes. Draw a miss branch from Service to Database, not a magical Redis → Database fetch.

## Trade-offs

Waiters add latency and leases can fail. Serving stale content is a product decision: expired access rights or expiring links may require a hard freshness check. If refresh is unavailable, bound waiting and return a controlled response instead of holding every request indefinitely.

## Interview one-liners

- “The cache is optional for correctness, but the origin must still survive a cold-cache event.”

## Common follow-up questions

- **Lease holder crashes?** Expire its lease, bound waiter deadlines and allow a fenced successor.
- **Every key expires together?** Jitter expiry and warm gradually under an origin budget.
- **Can stale data always be served?** Only within the stated freshness and authorization policy.

## Further reading

- [Caching challenges and strategies — Amazon Builders' Library](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
