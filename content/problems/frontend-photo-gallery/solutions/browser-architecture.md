---
title: "Browser architecture with explicit ownership"
order: 1
---

Use responsive image sizes with intrinsic width/height; lazy-load below-fold thumbnails and preload at most adjacent lightbox images. Keep the selected photo by stable ID; do not automatically advance a carousel without pause and user control.

## Component boundaries

The feature root coordinates **Gallery / Lightbox**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
activePhotoId: string | null
lightboxOpen: boolean
returnFocusId: string | null
loadedNeighborIds: Set<id>
gestureState: transient local pointer data
```

PhotoPage: {items:[{id,alt,width,height,variants}],nextCursor}; cache metadata separately from decoded images; bound prefetched neighbors and release object URLs when no longer used.

Main network contract: `GET /albums/{id}/photos?cursor={cursor}`. Example response shape:

```javascript
{
  "items": [
    {
      "id": "img1",
      "alt": "Mountain at sunrise",
      "width": 1600,
      "height": 900,
      "variants": { "thumb": "...", "medium": "...", "full": "..." }
    }
  ],
  "nextCursor": "c2"
}
```

Keep ephemeral selection and focus state local; no persistence is required for basic operation.

## Performance and accessibility

2,000 metadata entries; fetch 30 thumbnails/page; lightbox prefetch only previous/next.

~5.76 MB decoded per image; 3 neighbors/active ≈17.3 MB before overhead. Compressed transfer size understates decoded memory; bound neighbor prefetch. Profile decoded memory and image layout shifts on mobile. These are illustrative design assumptions to validate, not benchmark results.

Use meaningful alt text, keyboard next/previous, an accessible modal with Escape, trapped focus and focus restoration to the opened thumbnail; respect reduced motion.

## Failure walkthrough

**A full-resolution image fails while navigating quickly**

Keep thumbnail/placeholder, expose retry, ignore old selection loads, abort expendable prefetch and revoke local object URLs.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- A static grid is simpler and avoids modal navigation complexity. Preloading all full-resolution photos is wasteful even if metadata is small.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
