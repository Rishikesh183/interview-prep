---
title: "Browser architecture with explicit ownership"
order: 1
---

Start with a modular monolith, route-level code splitting and explicit feature exports. The shell owns navigation/session/error boundaries; feature modules own their state and APIs. SSR public discovery routes selectively and CSR authenticated tools when appropriate. Adopt independently deployed microfrontends only for concrete team/deploy constraints.

## Component boundaries

The feature root coordinates **Route Boundary**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
sessionView: loading | authenticated | anonymous
activeTenantId: string
routeTransition: idle | loading | failed
feature-local state stays inside each module
```

SessionView: {userId,tenantId,capabilities,expiresAt}; account/tenant-scoped cache reset on identity change; server enforces every permission; shell hides unavailable controls but is not an authorization boundary.

Main network contract: `GET /session`. Example response shape:

```javascript
{ "userId": "u1", "tenantId": "t1", "capabilities": ["billing:read"], "expiresAt": "..." }
```

Own route loading and session context centrally while feature implementation details remain private.

## Performance and accessibility

3 large feature areas; initial load should include shell + active route, not all feature code; track real-user route failures.

Eager: 1,000 KB; active-route split: ~400 KB before shared/runtime overhead. Set production bundle budgets and analyze duplicate dependencies. Measure cache-cold vs warm navigation and hydration; compression changes transfer size. These are illustrative design assumptions to validate, not benchmark results.

Provide skip links, route heading/focus management, document-title updates and keyboard navigation. Route errors must expose recovery without losing shell controls.

## Failure walkthrough

**A lazy chunk is stale after a deployment, or tenant switches mid-request**

Use a guarded refresh prompt for chunk-version failure; cancel old-tenant requests and clear caches before rendering new data. Add route-level error boundaries and release-correlated monitoring.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Microfrontends enable independent release ownership but add shared-runtime, CSS, routing and observability costs. A modular monolith is sufficient until organizational constraints justify these costs.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
