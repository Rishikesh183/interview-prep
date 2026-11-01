---
title: "WebSockets + Redis GEO"
order: 1
---

Driver apps maintain WebSockets to a location gateway. The gateway updates city-sharded Redis GEO sets and a separate per-driver heartbeat-expiry index, since GEO members do not have individual key TTLs. Matching queries fresh candidates and claims a driver with a fenced conditional state transition. Trips persist in SQL; payments use an external provider.

## Design decisions

Shard geo state by region/city; persist trip assignments separately from ephemeral location data.

A geo candidate is not an assignment; conditionally claim before notifying the driver.

Kafka mode can use HTTP batch ingestion for the same message shape; ordering is per driver, not global.

## Trade-offs

- Redis handles the write rate in memory
- Location loss on Redis failure is acceptable (next ping repairs it)
- City-level sharding keeps hot spots contained



## Failure handling

Two matchers select the same nearby driver: Only one conditional availability claim succeeds; retry the losing matcher with another candidate. Expire stale location membership and fence late acceptance of an expired offer.
