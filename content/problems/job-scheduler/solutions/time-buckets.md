---
title: "Time-bucketed table + partitioned schedulers"
order: 1
---

Jobs are stored by next_run minute bucket and partition. Each scheduler owns partitions (leased via etcd), polls the current bucket, and pushes due jobs to SQS. Workers ack on completion; visibility timeout handles crashes.

## Trade-offs

- Horizontally scalable
- Partition rebalancing complexity
