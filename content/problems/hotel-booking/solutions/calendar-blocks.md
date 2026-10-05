---
title: "Calendar blocks per listing"
order: 2
---

Store booked date ranges per listing; reserve with an exclusion constraint on overlapping ranges (Postgres) inside a transaction.

## Trade-offs

- Compact for single-unit homes
- Harder for hotels with many identical rooms
