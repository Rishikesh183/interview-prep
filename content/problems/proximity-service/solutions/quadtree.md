---
title: "In-memory quadtree"
order: 2
---

Each search server builds an in-memory quadtree (leaf ≤ 100 businesses) at startup from the DB; rebuilt nightly with rolling restarts.

## Trade-offs

- Adapts to density
- Startup build time; memory per server (~2 GB)
