---
title: "Fan-out on read (pull)"
order: 2
---

Writes only store the post. On timeline load the service fetches recent post IDs for each followee from a per-author cache and merges them (k-way merge). Works well when follow counts are modest; celebrities are naturally cheap.

## Trade-offs

- Cheap writes, no write amplification
- Read latency grows with followee count
- Heavy caching of per-author recent posts required
