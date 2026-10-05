---
title: "WebSockets & real-time"
tags: ["realtime","networking"]
components: ["websocket_server"]
related: ["pub-sub","load-balancing","message-queues-vs-streams"]
---

## What it is

A WebSocket is a long-lived, two-way connection between client and server, so the server can push updates instantly instead of the client polling.

## When to use it

Chat, live location, collaborative editing, live scores, notifications while the app is open.

## How it works

- The client upgrades an HTTP connection; the server keeps it open (memory per connection).
- A **WebSocket tier** of many servers sits behind an L4 load balancer; each holds part of the connections.
- To reach a user on another server, servers share **pub/sub** channels or a **session registry** (user → server).
- Heartbeats detect dead connections and drive presence. Alternatives: **SSE** (server→client only) and long polling.

## Trade-offs

- Stateful connections make deploys and scaling harder (connections must drain and reconnect).
- Mobile networks drop connections; clients must reconnect and catch up from storage.

## Interview one-liners

- "Messages are persisted first, then published to the recipient's channel; whichever gateway holds their socket delivers it."

## Common follow-up questions

- How many connections per server, and how many servers?
- How does a reconnecting client get the messages it missed?

## Further reading

- [MDN: The WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
