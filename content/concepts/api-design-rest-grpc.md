---
title: "API design: REST and gRPC"
tags: ["apis"]
components: ["api_gateway","auth_service","web_client","mobile_client"]
related: ["idempotency","rate-limiting-algorithms","websockets-realtime"]
---

## What it is

Defining how clients talk to your services: resources, methods, payloads, errors, pagination and authentication.

## When to use it

Every design: the API stage is where you show the system's contract before drawing boxes.

## How it works

- **REST**: resources with nouns (`/v1/urls/{code}`), HTTP verbs, status codes (201, 400, 404, 409, 429).
- **Pagination**: cursor-based for feeds (stable under inserts), offset for small lists.
- **Idempotency keys** for unsafe retries; **versioning** in the path or header.
- **gRPC**: typed contracts over HTTP/2, efficient for service-to-service calls and streaming.
- An **API gateway** centralises auth, rate limits and routing; an **auth service** issues tokens (JWT / OAuth).

## Trade-offs

- REST is universal and cacheable; gRPC is faster and typed but less browser-friendly.
- Chatty APIs (many small calls) hurt mobile clients; aggregate where needed.

## Interview one-liners

- "GET /v1/feed?cursor=... returns items and nextCursor, so scrolling is stable while new posts arrive."

## Common follow-up questions

- How do you paginate a feed that changes while scrolling?
- How do you evolve the API without breaking old clients?

## Further reading

- [MDN: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
- [gRPC documentation](https://grpc.io/docs/)
