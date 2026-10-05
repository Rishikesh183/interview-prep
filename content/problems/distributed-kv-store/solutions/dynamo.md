---
title: "Dynamo-style leaderless"
order: 1
---

Consistent hashing with vnodes; any node coordinates; N=3, W=2, R=2; vector clocks with client-side merge; hinted handoff, read repair and Merkle-tree anti-entropy; gossip for membership.

## Trade-offs

- Always writable
- Clients may see siblings
