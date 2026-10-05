---
title: "Stateless brokers + tiered storage"
order: 2
---

Brokers keep only recent segments locally and offload to object storage; metadata in a consensus store; read-from-follower.

## Trade-offs

- Cheap long retention, elastic brokers
- Higher latency for old reads
