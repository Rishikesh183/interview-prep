---
title: "Event-driven serverless pipeline"
order: 2
---

S3 upload events go to a queue that triggers serverless functions: one splits the file, a fan-out of functions encodes chunks, a final step stitches manifests. Metadata lives in DynamoDB. Delivery via CDN with signed URLs.

## Design decisions

CDN absorbs segment traffic; scale transcoders by queue age and processing time, not viewer count.

API returns signed upload parts; the creator sends media bytes to raw object storage.

Use an outbox/object-store event and dedup processing version; duplicate completion must not publish incomplete media.

The player fetches HLS/DASH segments from CDN and switches bitrate adaptively.

## Trade-offs

- No fleet management; pay per use
- Function time/memory limits force fine chunking
- Harder to use GPUs/special encoders



## Failure handling

A transcoder fails after writing some renditions: Retry deterministic versioned segment jobs, validate outputs and publish the manifest atomically when complete. Garbage-collect abandoned versions; the old READY version remains playable.
