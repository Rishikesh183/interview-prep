---
title: "Browser architecture with explicit ownership"
order: 1
---

Model checkout as explicit states and guard transitions. Disable repeated submit while pending but also reuse one idempotency key for retries of the same attempt. Payment provider fields tokenize sensitive input; query order status after an ambiguous timeout before starting a new attempt.

## Component boundaries

The feature root coordinates **Checkout Form**, a feature-scoped interaction store and a server-state query cache. The API adapter owns request lifecycle; **Existing Backend API** owns HTTP contracts and server enforcement. RPC entries describe local props/callbacks or functions, not network servers. Arrow direction means caller/dependency; data returns along the call path. See the guided HLD for exact node placement, state owners and construction order.

## State and contracts

```text
step: address | delivery | payment | confirmation
draftAddress: safe form fields
submitState: idle | submitting | pending | confirmed | failed
checkoutAttemptId: string
fieldErrors: Record<string,string>
```

CartSnapshot: {cartId,version,lines:[{sku,quantity,unitPrice}],totals,quoteExpiresAt}; key [cart,accountId]; server owns prices, stock and final totals; never persist card data or trust client totals.

Main network contract: `GET /cart`. Example response shape:

```javascript
{
  "cartId": "cart1",
  "version": 7,
  "lines": [{ "sku": "sku1", "quantity": 2, "unitPrice": 500 }],
  "totals": { "amount": 1000, "currency": "INR" },
  "quoteExpiresAt": "..."
}
```

Keep ephemeral selection and focus state local; no persistence is required for basic operation.

## Performance and accessibility

Cart of up to 100 lines; delay payment SDK load until needed, avoid full-page rerenders on every keystroke.

1 edited line + derived totals, rather than 100 independent total calculations. Memoize only profiled expensive work; authoritative totals still come from server. Profile form input latency and payment-SDK loading on slow devices. These are illustrative design assumptions to validate, not benchmark results.

Native form labels and autocomplete attributes, inline error associations, focus first invalid field, step headings and an announced pending state. A visual spinner alone does not communicate submission.

## Failure walkthrough

**Payment succeeds but the order response is lost**

Show pending confirmation, reuse checkoutAttemptId to query/retry safely; server verifies order ownership. Do not double-charge by generating a fresh attempt automatically.

## Interview follow-ups

- How would you test this behavior under out-of-order responses or a route change?
- Which state survives refresh, and which should be cleared on identity change?
- What changes first when the workload grows tenfold?

## Trade-offs

- Optimistic quantity updates feel fast but need version reconciliation. Pessimistic final checkout is clearer where price and stock must be confirmed.
- Browser caches improve perceived speed but require explicit identity, invalidation and memory bounds.
- Structural checks are interview practice heuristics; browser profiling and assistive-technology testing are separate work.

## Further reading

The prompt and architecture are original practice material. The following sources support interview format and browser concepts; this is not a claim that a specific company asks this exact question.

- [Interview question formats](https://www.greatfrontend.com/questions/system-design)
- [Browser performance measurement](https://web.dev/articles/vitals)
- [Accessible patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
