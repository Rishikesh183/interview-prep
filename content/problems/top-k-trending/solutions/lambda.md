---
title: "Lambda: fast approximate + slow exact"
order: 2
---

Streaming path as above for the 1-hour view; hourly/daily Spark jobs compute exact counts for longer windows.

## Trade-offs

- Accurate long windows
- Two pipelines to maintain
