---
title: "Presigned upload + async thumbnails"
order: 1
---

Client asks the API for a presigned S3 URL, uploads directly, then confirms. S3 event → queue → workers produce thumbnails. CDN serves all sizes. Feed uses hybrid fan-out into Redis.

## Trade-offs

- App servers never touch photo bytes
- Post visible only after thumbnails exist (or show placeholder)
