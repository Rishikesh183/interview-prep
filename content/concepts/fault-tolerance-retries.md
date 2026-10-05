---
title: "Fault tolerance & retries"
tags: ["reliability"]
components: ["external_service"]
related: ["idempotency","message-queues-vs-streams","replication","observability"]
---

## What it is

Designing so that failures (crashed servers, slow dependencies, network errors) don't become outages or lost work.

## When to use it

Every call to something that can fail, especially external providers (payments, SMS, push) and anything across the network.

## How it works

- **Timeouts** on every call; never wait forever.
- **Retries with exponential backoff and jitter**, only for idempotent operations.
- **Dead-letter queues** for messages that keep failing, so they can be inspected and replayed.
- **Circuit breakers** stop hammering a dependency that's down.
- **Redundancy**: multiple instances, replicas across zones, no single point of failure.
- **Graceful degradation**: serve stale data or a reduced feature instead of an error.

## Trade-offs

- Retries without backoff turn a small outage into a retry storm.
- Retrying non-idempotent operations causes duplicates.
- More redundancy costs more money and complexity.

## Interview one-liners

- "Provider calls have a 2s timeout and 5 retries with exponential backoff, then go to the DLQ."

## Common follow-up questions

- What happens when the payment provider is down for 10 minutes?
- Where is the single point of failure in your design?

## Further reading

- [AWS Well-Architected: Reliability pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
