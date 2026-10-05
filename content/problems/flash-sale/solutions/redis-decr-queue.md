---
title: "Redis DECR + order queue"
order: 1
---

Sale page is static on the CDN. Gateway rate-limits per user. Buy requests DECR a Redis stock counter (Lua: only if > 0); winners get a token and an order message goes to a queue; workers create orders in SQL. Unpaid after 10 min → INCR stock back.

## Trade-offs

- Handles huge QPS cheaply
- Redis is the source of truth during the sale; reconcile after
