---
title: "Redis seat holds + SQL commit"
order: 1
---

Selecting seats does SET seat:{show}:{seat} user NX EX 600 in Redis (atomic, auto-expiring hold). Checkout calls the payment provider with an idempotency key; on success a SQL transaction inserts bookings with UNIQUE(show_id, seat_id) as the final guard against double booking.

## Design decisions

Use admission/waiting rooms, short hold TTLs and authoritative uniqueness constraints.

The hold must be all-or-nothing and tied to the authenticated owner.

Use provider idempotency and a durable booking state machine; compensate an authorization if the hold expired before confirmation.

## Trade-offs

- Fast holds without DB row locks
- Two sources of truth: Redis for holds, SQL for bookings
- Unique constraint catches any race Redis misses



## Failure handling

Payment completes after the hold expires: Recheck ownership and expiry transactionally before confirmation. If another user owns the seat, void/refund the first payment idempotently instead of double booking.
