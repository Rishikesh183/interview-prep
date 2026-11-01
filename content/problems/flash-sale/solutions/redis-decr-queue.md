---
title: "Redis DECR + order queue"
order: 1
---

Sale page is static on the CDN. Gateway rate-limits per user. Buy requests DECR a Redis stock counter (Lua: only if > 0); winners get a token and an order message goes to a queue; workers create orders in SQL. Unpaid after 10 min → INCR stock back.

## Design decisions

Serve the sale page through CDN; use atomic admission and bounded queue consumers rather than a DB write for every click.

Dedup requestId, enforce one purchase per policy, and return sold-out/admission responses explicitly.

## Trade-offs

- Handles huge QPS cheaply
- Redis is the source of truth during the sale; reconcile after



## Failure handling

Reservation succeeds but enqueue or order creation fails: Record an outbox or durable reservation reconciliation marker; retry with the same token. Release an expired unpaid token only after a fenced, idempotent order transition.
