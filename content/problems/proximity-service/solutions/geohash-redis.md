---
title: "Geohash in Redis / DB index"
order: 1
---

Store geohash (precision 6) per business; query the target cell plus 8 neighbours; cache cell → business IDs in Redis; business details from read replicas.

## Trade-offs

- Simple, works in any DB
- Fixed cell sizes are uneven in dense areas
