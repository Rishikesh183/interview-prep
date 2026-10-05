---
title: "Consistency models"
tags: ["consistency","distributed-systems"]
components: ["sql_db","nosql_kv"]
related: ["cap-pacelc","replication","idempotency"]
---

## What it is

The guarantees a system gives about what a read returns after a write: from strong (always the latest) to eventual (all replicas converge, at some point).

## When to use it

Whenever users read data that others (or they themselves) just changed, especially with replicas or caches in between.

## How it works

- **Strong / linearizable**: every read sees the latest write. Needed for balances, seat booking, unique usernames.
- **Read-your-writes**: a user always sees their own changes (route them to the leader or cache their write).
- **Monotonic reads**: a user never sees time go backwards.
- **Eventual**: replicas converge; fine for feeds, counters, search.
- In SQL, **isolation levels** (read committed → serializable) control what concurrent transactions see.

## Trade-offs

- Stronger guarantees cost latency and availability.
- Mixing levels is normal: be explicit about which data gets which guarantee.

## Interview one-liners

- "Timeline is eventually consistent; the user's own post is shown immediately from the write path (read-your-writes)."
- "Seat booking uses serializable transactions or a unique constraint."

## Common follow-up questions

- Can a user post something and then not see it?
- What anomalies can happen at read-committed isolation?

## Further reading

- [PostgreSQL: Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
