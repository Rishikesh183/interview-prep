---
title: "Block server with presigned URLs"
order: 1
---

Client splits files into 4 MB blocks and hashes each (SHA-256). It asks the metadata service which blocks are missing, uploads only those directly to S3 using presigned URLs, then commits a new file version. A notification service pushes change events to the user's other devices over WebSockets.

## Design decisions

Immutable chunking reduces transfer cost; metadata needs atomic version and block-list updates.

Presigned mode returns signed object-store URLs; upload-service mode returns service chunk URLs.

Commit the version and change cursor atomically; incomplete blocks must not become a visible file.

A durable cursor recovers missed WebSocket hints or long-poll responses.

## Trade-offs

- Only changed blocks are uploaded (delta sync)
- Content-addressed blocks dedupe across users
- Commit step must be atomic in the metadata DB



## Failure handling

Upload succeeds but metadata commit fails: Leave uploaded blocks unreferenced, allow a retry with the same upload ID, and garbage-collect abandoned blocks after a grace period. Never expose a partial file version.
