---
title: "Geohash in Redis / DB index"
order: 1
---

Store geohash (precision 6) per business; query the target cell plus 8 neighbours; cache cell → business IDs in Redis; business details from read replicas.

## Design decisions

Shard by geographic region and replicate hot regions; use exact-distance filtering for cell-boundary correctness.

Search every intersecting cell, then exact-distance filter and rank. A fixed nine-cell scan is only sufficient for a bounded radius/cell-size combination. Bind cursors to the query center/radius and stable distance/ID ordering.

Publish index changes through a durable change feed; document freshness if rebuilding periodically.

## Trade-offs

- Simple, works in any DB
- Fixed cell sizes are uneven in dense areas



## Failure handling

Geo index is stale after a business moves: Version the source record and index update; rebuild or replay changes. Filter inactive/deleted businesses during hydration and expose a defined freshness bound.
