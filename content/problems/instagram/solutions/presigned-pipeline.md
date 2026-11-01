---
title: "Presigned upload + async thumbnails"
order: 1
---

Client asks the API for a presigned S3 URL, uploads directly, then confirms. S3 event → queue → workers produce thumbnails. CDN serves all sizes. Feed uses hybrid fan-out into Redis.

## Design decisions

Upload directly or through a dedicated fleet; generate variants asynchronously and deliver through CDN.

Presigned mode transfers bytes to object storage; upload-service mode streams them through the upload fleet.

A retry must not enqueue unbounded duplicate processing; confirm the referenced object belongs to the user.

Return CDN URLs for READY variants, not original photo bytes through the API.

## Trade-offs

- App servers never touch photo bytes
- Post visible only after thumbnails exist (or show placeholder)



## Failure handling

Thumbnail job is duplicated or a variant fails: Use deterministic object keys and conditional metadata transitions. Retry failed variants; keep the post PROCESSING or show an explicit placeholder instead of broken media.
