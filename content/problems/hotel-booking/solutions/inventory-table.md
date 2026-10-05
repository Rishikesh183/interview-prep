---
title: "Room-night inventory table"
order: 1
---

room_inventory(listing_id, date, total, reserved) with a version column; booking increments reserved with a conditional update. Search via Elasticsearch fed by CDC from the DB.

## Trade-offs

- Clear, auditable
- Many rows per listing; partition by listing_id
