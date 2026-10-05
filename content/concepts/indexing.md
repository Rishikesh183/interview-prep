---
title: "Indexing"
tags: ["storage","performance"]
components: ["sql_db"]
related: ["database-choice-sql-vs-nosql","search-indexes","sharding-partitioning"]
---

## What it is

An index is an extra data structure (usually a B-tree) that lets the database find rows by a column without scanning the whole table.

## When to use it

Any column you filter, join or sort on frequently. Check that every hot query in your design is backed by an index or a primary key.

## How it works

- **B-tree** indexes support equality and range queries (`WHERE created_at > ...`).
- **Composite** indexes cover several columns; column order matters (leftmost prefix rule).
- **Covering** indexes include every column a query needs, so the table isn't touched.
- **Hash**, **geo** and **full-text** indexes serve special query types.

## Trade-offs

- Every index slows writes and uses storage; index for the queries you actually run.
- Low-selectivity columns (e.g. a boolean) make poor indexes.
- Large indexes stop fitting in memory, and then performance falls off a cliff.

## Interview one-liners

- "A composite index on (user_id, created_at) serves 'latest posts by user' without a sort."
- "The short code is the primary key, so redirects are a single index lookup."

## Common follow-up questions

- Which index serves your most frequent query?
- How do indexes affect your write throughput?
- How would you find the slow queries in production?

## Further reading

- [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html)
