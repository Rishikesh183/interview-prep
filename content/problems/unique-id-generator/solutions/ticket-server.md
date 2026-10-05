---
title: "Ticket servers with ranges"
order: 2
---

Two DB-backed ticket servers hand out ranges (odd/even) of 10K IDs; app servers allocate locally from their range.

## Trade-offs

- Simple and strictly unique
- Not time-ordered across servers
- Ranges are lost on crash (gaps)
