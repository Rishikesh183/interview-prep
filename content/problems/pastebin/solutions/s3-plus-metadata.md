---
title: "Object storage + metadata DB"
order: 1
---

Service writes the body to S3 under a random key and a metadata row (key, size, language, expires_at) to SQL. Reads go CDN → service → S3. A scheduler deletes expired rows; S3 lifecycle rules delete the blobs.

## Design decisions

Inline small values only within store limits; use object storage for large bodies.

Validate size and atomically publish metadata after body storage; clean up orphaned objects.

Cache TTL and CDN behavior must respect expires_at; physical deletion may run later.

## Trade-offs

- Cheap durable storage for large bodies
- Two writes per create need cleanup on partial failure



## Failure handling

Body upload succeeds but metadata insert fails: Garbage-collect unreferenced objects after a grace period; retries create or reuse a clearly identified paste. Always check expiry even if the object still exists.
