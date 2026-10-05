---
title: "Sharding & partitioning"
tags: ["storage","scalability"]
components: ["sql_db","nosql_kv","wide_column"]
related: ["consistent-hashing","replication","database-choice-sql-vs-nosql"]
---

## What it is

Splitting one large dataset across several machines (shards), each holding part of the data, so writes and storage scale beyond one server.

## When to use it

When one machine can't take the write rate or hold the data, even after caching and read replicas.

## How it works

- Pick a **shard key** that spreads load evenly and keeps your common queries on one shard (e.g. user_id).
- **Range** sharding keeps ranges together (good for scans, risk of hot ranges).
- **Hash** sharding spreads evenly (no range scans).
- **Consistent hashing** or a directory service decides which shard owns a key and limits data movement when shards are added.

## Trade-offs

- Cross-shard queries and transactions are slow or impossible; design so most requests hit one shard.
- A bad key creates **hot shards** (e.g. a celebrity user).
- Re-sharding live data is one of the hardest operations, so plan headroom.

## Interview one-liners

- "Hash-shard by user_id so a user's data lives on one shard."
- "For celebrity keys I'd add a random suffix to spread their writes."

## Common follow-up questions

- What happens when one shard becomes hot?
- How do you add shards without downtime?
- Which queries need to touch every shard?

## Further reading

- [MongoDB: Sharding](https://www.mongodb.com/docs/manual/sharding/)
- [DynamoDB: Partitions and data distribution](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html)
