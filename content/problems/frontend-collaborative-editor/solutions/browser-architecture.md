---
title: "Browser architecture with explicit ownership"
order: 1
---

Bind a proven CRDT model to a rich-text editor; persist local updates before showing saved locally, then exchange missing operations using state vectors. Presence is ephemeral and throttled. Undo tracks local user operations rather than reverting the whole shared snapshot.

## Component boundaries

The feature root coordinates **Editor Surface**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
documentId: string
selection: relative document positions
connectionStatus: offline | syncing | synced
pendingUpdateIds: Set<id>
presenceByClient: Map<id,{cursor,lastSeen}>
```

DocumentBootstrap: {docId,snapshot,stateVector,permissions}; cache bootstrap briefly; a dedicated CRDT document model in client state owns live content, not a repeatedly overwritten server-query string.

Main network contract: `GET /documents/{id}/bootstrap`. Example response shape:

```javascript
{
  "docId": "d1",
  "snapshot": "base64 CRDT state",
  "stateVector": "base64",
  "permissions": { "read": true, "write": true }
}
```

A sync provider bridges the editor model to the server without treating the socket as durable storage.

## Performance and accessibility

Document with 50 concurrent editors and 100,000 characters; incremental operations and bounded presence rendering.

250 presence events/s before coalescing. Throttle/coalesce remote cursor presentation; durable document operations require a separate reliable path. Profile long-document typing and IME; presence rate is an assumption, not an algorithm correctness proof. These are illustrative design assumptions to validate, not benchmark results.

Use an editor with documented keyboard/screen-reader and IME support; toolbar buttons expose pressed state, shortcuts and focus return. Announce connection status without rereading every remote edit.

## Failure walkthrough

**Offline edits meet remote edits after permissions were revoked**

Revalidate permissions before sync; preserve a recoverable local copy and explain rejected writes. CRDT convergence does not solve authorization or semantic conflicts.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Server-ordered OT is a valid alternative with transform/version machinery. Last-write-wins whole-document replacement loses concurrent edits and is unsuitable here.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Yjs editor bindings and providers](https://docs.yjs.dev/getting-started/a-collaborative-editor)
