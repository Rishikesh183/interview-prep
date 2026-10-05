---
title: "Block server with presigned URLs"
order: 1
---

Client splits files into 4 MB blocks and hashes each (SHA-256). It asks the metadata service which blocks are missing, uploads only those directly to S3 using presigned URLs, then commits a new file version. A notification service pushes change events to the user's other devices over WebSockets.

## Trade-offs

- Only changed blocks are uploaded (delta sync)
- Content-addressed blocks dedupe across users
- Commit step must be atomic in the metadata DB
