---
title: "Smart clients + consistent hashing"
order: 1
---

Client library holds the hash ring (150 virtual nodes per server) from service discovery and talks to nodes directly. Each key is replicated to the next node on the ring.

## Trade-offs

- No proxy hop
- Clients must update rings consistently
