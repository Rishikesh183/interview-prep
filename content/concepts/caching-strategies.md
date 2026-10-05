---
title: "Caching strategies"
tags: ["performance","read-heavy"]
components: ["cache"]
related: ["cdn","consistency-models","back-of-envelope-estimation"]
---

## What it is

A cache keeps copies of frequently read data in fast memory (e.g. Redis) so most reads skip the slower database.

## When to use it

Read-heavy workloads (10:1 or more), expensive queries or computed results, and data where being a few seconds stale is acceptable.

## How it works

- **Cache-aside** (most common): the app reads the cache, and on a miss reads the DB and fills the cache.
- **Write-through**: writes go to the cache and DB together; reads are always warm, writes are slower.
- **Write-back**: writes go to the cache and are flushed later; fast, but data can be lost.
- **Eviction**: LRU / LFU when memory is full; **TTL** bounds staleness.
- Size it with the 80/20 rule: cache the hottest ~20% of daily reads.

## Trade-offs

- Every cache is a consistency problem: decide how stale is acceptable and how invalidation happens.
- **Thundering herd**: a popular key expires and thousands of requests hit the DB; use request coalescing or jittered TTLs.
- **Hot keys** can overload one cache node; replicate them or add a local in-process cache.

## Interview one-liners

- "Cache-aside in Redis with a 24h TTL; the cache holds the hot 20%, about 30 GB."
- "On writes I delete the cache key rather than update it, to avoid racing writers."

## Common follow-up questions

- How do you invalidate when the underlying data changes?
- What happens if the cache cluster goes down?
- How do you prevent a stampede when a hot key expires?

## Further reading

- [Redis documentation](https://redis.io/docs/latest/)
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
