---
title: "Fan-out on write (hybrid for celebrities)"
order: 1
---

Post Service stores the post and emits an event. Fan-out workers push the post ID into each follower's timeline list in Redis (capped at ~800 IDs). Accounts above ~10K followers are skipped; their posts are merged in at read time (hybrid).

## Design decisions

Exclude celebrity accounts from push fan-out and merge them at read time, or choose pull for modest follow counts.

Use a transactional outbox or replayable event feed so a committed post is not lost from fan-out.

Cursor combines stable ordering keys. Hybrid mode merges celebrity posts at read time; pull mode merges every followed author.

## Trade-offs

- Timeline reads are a single Redis lookup
- Write amplification: avg 200 cache writes per post
- Hybrid merge adds read-time work only for celebrity followees



## Failure handling

Fan-out worker crashes halfway through a follower list: Checkpoint the batch and retry idempotent (timeline_id, post_id) insertions. Timeline lag is acceptable; missing the authoritative post is not.
