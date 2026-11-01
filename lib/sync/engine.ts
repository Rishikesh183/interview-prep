import { db } from "@/lib/db/dexie";
import { listProgress } from "@/lib/db/progress";
import { maxProgress } from "@/lib/points";
import type { MySolutionRow, ProgressRow } from "@/lib/schema";
import { mySolutionToRow, progressToRow, rowToMySolution, rowToProgress } from "./mapping";

/** Cloud sync deliberately excludes drafts and attempt history. */
export type RemoteProfile = {
  listProgress(): Promise<ProgressRow[]>;
  upsertProgress(rows: ProgressRow[]): Promise<void>;
  listMySolutions(): Promise<MySolutionRow[]>;
  upsertMySolutions(rows: MySolutionRow[]): Promise<void>;
  removeMySolutions(ids: string[]): Promise<void>;
};

export class SyncEngine {
  constructor(
    private readonly remote: RemoteProfile,
    private readonly userId: string,
  ) {}

  async bindUser(): Promise<void> {
    await db().meta.put({ key: "syncUserId", value: this.userId });
  }

  /** Pull compact progress and intentionally saved designs, never full attempts. */
  async syncAll(): Promise<void> {
    await this.syncProgress();
    await this.syncMySolutions();
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
      await Promise.all(dirty.map((s) => d.mySolutions.update(s.id, { pushedAt: s.updatedAt })));
    }
    return deleted.length + dirty.length;
  }

  /** Best-of-both merge of local and server progress, then upload whatever the server lacks. */
  async syncProgress(): Promise<void> {
    const d = db();
    const now = Date.now();
    const rows = await this.remote.listProgress();
    // A submission can finish during the network request. Merge the latest local values atomically.
    await d.transaction("rw", d.progress, async () => {
      const local = new Map((await listProgress()).map((p) => [p.problemId, p]));
      for (const row of rows) {
        const remote = rowToProgress(row, 0);
        const mine = local.get(row.problem_id);
        local.set(
          row.problem_id,
          mine ? maxProgress(mine, remote) : { ...remote, updatedAt: now, pushedAt: now },
        );
      }
      await d.progress.bulkPut([...local.values()]);
    });
    await this.pushProgress();
  }

  private async pushProgress(): Promise<number> {
    const dirty = (await listProgress()).filter((p) => (p.pushedAt ?? -1) < p.updatedAt);
    if (!dirty.length) return 0;
    await this.remote.upsertProgress(dirty.map((p) => progressToRow(p, this.userId)));
    await Promise.all(
      dirty.map((p) => db().progress.update(p.problemId, { pushedAt: p.updatedAt })),
    );
    return dirty.length;
  }

  /** Local attempt edits are not part of the cloud dirty set. */
  async pushDirty(): Promise<number> {
    return (await this.pushProgress()) + (await this.pushMySolutions());
  }
}
