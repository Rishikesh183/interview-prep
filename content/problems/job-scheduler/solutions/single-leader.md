---
title: "Single leader with hot standby"
order: 2
---

One leader (elected via ZooKeeper) scans a min-heap/ordered index of next_run and dispatches; standby takes over on failure.

## Design decisions

Measure due-job skew; bounded queue dispatch protects workers when many jobs share the same boundary.

Validate timezone and missed-run policy; execution identity is job_id plus scheduled_at.

Separate the schedule from actual attempts so retries are observable.

## Trade-offs

- Simple
- Leader throughput caps the system



## Failure handling

A worker crashes after performing the external side effect: The visibility timeout redelivers the same execution_id. The target must accept an idempotency key; the scheduler cannot promise exactly-once arbitrary side effects.
