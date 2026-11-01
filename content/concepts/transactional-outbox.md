---
title: "Transactional outbox and reliable event publishing"
kind: pattern
tags: ["transactions", "events", "reliability", "dual-writes"]
components: ["sql_db", "worker", "event_stream", "message_queue"]
related: ["change-data-capture", "idempotency", "message-queues-vs-streams", "sagas-distributed-transactions"]
---

## What it is

Commit a business change and an event record in the same local database transaction. A relay later publishes committed events. This closes the failure gap between “database write succeeded” and “message publication failed”; it does not make delivery exactly once.

## When to use it

Order creation, feed publication, notification requests or any durable state change that must trigger asynchronous work. The business row and outbox must share a real atomic transaction boundary; two unrelated databases do not become atomic just because one is called an outbox.

## How it works

1. Write the business row and `Outbox(event_id, aggregate_id, sequence, event_type, payload, created_at)` in one transaction.
2. A polling relay or CDC connector reads committed outbox entries and publishes them, preserving the required per-aggregate order.
3. Record publication progress after acknowledgement. If the relay crashes between publish and marking progress, it may publish again.
4. The consumer dedups `event_id` in the same transaction as its local effect. External effects need the downstream system's idempotency support or reconciliation.

### Worked example

Create `Order(o42, PENDING)` and `Outbox(e42, OrderCreated)` together. If the transaction rolls back, neither exists. If the broker is down, the API can still return a committed order ID while the relay retries. If the relay restarts after a successful send, `e42` may arrive twice; a unique processed-event record prevents two local inventory deductions. Draw Service → Orders + Outbox DB → Relay → Queue → Inventory Worker, with both initial inserts inside one database box.

## Trade-offs

Adds storage, relay lag, cleanup and schema-versioning work. Monitor oldest unpublished event age and broker failures. Delete/archive only after the recovery and replay policy is satisfied. Outbox publishing and saga compensation solve different boundaries and can be used together.

## Interview one-liners

- “The intent to publish commits with the business row; delivery is at least once and consumers are idempotent.”

## Common follow-up questions

- **Crash after broker ack?** Republish the same event ID; the consumer must tolerate it.
- **Events arrive out of order?** Partition by aggregate and track sequence/version.
- **Outbox grows forever?** Define retention and monitor the oldest unpublished event before cleanup.

## Further reading

- [Transactional outbox pattern — AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
