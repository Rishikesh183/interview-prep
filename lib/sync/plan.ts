/**
 * Decides what to push, pull and delete. Pure: last-write-wins on updated time (PHASE-2 §1).
 *
 * `synced` holds ids that have been in sync with the server before, so "only on this device"
 * can be told apart: never synced → new here (push); synced before → deleted elsewhere (drop).
 */
export type SyncPlan = {
  push: string[];
  pull: string[];
  deleteRemote: string[];
  deleteLocal: string[];
};

type Stamp = { id: string; updatedAt: number };

export function planSync(
  local: Stamp[],
  remote: Stamp[],
  synced: Set<string>,
  tombstones: Set<string>,
): SyncPlan {
  const plan: SyncPlan = { push: [], pull: [], deleteRemote: [], deleteLocal: [] };
  const remoteById = new Map(remote.map((r) => [r.id, r.updatedAt]));
  const localById = new Map(local.map((l) => [l.id, l.updatedAt]));

  for (const [id, localAt] of localById) {
    const remoteAt = remoteById.get(id);
    if (remoteAt === undefined) {
      (synced.has(id) ? plan.deleteLocal : plan.push).push(id);
    } else if (localAt > remoteAt) plan.push.push(id);
    else if (remoteAt > localAt) plan.pull.push(id);
  }
  for (const id of remoteById.keys()) {
    if (localById.has(id)) continue;
    (tombstones.has(id) ? plan.deleteRemote : plan.pull).push(id);
  }
  return plan;
}
