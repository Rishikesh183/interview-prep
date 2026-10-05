---
title: "Kafka partitioned by host"
order: 2
---

URLs are produced to Kafka keyed by host so one consumer handles a host at a time and rate-limits locally; content hashes dedupe pages.

## Trade-offs

- Simple scaling
- Hot hosts create hot partitions
