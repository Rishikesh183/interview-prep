---
title: "CAP and PACELC"
tags: ["distributed-systems","consistency"]
components: ["nosql_kv","wide_column"]
related: ["consistency-models","replication","distributed-locks-consensus"]
---

## What it is

CAP says that during a network **P**artition a replicated system must choose between **C**onsistency and **A**vailability. PACELC adds: **E**lse, in normal operation, it trades **L**atency against **C**onsistency.

## When to use it

Whenever data is replicated across machines or regions. It's a vocabulary for explaining your choices, not a design method.

## How it works

- **CP** systems refuse some requests during a partition to avoid divergent data (e.g. a strongly consistent store losing quorum).
- **AP** systems keep answering and reconcile later (e.g. Dynamo-style stores).
- PACELC: even without failures, waiting for more replicas means stronger consistency but higher latency.
- Many stores let you choose per request (quorum reads vs single-replica reads).

## Trade-offs

- Pick per feature: payments and inventory lean CP; feeds, likes and presence lean AP.
- Claiming 'CA' for a distributed system is a red flag; partitions happen.

## Interview one-liners

- "The ledger is CP: I'd rather reject a payment than double-spend."
- "The like counter is AP and eventually consistent."

## Common follow-up questions

- What does your system do during a network split between regions?
- Which data in your design can be stale, and for how long?

## Further reading

- [DynamoDB: Read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [Cassandra: Consistency levels](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
