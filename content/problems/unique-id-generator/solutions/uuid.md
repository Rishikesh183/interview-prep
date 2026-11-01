---
title: "UUID v7 in-process"
order: 3
---

Each service generates 128-bit UUIDv7 locally (timestamp + randomness). No coordination at all.

## Design decisions

Use only if the width and strict uniqueness requirements can be relaxed; never truncate a UUID to 64 bits.

Serialize 64-bit integers as strings in JSON. Library mode calls this locally; UUIDv7 returns 128-bit values and requires a relaxed ID-width requirement.

## Trade-offs

- Zero infrastructure
- 128-bit, not 64
- Index locality is fine because v7 is time-ordered

- UUIDv7 is 128-bit with probabilistic uniqueness. It does not satisfy the prompt’s strict 64-bit globally unique numeric-ID contract. This is a comparison alternative only when those constraints are relaxed.

## Failure handling

Clock moves backward or a worker lease is reassigned: A Snowflake generator stops/waits rather than emitting overlapping timestamps; fence obsolete leases and delay namespace reuse. Ticket ranges avoid clock dependence but lose global time order.
