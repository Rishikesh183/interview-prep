---
title: "Upload service streaming chunks"
order: 2
---

Clients send resumable chunked uploads to an upload service that writes chunks to object storage and records them in metadata. Devices long-poll a changes endpoint for sync. Conflicts are resolved by keeping both versions.

## Trade-offs

- Easier to validate and scan content
- Upload bandwidth flows through your fleet
- Long-polling is simpler than WebSockets but less instant
