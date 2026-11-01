---
title: "Counter + base62 with cache-aside"
order: 1
---

Allocate disjoint numeric ID ranges to URL servers and base62-encode IDs into short codes. A seven-character namespace holds 62^7 codes; arbitrary 64-bit values need up to eleven characters. Store mappings durably by code. Redirects check Redis first, then fall back to the mapping store, with expiry checked on both paths.

## Design decisions

Optimize redirects with a shared cache; scale stateless services and replicate durable mappings.

Validate the URL scheme; reserve the code atomically. A duplicate alias is a conflict, not an overwrite.

Cache-aside lookup; 302 keeps expiry policy under server control. Bound cache TTL by expires_at.

## Trade-offs

- No collisions and no retries, but sequential codes are guessable unless the counter is shuffled
- The ID generator must be highly available (use ranges per server to avoid a hot path)
- KV store scales linearly for point lookups; no joins needed



## Failure handling

Cache is unavailable or a link has expired: Read the durable store with a bounded timeout and protect it from a cache-miss stampede. Reject expired mappings even before TTL cleanup runs.
