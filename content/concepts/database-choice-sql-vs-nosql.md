---
title: "Choosing a database: SQL vs NoSQL"
tags: ["storage","data-modeling"]
components: ["sql_db","nosql_kv","nosql_document","wide_column","graph_db","data_warehouse"]
related: ["indexing","sharding-partitioning","consistency-models","replication"]
---

## What it is

Picking the store that fits your data's shape and access pattern: relational (SQL) databases versus key-value, document, wide-column and graph stores.

## When to use it

Every design that stores data. Decide after you know the main queries, the read/write ratio and the consistency needs.

## How it works

- **SQL** (Postgres, MySQL): tables, joins, transactions, strong consistency. Great default for orders, payments, inventory.
- **Key-value** (DynamoDB, Redis): lookups by key at huge scale; you design around the access pattern.
- **Document** (MongoDB): flexible JSON records read as a whole.
- **Wide-column** (Cassandra): very high write rates, data partitioned by key and sorted within a partition (chat messages, time series).
- **Graph**: relationship-heavy queries (friends of friends). **Warehouse**: analytics over large history.

## Trade-offs

- NoSQL scales writes horizontally but you give up joins and often multi-row transactions.
- SQL can scale a long way with replicas and sharding, but sharding it is real work.
- Choosing by fashion instead of access pattern is the classic mistake.

## Interview one-liners

- "Bookings need transactions and a unique constraint, so Postgres."
- "Messages are write-heavy and read by conversation and time, so Cassandra partitioned by conversation_id."

## Common follow-up questions

- What are your main queries, and does the schema serve them without scans?
- What happens when one partition gets hot?
- Where do you need strong consistency, and where is eventual fine?

## Further reading

- [PostgreSQL documentation](https://www.postgresql.org/docs/current/)
- [Amazon DynamoDB developer guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
- [Apache Cassandra docs](https://cassandra.apache.org/doc/latest/)
