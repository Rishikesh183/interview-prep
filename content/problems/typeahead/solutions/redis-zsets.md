---
title: "Prefix → sorted set in Redis"
order: 2
---

For each prefix up to 10 chars keep a Redis sorted set of top queries; a streaming job increments scores.

## Trade-offs

- Fresh within minutes
- Huge key count; prune long-tail prefixes
