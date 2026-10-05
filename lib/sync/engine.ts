import { db } from "@/lib/db/dexie";
import { listProgress } from "@/lib/db/progress";
import { maxProgress } from "@/lib/points";
import {
  AttemptSchema,
  type Attempt,
  type AttemptRow,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import {
  attemptToRow,
  isUuid,
  mySolutionToRow,
  progressToRow,
  rowToAttempt,
  rowToMySolution,
  rowToProgress,
} from "./mapping";
import { planSync, type SyncPlan } from "./plan";

/** What the engine needs from the server. Implemented with Supabase in ./supabaseRemote.ts. */
export type RemoteAttempts = {
  /** id + updated time (ms) of every attempt the user owns. */
  listStamps(): Promise<{ id: string; updatedAt: number }[]>;
  fetch(ids: string[]): Promise<AttemptRow[]>;
  /** Server keeps the newer row on conflict (LWW trigger). */
  upsert(rows: AttemptRow[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  listProgress(): Promise<ProgressRow[]>;
  /** Server keeps the best of old and new (keep-best trigger). */
  upsertProgress(rows: ProgressRow[]): Promise<void>;
  listMySolutions(): Promise<MySolutionRow[]>;
  upsertMySolutions(rows: MySolutionRow[]): Promise<void>;
  removeMySolutions(ids: string[]): Promise<void>;
};

const BATCH = 50;
const chunks = <T>(xs: T[], n = BATCH) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

function parseLocal(row: unknown): Attempt | null {
  const res = AttemptSchema.safeParse(row);
  return res.success ? res.data : null;
}

export class SyncEngine {
  constructor(
    private readonly remote: RemoteAttempts,
    private readonly userId: string,
  ) {}

  /**
   * A different account on this device: forget what was synced for the old one, so local
   * attempts are treated as new for this account (a personal, single-user app).
   */
  async bindUser(): Promise<void> {
    const d = db();
    const prev = await d.meta.get("syncUserId");
    if (prev?.value !== this.userId) {
      await d.syncState.clear();
      await d.meta.put({ key: "syncUserId", value: this.userId });
    }
  }

  /** Attempts created before ids were UUIDs get a UUID before their first upload. */
  async rekeyLegacyIds(): Promise<number> {
    const d = db();
    const legacy = (await d.attempts.toArray()).filter((a) => !isUuid(a.id));
    await d.transaction("rw", d.attempts, async () => {
      for (const a of legacy) {
        await d.attempts.delete(a.id);
        await d.attempts.put({ ...a, id: crypto.randomUUID() });
      }
    });
    return legacy.length;
  }

  /** Full reconcile with the server (on start, sign-in and when the tab comes back). */
  async syncAll(): Promise<SyncPlan> {
    await this.rekeyLegacyIds();
    const d = db();
    const [local, remote, synced, tombs] = await Promise.all([
      d.attempts.toArray(),
      this.remote.listStamps(),
      d.syncState.toArray(),
      d.tombstones.toArray(),
    ]);
    const plan = planSync(
      local.map((a) => ({ id: a.id, updatedAt: a.updatedAt })),
      remote,
      new Set(synced.map((s) => s.id)),
      new Set(tombs.map((t) => t.id)),
    );

    await this.push(plan.push);
    await this.pull(plan.pull);
    if (plan.deleteRemote.length) await this.remote.remove(plan.deleteRemote);
    await d.transaction("rw", d.attempts, d.syncState, async () => {
      await d.attempts.bulkDelete(plan.deleteLocal);
      await d.syncState.bulkDelete(plan.deleteLocal);
    });
    // Every tombstone is resolved now: deleted remotely, or it never existed there.
    await d.tombstones.clear();
    await this.syncProgress();
    await this.syncMySolutions();
    return plan;
  }

  /**
   * Saved solutions are created once and rarely renamed: pull the ones this device lacks, drop
   * local copies the server no longer has (deleted elsewhere), then push local changes.
   */
  async syncMySolutions(): Promise<void> {
    const d = db();
    const now = Date.now();
    const [remote, local] = await Promise.all([
      this.remote.listMySolutions(),
      d.mySolutions.toArray(),
    ]);
    const localIds = new Set(local.map((s) => s.id));
    const remoteIds = new Set(remote.map((r) => r.id));
    const gone = local
      .filter((s) => s.pushedAt !== undefined && s.deletedAt === undefined && !remoteIds.has(s.id))
      .map((s) => s.id);
    await d.mySolutions.bulkDelete(gone);
    await d.mySolutions.bulkPut(
      remote.filter((r) => !localIds.has(r.id)).map((r) => rowToMySolution(r, now)),
    );
    await this.pushMySolutions();
  }

  private async pushMySolutions(): Promise<number> {
    const d = db();
    const all = await d.mySolutions.toArray();
    const deleted = all.filter((s) => s.deletedAt !== undefined).map((s) => s.id);
    if (deleted.length) {
      await this.remote.removeMySolutions(deleted);
      await d.mySolutions.bulkDelete(deleted);
    }
    const dirty = all.filter((s) => s.deletedAt === undefined && (s.pushedAt ?? -1) < s.updatedAt);
    if (dirty.length) {
      await this.remote.upsertMySolutions(dirty.map((s) => mySolutionToRow(s, this.userId)));
      await d.mySolutions.bulkPut(dirty.map((s) => ({ ...s, pushedAt: s.updatedAt })));
    }
    return deleted.length + dirty.length;
  }

  /** Best-of-both merge of local and server progress, then upload whatever the server lacks. */
  async syncProgress(): Promise<void> {
    const d = db();
    const now = Date.now();
    const local = new Map((await listProgress()).map((p) => [p.problemId, p]));
    for (const row of await this.remote.listProgress()) {
      const remote = rowToProgress(row, 0);
      const mine = local.get(row.problem_id);
      // Unchanged-by-server rows keep their push state; improved ones count as already pushed.
      local.set(
        row.problem_id,
        mine ? maxProgress(mine, remote) : { ...remote, updatedAt: now, pushedAt: now },
      );
    }
    await d.progress.bulkPut([...local.values()]);
    await this.pushProgress();
  }

  private async pushProgress(): Promise<number> {
    const dirty = (await listProgress()).filter((p) => (p.pushedAt ?? -1) < p.updatedAt);
    if (!dirty.length) return 0;
    await this.remote.upsertProgress(dirty.map((p) => progressToRow(p, this.userId)));
    await db().progress.bulkPut(dirty.map((p) => ({ ...p, pushedAt: p.updatedAt })));
    return dirty.length;
  }

  /** Fast path for local edits: upload changed attempts and pending deletes. */
  async pushDirty(): Promise<number> {
    const d = db();
    const [local, synced, tombs] = await Promise.all([
      d.attempts.toArray(),
      d.syncState.toArray(),
      d.tombstones.toArray(),
    ]);
    const syncedAt = new Map(synced.map((s) => [s.id, s.syncedUpdatedAt]));
    const dirty = local
      .filter((a) => isUuid(a.id) && (syncedAt.get(a.id) ?? -1) < a.updatedAt)
      .map((a) => a.id);
    await this.push(dirty);
    if (tombs.length) {
      const ids = tombs.map((t) => t.id);
      await this.remote.remove(ids);
      await d.tombstones.bulkDelete(ids);
    }
    return (
      dirty.length + tombs.length + (await this.pushProgress()) + (await this.pushMySolutions())
    );
  }

  private async push(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const d = db();
    for (const batch of chunks(ids)) {
      const attempts = (await d.attempts.bulkGet(batch))
        .map(parseLocal)
        .filter((a): a is Attempt => a !== null);
      await this.remote.upsert(
        await Promise.all(attempts.map((a) => attemptToRow(a, this.userId))),
      );
      await d.syncState.bulkPut(attempts.map((a) => ({ id: a.id, syncedUpdatedAt: a.updatedAt })));
    }
  }

  private async pull(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const d = db();
    for (const batch of chunks(ids)) {
      const attempts = (await this.remote.fetch(batch)).map(rowToAttempt);
      await d.transaction("rw", d.attempts, d.syncState, async () => {
        // Written as-is (not via saveAttempt) so the server's updated time is preserved.
        await d.attempts.bulkPut(attempts);
        await d.syncState.bulkPut(
          attempts.map((a) => ({ id: a.id, syncedUpdatedAt: a.updatedAt })),
        );
      });
    }
  }
}
