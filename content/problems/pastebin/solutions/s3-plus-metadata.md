---
title: "Object storage + metadata DB"
order: 1
---

Service writes the body to S3 under a random key and a metadata row (key, size, language, expires_at) to SQL. Reads go CDN → service → S3. A scheduler deletes expired rows; S3 lifecycle rules delete the blobs.

## Trade-offs

- Cheap durable storage for large bodies
- Two writes per create need cleanup on partial failure
