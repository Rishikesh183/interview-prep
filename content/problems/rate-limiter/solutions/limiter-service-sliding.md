---
title: "Dedicated limiter tier, sliding window"
order: 2
---

A separate rate-limiter tier sits in front of services and keeps a sliding window counter (current + previous window weighted) in Redis using atomic INCR with EXPIRE.

## Trade-offs

- Smoother than fixed windows, cheaper than sliding logs
- Extra hop, but independently scalable and reusable
- Fail closed for expensive endpoints, fail open elsewhere
