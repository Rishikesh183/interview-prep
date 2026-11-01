---
title: "Fan-out on read (pull)"
order: 2
---

Writes only store the post. On timeline load the service fetches recent post IDs for each followee from a per-author cache and merges them (k-way merge). Works well when follow counts are modest; celebrities are naturally cheap.

## Design decisions

Exclude celebrity accounts from push fan-out and merge them at read time, or choose pull for modest follow counts.

Use a transactional outbox or replayable event feed so a committed post is not lost from fan-out.

Cursor combines stable ordering keys. Hybrid mode merges celebrity posts at read time; pull mode merges every followed author.

## Trade-offs

- Cheap writes, no write amplification
- Read latency grows with followee count
- Heavy caching of per-author recent posts required



## Failure handling

Fan-out worker crashes halfway through a follower list: Checkpoint the batch and retry idempotent (timeline_id, post_id) insertions. Timeline lag is acceptable; missing the authoritative post is not.
