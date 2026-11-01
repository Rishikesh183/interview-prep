---
title: "Load-aware router to model servers"
order: 2
---

A router picks the least-loaded GPU server directly (no queue) and proxies the gRPC token stream back over WebSockets; overload returns 429.

## Design decisions

Admission control must consider tokens and KV-cache memory, not request count alone.

Reserve token budget, propagate cancellation, and dedup requestId. SSE works over HTTP; direct-router mode may proxy the same token events over WebSockets.

## Trade-offs

- Lower latency
- Harsh behaviour under overload



## Failure handling

GPU dies after streaming part of an answer: Mark the generation interrupted and settle measured usage. Retry creates a clearly identified new attempt; do not silently splice unrelated completions into the old stream.
