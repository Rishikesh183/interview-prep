---
title: "Snowflake"
order: 1
---

41-bit ms timestamp, 5-bit datacenter, 5-bit worker, 12-bit sequence. Worker IDs leased from ZooKeeper at startup. Generators are stateless otherwise and run in every region.

## Design decisions

Choose an epoch and worker lease policy; wait or fail when the sequence is exhausted or the clock regresses.

Serialize 64-bit integers as strings in JSON. Library mode calls this locally; UUIDv7 returns 128-bit values and requires a relaxed ID-width requirement.

## Trade-offs

- 4096 IDs/ms per worker
- Depends on reasonably synced clocks
- ~69 years of timestamps



## Failure handling

Clock moves backward or a worker lease is reassigned: A Snowflake generator stops/waits rather than emitting overlapping timestamps; fence obsolete leases and delay namespace reuse. Ticket ranges avoid clock dependence but lose global time order.
