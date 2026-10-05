---
title: "CDN"
tags: ["performance","networking"]
components: ["cdn"]
related: ["caching-strategies","object-storage-blobs","load-balancing"]
---

## What it is

A content delivery network is a worldwide set of edge caches that serve static files, media and sometimes API responses from a location close to the user.

## When to use it

Images, video, scripts and downloads; anything read by many users far from your origin. Also to absorb traffic spikes and some attacks.

## How it works

- The user's request hits the nearest edge. On a hit the edge answers directly; on a miss it fetches from your **origin** (often object storage) and caches it.
- Cache lifetime is controlled by **TTL / Cache-Control** headers; versioned file names make updates safe.
- **Signed URLs** restrict who can fetch private content.
- Video uses the CDN for every small segment of an adaptive stream.

## Trade-offs

- Invalidating content worldwide is slow and sometimes costly; prefer versioned URLs.
- Dynamic, personalised responses rarely cache well.
- Egress cost moves from your servers to the CDN bill, which is usually cheaper but not free.

## Interview one-liners

- "Static and media go through the CDN with long TTLs and versioned paths; the origin is S3."
- "The CDN is why video bandwidth doesn't land on our servers."

## Common follow-up questions

- How do you update a file that's cached at 300 edges?
- How do you protect paid content on a CDN?
- What's your cache hit ratio target, and what happens on a miss storm?

## Further reading

- [Amazon CloudFront developer guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
- [Cloudflare cache docs](https://developers.cloudflare.com/cache/)
