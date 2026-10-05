---
title: "Message queues vs event streams"
tags: ["messaging","async"]
components: ["message_queue","event_stream","worker","stream_processor","batch_processor"]
related: ["pub-sub","idempotency","fault-tolerance-retries"]
---

## What it is

Both decouple producers from consumers. A **queue** (SQS, RabbitMQ) hands each message to one consumer and deletes it; a **stream** (Kafka) is a durable, ordered log that many consumer groups read at their own pace.

## When to use it

Slow or unreliable work off the request path (emails, transcoding), absorbing traffic spikes, and fanning events out to several systems.

## How it works

- Queue: workers pull messages; a **visibility timeout** re-delivers a message if a worker dies; failures go to a **dead-letter queue**.
- Stream: messages are appended to **partitions**; order is kept per partition; consumers track **offsets** and can replay history.
- Delivery is usually **at-least-once**, so consumers must be **idempotent**.
- Stream processors (Flink) and batch jobs (Spark) consume streams for aggregation.

## Trade-offs

- Queues are simpler for task distribution; streams win when several consumers need the same events or you need replay.
- Ordering costs parallelism (one partition = one consumer at a time).
- Async means eventual consistency and a harder 'is it done?' story for the user.

## Interview one-liners

- "The API enqueues and returns 202; workers transcode and retry with backoff, then dead-letter."
- "Kafka partitioned by conversation_id gives per-conversation ordering."

## Common follow-up questions

- What happens if a worker crashes halfway through a message?
- How do you avoid processing a message twice?
- How do you keep ordering where it matters?

## Further reading

- [Apache Kafka documentation](https://kafka.apache.org/documentation/)
- [Amazon SQS dead-letter queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
