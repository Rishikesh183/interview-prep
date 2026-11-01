---
title: "Hybrid fan-out and the celebrity problem"
kind: pattern
tags: ["fanout", "news-feed", "skew", "cost-models"]
components: ["service", "worker", "event_stream", "cache"]
related: ["fan-out-on-write", "fan-out-on-read", "hot-partitions", "backpressure-load-shedding"]
---

## What it is

Combine pushed timelines for ordinary authors with read-time merging for high-fan-out authors. The purpose is to keep normal reads cheap while preventing a single publication from generating an unbounded delivery burst.

## When to use it

Social graphs with a heavy-tailed follower distribution: many small accounts and a few very large ones. It also helps when only a small fraction of followers actively read a feed. There is no universal celebrity threshold.

## How it works

1. Store every post and a durable publication event.
2. Apply a versioned delivery policy using eligible follower count, activity, publication rate, queue budget and freshness targets.
3. Push normal-author post IDs into reader timelines. Keep high-fan-out authors' recent posts indexed by author instead.
4. Feed Service reads a pushed page, looks up the reader's pull-mode followees and merges their recent posts. Hydrate, dedup and enforce current access rules.
5. During policy changes, tolerate overlap using post-ID deduplication and a bounded backfill window. Avoid gaps while changing the delivery route.

### Worked example

For an illustrative page, load 30 pushed IDs and 20 recent IDs from each of two pull-mode authors: **70 candidates** before filtering and merging. Compare this with copying one celebrity post to 5M follower timelines. Choose the delivery route by estimated push work versus active-reader merge work, not a memorized “10K followers” constant. In the HLD, show both Timeline Cache and Author Post Index feeding the same Feed Service.

## Trade-offs

This adds policy state and two delivery paths. Monitoring must distinguish publication acceptance, fan-out lag and user-visible freshness. A bad threshold or transition can still overload reads or hide posts. Keep a replayable publication source to repair derived state.

## Interview one-liners

- “I split delivery by measured fan-out cost, then merge both paths into one cursor-stable feed.”
- “A threshold change is a data migration with deduplication and gap protection.”

## Common follow-up questions

- **Account suddenly goes viral?** Reclassify with a policy version and isolate outstanding large fan-outs.
- **Reader follows thousands of celebrities?** Bound candidate work and introduce additional precomputation or ranking tiers.
- **Queue is behind?** Expose a freshness watermark and use a bounded pull fallback where affordable.

## Further reading

- [Timelines at Scale — historical engineering talk](https://www.infoq.com/presentations/Twitter-Timeline-Scalability/)
- [Caching best practices — AWS](https://aws.amazon.com/caching/best-practices/)
