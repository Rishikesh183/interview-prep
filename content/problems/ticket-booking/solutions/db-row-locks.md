---
title: "Database row locks + waiting room"
order: 2
---

Seats are rows with status. Holding runs SELECT ... FOR UPDATE then sets status=HELD with held_until. A sweeper job releases expired holds. For hot shows a virtual waiting room (queue) admits users in batches so the DB isn't overwhelmed.

## Trade-offs

- Single source of truth
- Row locks limit throughput on hot shows
- Waiting room gives fairness
