---
title: "In-memory quadtree"
order: 2
---

Each search server builds an in-memory quadtree (leaf ≤ 100 businesses) at startup from the DB; rebuilt nightly with rolling restarts.

## Design decisions

Shard by geographic region and replicate hot regions; use exact-distance filtering for cell-boundary correctness.

Search every intersecting cell, then exact-distance filter and rank. A fixed nine-cell scan is only sufficient for a bounded radius/cell-size combination. Bind cursors to the query center/radius and stable distance/ID ordering.

Publish index changes through a durable change feed; document freshness if rebuilding periodically.

## Trade-offs

- Adapts to density
- Startup build time; memory per server (~2 GB)



## Failure handling

Geo index is stale after a business moves: Version the source record and index update; rebuild or replay changes. Filter inactive/deleted businesses during hydration and expose a defined freshness bound.
