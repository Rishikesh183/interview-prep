---
title: "Frontend performance & accessible rendering"
tags: ["frontend", "interview"]
components: ["web_worker"]
related: ["frontend-state-and-contracts", "frontend-recovery-and-offline"]
---

## What it is

Frontend capacity is constrained by device CPU, main-thread work, rendered elements, transferred bytes and retained memory. Begin with a representative device and user journey, then use an explicit budget and measurement plan to choose an optimization.

## When to use it

Use for long feeds, large grids, image-heavy pages and chart dashboards. Backend request throughput alone cannot explain a sluggish browser.

## How it works

Estimate visible work before total dataset size. A 100,000-row grid with 40 mounted rows has a small DOM window, but cached rows still consume memory. Bound both. Reserve image dimensions, load appropriate variants, split inactive route code and avoid long synchronous work. A web worker can transform data through versioned postMessage jobs; it cannot touch the DOM. Discard stale job results and measure serialization cost.

Pair virtualization with keyboard focus and logical row indices. Pin focused items or move focus deliberately before unmounting. Core Web Vitals provide field signals for loading, responsiveness and layout stability; lab profiles explain individual bottlenecks. Written targets are not measurements.

## Trade-offs

Virtualization reduces mounted work but complicates heights, focus and find-in-page. Workers add messaging and lifecycle overhead. Memoization only pays for expensive repeated computation with stable inputs. Prefer simpler pagination when it meets the interaction need.

## Interview one-liners

- “I bound DOM work and retained data separately.”
- “I profile the actual interaction on the target device before moving work to a worker.”

## Common follow-up questions

- **Why not render all rows?** Large DOM, layout and event work can delay input.
- **Does a worker make everything faster?** Startup and transfer can outweigh small tasks.
- **How is accessibility checked?** Keyboard paths, semantic structure, focus transitions and assistive-technology testing alongside automated checks.

## Further reading

- [web.dev: Web Vitals](https://web.dev/articles/vitals)
- [MDN: using web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [W3C: interactive grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
