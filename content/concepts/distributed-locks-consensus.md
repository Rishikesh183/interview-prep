---
title: "Distributed locks & consensus"
tags: ["distributed-systems","coordination"]
components: ["coordination","scheduler"]
related: ["id-generation","replication","idempotency"]
---

## What it is

Ways for several machines to agree on one thing: who the leader is, who holds a lock, what the configuration is. Consensus algorithms (Raft, Paxos) make that agreement safe despite failures.

## When to use it

Leader election (one scheduler dispatching jobs), exclusive work (one worker per shard), assigning unique machine ids, storing cluster config.

## How it works

- Coordination services (**ZooKeeper, etcd**) run consensus and expose locks, leases and watches.
- A **lease** is a lock with an expiry; the holder must renew it, so a crashed holder releases it automatically.
- **Fencing tokens** (increasing numbers) stop a stale ex-leader from writing after its lease expired.
- For simple cases, a database row lock or a Redis `SET NX PX` can do.

## Trade-offs

- Locks add latency and a dependency; prefer designs that don't need them (partitioning, idempotency).
- Redis-based locks are weaker under failures than consensus-based ones.

## Interview one-liners

- "Scheduler instances lease partitions from etcd; a dead instance's lease expires and another takes over."

## Common follow-up questions

- What if the lock holder pauses (GC) longer than the lease?
- What happens when the coordination service is unavailable?

## Further reading

- [The Raft consensus algorithm](https://raft.github.io/)
- [etcd documentation](https://etcd.io/docs/)
- [Redis: Distributed locks](https://redis.io/docs/latest/develop/use/patterns/distributed-locks/)
