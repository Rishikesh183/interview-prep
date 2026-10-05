---
title: "Hash + collision check"
order: 2
---

The service hashes the long URL (MD5/SHA-256), takes the first 7 base62 characters and inserts with a unique constraint. On collision it appends a salt and retries. Same long URL maps to the same code, which deduplicates for free.

## Trade-offs

- No coordination service needed
- Collisions grow with table size; each retry costs a DB round trip
- Deterministic codes leak whether a URL was already shortened
