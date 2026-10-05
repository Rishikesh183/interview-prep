---
title: "Trie with cached top-K + daily rebuild"
order: 1
---

Query logs land in Kafka → S3; a daily Spark job aggregates counts and builds a trie where each node stores its top-10. Serialized tries are loaded into suggestion servers (sharded by first letters); responses cached at CDN with short TTL.

## Trade-offs

- Very fast reads
- Up to a day stale; add a streaming layer for trending queries
