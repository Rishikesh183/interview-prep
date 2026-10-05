---
title: "Event-driven serverless pipeline"
order: 2
---

S3 upload events go to a queue that triggers serverless functions: one splits the file, a fan-out of functions encodes chunks, a final step stitches manifests. Metadata lives in DynamoDB. Delivery via CDN with signed URLs.

## Trade-offs

- No fleet management; pay per use
- Function time/memory limits force fine chunking
- Harder to use GPUs/special encoders
