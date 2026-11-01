---
title: "Browser architecture with explicit ownership"
order: 1
---

Coordinate filter changes with a generation key but give each widget an independent query/error boundary. Limit parallel requests, pause refresh in hidden tabs and request server aggregation/downsampling for the visible chart resolution.

## Component boundaries

The feature root coordinates **Widget Grid**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
layout: widget placements
expandedWidgetId: string | null
pausedRefresh: boolean
URL owns date range, timezone and filters
```

WidgetResults: {metricId,range,timezone,filters,bucketSize,asOf,points}; key includes all aggregation inputs; separate per-widget freshness; retain last success with explicit stale indicator.

Main network contract: `GET /metrics/{metricId}?from={from}&to={to}&tz={tz}&bucket={bucket}`. Example response shape:

```javascript
{
  "metricId": "sales",
  "asOf": "...",
  "bucketSize": "1h",
  "points": [{ "t": "...", "value": 42 }],
  "partial": false
}
```

Expensive chart transforms can run off-main-thread while controls remain responsive.

## Performance and accessibility

12 widgets, each at most 1,000 displayed points; 4 concurrent queries; hidden-tab refresh suspended.

12,000 displayed points; at least 3 request waves if all start cold. Prioritize visible widgets and downsample before transfer. Measure chart render time, network waterfalls and filter-to-first-widget latency. These are illustrative design assumptions to validate, not benchmark results.

Each chart has a title, units, textual summary and accessible table/download alternative; keyboard controls for filters and layout, distinguish data series beyond color.

## Failure walkthrough

**One slow widget returns a previous date range after filters change**

Reject obsolete keys, show per-widget error and retain clearly marked stale data only when its range is visible. Never label old-range data as current.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- A batched endpoint reduces requests but can couple slow widgets. Independent queries improve isolation; server snapshot tokens are needed if exact cross-widget consistency matters.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
