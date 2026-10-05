---
title: "Publish / subscribe"
tags: ["messaging","realtime"]
components: ["pub_sub","notification_service"]
related: ["message-queues-vs-streams","websockets-realtime"]
---

## What it is

Publishers send a message to a topic or channel and every current subscriber receives a copy. Senders don't know who's listening.

## When to use it

Fan-out: chat messages to the server holding a recipient's socket, cache invalidation to every node, notifications to several channels.

## How it works

- Subscribers register interest in channels (e.g. one per user or room).
- Lightweight pub/sub (Redis) is fire-and-forget: offline subscribers miss messages, so persist first.
- Durable pub/sub (Google Pub/Sub, Kafka consumer groups) keeps messages until each subscription acknowledges.
- Notification services subscribe to events and deliver push / email / SMS.

## Trade-offs

- Fire-and-forget is fast but lossy; durable is reliable but heavier.
- Large fan-out (a channel with millions of subscribers) needs batching or a different pattern.

## Interview one-liners

- "Each chat server subscribes to the channels of the users connected to it; the message service publishes after persisting."

## Common follow-up questions

- What happens to a message published while the subscriber is down?
- How does this scale to a channel with 1M subscribers?

## Further reading

- [Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)
- [Google Cloud Pub/Sub overview](https://cloud.google.com/pubsub/docs/overview)
