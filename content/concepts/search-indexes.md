---
title: "Search indexes"
tags: ["storage","search"]
components: ["search_index","vector_db"]
related: ["indexing","database-choice-sql-vs-nosql"]
---

## What it is

A separate store (Elasticsearch, OpenSearch) built for full-text and faceted search, using an inverted index: word → documents containing it. Vector databases do the same for similarity search over embeddings.

## When to use it

Searching text, filtering by many attributes at once, autocomplete, and 'similar items' features.

## How it works

- Documents are analysed (tokenised, stemmed) into an **inverted index**; queries are scored for relevance.
- The database stays the source of truth; the index is fed by **change data capture** or events, so it lags slightly.
- Shards and replicas spread the index across nodes.
- Vector DBs store embeddings and find nearest neighbours (HNSW indexes).

## Trade-offs

- Another system to keep in sync; search results can be briefly stale.
- Not suitable as the primary store for transactional data.

## Interview one-liners

- "Listings are indexed in Elasticsearch via CDC from Postgres; search is eventually consistent, bookings are not."

## Common follow-up questions

- How does a new listing get into the index, and how quickly?
- How do you re-index without downtime?

## Further reading

- [Elastic documentation](https://www.elastic.co/guide/index.html)
