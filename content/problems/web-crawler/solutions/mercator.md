---
title: "Mercator-style frontier"
order: 1
---

Front queues by priority, back queues one per host with a min delay; fetcher workers pull from back queues, resolve via a DNS cache, store pages in S3, extract links, check a Bloom filter + URL DB, and enqueue new ones.

## Trade-offs

- Politeness by construction
- Complex frontier state
