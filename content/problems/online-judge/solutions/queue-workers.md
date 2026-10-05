---
title: "Queue + sandboxed workers"
order: 1
---

API stores the submission and enqueues it; judge workers pull jobs, run each test inside a Firecracker microVM / gVisor container with cgroup limits, and write the verdict. Clients poll GET /submissions/{id}. Workers autoscale on queue depth.

## Trade-offs

- Spikes just lengthen the queue
- Polling is simple but chatty
