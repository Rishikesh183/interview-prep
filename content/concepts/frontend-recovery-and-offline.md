---
title: "Frontend recovery, offline storage & realtime"
tags: ["frontend", "interview"]
components: ["browser_storage", "service_worker", "realtime_client"]
related: ["frontend-state-and-contracts", "frontend-performance"]
---

## What it is

A resilient frontend distinguishes rendered data, durable local work, confirmed server state and a live connection. IndexedDB can persist structured local records; a service worker can intercept requests for an offline shell; a realtime client receives deltas and recovers missing history.

## When to use it

Use for offline notes, resumable uploads, chat and collaborative editing. Do not add offline caching to every product by default: it introduces migration, stale-data and privacy decisions.

## How it works

For offline edits, atomically persist a local record and an outbox operation with stable mutation ID. Sync with expected versions and explicit conflict handling. A reconnect uses a last-seen cursor/sequence, deduplicates events and backfills gaps. Connection success alone is not proof that local changes are durable on the server.

A service worker caches a versioned public shell and has an explicit activation/update policy. It is separate from an ordinary web worker and may be stopped between events. Do not rely on a permanent background process. Private API caching requires deliberate per-account retention and sign-out handling. Browser storage can fail or be evicted; expose unsaved errors and recovery/export instead of promising a backup.

## Trade-offs

Local-first improves responsiveness and offline availability but adds conflict resolution, quota and migration work. Polling is often sufficient for low-rate updates. SSE is suitable for server-to-browser events; WebSocket supports bidirectional messaging, but neither automatically provides replay or exactly-once delivery.

## Interview one-liners

- “A cursor and a backfill API make reconnection correct; a socket alone does not.”
- “Saved locally and synced to server are separate states.”

## Common follow-up questions

- **What if a retry duplicates a write?** Reuse a mutation ID and let the server deduplicate.
- **What happens when storage is full?** Surface unsaved state, preserve the current draft and offer export/retry.
- **Can background sync be required?** No. Provide a foreground reconnect path for unsupported browsers and stopped workers.

## Further reading

- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
