---
title: "Scalability basics"
tags: ["fundamentals"]
components: ["service","serverless_fn","note","group"]
related: ["load-balancing","caching-strategies","sharding-partitioning","back-of-envelope-estimation"]
---

## What it is

Scalability is a system's ability to handle more load (users, requests, data) by adding resources, without a redesign and without getting slower or less reliable.

## When to use it

Always ask about it first: how many users, how fast is it growing, what is read-heavy vs write-heavy. The answer decides which of the techniques below you actually need.

## How it works

- **Vertical scaling**: a bigger machine. Simple, but has a ceiling and is a single point of failure.
- **Horizontal scaling**: more machines behind a load balancer. Needs *stateless* services: keep session data in a shared store, not in server memory.
- Scale the **data tier** separately: read replicas for reads, caching for hot data, sharding when writes or size outgrow one machine.
- Move slow work **off the request path** with queues and workers.
- In diagrams, use **groups** to show regions/AZs and **notes** to explain why each piece is there.

## Trade-offs

- Horizontal scaling adds moving parts: more failure modes, harder debugging, eventual consistency.
- Over-engineering early is costly; design for roughly 10x current load, not 1000x.
- Stateless app servers are easy to scale; state just moves to the data tier, which is the hard part.

## Interview one-liners

- "Keep the app tier stateless so I can add instances behind the load balancer."
- "The database is the real bottleneck; I'll scale reads with replicas and a cache first, and shard only if writes demand it."

## Common follow-up questions

- What breaks first when traffic grows 10x?
- Where is state kept, and how does a new instance get it?
- How does the system behave during a deploy or when one instance dies?

## Further reading

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [AWS Well-Architected: Reliability pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
