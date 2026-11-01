---
title: "Trie with cached top-K + daily rebuild"
order: 1
---

Query logs land in Kafka → S3; a daily Spark job aggregates counts and builds a trie where each node stores its top-10. Serialized tries are loaded into suggestion servers (sharded by first letters); responses cached at CDN with short TTL.

## Design decisions

Precompute top-K and prune long-tail prefixes; batch trie builds trade freshness for simpler serving.

Debounce client requests and cache normalized-prefix results. Apply privacy filtering before publishing query logs.

## Trade-offs

- Very fast reads
- Up to a day stale; add a streaming layer for trending queries



## Failure handling

A ranking build fails or a stream updater falls behind: Keep serving the last complete version; publish builds with atomic version swaps. Monitor freshness, dedup replayed query events, and expire stale CDN results within the freshness budget.
