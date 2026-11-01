---
title: "SFU with simulcast"
order: 1
---

Signaling over WebSockets; clients send 3 simulcast layers to a regional SFU which forwards the right layer to each receiver; STUN/TURN for NAT; recording bots join as participants and write to S3.

## Design decisions

Size media servers by packet/egress or codec compute separately from signaling connections.

Recording permissions and retention are explicit; allocate a nearby media region.

Signaling exchanges SDP/ICE over WebSockets; RTP media goes to SFU/MCU or TURN, independently of the API.

Use ICE with STUN/TURN; WebSocket signaling does not carry the video media stream.

## Trade-offs

- Server does no transcoding: cheap and low latency
- Clients decode many streams



## Failure handling

A participant changes network or the media node fails: Use ICE restart, reconnect signaling and reassign a healthy media node/region with a new token. Expect a short media interruption; preserve meeting permissions and roster.
