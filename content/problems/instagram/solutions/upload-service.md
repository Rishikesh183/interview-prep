---
title: "Upload service proxy"
order: 2
---

A dedicated upload service streams photos to S3 and enqueues processing; simpler auth and validation, more bandwidth on your fleet.

## Trade-offs

- Easier validation/virus scanning
- Expensive egress through app tier
