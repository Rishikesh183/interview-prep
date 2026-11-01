---
title: "Browser architecture with explicit ownership"
order: 1
---

Write Note and OutboxMutation atomically to IndexedDB before acknowledging saved locally. A foreground sync coordinator retries stable mutation IDs, uses expectedVersion and stores remote tombstones. Service worker caches the versioned app shell, not arbitrary private API responses; background sync is optional enhancement.

## Component boundaries

The feature root coordinates **Notes Editor**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
activeNoteId: string | null
editorDraft: string
syncStatus: local | syncing | synced | conflict | failed
conflictByNote: Map<id,{local,remote}>
```

SyncResponse: {changes:[{id,version,body,deleted}],nextCursor}; query cache is a transient sync buffer; IndexedDB owns local notes and durable outbox; apply a sync page and cursor in one transaction.

Main network contract: `GET /notes/changes?cursor={cursor}`. Example response shape:

```javascript
{ "changes": [{ "id": "n1", "version": 5, "body": "Notes", "deleted": false }], "nextCursor": "s2" }
```

Local database owns durable notes and pending sync operations, independently from render state.

## Performance and accessibility

1,000 notes averaging 10 KB text; offline app shell; browser storage can be evicted and is not a backup guarantee.

~10 MB raw text plus indexes, outbox and copies. Budget quota overhead; expose export and sync status rather than promise unlimited durability. Test denied storage, quota exhaustion, schema upgrade and a browser restart during sync. These are illustrative design assumptions to validate, not benchmark results.

Keyboard-accessible note list/editor, labelled sync and conflict status, explicit unsaved errors and focus preservation when remote notes arrive.

## Failure walkthrough

**Local and remote versions diverge, or storage write fails**

On 409 keep both versions for merge; never silently overwrite. On transaction failure retain in-memory draft, show unsaved and allow export. A network online flag alone does not prove sync succeeded.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Online-first is simpler when offline edits are unnecessary. CRDTs help concurrent rich editing but add substantial complexity for basic notes.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [IndexedDB browser API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
