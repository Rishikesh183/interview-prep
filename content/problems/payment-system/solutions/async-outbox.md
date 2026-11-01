---
title: "Async executor with outbox"
order: 2
---

Checkout writes a payment order and an outbox event in one transaction. A relay publishes outbox events to a queue; payment executors call the PSP with retries and the idempotency key; results update the ledger. Wallet balances are derived from ledger entries.

## Design decisions

Partition by account/merchant when needed, while preserving transaction atomicity and idempotency.

Return the prior result for the same key and payload. A timeout does not mean the provider failed; reconcile by provider reference.

Only an authorized caller sees this payment; settlement and payment authorization are distinct states.

## Trade-offs

- Checkout returns fast; PSP slowness doesn't block users
- Outbox guarantees the event is published if the order commits
- UI must handle 'processing' state



## Failure handling

Provider charges but the response is lost: Do not issue a fresh logical charge. Retry/query with the same provider idempotency key, process signed webhooks idempotently and reconcile settlement files with immutable ledger entries.
