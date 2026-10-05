---
title: "Redis seat holds + SQL commit"
order: 1
---

Selecting seats does SET seat:{show}:{seat} user NX EX 600 in Redis (atomic, auto-expiring hold). Checkout calls the payment provider with an idempotency key; on success a SQL transaction inserts bookings with UNIQUE(show_id, seat_id) as the final guard against double booking.

## Trade-offs

- Fast holds without DB row locks
- Two sources of truth: Redis for holds, SQL for bookings
- Unique constraint catches any race Redis misses
