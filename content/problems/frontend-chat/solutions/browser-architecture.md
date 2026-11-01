---
title: "Browser architecture with explicit ownership"
order: 1
---

Render pending messages under a stable clientMessageId and reconcile the server acknowledgement into the same row. Apply sequence-ordered events, dedup retries and backfill gaps after reconnect. Auto-scroll only if the reader was already near the bottom.

## Component boundaries

The feature root coordinates **Message Timeline**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
activeConversationId: string
draftsByConversation: Map<id,string>
pendingByClientId: Map<id,Message>
lastSequenceByConversation: Map<id,number>
atBottom: boolean
```

MessagePages: {byId,orderedIds,nextBeforeCursor}; key [messages,accountId,conversationId]; dedup using server ID and clientMessageId; retain bounded history, never let one conversation response populate another.

Main network contract: `GET /conversations/{id}/messages?before={cursor}`. Example response shape:

```javascript
{
  "items": [
    { "id": "m1", "clientMessageId": "local1", "sequence": 42, "body": "Hi", "senderId": "u1" }
  ],
  "nextBeforeCursor": "c1",
  "latestSequence": 42
}
```

Receive deltas through a disposable conversation subscription; connection state is distinct from durable message state.

## Performance and accessibility

50 messages per page; many conversations but only one active visible timeline; batch incoming events and bound DOM/history.

At most ~10 event-driven render batches/s rather than 20 separate commits. Batching limits churn but adds up to ~100 ms presentation delay. Measure interaction latency and ensure input updates stay immediate; presence can tolerate more coalescing. These are illustrative design assumptions to validate, not benchmark results.

Label composer and send button, keep keyboard focus while sending, announce relevant new messages politely without rereading history; do not force scroll while the user is reading older content.

## Failure walkthrough

**Socket reconnect delivers a duplicate and skips an event**

Dedup by ID, detect sequence gap and fetch missing range; retry a failed send with its original clientMessageId. Subscription cleanup prevents cross-room leakage.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Polling is simpler for low-frequency messaging. WebSocket lowers latency but requires backfill, connection lifecycle and multi-tab policy.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
