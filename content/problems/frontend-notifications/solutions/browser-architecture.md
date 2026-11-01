---
title: "Browser architecture with explicit ownership"
order: 1
---

Use a versioned unread-count snapshot and ID-based notification deduplication. Optimistic read state is a reversible overlay until acknowledgement. After connection gaps refetch count and page before accepting later events.

## Component boundaries

The feature root coordinates **Notification List**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
drawerOpen: boolean
focusedNotificationId: string | null
pendingReadIds: Set<id>
lastEventCursor: string | null
```

Notifications: {byId,pages,nextCursor,unreadCount,countVersion}; account-scoped cache; count is a versioned server snapshot reconciled after local read mutations, not decremented blindly for every duplicate event.

Main network contract: `GET /notifications?cursor={cursor}`. Example response shape:

```javascript
{
  "items": [{ "id": "n1", "title": "Build complete", "readAt": null, "target": "/builds/b1" }],
  "nextCursor": "c2",
  "unreadCount": 3,
  "countVersion": 10
}
```

Live updates supplement a paginated fetch; the stream is not the sole source of notification history.

## Performance and accessibility

100 notifications per retained page window; bursty live events; coalesce badge updates without blocking drawer controls.

Set membership yields 1 row; count does not change 50 times. Identity and versioning matter more than transport speed. Test two tabs marking the same item read and reordered count responses. These are illustrative design assumptions to validate, not benchmark results.

Use a labelled drawer/dialog with appropriate focus management and Escape behavior; return focus to bell on close. Announce a concise count change, not every historical row.

## Failure walkthrough

**Two tabs read the same notification during a reconnect**

Read mutation is idempotent; accept only current count versions and refresh authoritative state after a gap. Broadcast invalidation across tabs if supported.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Periodic polling may be sufficient. SSE fits server-to-client deltas; WebSocket is useful only when bidirectional traffic is needed.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
