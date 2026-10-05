---
title: "Fan-out on write (hybrid for celebrities)"
order: 1
---

Post Service stores the post and emits an event. Fan-out workers push the post ID into each follower's timeline list in Redis (capped at ~800 IDs). Accounts above ~10K followers are skipped; their posts are merged in at read time (hybrid).

## Trade-offs

- Timeline reads are a single Redis lookup
- Write amplification: avg 200 cache writes per post
- Hybrid merge adds read-time work only for celebrity followees
