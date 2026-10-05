---
title: "Single leader with hot standby"
order: 2
---

One leader (elected via ZooKeeper) scans a min-heap/ordered index of next_run and dispatches; standby takes over on failure.

## Trade-offs

- Simple
- Leader throughput caps the system
