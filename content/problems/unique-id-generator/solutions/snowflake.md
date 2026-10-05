---
title: "Snowflake"
order: 1
---

41-bit ms timestamp, 5-bit datacenter, 5-bit worker, 12-bit sequence. Worker IDs leased from ZooKeeper at startup. Generators are stateless otherwise and run in every region.

## Trade-offs

- 4096 IDs/ms per worker
- Depends on reasonably synced clocks
- ~69 years of timestamps
