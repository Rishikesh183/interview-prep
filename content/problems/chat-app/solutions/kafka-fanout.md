---
title: "Kafka-backed delivery"
order: 2
---

Chat servers append every message to Kafka partitioned by conversation_id (ordering per partition). Delivery workers consume, persist to storage and route to the recipient's chat server via a session registry; offline recipients get a push.

## Trade-offs

- Durable, replayable log; consumers can be added (search, analytics)
- Higher latency than direct pub/sub
- Session registry must be kept fresh on reconnects
