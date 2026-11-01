---
title: "Kafka partitioned by host"
order: 2
---

URLs are produced to Kafka keyed by host so one consumer handles a host at a time and rate-limits locally; content hashes dedupe pages.

## Design decisions

Shard frontier ownership by host; global worker parallelism must never violate a single host's delay budget.

This system does not require a public consumer REST API. Normalize/dedup URLs and enforce per-host politeness before dispatch.

Acknowledge only after content and URL state commit; retry with the same task identity.

## Trade-offs

- Simple scaling
- Hot hosts create hot partitions



## Failure handling

A fetcher dies after downloading but before acknowledging: Redeliver the leased task; dedup by normalized URL/content hash. Preserve per-host next-allowed-fetch time across ownership changes and back off repeatedly failing hosts.
