---
title: "Hash + collision check"
order: 2
---

Hash a destination plus salt into a short base62 code and conditionally insert it under a uniqueness constraint. On collision with a different destination, choose a new salt and retry. Stable destination deduplication requires a separate unique fingerprint policy. Redirects use cache-aside SQL lookups and 302 responses so expiry stays under server control.

## Design decisions

Optimize redirects with a shared cache; scale stateless services and replicate durable mappings.

Validate the URL scheme; reserve the code atomically. A duplicate alias is a conflict, not an overwrite.

Cache-aside lookup; 302 keeps expiry policy under server control. Bound cache TTL by expires_at.

## Trade-offs

- No coordination service needed
- Collisions grow with table size; each retry costs a DB round trip
- Deterministic codes leak whether a URL was already shortened



## Failure handling

Cache is unavailable or a link has expired: Read the durable store with a bounded timeout and protect it from a cache-miss stampede. Reject expired mappings even before TTL cleanup runs.
