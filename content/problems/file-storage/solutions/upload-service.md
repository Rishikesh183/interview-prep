---
title: "Upload service streaming chunks"
order: 2
---

Clients send resumable chunked uploads to an upload service that writes chunks to object storage and records them in metadata. Devices long-poll a changes endpoint for sync. Conflicts are resolved by keeping both versions.

## Design decisions

Immutable chunking reduces transfer cost; metadata needs atomic version and block-list updates.

Presigned mode returns signed object-store URLs; upload-service mode returns service chunk URLs.

Retry the same chunk number and checksum safely; metadata commit is a separate operation.

Commit the version and change cursor atomically; incomplete blocks must not become a visible file.

A durable cursor recovers missed WebSocket hints or long-poll responses.

## Trade-offs

- Easier to validate and scan content
- Upload bandwidth flows through your fleet
- Long-polling is simpler than WebSockets but less instant



## Failure handling

Upload succeeds but metadata commit fails: Leave uploaded blocks unreferenced, allow a retry with the same upload ID, and garbage-collect abandoned blocks after a grace period. Never expose a partial file version.
