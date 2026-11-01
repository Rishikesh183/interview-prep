---
title: "Backpressure, bounded queues and load shedding"
kind: pattern
tags: ["overload", "queues", "latency", "admission-control"]
components: ["api_gateway", "message_queue", "worker", "rate_limiter"]
related: ["rate-limiting-algorithms", "fault-tolerance-retries", "message-queues-vs-streams", "observability"]
---

## What it is

Backpressure slows producers when downstream capacity is constrained. Load shedding rejects excess work before it makes the whole system unusable. Bounded queues absorb short bursts; they cannot fix sustained demand above service capacity.

## When to use it

GPU inference, judge workers, transcoding, notification campaigns and flash-sale admission. Define a latency or queue-age budget before deciding how much work to buffer. Rate limits enforce a caller policy; global admission protects actual available capacity.

## How it works

1. Measure queue age, active work, processing latency and dependency health, not just CPU.
2. Limit queue length, request age and per-tenant concurrency. Carry deadlines through the pipeline.
3. Slow ingestion where a producer protocol supports it, otherwise reject early. Use 429 for quota/admission policy or 503 for unavailable capacity, with documented retry information.
4. Retry only retryable work with jitter and a budget. Separate poison messages and high-priority capacity so retries cannot starve useful work.

### Worked example

Assume arrivals of 1,200 jobs/s and completion capacity of 1,000/s. Backlog grows by **200 jobs/s**. After 30 seconds it contains 6,000 jobs, about six seconds of work at that service rate before accounting for new arrivals. A two-second queue-delay budget allows roughly 2,000 queued jobs under these assumptions. A larger queue hides the capacity problem while clients time out and retry. Draw admission before the queue and label worker concurrency and the rejection branch.

## Trade-offs

Early rejection sacrifices some requests to keep accepted work timely. Fairness needs explicit tenant/tier budgets. Autoscaling has delay and may be limited by a downstream bottleneck; an unbounded queue merely converts overload into stale work and memory/storage growth.

## Interview one-liners

- “I size the queue against acceptable waiting time and reject work that cannot finish before its deadline.”

## Common follow-up questions

- **Why not queue everything?** Sustained overload makes latency and retries grow without bound.
- **What about critical customers?** Reserve capacity or use fair weighted scheduling with starvation protection.
- **Workers recover?** Drain within the latency budget; discard or reconcile expired work according to business semantics.

## Further reading

- [Using load shedding to avoid overload — Amazon Builders' Library](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/)
