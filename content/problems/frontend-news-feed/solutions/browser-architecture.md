---
title: "Browser architecture with explicit ownership"
order: 1
---

Use cursor pagination, ID normalization and a variable-height virtualized list. Anchor by post ID plus pixel offset rather than raw scrollTop. Keep new posts behind a New posts button to avoid moving the reader.

## Component boundaries

The feature root coordinates **Virtualized Feed**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
anchor: {postId,offset}
pendingLikes: Map<postId,mutationId>
newItemsAvailable: boolean
focusedPostId: string | null
```

FeedPages: {byId: Record<id,Post>, pageIds: string[][], nextCursor, snapshotId}; query key [feed, viewerId, snapshotId]; retain a bounded page window and refetch evicted ranges without duplicating IDs.

Main network contract: `GET /feed?cursor={cursor}&snapshot={snapshotId}`. Example response shape:

```javascript
{items:[{id:"p1",body:"Hello",image:{url,width,height},liked:false,version:3}],nextCursor:"c2",snapshotId:"s1"}
```

Keep ephemeral selection and focus state local; no persistence is required for basic operation.

## Performance and accessibility

10,000 browsed posts, 20 fetched per page; illustrative mounted window of 20 plus 10 overscan; lazy images with reserved aspect ratio.

30 / 10,000 = 0.3% of rows mounted. DOM work scales with the window; retained data still needs an independent bound. Profile scrolling, image decode and memory; preserve focused rows when windowing. These are illustrative design assumptions to validate, not benchmark results.

Use semantic articles and headings, keyboard-operable like/load-more controls, polite load announcements and stable focus when rows are recycled. Never announce the whole feed on every update.

## Failure walkthrough

**A like retry and a new page return conflicting versions**

Track mutationId and server version; rollback only the failed optimistic operation. Dedup page IDs, expose retry and retain existing content.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- A simple paginated list has better navigation semantics for shorter feeds; virtualization helps very long sessions but complicates variable heights and accessibility.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
