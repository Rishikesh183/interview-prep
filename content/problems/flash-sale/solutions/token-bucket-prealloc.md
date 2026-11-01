---
title: "Pre-allocated purchase tokens"
order: 2
---

Generate 10,000 purchase tokens in advance; a waiting room hands them out FIFO; holding a token lets the user check out normally.

## Design decisions

Serve the sale page through CDN; use atomic admission and bounded queue consumers rather than a DB write for every click.

Dedup requestId, enforce one purchase per policy, and return sold-out/admission responses explicitly.

## Trade-offs

- Fair and simple checkout
- Waiting room infrastructure needed



## Failure handling

Reservation succeeds but enqueue or order creation fails: Record an outbox or durable reservation reconciliation marker; retry with the same token. Release an expired unpaid token only after a fenced, idempotent order transition.
