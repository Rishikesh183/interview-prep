---
title: "Database row locks + waiting room"
order: 2
---

Seats are rows with status. Holding runs SELECT ... FOR UPDATE then sets status=HELD with held_until. A sweeper job releases expired holds. For hot shows a virtual waiting room (queue) admits users in batches so the DB isn't overwhelmed.

## Design decisions

Use admission/waiting rooms, short hold TTLs and authoritative uniqueness constraints.

The hold must be all-or-nothing and tied to the authenticated owner.

Use provider idempotency and a durable booking state machine; compensate an authorization if the hold expired before confirmation.

## Trade-offs

- Single source of truth
- Row locks limit throughput on hot shows
- Waiting room gives fairness



## Failure handling

Payment completes after the hold expires: Recheck ownership and expiry transactionally before confirmation. If another user owns the seat, void/refund the first payment idempotently instead of double booking.
