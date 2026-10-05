---
title: "Observability"
tags: ["operations"]
components: ["monitoring","time_series_db"]
related: ["fault-tolerance-retries","scalability-basics"]
---

## What it is

Being able to tell what your system is doing from the outside, using **metrics**, **logs** and **traces**, so you notice problems and find their cause.

## When to use it

Every production system. In interviews, mention it for critical paths and for how you'd detect the failures you designed for.

## How it works

- **Metrics** (counters, latencies) go to a **time-series DB**; dashboards and alerts read them. Watch latency, traffic, errors and saturation.
- **Logs** record events for debugging; keep them structured.
- **Traces** follow one request across services to find the slow hop.
- **Alerts** page on-call on user-visible symptoms (error rate, latency), not every cause.

## Trade-offs

- High-cardinality metrics and verbose logs get expensive; sample and aggregate.
- Too many alerts lead to alert fatigue.

## Interview one-liners

- "I'd alert on p99 redirect latency and 5xx rate, and trace the write path end to end."

## Common follow-up questions

- How would you know this design is failing before users tell you?
- What are your SLOs?

## Further reading

- [OpenTelemetry documentation](https://opentelemetry.io/docs/)
- [Prometheus overview](https://prometheus.io/docs/introduction/overview/)
