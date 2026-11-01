---
title: "Browser architecture with explicit ownership"
order: 1
---

Wrap the native video element in a media adapter. Feed actual media events into a state machine instead of assuming play() succeeded. Use native HLS where supported or a compatible adaptive player via Media Source Extensions; quality selection follows capabilities and user preference.

## Component boundaries

The feature root coordinates **Player Controls**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
mediaState: idle | loading | playing | paused | buffering | ended | error
currentTime: number
selectedCaption: string | null
qualityMode: auto | explicit
seekGeneration: number
```

PlaybackMetadata: {videoId,manifestUrl,expiresAt,tracks,duration,poster}; short-lived account-scoped cache; never cache entitlement forever; the media element is authoritative for current playback/buffer state.

Main network contract: `GET /videos/{id}/playback`. Example response shape:

```javascript
{
  "videoId": "v1",
  "manifestUrl": "https://media.example/manifest.m3u8",
  "expiresAt": "...",
  "duration": 3600,
  "tracks": [{ "kind": "captions", "lang": "en", "url": "..." }]
}
```

Keep imperative media lifecycle isolated from declarative page and controls.

## Performance and accessibility

One active player per page; lazy comments/recommendations, defer optional player modules; bound prefetch and release the previous source on navigation.

5 × 20 / 8 = 12.5 MB encoded payload, excluding decoder overhead. Do not equate JavaScript heap with media memory or prefetch the whole movie. Measure startup delay, rebuffer ratio, seek latency and decoder behavior on supported devices. These are illustrative design assumptions to validate, not benchmark results.

Prefer usable native controls as fallback, labelled custom controls, keyboard seeking/volume and visible focus. Provide captions and avoid autoplay with sound; handle play() rejection.

## Failure walkthrough

**Signed manifest expires during a seek or network drops**

Refresh authorization once, preserve intended time, resume only after metadata is valid; show retry and keep controls operable. A new video ID cancels old loads.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Native playback minimizes complexity but gives less control over adaptive logic. A player library adds capabilities and bundle weight; DRM/browser matrices require explicit scope.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
