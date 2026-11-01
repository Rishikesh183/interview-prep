---
title: "Kafka topic per channel"
order: 2
---

Requests are written to a Kafka topic per channel; consumer groups per channel scale independently. Failed sends go to a retry topic with delay, then a dead-letter topic.

## Design decisions

Separate channel queues/consumer groups and enforce provider-specific rate limits.

Check preferences, dedup the idempotency key and publish durably before acknowledging.

## Trade-offs

- Replayable history and high throughput for campaigns
- Retry-with-delay needs extra topics
- Per-key ordering available if needed



## Failure handling

Provider times out after accepting a message: Retry using provider idempotency where supported; retain the ambiguous attempt and provider request ID. Bound retries with backoff and a DLQ; do not promise universal exactly-once delivery.
