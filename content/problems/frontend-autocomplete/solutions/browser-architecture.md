---
title: "Browser architecture with explicit ownership"
order: 1
---

Debounce the fetch by an illustrative 200 ms; abort the previous lookup and also compare requestGeneration before committing. A late response for ca must never overwrite cam. Input text remains separate from the committed selection.

## Component boundaries

The feature root coordinates **Suggestion List**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
query: string
activeOptionId: string | null
open: boolean
requestGeneration: number
selectedValue: {id,label} | null
```

SuggestionPage: {query, locale, items: [{id,label,description}], fetchedAt}; cache key [suggestions, locale, normalizedQuery]; bounded LRU cache, short freshness window; never reuse across different tenants.

Main network contract: `GET /suggestions?q={query}&locale={locale}&limit=10`. Example response shape:

```javascript
{ "items": [{ "id": "p1", "label": "Camera", "description": "Cameras" }] }
```

Keep ephemeral selection and focus state local; no persistence is required for basic operation.

## Performance and accessibility

Mid-range phone, long-tail latency, at most 10 suggestions mounted; target immediate input feedback before network completion.

10 immediate input updates; often 1 lookup after the burst, but pauses can trigger more. Reduces request bursts without delaying local typing. Measure input responsiveness and request count under variable latency; debounce is not a correctness mechanism. These are illustrative design assumptions to validate, not benchmark results.

Use combobox/listbox semantics, labelled input, aria-expanded, aria-controls and aria-activedescendant; Arrow keys move active option, Enter commits, Escape closes. Keep DOM focus in input and announce result count politely.

## Failure walkthrough

**An older slow request succeeds after a newer fast one**

Ignore obsolete generations even if abort arrived too late; show retry for the current query only and keep typed text.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Fetch on each change with request identity for small workloads; debounce saves traffic but delays first suggestions. A headless controlled component supports reuse while a wrapper owns caching.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Combobox keyboard and semantics](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
