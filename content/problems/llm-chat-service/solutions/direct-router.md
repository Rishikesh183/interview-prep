---
title: "Load-aware router to model servers"
order: 2
---

A router picks the least-loaded GPU server directly (no queue) and proxies the gRPC token stream back over WebSockets; overload returns 429.

## Trade-offs

- Lower latency
- Harsh behaviour under overload
