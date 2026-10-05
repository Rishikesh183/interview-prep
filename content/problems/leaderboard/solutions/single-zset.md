---
title: "Redis sorted set + DB of record"
order: 1
---

Score updates go to SQL (source of truth) and ZINCRBY on Redis. Top-N via ZREVRANGE, own rank via ZREVRANK. Daily boards are separate keys with TTL.

## Trade-offs

- Simple, very fast up to ~100M members per shard
- Redis memory is the limit
