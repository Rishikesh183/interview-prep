---
title: "Key-value store with native TTL"
order: 2
---

Small pastes (<64 KB) go straight into a KV store (DynamoDB) with a TTL attribute; large ones spill to S3. Expiry is handled by the store itself.

## Design decisions

Inline small values only within store limits; use object storage for large bodies.

Validate size and atomically publish metadata after body storage; clean up orphaned objects.

Cache TTL and CDN behavior must respect expires_at; physical deletion may run later.

## Trade-offs

- No cleanup job for small pastes
- Item size limits force a split path
- TTL deletion is eventually consistent; check expires_at on read



## Failure handling

Body upload succeeds but metadata insert fails: Garbage-collect unreferenced objects after a grace period; retries create or reuse a clearly identified paste. Always check expiry even if the object still exists.
