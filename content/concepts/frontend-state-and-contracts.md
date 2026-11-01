---
title: "Frontend state ownership & contracts"
tags: ["frontend", "interview"]
components: ["ui_component", "client_store", "query_cache", "api_client", "router"]
related: ["frontend-performance", "frontend-recovery-and-offline"]
---

## What it is

A browser architecture separates presentation, user interaction, navigation and remote data. Give every fact one authoritative owner: component state for transient UI, URL for shareable navigation, a query cache for server snapshots, and a local repository for durable offline edits.

## When to use it

Use this split for search, checkout, dashboards and any page where stale responses or duplicated state can show the wrong result.

## How it works

Start with user actions and draw caller-to-dependency arrows. Define props and callbacks at component boundaries; use an API adapter for network validation and cancellation. Cache keys include identity and every input that changes the result. Mutations reconcile server versions and invalidate affected keys.

For example, query text can be local while typing; committed search filters belong in the URL. Results belong to a key-scoped query cache. Aborting an old request saves work, but a request-generation or identity check prevents late results from committing after cancellation loses a race.

## Trade-offs

A global store makes coordination easy but broad subscriptions and duplicated server data cause synchronization bugs. Keep state near its consumers and derive values rather than maintaining competing copies. A query library does not remove the need to define invalidation and trust boundaries.

## Interview one-liners

- “The URL owns committed filters; the query cache owns results; the component owns its open menu.”
- “Cancellation is an optimization; checking response identity is part of correctness.”

## Common follow-up questions

- **What survives refresh?** URL and deliberate local persistence; ordinary component state does not.
- **Does hiding a button enforce permissions?** No. The server checks every protected operation.
- **How do callbacks differ from HTTP APIs?** Local props/events define ownership; HTTP adds authentication, serialization and network failure.

## Further reading

- [React: choosing state structure](https://react.dev/learn/choosing-the-state-structure)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
