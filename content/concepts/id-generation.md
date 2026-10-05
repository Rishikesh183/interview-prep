---
title: "ID generation"
tags: ["distributed-systems"]
components: ["id_generator"]
related: ["sharding-partitioning","distributed-locks-consensus"]
---

## What it is

Producing unique identifiers across many machines without a single bottleneck, often with useful properties like rough time ordering.

## When to use it

Primary keys in sharded stores, short codes (URL shortener), message ids for ordering.

## How it works

- **Auto-increment** in one DB: simple, but a bottleneck and leaks counts.
- **UUID v4**: random, no coordination; large and unordered. **UUID v7** adds a timestamp prefix for ordering.
- **Snowflake**: timestamp + machine id + per-ms sequence in 64 bits; sortable and fast.
- **Ranges / ticket server**: hand each server a block of ids to use locally.
- Encode numbers in **base62** for short, URL-safe codes.

## Trade-offs

- Time-based ids depend on clocks; a clock moving backwards must be handled.
- Sequential ids are guessable; shuffle or encrypt them if that matters.
- Machine ids must be unique (assigned via config or a coordinator).

## Interview one-liners

- "Snowflake: 41-bit ms timestamp, 10-bit worker id, 12-bit sequence, so 4096 ids per ms per worker."

## Common follow-up questions

- What if a machine's clock jumps backwards?
- How does each generator get its worker id?

## Further reading

- [RFC 9562: UUIDs (including v7)](https://www.rfc-editor.org/rfc/rfc9562)
