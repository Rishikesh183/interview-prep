---
title: "Gateway middleware + Redis token bucket"
order: 1
---

The API gateway runs the limiter as middleware. Token buckets per API key live in a Redis cluster and are refilled lazily inside a Lua script (atomic read-modify-write). Over-limit → 429 with Retry-After.

## Trade-offs

- No extra network hop beyond Redis
- Token bucket allows bursts up to bucket size
- Fail open if Redis is unavailable to protect availability
