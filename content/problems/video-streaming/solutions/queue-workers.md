---
title: "Queue-driven transcoding workers"
order: 1
---

Creators get a presigned multipart upload URL and upload straight to S3. The upload service records metadata and enqueues a transcode job. Workers split the video into segments, encode each segment into 240p–4K renditions in parallel, write HLS segments + manifests back to S3, and mark the video ready. Viewers fetch manifests and segments via the CDN; the player switches renditions (ABR).

## Trade-offs

- Workers scale with queue depth
- Segment-level parallelism shortens processing
- Popular content is cached at the edge; long tail falls back to origin
