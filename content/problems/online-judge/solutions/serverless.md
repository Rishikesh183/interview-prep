---
title: "Serverless execution"
order: 2
---

Each submission triggers an isolated function per language runtime; results pushed via WebSocket.

## Design decisions

Scale by queue age and runtime; maintain hard CPU, memory, disk, process and network limits.

Publish execution only after the submission record is durable; enforce user quotas.

Poll with backoff or use a notification hint; hidden test details must remain private.

## Trade-offs

- No fleet to manage
- Cold starts and execution-time caps; weaker control over isolation



## Failure handling

A sandbox times out or a judge crashes: Kill the entire process tree/microVM, reclaim resources and persist an execution outcome. Redeliver infrastructure failures by submission_id; a user-code timeout is a verdict, not an infinite retry.
