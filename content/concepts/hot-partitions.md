---
title: "Hot keys, hot partitions and write sharding"
kind: pattern
tags: ["skew", "sharding", "hot-keys", "capacity"]
components: ["nosql_kv", "cache", "event_stream", "service"]
related: ["sharding-partitioning", "consistent-hashing", "hybrid-fan-out", "cache-stampede"]
---

## What it is

A small number of keys can dominate traffic and exhaust one partition while the rest of a cluster is idle. Hashing many distinct keys evenly does not split the load for one exceptionally popular key.

## When to use it

Celebrity feeds, global counters, popular products, single-room chat streams or date-based event partitions. Diagnose per-key/partition utilization and lag before adding machines. The right repair differs for read and write hotspots.

## How it works

- For read hotspots, cache/replicate immutable or appropriately versioned values and coalesce refreshes.
- For splittable writes, salt a logical key into multiple physical keys. A deterministic suffix can support targeted lookup; random suffixes often require querying and merging every bucket.
- For events, partition by a finer key only if the application can tolerate the changed ordering boundary.
- Keep exclusive ownership invariants at an authoritative decision point; arbitrary salting cannot make a seat or final stock unit safe to sell twice.

### Worked example

A counter receives 600K updates/s. Sixteen suffix buckets average **37.5K updates/s each**, before skew and replication overhead. Compare that with measured per-partition limits; sixteen is an illustrative calculation, not a guaranteed sufficient shard count. Reading the exact counter now needs a merge over sixteen buckets or a maintained aggregate. In the HLD, label `counter:{id}:{bucket}` rather than drawing an unexplained “sharded DB” box.

## Trade-offs

Write sharding moves work onto reads and coordination. It can weaken a simple atomic increment/compare-and-set contract. Repartitioning changes routing and requires migration/deduplication. Read replicas will not remove a single authoritative write bottleneck by themselves.

## Interview one-liners

- “I model skew and the hottest partition, not just aggregate QPS divided by server count.”
- “Splitting a key changes the merge and consistency contract, so I state that before sharding it.”

## Common follow-up questions

- **Can consistent hashing solve one hot key?** It chooses an owner; splitting/replicating the value needs another mechanism.
- **Need an exact limited inventory count?** Use authoritative atomic admission or safely preallocate inventory rights; do not oversell independently salted counters.
- **How is the bucket count chosen?** Peak hot-key load, measured capacity, headroom and acceptable read amplification.

## Further reading

- [Write sharding and its read trade-offs — DynamoDB documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html)
