---
title: "Mercator-style frontier"
order: 1
---

Front queues by priority, back queues one per host with a min delay; fetcher workers pull from back queues, resolve via a DNS cache, store pages in S3, extract links, check a Bloom filter + URL DB, and enqueue new ones.

## Design decisions

Shard frontier ownership by host; global worker parallelism must never violate a single host's delay budget.

This system does not require a public consumer REST API. Normalize/dedup URLs and enforce per-host politeness before dispatch.

Acknowledge only after content and URL state commit; retry with the same task identity.

## Trade-offs

- Politeness by construction
- Complex frontier state



## Failure handling

A fetcher dies after downloading but before acknowledging: Redeliver the leased task; dedup by normalized URL/content hash. Preserve per-host next-allowed-fetch time across ownership changes and back off repeatedly failing hosts.
