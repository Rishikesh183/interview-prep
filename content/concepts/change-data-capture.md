---
title: "Change data capture (CDC)"
kind: pattern
tags: ["cdc", "events", "search", "replication"]
components: ["sql_db", "event_stream", "worker", "search_index"]
related: ["transactional-outbox", "search-indexes", "idempotency", "consistency-models"]
---

## What it is

Observe committed database changes and turn them into a change stream. Log-based CDC reads a database's change/WAL/binlog mechanism so derived indexes and services can react without putting a second synchronous write into every request handler.

## When to use it

Search indexing, warehouse ingestion, cache invalidation and outbox relaying. Prefer a semantic outbox event when consumers need business intent: a changed row alone may not explain why the user performed the operation.

## How it works

1. Bootstrap a consistent snapshot and establish the corresponding log position; coordinate the transition so updates are neither skipped nor applied twice incorrectly.
2. Publish inserts, updates and deletes with keys, schema information and source positions/versions.
3. Checkpoint progress durably. Consumers assume replay and apply idempotent/version-aware updates.
4. Track connector lag and retained source-log space. A connector that falls behind log retention may require a new snapshot.

### Worked example

A hotel's source row advances from version 11 to 12 and becomes unavailable. CDC updates the search document to 12. If version 11 is replayed afterward, the indexer ignores it rather than advertising stale capacity again. Search is still a derived view: Reservation Service rechecks the authoritative inventory before confirming a booking. Draw Inventory DB → CDC Stream → Indexer → Search Index, and separately the reservation write to Inventory DB.

## Trade-offs

Introduces lag, operational state and schema coupling. Ordering guarantees depend on the source, connector and partitioning; do not promise one global transaction order across every topic. Handle deletes and schema evolution explicitly. CDC is not a replacement for source backups or for idempotent consumers.

## Interview one-liners

- “CDC maintains the read model; the source database still makes the authoritative booking decision.”
- “I define snapshot handoff, durable checkpoints, log retention and replay behavior.”

## Common follow-up questions

- **Connector is down longer than log retention?** Re-snapshot with a defined handoff instead of silently skipping the gap.
- **Row schema changes?** Version the consumer contract and deploy compatible transformations.
- **A delete is missed?** Retain delete/tombstone semantics and periodically reconcile the derived index.

## Further reading

- [Debezium architecture](https://debezium.io/documentation/reference/stable/architecture.html)
