---
title: "Queue-driven transcoding workers"
order: 1
---

Creators get a presigned multipart upload URL and upload straight to S3. The upload service records metadata and enqueues a transcode job. Workers split the video into segments, encode each segment into 240p–4K renditions in parallel, write HLS segments + manifests back to S3, and mark the video ready. Viewers fetch manifests and segments via the CDN; the player switches renditions (ABR).

## Design decisions

CDN absorbs segment traffic; scale transcoders by queue age and processing time, not viewer count.

API returns signed upload parts; the creator sends media bytes to raw object storage.

Use an outbox/object-store event and dedup processing version; duplicate completion must not publish incomplete media.

The player fetches HLS/DASH segments from CDN and switches bitrate adaptively.

## Trade-offs

- Workers scale with queue depth
- Segment-level parallelism shortens processing
- Popular content is cached at the edge; long tail falls back to origin



## Failure handling

A transcoder fails after writing some renditions: Retry deterministic versioned segment jobs, validate outputs and publish the manifest atomically when complete. Garbage-collect abandoned versions; the old READY version remains playable.
