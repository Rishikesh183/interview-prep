---
title: "Rate limiting algorithms"
tags: ["reliability","apis"]
components: ["rate_limiter","waf"]
related: ["api-design-rest-grpc","caching-strategies"]
---

## What it is

Limiting how many requests a client (user, IP, API key) can make in a period, to protect the system and share capacity fairly.

## When to use it

Public APIs, login endpoints, expensive operations, and flash-traffic events.

## How it works

- **Fixed window**: count per minute; simple, but allows bursts at window edges.
- **Sliding window log**: store timestamps; exact but memory-heavy.
- **Sliding window counter**: weighted current + previous window; a good compromise.
- **Token bucket**: tokens refill at a rate and each request spends one; allows controlled bursts.
- Counters live in a **shared store** (Redis) and are updated **atomically** (INCR, Lua script). Rejections return **429** with Retry-After.

## Trade-offs

- Local counters per server multiply the real limit by the number of servers.
- If the counter store is down: **fail open** (stay available) or **fail closed** (stay safe).
- A WAF and network-level limits handle abusive traffic before it reaches the app.

## Interview one-liners

- "Token bucket per API key in Redis, updated in a Lua script; over-limit gets 429 with Retry-After."

## Common follow-up questions

- How do limits work across regions?
- How would you give premium users a higher limit?

## Further reading

- [RFC 6585: 429 Too Many Requests](https://datatracker.ietf.org/doc/html/rfc6585#section-4)
- [Redis: INCR](https://redis.io/docs/latest/commands/incr/)
