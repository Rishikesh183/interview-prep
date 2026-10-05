---
title: "Queue per channel"
order: 1
---

The notification service validates the request, checks preferences (cached), dedups on an idempotency key, renders the template and enqueues to the channel's SQS queue. Channel workers call the provider with exponential backoff; after 5 attempts messages go to the DLQ.

## Trade-offs

- Strong isolation between channels
- Many queues to operate
- At-least-once + idempotency key ≈ effectively once
