---
title: "Browser architecture with explicit ownership"
order: 1
---

Slice files into 8 MiB parts and upload at most three concurrently. Confirm progress only for acknowledged parts; in-flight bytes are provisional. Store session metadata in IndexedDB, not the whole file by default; after reload require re-selection and verify fingerprint unless a supported permissioned file handle is available.

## Component boundaries

The feature root coordinates **Upload Queue**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
filesById: {fileRef,sessionId,status,confirmedParts,inFlightBytes}
status: queued | uploading | paused | failed | complete
concurrencyLimit: number
retryBudgetByPart: Map<part,number>
```

UploadSession: {uploadId,fileFingerprint,partSize,confirmedParts,expiresAt}; server is authoritative for uploaded parts; cache metadata only and reconcile through a session-status request.

Main network contract: `GET /uploads/{uploadId}`. Example response shape:

```javascript
{
  "uploadId": "up1",
  "partSize": 8388608,
  "confirmedParts": [1, 2],
  "expiresAt": "...",
  "status": "active"
}
```

Persist resumable session identity and acknowledgements separately from ephemeral File references.

## Performance and accessibility

Up to 2 GiB per file; three concurrent 8 MiB parts; no whole-file ArrayBuffer.

~24 MiB active chunk payload plus browser/network overhead. Bound concurrency and release buffers; actual browser copies add memory. Profile peak memory and progress behavior with retries, pause and background tabs. These are illustrative design assumptions to validate, not benchmark results.

Provide a labelled file input as well as drag/drop, keyboard pause/cancel, text progress and throttled announcements. Validation errors identify the affected file.

## Failure walkthrough

**A part succeeds but its acknowledgement times out**

Reconcile confirmed parts from server; retry the same part number/checksum safely. Expired sessions require explicit restart; cancel aborts active requests and informs the server.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Whole-file upload is simpler for small files. Resumable multipart adds server coordination; persistent file access varies by browser and permission.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [IndexedDB browser API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
