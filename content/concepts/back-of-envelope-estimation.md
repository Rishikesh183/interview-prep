---
title: "Back-of-envelope estimation"
tags: ["fundamentals"]
components: []
related: ["scalability-basics","caching-strategies","sharding-partitioning"]
---

## What it is

Quick, rough calculations of traffic, storage and bandwidth that tell you which parts of a design need to scale and how much.

## When to use it

Early in every interview, right after requirements. The numbers should drive decisions (cache size, shard count, queue buffering).

## How it works

- **QPS** = daily actions ÷ 86,400 (≈ 10^5). Peak ≈ 2–3× average.
- **Storage** = writes/day × object size × retention.
- **Bandwidth** = QPS × object size, separately for ingress and egress.
- **Cache** ≈ 20% of daily reads × object size (80/20 rule).
- Round aggressively: powers of ten are fine. Say your assumptions out loud.

## Trade-offs

- Precision isn't the point; the order of magnitude is.
- Forgetting peaks, replication factor or metadata overhead are common misses.

## Interview one-liners

- "100M new URLs a month is about 40 writes/s; at 100:1 that's 4K reads/s, about 12K at peak."

## Common follow-up questions

- Which number drove your biggest design decision?
- How much does replication multiply your storage?

## Further reading

- [Google SRE book](https://sre.google/sre-book/table-of-contents/)
