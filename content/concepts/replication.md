---
title: "Replication"
tags: ["reliability","storage"]
components: ["sql_db","wide_column"]
related: ["consistency-models","cap-pacelc","fault-tolerance-retries"]
---

## What it is

Keeping copies of the same data on several machines, so the system survives a machine failure and can serve more reads.

## When to use it

Any data you can't lose or any store that must stay available. Also to spread read traffic.

## How it works

- **Leader–follower**: writes go to one leader and are copied to followers; followers serve reads and take over if the leader fails.
- **Synchronous** replication waits for followers (no data loss, slower writes); **asynchronous** doesn't (fast, may lose recent writes on failover).
- **Multi-leader / leaderless** (Dynamo, Cassandra): any replica accepts writes; conflicts are resolved later.
- A **replication factor** of 3 across availability zones is a common default.

## Trade-offs

- Reading from followers can return stale data (replication lag).
- Failover needs care: split brain, lost async writes, clients reconnecting.
- More replicas mean more storage cost and more write work.

## Interview one-liners

- "Primary with a synchronous standby in another AZ plus async read replicas."
- "Replication factor 3 with quorum writes, so one node can fail without losing data."

## Common follow-up questions

- What happens to writes during failover?
- How stale can a read replica be, and does the user ever see their own write missing?
- How do you avoid two leaders after a network partition?

## Further reading

- [PostgreSQL: High availability and replication](https://www.postgresql.org/docs/current/high-availability.html)
- [Cassandra: Dynamo architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
