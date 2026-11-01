---
title: "Location stream + sharded geo index"
order: 2
---

Location pings are produced to Kafka partitioned by geohash prefix. Geo-index workers consume and maintain in-memory H3 cell → drivers maps, sharded by region. Dispatch queries the owning shard and claims a driver with a conditional write on the driver's state row.

## Design decisions

Shard geo state by region/city; persist trip assignments separately from ephemeral location data.

A geo candidate is not an assignment; conditionally claim before notifying the driver.

Kafka mode can use HTTP batch ingestion for the same message shape; ordering is per driver, not global.

## Trade-offs

- Replayable stream feeds analytics/ETA too
- More components, slightly higher latency
- Conditional write gives exactly one assignment



## Failure handling

Two matchers select the same nearby driver: Only one conditional availability claim succeeds; retry the losing matcher with another candidate. Expire stale location membership and fence late acceptance of an expired offer.
