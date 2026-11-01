---
title: "Smart clients + consistent hashing"
order: 1
---

Client library holds the hash ring (150 virtual nodes per server) from service discovery and talks to nodes directly. Each key is replicated to the next node on the ring.

## Design decisions

Partition memory across shards; size for a failed shard moving to survivors.

Client-ring or proxy routing chooses the shard. A miss causes the application, not the cache, to fetch the source of truth.

Hash key routing must be consistent for GET and SET. Never treat replication of cached data as a durable write guarantee.

## Trade-offs

- No proxy hop
- Clients must update rings consistently



## Failure handling

A cache shard dies or membership changes: Treat misses as recoverable; rebuild gradually with request coalescing and jittered TTLs. Bound source-of-truth load, and version membership to prevent inconsistent routing loops.
