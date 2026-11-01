---
title: "Time-bucketed table + partitioned schedulers"
order: 1
---

Jobs are stored by next_run minute bucket and partition. Each scheduler owns partitions (leased via etcd), polls the current bucket, and pushes due jobs to SQS. Workers ack on completion; visibility timeout handles crashes.

## Design decisions

Measure due-job skew; bounded queue dispatch protects workers when many jobs share the same boundary.

Validate timezone and missed-run policy; execution identity is job_id plus scheduled_at.

Separate the schedule from actual attempts so retries are observable.

## Trade-offs

- Horizontally scalable
- Partition rebalancing complexity



## Failure handling

A worker crashes after performing the external side effect: The visibility timeout redelivers the same execution_id. The target must accept an idempotency key; the scheduler cannot promise exactly-once arbitrary side effects.
