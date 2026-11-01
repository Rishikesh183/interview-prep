# Submission and storage policy

Practice, deterministic checks, and draft autosave work without an account. Submission requires a signed-in user and a Supabase-verified session. Loading auth state and deployments without account configuration cannot submit. Verification failures leave the draft editable; sign-in returns to the same problem/attempt.

The submission action checks identity again after asynchronous work and refuses to lock a different attempt opened during verification. The UI also prevents duplicate submission clicks. Best progress is recorded after a successful submit.

| Data | Browser | Supabase |
| --- | --- | --- |
| Drafts and full attempt history | IndexedDB via Dexie | Never uploaded, downloaded, or remotely deleted by history sync |
| Best result per problem | IndexedDB | Compact best-progress row |
| Explicitly saved My solutions | IndexedDB | Saved graph/API/entity snapshot |
| Problems, walkthroughs, Learn cards | Static content files | No database rows |

History belongs to the browser/device. Clearing site data removes it; export designs that need a separate backup. The sync worker watches only progress and explicitly saved solutions, so canvas/timer/history edits do not generate cloud writes. Legacy local attempt IDs and history links remain stable.

A synced progress row proves a previous submission even on a fresh device without history. Both solution gates and early-peek scoring use that fact. Progress merge and upload bookkeeping preserve newer local results recorded while a network operation is in flight.

Legacy cloud attempt rows/tables are retained for compatibility; this change stops using them rather than issuing a destructive cleanup. Existing AI review cache and budget storage are separate from history synchronization.
