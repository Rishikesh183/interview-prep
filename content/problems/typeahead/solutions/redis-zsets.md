---
title: "Prefix → sorted set in Redis"
order: 2
---

For each prefix up to 10 chars keep a Redis sorted set of top queries; a streaming job increments scores.

## Design decisions

Precompute top-K and prune long-tail prefixes; batch trie builds trade freshness for simpler serving.

Debounce client requests and cache normalized-prefix results. Apply privacy filtering before publishing query logs.

## Trade-offs

- Fresh within minutes
- Huge key count; prune long-tail prefixes



## Failure handling

A ranking build fails or a stream updater falls behind: Keep serving the last complete version; publish builds with atomic version swaps. Monitor freshness, dedup replayed query events, and expire stale CDN results within the freshness budget.
