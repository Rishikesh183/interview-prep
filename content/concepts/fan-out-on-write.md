---
title: "Fan-out on write (push feeds)"
kind: pattern
tags: ["fanout", "news-feed", "read-heavy", "materialized-views"]
components: ["service", "worker", "event_stream", "cache"]
related: ["fan-out-on-read", "hybrid-fan-out", "transactional-outbox", "idempotency"]
---

## What it is

Build each reader's feed when an author publishes. Background workers insert the new post ID into followers' timeline indexes, moving repeated computation from feed reads to the write pipeline. This is also called a push feed.

## When to use it

Read-heavy social feeds, activity inboxes and subscriptions where most readers need similar recent items. Choose it when fast reads justify write amplification and a bounded delivery delay. A timeline index is derived state, not the only copy of a post.

## How it works

1. Post Service stores `Post(post_id, author_id, created_at, body)` and a durable event/outbox marker.
2. A consumer reads followers in batches and inserts `FeedEntry(user_id, post_id, sort_key)` into timeline storage. Enforce uniqueness on `(user_id, post_id)` so replay is safe.
3. Feed Service reads a bounded ID list, hydrates posts and checks current deletion/privacy rules. The write path does not guarantee that permissions remain unchanged until read time.
4. Cap each cached timeline and rebuild from authoritative posts/relationships after eviction.

### Worked example

Assume 1,000 new posts/s and 500 eligible followers per post. That produces about **500,000 timeline inserts/s**, rather than 1,000 writes/s. A 5M-follower author can create an exceptional burst even when the average looks safe. Draw the durable post store, event stream, fan-out workers, follower lookup and per-reader timeline cache separately. Label the API response as “post accepted”; follower delivery can continue afterward.

## Trade-offs

Fast feed reads cost extra writes, derived storage and background lag. Inactive followers may receive work they never read. A celebrity can monopolize workers; batch/checkpoint work and isolate large fan-outs or use the hybrid pattern. Follow/unfollow backfill and deletion handling need explicit policies.

## Interview one-liners

- “I store the post once, then asynchronously materialize follower timeline IDs. The durable post remains authoritative.”
- “My capacity estimate uses posts/s × eligible followers, not just the post API QPS.”

## Common follow-up questions

- **Worker dies halfway through?** Resume a checkpoint and dedup `(user_id, post_id)` insertions.
- **New follower wants old posts?** Backfill a bounded recent window or use a read-time fallback.
- **Post is deleted?** Hide it during hydration immediately; clean derived indexes asynchronously.

## Further reading

- [Timelines at Scale — historical engineering talk by Raffi Krikorian](https://www.infoq.com/presentations/Twitter-Timeline-Scalability/)
- [Materialized View pattern — Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view)
