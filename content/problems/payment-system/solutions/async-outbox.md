---
title: "Async executor with outbox"
order: 2
---

Checkout writes a payment order and an outbox event in one transaction. A relay publishes outbox events to a queue; payment executors call the PSP with retries and the idempotency key; results update the ledger. Wallet balances are derived from ledger entries.

## Trade-offs

- Checkout returns fast; PSP slowness doesn't block users
- Outbox guarantees the event is published if the order commits
- UI must handle 'processing' state
