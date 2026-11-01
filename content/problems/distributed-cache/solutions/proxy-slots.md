---
title: "Proxy tier + hash slots"
order: 2
---

Redis-Cluster style 16384 hash slots, a proxy tier routes requests, primaries replicate to replicas, gossip detects failures and promotes replicas.

## Design decisions

Partition memory across shards; size for a failed shard moving to survivors.

Client-ring or proxy routing chooses the shard. A miss causes the application, not the cache, to fetch the source of truth.

Hash key routing must be consistent for GET and SET. Never treat replication of cached data as a durable write guarantee.

## Trade-offs

- Simple clients
- Extra hop and proxy capacity to manage



## Failure handling

A cache shard dies or membership changes: Treat misses as recoverable; rebuild gradually with request coalescing and jittered TTLs. Bound source-of-truth load, and version membership to prevent inconsistent routing loops.
