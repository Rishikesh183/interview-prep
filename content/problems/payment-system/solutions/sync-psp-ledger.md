---
title: "Payment service + double-entry ledger"
order: 1
---

The payment service stores a payment row (status=PENDING) keyed by idempotency key, calls the PSP with the same key, then writes balanced ledger entries in one SQL transaction. PSP webhooks go through a queue to workers that update status idempotently. A nightly batch job reconciles ledger vs PSP settlement files.

## Design decisions

Partition by account/merchant when needed, while preserving transaction atomicity and idempotency.

Return the prior result for the same key and payload. A timeout does not mean the provider failed; reconcile by provider reference.

Only an authorized caller sees this payment; settlement and payment authorization are distinct states.

## Trade-offs

- Simple request flow
- Synchronous PSP latency on the request path
- Idempotency key at every hop makes retries safe



## Failure handling

Provider charges but the response is lost: Do not issue a fresh logical charge. Retry/query with the same provider idempotency key, process signed webhooks idempotently and reconcile settlement files with immutable ledger entries.
