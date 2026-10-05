---
title: "Load balancing"
tags: ["networking"]
components: ["load_balancer","dns","service_discovery"]
related: ["scalability-basics","consistent-hashing","websockets-realtime"]
---

## What it is

A load balancer spreads incoming requests across several server instances so no single one is overloaded, and stops sending traffic to instances that are unhealthy.

## When to use it

Any time a tier has more than one instance. Also at the edge (DNS / geo routing) to send users to the nearest region.

## How it works

- **L4** balancers route by IP/port (fast, protocol-agnostic); **L7** balancers understand HTTP and can route by path, header or cookie.
- Algorithms: round-robin, least-connections, weighted, and **consistent hashing** when the same key should land on the same server (caches, WebSocket rooms).
- **Health checks** remove dead instances; **service discovery** keeps the list of instances current as they scale.
- **Sticky sessions** pin a client to one server; useful for WebSockets, but avoid for stateless HTTP.

## Trade-offs

- The balancer itself must be redundant (active/passive pair or a managed service).
- Sticky sessions make scaling and failover uneven.
- L7 features (TLS termination, routing rules) cost CPU and add latency.

## Interview one-liners

- "An L7 load balancer with health checks in front of a stateless service tier."
- "For WebSockets I'd use consistent hashing on room id so a room's members share a node."

## Common follow-up questions

- What happens to in-flight requests when an instance dies?
- How do you avoid the load balancer being a single point of failure?
- When would you pick least-connections over round-robin?

## Further reading

- [NGINX: HTTP load balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [AWS Elastic Load Balancing](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html)
