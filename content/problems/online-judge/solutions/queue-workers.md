---
title: "Queue + sandboxed workers"
order: 1
---

API stores the submission and enqueues it; judge workers pull jobs, run each test inside a Firecracker microVM / gVisor container with cgroup limits, and write the verdict. Clients poll GET /submissions/{id}. Workers autoscale on queue depth.

## Design decisions

Scale by queue age and runtime; maintain hard CPU, memory, disk, process and network limits.

Publish execution only after the submission record is durable; enforce user quotas.

Poll with backoff or use a notification hint; hidden test details must remain private.

## Trade-offs

- Spikes just lengthen the queue
- Polling is simple but chatty



## Failure handling

A sandbox times out or a judge crashes: Kill the entire process tree/microVM, reclaim resources and persist an execution outcome. Redeliver infrastructure failures by submission_id; a user-code timeout is a verdict, not an infinite retry.
