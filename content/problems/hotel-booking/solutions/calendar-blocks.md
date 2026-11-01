---
title: "Calendar blocks per listing"
order: 2
---

Store booked date ranges per listing; reserve with an exclusion constraint on overlapping ranges (Postgres) inside a transaction.

## Design decisions

Multi-room inventory needs separate unit allocation or inventory-table design; one exclusion range cannot model an entire hotel room count.

Search availability is a hint; authoritative availability is checked again at reservation time.

A payment callback confirms an existing hold with idempotency; never trust a stale search result.

## Trade-offs

- Compact for single-unit homes
- Harder for hotels with many identical rooms

- The exclusion-calendar approach directly models single-unit listings. Multi-room hotels need per-room calendars or the inventory-table approach.

## Failure handling

Search shows availability that has just been booked: Return 409 at reservation, suggest another listing/date, and do not charge an unconfirmed reservation. Index updates may lag the authoritative calendar.
