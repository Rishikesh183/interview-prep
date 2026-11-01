---
title: "Browser architecture with explicit ownership"
order: 1
---

The router owns committed URL state and SSRs the initial page for discovery. Client transitions cancel superseded requests and commit only a result matching the canonical query key. Reserve image dimensions and prioritize above-fold assets.

## Component boundaries

The feature root coordinates **Product Grid**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
draftFilters: local edits until Apply
viewMode: grid | list
focusedProductId: string | null
URL is authoritative for committed search parameters
```

ProductResults: {items:[{id,title,price,image}], facets, nextCursor, queryVersion}; key by canonical query/filter/sort/locale; bounded query cache, invalidate changed prices on detail/cart confirmation.

Main network contract: `GET /products?q={q}&filters={filters}&sort={sort}&cursor={cursor}`. Example response shape:

```javascript
{items:[{id:"sku1",title:"Headphones",price:{amount:9900,currency:"INR"},image:{url,width,height}}],facets:[],nextCursor:"c2"}
```

URL state is the source of truth for committed filters; the store holds only drafts.

## Performance and accessibility

40 products per page on a mobile network; prioritize one initial route and visible images, defer optional recommendation code.

40 × 100 KB = 4 MB; 40 × 20 KB = 800 KB before lazy-loading. Image sizing dominates an illustrative listing payload. Measure actual encoded sizes, LCP, layout shifts and hydration; image budgets depend on device width. These are illustrative design assumptions to validate, not benchmark results.

Label filter groups, expose selected filters and clear-all, announce result count without stealing focus; use semantic product links and accessible mobile filter dialog focus restoration.

## Failure walkthrough

**Rapid filter changes render results for the previous URL**

Abort and key-check responses; keep the previous grid visibly marked as updating. Back/forward restores the same committed URL state.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- CSR can be enough for an internal authenticated catalog. SSR improves initial discoverability but adds hydration and personalized-cache boundaries.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
