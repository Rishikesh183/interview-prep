---
title: "Browser architecture with explicit ownership"
order: 1
---

Virtualize two axes with stable IDs and bounded overscan; offscreen data and selected IDs are independent of DOM rows. Server sorts/filters the entire dataset. A worker can format/index only loaded data; it cannot make sorting one cached page equivalent to sorting all rows.

## Component boundaries

The feature root coordinates **Virtualized Grid**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
activeCell: {rowId,columnId}
selection: {ids:Set<id>,mode:explicit | allMatching,queryKey}
columnWidths: Map<id,number>
editDrafts: Map<cellId,value>
```

GridPages: {queryKey,rowsById,pageRanges,totalCount}; server sorting/filtering for whole dataset; key includes filters, sort and dataset version; cache selected rows independently from mounted DOM.

Main network contract: `GET /rows?sort={sort}&filter={filter}&cursor={cursor}`. Example response shape:

```javascript
{
  "rows": [{ "id": "r1", "version": 4, "cells": { "name": "Ada", "team": "Infra" } }],
  "nextCursor": "c2",
  "totalCount": 100000,
  "queryToken": "q1"
}
```

Move expensive loaded-row formatting off the main thread only after profiling transfer cost.

## Performance and accessibility

100,000 × 50 cells; target around 40 mounted rows and 12 mounted columns including overscan.

5,000,000 logical cells vs ~480 mounted cells. Window both dimensions; keep the focused cell mounted or move focus deliberately. Profile scroll/resize and worker messaging, measure memory for retained pages separately. These are illustrative design assumptions to validate, not benchmark results.

Use table semantics for read-only data; interactive grid needs roving tabIndex, arrow/Home/End navigation, correct logical row/column indices and a focused-cell strategy across virtualization.

## Failure walkthrough

**Another user edits the same cell before save**

Send expected row version; on 409 preserve the draft, show current value and ask how to resolve. Cancel stale query responses on sorting changes.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Simple server-paginated tables are cheaper and often more accessible. Full grid behavior is justified by editing and spreadsheet-like navigation.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Interactive grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
