---
title: "Proxy tier + hash slots"
order: 2
---

Redis-Cluster style 16384 hash slots, a proxy tier routes requests, primaries replicate to replicas, gossip detects failures and promotes replicas.

## Trade-offs

- Simple clients
- Extra hop and proxy capacity to manage
