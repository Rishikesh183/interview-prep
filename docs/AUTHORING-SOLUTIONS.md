# Authoring a guided solution

Every published reference uses three files in `content/problems/<problem>/solutions/`:

- `<slug>.md`: summary, technical decisions, trade-offs and failure discussion.
- `<slug>.graph.json`: the canonical compact graph, API contracts and state/entities. API owners use `ownerNodeId`; entities use `storeNodeId`. The graph codec restores catalog defaults.
- `<slug>.walkthrough.json`: explanations, estimates, build sequence and request flows. See `lib/schema/walkthrough.ts` for the schema.

Keep graph positions, fields, endpoint payloads and ownership in the graph file. Reference them by ID or entity name in the walkthrough; do not copy those definitions into multiple files.

For every node, explain its responsibility and the reason for its configuration. For every contract, supply request, response and status/error semantics. Explicitly say “No request body” when appropriate. Describe keys, access patterns and concurrency constraints for each entity or state structure. Local generator state, leases and transient counters are legitimate state models; explain how their durability differs from a database record.

Build steps are cumulative. Each step introduces node IDs and any edges whose endpoints have already been introduced, as well as the APIs/entities owned by the available nodes. The last step must expose the complete final graph and every API/entity.

A flow step uses ordered `edgeIds` to describe a directed route and `nodeIds` for its endpoints. Separate cache-hit/miss branches and calls to different dependencies into separate steps. Do not add reverse edges just to depict a function's return value. Shared ingress edges may carry several endpoints; a linked edge API is optional but, when supplied, must belong to the edge target.

State all sizing assumptions and units. Mark illustrative calculations as illustrative; approach-specific calculations must match the chosen architecture. Explain correctness boundaries such as duplicate delivery, expiry, partial writes and fencing. A reference that relaxes the prompt must list its limitations explicitly; passing static graph checks alone is not proof of full requirement compliance.

Do not modify a test merely to match a reference. A check that wrongly excludes a valid architecture can be broadened to express the underlying requirement, with regression coverage for both valid alternatives and invalid designs.

Run `pnpm validate:content`, `pnpm typecheck`, `pnpm lint` and `pnpm test`. Preview the approach through the solutions page and Review, inspect its components and contracts, and check the build sequence and named flows at desktop and narrow widths. Existing solution access and scoring rules apply.
