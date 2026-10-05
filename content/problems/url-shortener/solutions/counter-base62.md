---
title: "Counter + base62 with cache-aside"
order: 1
---

An ID generator hands out unique 64-bit numbers which the service base62-encodes into 7-char codes. Mappings live in a key-value store keyed by code. Redirects check Redis first (cache-aside) and fall back to the KV store.

## Trade-offs

- No collisions and no retries, but sequential codes are guessable unless the counter is shuffled
- The ID generator must be highly available (use ranges per server to avoid a hot path)
- KV store scales linearly for point lookups; no joins needed
