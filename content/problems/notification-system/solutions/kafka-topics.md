---
title: "Kafka topic per channel"
order: 2
---

Requests are written to a Kafka topic per channel; consumer groups per channel scale independently. Failed sends go to a retry topic with delay, then a dead-letter topic.

## Trade-offs

- Replayable history and high throughput for campaigns
- Retry-with-delay needs extra topics
- Per-key ordering available if needed
