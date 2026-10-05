---
title: "Payment service + double-entry ledger"
order: 1
---

The payment service stores a payment row (status=PENDING) keyed by idempotency key, calls the PSP with the same key, then writes balanced ledger entries in one SQL transaction. PSP webhooks go through a queue to workers that update status idempotently. A nightly batch job reconciles ledger vs PSP settlement files.

## Trade-offs

- Simple request flow
- Synchronous PSP latency on the request path
- Idempotency key at every hop makes retries safe
