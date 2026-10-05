---
title: "SFU with simulcast"
order: 1
---

Signaling over WebSockets; clients send 3 simulcast layers to a regional SFU which forwards the right layer to each receiver; STUN/TURN for NAT; recording bots join as participants and write to S3.

## Trade-offs

- Server does no transcoding: cheap and low latency
- Clients decode many streams
