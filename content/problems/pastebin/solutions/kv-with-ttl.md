---
title: "Key-value store with native TTL"
order: 2
---

Small pastes (<64 KB) go straight into a KV store (DynamoDB) with a TTL attribute; large ones spill to S3. Expiry is handled by the store itself.

## Trade-offs

- No cleanup job for small pastes
- Item size limits force a split path
- TTL deletion is eventually consistent; check expires_at on read
