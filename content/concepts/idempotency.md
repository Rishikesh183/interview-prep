---
title: "Idempotency"
tags: ["reliability","apis"]
components: ["service"]
related: ["fault-tolerance-retries","api-design-rest-grpc","message-queues-vs-streams"]
---

## What it is

An operation is idempotent if doing it twice has the same effect as doing it once. It makes retries safe.

## When to use it

Anything that can be retried: payments, bookings, sends, and every message consumer in an at-least-once system.

## How it works

- The client generates an **idempotency key** per logical action and sends it with the request.
- The server stores key → result. A repeat with the same key returns the stored result instead of acting again.
- In the database, a **unique constraint** on the key (or on a natural key) makes duplicates impossible even under races.
- GET, PUT and DELETE are idempotent by design in HTTP; POST needs a key.

## Trade-offs

- Keys must be stored (with a TTL) and checked atomically.
- The stored response must match what the first call returned, including errors.

## Interview one-liners

- "POST /payments takes an Idempotency-Key; a retry after a timeout returns the original payment, never a second charge."

## Common follow-up questions

- The first request is still in progress when the retry arrives. What happens?
- How long do you keep keys?

## Further reading

- [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [MDN: Idempotent](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent)
