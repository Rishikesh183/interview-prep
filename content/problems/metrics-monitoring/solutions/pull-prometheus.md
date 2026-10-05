---
title: "Pull-based (Prometheus + Thanos)"
order: 2
---

Prometheus servers scrape targets discovered via service discovery, store locally, and ship blocks to object storage; Thanos queries across shards; Alertmanager handles alerts.

## Trade-offs

- Simple per-team
- Global queries and HA need extra layers
