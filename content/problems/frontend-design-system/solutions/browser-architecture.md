---
title: "Browser architecture with explicit ownership"
order: 1
---

Layer semantic tokens -> headless behavior primitives -> styled components -> product patterns. Define one controlled/uncontrolled ownership rule and forward refs. Publish tree-shakable per-component exports, semver changes and migration examples with visual, interaction and accessibility coverage.

## Component boundaries

The feature root coordinates **Accessible Primitives**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
themePreference: light | dark | system
previewProps: component-specific local state
selectedExampleId: string
component value owned by caller when controlled; internal otherwise
```

CatalogManifest: {version,components:[{name,entry,docsUrl,tokenVersion}]}; cache immutable released versions; the runtime component package is build-time code, not downloaded executable code from arbitrary manifest URLs.

Main network contract: `GET /catalog/releases/{version}/manifest`. Example response shape:

```javascript
{
  "version": "2.1.0",
  "tokenVersion": "2",
  "components": [{ "name": "Dialog", "entry": "@acme/ui/dialog", "docsUrl": "/docs/dialog" }]
}
```

Separate token values from interaction semantics so restyling cannot silently change keyboard behavior.

## Performance and accessibility

20 consuming apps, ~40 primitives; avoid bundling the full library for one button; measure consumer output, not source size.

Desired dependency closure is Button + shared tokens/helpers, not 40 component modules. Verify tree shaking and CSS side effects in a production consumer fixture. Track bundle changes and visual/interaction regressions per release. These are illustrative design assumptions to validate, not benchmark results.

Define keyboard/focus contracts per primitive, native semantics first, contrast and reduced-motion tokens, accessible-name requirements and automated plus manual assistive-technology checks.

## Failure walkthrough

**A theme override or minor release breaks a consumer interaction**

Document stable token/API contracts, use prerelease consumer validation, migration tooling and version rollback. Accessibility requirements are part of the API.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Headless primitives maximize flexibility but consumers must style correctly. A styled system accelerates consistency but needs deliberate escape hatches; avoid unrestricted internal DOM dependencies.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
