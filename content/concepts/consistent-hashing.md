---
title: "Consistent hashing"
tags: ["distributed-systems","scalability"]
components: ["cache","nosql_kv"]
related: ["sharding-partitioning","replication","load-balancing"]
---

## What it is

A way to map keys to servers so that adding or removing a server moves only a small fraction of keys, instead of almost all of them.

## When to use it

Distributed caches, key-value stores, and any load balancing where the same key should keep landing on the same node.

## How it works

- Servers and keys are hashed onto the same circular space (a **ring**). A key belongs to the first server clockwise from it.
- Adding a server only takes over keys from its neighbour; removing one hands them to the next.
- **Virtual nodes**: each server appears many times on the ring, which evens out the load.
- For replication, a key is also stored on the next N−1 servers on the ring.

## Trade-offs

- Without virtual nodes the load is uneven.
- Clients or routers need an up-to-date view of the ring (membership via gossip or a coordinator).
- Hot keys still overload one node; hashing doesn't fix popularity skew.

## Interview one-liners

- "hash(key) % N reshuffles everything when N changes; a hash ring with virtual nodes moves about 1/N of keys."

## Common follow-up questions

- How many virtual nodes, and why?
- How does a client learn that the ring changed?
- What happens to the keys of a node that dies?

## Further reading

- [Cassandra: Dynamo architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
