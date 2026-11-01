---
title: "Redis sorted set + DB of record"
order: 1
---

Score updates go to SQL (source of truth) and ZINCRBY on Redis. Top-N via ZREVRANGE, own rank via ZREVRANK. Daily boards are separate keys with TTL.

## Design decisions

One Redis board has a memory and write limit; shard by score range only when measurements require it.

Authenticate game servers and dedup eventId; clients must not arbitrarily assign scores.

Read the serving sorted sets; document lag if an asynchronous index is used.

A sharded rank needs counts of higher score buckets plus the rank within the player bucket.

## Trade-offs

- Simple, very fast up to ~100M members per shard
- Redis memory is the limit



## Failure handling

Score commits but the ranking index update is lost: Replay a durable outbox/event log using score versions. Reads may temporarily lag; rebuild Redis from authoritative scores rather than losing results.
