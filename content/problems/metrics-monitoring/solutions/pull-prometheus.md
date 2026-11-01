---
title: "Pull-based (Prometheus + Thanos)"
order: 2
---

Prometheus servers scrape targets discovered via service discovery, store locally, and ship blocks to object storage; Thanos queries across shards; Alertmanager handles alerts.

## Design decisions

Control label cardinality; downsample historical blocks and separate ingestion from expensive queries.

Apply query cost limits; choose raw or rolled-up resolution based on requested time span.

## Trade-offs

- Simple per-team
- Global queries and HA need extra layers



## Failure handling

A target disappears or ingestion backs up: Track scrape failures and missing series separately from zero values. Alert on collection health, cap buffers, and expose dropped-sample counters rather than hiding data gaps.
