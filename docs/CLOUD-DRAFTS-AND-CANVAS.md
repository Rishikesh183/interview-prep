# Cloud HLD drafts and canvas editing

Signed-in practice now syncs **one latest editable design per account/question**: compact graph, APIs, entities, requirements, estimation notes, stage and hint/early-peek state. Full submitted history, timers, AI reviews and older versions stay local. A second laptop resumes the design as a local working copy; it does not download an attempt timeline. Sandbox tabs remain local and support JSON export/import.

## Existing work on the other laptop

Older versions deliberately excluded HLD drafts from cloud sync. Revisit the old laptop after the update. If its previous synced account matches the signed-in account, the app upgrades the latest in-progress local design for each question automatically. Otherwise open the relevant local attempt while signed in to associate that design with your account. Wait for **Cloud draft synced**, or use the account menu's **Sync now**. Work that never left the old browser cannot be recovered from Supabase until that browser runs the update.

## Supabase table and migration

Apply [`0006_design_drafts.sql`](../db/migrations/0006_design_drafts.sql) through the registered Drizzle migration workflow. A fresh database needs all migrations in order; an existing configured database only needs the pending migration. **Do not add rows manually:** the app creates them for the signed-in user.

| Column     | Type                | Purpose                                    |
| ---------- | ------------------- | ------------------------------------------ |
| user_id    | uuid, FK auth.users | Owner, part of primary key                 |
| problem_id | text                | Question, part of primary key              |
| revision   | integer             | Server-maintained concurrency version      |
| content    | jsonb               | Current versioned design, limited to 1 MiB |
| updated_at | timestamptz         | Server save time                           |

RLS permits users to read only their own rows. Browser INSERT/UPDATE/DELETE is revoked. The authenticated `save_design_draft(problem_id, content, base_revision, expected_user)` RPC verifies the expected account and atomically saves only against the matching revision. Anonymous access is denied. No service key is needed in the browser.

## Offline and concurrent edits

- Autosave writes locally first. Uploads are debounced with a maximum wait and resume after offline use/restart. Failed uploads stay dirty; an old response cannot mark a newer edit as uploaded.
- Incoming remote edits are staged rather than injected into an active canvas. An unseen cloud design arriving after a slow initial load cannot silently overwrite edits either.
- A conflict offers **Use cloud design** or **Keep this device**. The other version is preserved in local History. A second concurrent update produces another conflict instead of silent data loss.
- Draft queues are account-scoped. Account switches cancel old sync jobs and switch cached progress/saved solutions without deleting device history or another account's pending work. A late initial auth lookup cannot reverse a newer auth event.
- Deleting local history does not delete the independent latest cloud design. Cloud sync never copies all historical attempts into the attempts table.

## Canvas behavior

- Undo/redo wrappers pass one numeric step, not a React click event. Structural commands have separate undo steps; typing/dragging coalesces by edited target. Nodes, connections, APIs and entities form one undo document.
- **Microservice** is an independently deployed business/API boundary and satisfies generic Service checks. Multiple replicas of one service can also be distributed without microservices.
- **API Gateway + Load Balancer** is a logical replicated L7 ingress. Use separate nodes for L4 or distinct deployment/scaling boundaries. The three-client starter adds one shared ingress and three connected microservices in a single undoable command, with collision-free IDs.
- The distributed-rate-limiter starter includes multiple limiter instances, shared atomic Redis buckets, failure/TTL/key guidance and downstream microservices. Gateway rate limiting is disabled to avoid charging the same policy twice. Redis is identified as a counter store rather than incorrectly requiring a cache-aside policy.
- Starters accept 1–20 microservices. To expand an existing design, select the upstream gateway, load balancer, limiter or service, open **Config → Connected microservices**, and change **Service count**. Increasing it adds real independently editable nodes, routes and API scaffolds without moving or cloning existing services. This also works on hand-built/imported graphs. Selecting a microservice provides shortcuts to its upstream group; a gateway provides a shortcut to its limiter so expansion can stay behind enforcement. Service counts describe business/API boundaries; each service's replica settings still describe its instances.
- Reducing a group previews the last connected services in document order and requires explicit confirmation. Their incident edges (including connections from another upstream) and owned APIs are removed, missing component references are cleared, and entity definitions are retained with owners detached. One undo restores the entire change. Group membership follows actual direct outgoing connections, survives cloud draft/export round trips, and never counts multiple edges to one service as multiple services.
- **Replace component** in the inspector keeps node identity, position, connections, custom label and notes. Default-valued protocols/modes are re-inferred; non-default values are kept with a review notice. Newly incompatible node references and state-owner assignments are cleared, but state definitions survive. Incompatible API removal requires an explicit checkbox and unlinks affected edge contracts. Undo restores the whole document.
- Unknown/annotation replacement types and missing nodes are rejected. Replacement does not generate duplicate IDs, edges or self-loops. JSON exports now include entities while imports accept older exports without them. Clear-canvas retains entity definitions and detaches their owners.

## Checks

`pnpm test` covers event-safe undo/redo, rapid commands, four-connection replacement, API/state/reference repair, presets, second-device resume, simultaneous edits, in-flight saves, account switches, offline failure and legacy-draft upgrades.

`node --env-file=.env scripts/check-draft-sync-db.mjs` tests the actual save function against temporary fixtures only: revision conflicts, account fencing, separate users, invalid/oversized data and anonymous rejection. No real public/auth history fixtures are inserted.
