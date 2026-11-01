---
title: "MCU mixing"
order: 2
---

Media servers decode, mix into one composite stream per participant and re-encode.

## Design decisions

Size media servers by packet/egress or codec compute separately from signaling connections.

Recording permissions and retention are explicit; allocate a nearby media region.

Signaling exchanges SDP/ICE over WebSockets; RTP media goes to SFU/MCU or TURN, independently of the API.

Use ICE with STUN/TURN; WebSocket signaling does not carry the video media stream.

## Trade-offs

- Light clients (one stream)
- Very CPU-heavy servers, added latency



## Failure handling

A participant changes network or the media node fails: Use ICE restart, reconnect signaling and reassign a healthy media node/region with a new token. Expect a short media interruption; preserve meeting permissions and roster.
