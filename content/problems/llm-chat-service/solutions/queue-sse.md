---
title: "Gateway + priority queue + SSE"
order: 1
---

Gateway authenticates and applies token-based limits per tier; chat service stores the message and enqueues an inference request on a priority queue; GPU workers do continuous batching and stream tokens back through the chat service to the browser via SSE.

## Design decisions

Admission control must consider tokens and KV-cache memory, not request count alone.

Reserve token budget, propagate cancellation, and dedup requestId. SSE works over HTTP; direct-router mode may proxy the same token events over WebSockets.

## Trade-offs

- Smooth degradation (queue grows, free tier waits)
- Streaming path is long-lived; needs connection-aware LB



## Failure handling

GPU dies after streaming part of an answer: Mark the generation interrupted and settle measured usage. Retry creates a clearly identified new attempt; do not silently splice unrelated completions into the old stream.
