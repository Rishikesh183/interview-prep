---
title: "Object storage for blobs"
tags: ["storage","media"]
components: ["object_storage"]
related: ["cdn","database-choice-sql-vs-nosql"]
---

## What it is

A store for large immutable files (images, video, backups, logs) addressed by key, like Amazon S3. Cheap, durable and effectively unlimited.

## When to use it

Any media or file content. Keep only metadata (owner, size, key) in the database.

## How it works

- Upload directly from the client with a **presigned URL**, so bytes don't pass through your servers.
- Large files use **multipart / chunked** uploads, which are resumable.
- Serve reads through a **CDN** with the bucket as origin.
- **Lifecycle rules** move old objects to cheaper tiers or delete them.

## Trade-offs

- Not a database: no queries, and listing is slow; keep an index elsewhere.
- Overwrites and listings may be eventually consistent depending on the provider.
- Egress can be the biggest cost; use a CDN.

## Interview one-liners

- "The client gets a presigned PUT URL, uploads to S3, then confirms; S3 events trigger thumbnail workers."

## Common follow-up questions

- How do you resume a 5 GB upload that failed at 80%?
- How do you keep private files private?

## Further reading

- [Amazon S3 user guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
