---
title: "Upload service proxy"
order: 2
---

A dedicated upload service streams photos to S3 and enqueues processing; simpler auth and validation, more bandwidth on your fleet.

## Design decisions

Upload directly or through a dedicated fleet; generate variants asynchronously and deliver through CDN.

Presigned mode transfers bytes to object storage; upload-service mode streams them through the upload fleet.

A retry must not enqueue unbounded duplicate processing; confirm the referenced object belongs to the user.

Return CDN URLs for READY variants, not original photo bytes through the API.

## Trade-offs

- Easier validation/virus scanning
- Expensive egress through app tier



## Failure handling

Thumbnail job is duplicated or a variant fails: Use deterministic object keys and conditional metadata transitions. Retry failed variants; keep the post PROCESSING or show an explicit placeholder instead of broken media.
