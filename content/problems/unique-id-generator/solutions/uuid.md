---
title: "UUID v7 in-process"
order: 3
---

Each service generates 128-bit UUIDv7 locally (timestamp + randomness). No coordination at all.

## Trade-offs

- Zero infrastructure
- 128-bit, not 64
- Index locality is fine because v7 is time-ordered
