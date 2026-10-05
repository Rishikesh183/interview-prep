---
title: "Geo indexing"
tags: ["geo","search"]
components: ["geo_index"]
related: ["sharding-partitioning","caching-strategies"]
---

## What it is

Indexing locations so 'things near this point' queries are fast, by dividing the map into cells.

## When to use it

Nearby search (restaurants, drivers), geofencing, location-based matching.

## How it works

- **Geohash**: encodes lat/lng into a string; shared prefixes mean nearby cells. Search the target cell plus its 8 neighbours.
- **Quadtree**: recursively splits dense areas into smaller cells; adapts to density.
- **S2 / H3**: hierarchical cells on a sphere, used by large map and ride-hailing systems.
- Moving objects (drivers) live in memory (Redis GEO) with TTLs; static places can be rebuilt periodically.

## Trade-offs

- Fixed-size cells are uneven: crowded in cities, empty elsewhere.
- Points near a cell edge need neighbour cells searched too.
- High update rates (location pings) need an in-memory index, not a disk database.

## Interview one-liners

- "Drivers' locations go to Redis GEO keyed by city; matching runs GEOSEARCH within 2 km."

## Common follow-up questions

- How do you handle a user right at a cell boundary?
- How does the index cope with 1M location updates per second?

## Further reading

- [Redis geospatial](https://redis.io/docs/latest/develop/data-types/geospatial/)
- [H3 documentation](https://h3geo.org/docs/)
- [PostGIS documentation](https://postgis.net/documentation/)
