---
title: "Fan-out on read (pull feeds)"
kind: pattern
tags: ["fanout", "news-feed", "query-planning", "pagination"]
components: ["service", "cache", "wide_column", "graph_db"]
related: ["fan-out-on-write", "hybrid-fan-out", "indexing", "caching-strategies"]
---

## What it is

Store an author's posts once and assemble the reader's feed when requested. Feed Service loads the follow list, retrieves recent posts from relevant authors and merges them into one ordered page. This is also called a pull feed.

## When to use it

Feeds with modest follow counts, infrequent readers, or authors with huge audiences. Writes stay independent of follower count. A celebrity's publication is inexpensive, but every reader pays the query/merge cost when opening their feed.

## How it works

1. Index posts by `(author_id, created_at, post_id)` so each author's recent list is already ordered.
2. Load `Follow(follower_id, followee_id)`. Batch/cache author-list lookups and bound concurrency instead of opening an unbounded number of calls.
3. Merge sorted author lists with a heap, fetch more only as needed, filter inaccessible/deleted posts and dedup IDs.
4. Return an opaque cursor with a stable ordering boundary. A ranked feed may require a snapshot/version rather than a timestamp alone.

### Worked example

A reader follows 200 authors. Loading 20 recent IDs from each yields up to **4,000 candidates for a 20-item page**. With ordered lists, a k-way merge selects results without sorting the complete history. But the initial author fetches, slowest dependency and privacy checks can dominate p99 latency. Put Follow Store and per-author recent-post storage behind Feed Service in the HLD; there is no per-follower write on the publication path.

## Trade-offs

Cheap writes and less duplicated state trade against read amplification and variable latency. Cache author lists, bound follow counts or isolate readers with extreme graph sizes. The logical source can be current while a cached author list is still stale, so pull does not automatically mean strong freshness.

## Interview one-liners

- “A new post is stored once; the read path merges bounded per-author lists.”
- “I estimate authors touched per feed request and measure tail latency, not just average merge CPU.”

## Common follow-up questions

- **Reader follows 100K accounts?** Explain the latency limit and consider precomputation or hybrid delivery.
- **Concurrent new posts shift pages?** Use a stable cursor boundary/snapshot and ID deduplication; avoid offset pagination over a changing feed.
- **One author store is slow?** Apply deadlines and document whether partial results are acceptable.

## Further reading

- [Timelines at Scale — historical engineering talk](https://www.infoq.com/presentations/Twitter-Timeline-Scalability/)
