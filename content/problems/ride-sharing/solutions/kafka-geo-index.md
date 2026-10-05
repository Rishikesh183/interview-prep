---
title: "Location stream + sharded geo index"
order: 2
---

Location pings are produced to Kafka partitioned by geohash prefix. Geo-index workers consume and maintain in-memory H3 cell → drivers maps, sharded by region. Dispatch queries the owning shard and claims a driver with a conditional write on the driver's state row.

## Trade-offs

- Replayable stream feeds analytics/ETA too
- More components, slightly higher latency
- Conditional write gives exactly one assignment
