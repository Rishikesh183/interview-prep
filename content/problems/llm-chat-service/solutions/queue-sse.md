---
title: "Gateway + priority queue + SSE"
order: 1
---

Gateway authenticates and applies token-based limits per tier; chat service stores the message and enqueues an inference request on a priority queue; GPU workers do continuous batching and stream tokens back through the chat service to the browser via SSE.

## Trade-offs

- Smooth degradation (queue grows, free tier waits)
- Streaming path is long-lived; needs connection-aware LB
