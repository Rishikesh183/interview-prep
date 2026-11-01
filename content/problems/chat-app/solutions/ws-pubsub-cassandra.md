---
title: "WebSockets + Redis pub/sub + Cassandra"
order: 1
---

Clients keep a WebSocket to a chat server (sticky via L4 LB). A message is assigned a per-conversation sequence, written to Cassandra (partition = conversation_id, clustering = message_id) and published to a Redis channel per user; whichever server holds the recipient's socket delivers it. If the recipient is offline the message waits in storage and a push notification goes out.

## Design decisions

Connection count and message fan-out need separate capacity budgets; partition history by conversation.

Dedup by messageId; distinguish durable acceptance, recipient delivery and read receipts. Reconnect resumes from the last acknowledged sequence.

Use cursor pagination over conversation sequence, never a global ordering requirement.

## Trade-offs

- Redis pub/sub is fire-and-forget; durability comes from writing to Cassandra first
- Cassandra handles the write-heavy load and time-ordered reads per conversation
- Presence via heartbeats in Redis with short TTLs



## Failure handling

Recipient disconnects after the send is acknowledged: Retain the durable message and let reconnect fetch by sequence. Pub/sub alone cannot replay missed delivery; push notifications only prompt a client to sync.
