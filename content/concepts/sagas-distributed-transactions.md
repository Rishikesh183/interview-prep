---
title: "Sagas and compensating transactions"
kind: pattern
tags: ["saga", "transactions", "workflows", "consistency"]
components: ["service", "message_queue", "worker", "sql_db"]
related: ["transactional-outbox", "idempotency", "consistency-models", "fault-tolerance-retries"]
---

## What it is

Represent a cross-service business operation as a sequence of local transactions and explicit recovery actions. If a later step fails, compensating transactions restore an acceptable business state. Compensation is a new operation, not a database rollback across all services.

## When to use it

Booking, checkout or provisioning workflows whose services own separate stores. Use a local transaction instead when one database can enforce the whole invariant. Avoid inventing service boundaries merely to demonstrate a saga.

## How it works

1. Persist `Saga(saga_id, state, version, deadlines)` and stable step identities.
2. Choose orchestration (a coordinator advances the state machine) or choreography (services react to events). Explain who detects a stalled workflow.
3. Commit each step's local state plus publication intent; dedup retries and use version/fencing checks for late responses.
4. On failure, issue the defined compensations, persist their progress and escalate cases that cannot be completed automatically.

### Worked example

For ticket checkout: hold seats → authorize payment → confirm booking. If the hold expires before confirmation, conditionally reject confirmation and void the authorization. If funds were already captured, initiate an idempotent refund. Do not give the seat back after another user's valid booking. States such as `PAYMENT_PENDING`, `CONFIRMING`, `COMPENSATING` and `MANUAL_REVIEW` make uncertainty visible. Draw the workflow coordinator and its durable state separately from seat and payment services.

## Trade-offs

No global isolation: other users may observe intermediate state. Compensation can fail or be impossible, such as “unsending” an email. Prefer reversible reservations before irreversible actions; retries need deadlines and reconciliation. A queue alone does not provide a saga state machine.

## Interview one-liners

- “Each service commits locally; the workflow persists compensations and handles ambiguous outcomes explicitly.”

## Common follow-up questions

- **Coordinator crashes?** Resume from durable state and stable step IDs.
- **Payment result arrives after timeout?** Match its step version; reconcile or compensate without advancing an obsolete workflow.
- **Refund fails?** Retry under a bounded policy, retain the unresolved state and route to reconciliation/manual review.

## Further reading

- [Saga distributed transactions pattern — Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
