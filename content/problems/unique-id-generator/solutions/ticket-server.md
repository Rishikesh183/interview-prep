---
title: "Ticket servers with ranges"
order: 2
---

Two DB-backed ticket servers hand out ranges (odd/even) of 10K IDs; app servers allocate locally from their range.

## Design decisions

Choose ranges to trade fewer DB writes for more gaps, and explicitly relax global creation-time ordering.

Serialize 64-bit integers as strings in JSON. Library mode calls this locally; UUIDv7 returns 128-bit values and requires a relaxed ID-width requirement.

## Trade-offs

- Simple and strictly unique
- Not time-ordered across servers
- Ranges are lost on crash (gaps)

- Range allocation preserves uniqueness, but consumption across servers is not roughly ordered by actual creation time. Prefer Snowflake when the time-order requirement is strict.

## Failure handling

Clock moves backward or a worker lease is reassigned: A Snowflake generator stops/waits rather than emitting overlapping timestamps; fence obsolete leases and delay namespace reuse. Ticket ranges avoid clock dependence but lose global time order.
