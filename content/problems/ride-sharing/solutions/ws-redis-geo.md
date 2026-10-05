---
title: "WebSockets + Redis GEO"
order: 1
---

Driver apps hold WebSockets to a location gateway which writes to Redis GEO sets sharded by city (GEOADD, 30 s TTL per driver). The matching service queries GEOSEARCH for nearby available drivers and assigns atomically with a Lua script that flips the driver from available to busy. Trips are stored in SQL; payments via a PSP.

## Trade-offs

- Redis handles the write rate in memory
- Location loss on Redis failure is acceptable (next ping repairs it)
- City-level sharding keeps hot spots contained
