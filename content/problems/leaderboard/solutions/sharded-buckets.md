---
title: "Score-range shards + stream"
order: 2
---

Updates flow through Kafka; consumers write to shards bucketed by score range so top-N only reads the highest shard; ranks = sum of counts in higher shards + local rank.

## Design decisions

One Redis board has a memory and write limit; shard by score range only when measurements require it.

Authenticate game servers and dedup eventId; clients must not arbitrarily assign scores.

Read the serving sorted sets; document lag if an asynchronous index is used.

A sharded rank needs counts of higher score buckets plus the rank within the player bucket.

## Trade-offs

- Scales writes horizontally
- Players move between shards as scores change



## Failure handling

Score commits but the ranking index update is lost: Replay a durable outbox/event log using score versions. Reads may temporarily lag; rebuild Redis from authoritative scores rather than losing results.
