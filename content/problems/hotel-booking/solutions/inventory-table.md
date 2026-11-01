---
title: "Room-night inventory table"
order: 1
---

room_inventory(listing_id, date, total, reserved) with a version column; booking increments reserved with a conditional update. Search via Elasticsearch fed by CDC from the DB.

## Design decisions

Keep search in a derived index; use transactions or exclusion constraints for the authoritative booking decision.

Search availability is a hint; authoritative availability is checked again at reservation time.

A payment callback confirms an existing hold with idempotency; never trust a stale search result.

## Trade-offs

- Clear, auditable
- Many rows per listing; partition by listing_id



## Failure handling

Search shows availability that has just been booked: Return 409 at reservation, suggest another listing/date, and do not charge an unconfirmed reservation. Index updates may lag the authoritative calendar.
