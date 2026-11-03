import { db } from "@/lib/db/dexie";
import { listProgress } from "@/lib/db/progress";
import { listAttempts } from "@/lib/db/attempts";
import { maxProgress } from "@/lib/points";
import {
  ProgressSchema,
  MySolutionSchema,
  type MySolutionRow,
  type ProgressRow,
  type DraftRow,
  type DraftContent,
  type DraftWriteResult,
} from "@/lib/schema";
import { receiveDraft, sameDraft, queueDraft, draftKey } from "@/lib/db/drafts";
import { mySolutionToRow, progressToRow, rowToMySolution, rowToProgress } from "./mapping";

/** Draft snapshots are separate from, and never transport, attempt history. */
export type RemoteProfile = {
  listDrafts?(): Promise<DraftRow[]>;
  saveDraft?(
    problemId: string,
    content: DraftContent,
    revision: number,
    userId: string,
  ): Promise<DraftWriteResult>;
  listProgress(): Promise<ProgressRow[]>;
  upsertProgress(rows: ProgressRow[]): Promise<void>;
  listMySolutions(): Promise<MySolutionRow[]>;
  upsertMySolutions(rows: MySolutionRow[]): Promise<void>;
  removeMySolutions(ids: string[]): Promise<void>;
};

export class SyncEngine {
  private active = true;
  cancel() {
    this.active = false;
  }
  constructor(
    private readonly remote: RemoteProfile,
    readonly userId: string,
  ) {}

  async bindUser(): Promise<void> {
    const d = db();
    const previousUser = (await d.meta.get("syncUserId"))?.value;
    await d.transaction("rw", d.meta, d.progress, d.mySolutions, async () => {
      if (!this.active) return;
      const previous = (await d.meta.get("syncUserId"))?.value;
      if (previous && previous !== this.userId) {
        await d.meta.put({
          key: `profile:${previous}`,
          value: JSON.stringify({
            progress: await d.progress.toArray(),
            solutions: await d.mySolutions.toArray(),
          }),
        });
        const cached = (await d.meta.get(`profile:${this.userId}`))?.value;
        let profile: { progress?: unknown[]; solutions?: unknown[] } = {};
        try {
          profile = cached ? JSON.parse(cached) : {};
        } catch {
          /* Re-pull invalid cache. */
        }
        await d.progress.clear();
        await d.mySolutions.clear();
        await d.progress.bulkPut(
          (profile.progress ?? []).flatMap((p) => {
            const r = ProgressSchema.safeParse(p);
            return r.success ? [r.data] : [];
          }),
        );
        await d.mySolutions.bulkPut(
          (profile.solutions ?? []).flatMap((s) => {
            const r = MySolutionSchema.safeParse(s);
            return r.success ? [r.data] : [];
          }),
        );
      }
      await d.meta.put({ key: "syncUserId", value: this.userId });
    });
    // Upgrade yesterday's local drafts on this device, without uploading submitted history.
    const candidates = (await listAttempts())
      .filter(
        (a) =>
          a.status === "in_progress" &&
          (a.ownerUserId === this.userId || (!a.ownerUserId && previousUser === this.userId)),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const seen = new Set<string>();
    for (const a of candidates) {
      if (!this.active) return;
      if (seen.has(a.problemId)) continue;
      seen.add(a.problemId);
      if (await d.drafts.get(draftKey(this.userId, a.problemId))) continue;
      await d.attempts.update(a.id, { ownerUserId: this.userId });
      await queueDraft({ ...a, ownerUserId: this.userId }, this.userId, () => this.active);
    }
  }

  /** Pull compact progress and intentionally saved designs, never full attempts. */
  async syncAll(): Promise<void> {
    await this.syncProgress();
    if (!this.active) return;
    await this.syncMySolutions();
    if (!this.active) return;
    await this.syncDrafts();
  }

  async syncDrafts(): Promise<void> {
    if (!this.active || !this.remote.listDrafts) return;
    const rows = await this.remote.listDrafts();
    if (!this.active) return;
    for (const row of rows) {
      if (!this.active) return;
      await receiveDraft(row, this.userId);
    }
    await this.pushDrafts();
  }

  private async pushDrafts(): Promise<number> {
    if (!this.active || !this.remote.saveDraft) return 0;
    const d = db();
    const dirty = (await d.drafts.where("userId").equals(this.userId).toArray()).filter(
      (r) => r.dirty && !r.remote,
    );
    let count = 0;
    for (const sent of dirty) {
      if (!this.active) break;
      const result = await this.remote.saveDraft(
        sent.problemId,
        sent.content,
        sent.revision,
        this.userId,
      );
      if (!this.active) break;
      if (result.row.user_id !== this.userId || result.row.problem_id !== sent.problemId)
        throw new Error("Draft response identity mismatch");
      await d.transaction("rw", d.drafts, async () => {
        if (!this.active) return;
        const current = await d.drafts.get(sent.id);
        if (!current) return;
        if (result.outcome === "saved" || sameDraft(current.content, result.row.content)) {
          await d.drafts.update(sent.id, {
            revision: result.row.revision,
            dirty: !sameDraft(current.content, result.row.content),
            remote:
              current.remote && current.remote.revision > result.row.revision
                ? current.remote
                : undefined,
          });
        } else await d.drafts.update(sent.id, { remote: result.row });
      });
      count++;
    }
    return count;
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
    if (!this.active) return;
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
    if (!this.active) return 0;
    const d = db();
    const all = await d.mySolutions.toArray();
    const deleted = all.filter((s) => s.deletedAt !== undefined).map((s) => s.id);
    if (deleted.length) {
      await this.remote.removeMySolutions(deleted);
      if (!this.active) return 0;
      await d.mySolutions.bulkDelete(deleted);
    }
    const dirty = all.filter((s) => s.deletedAt === undefined && (s.pushedAt ?? -1) < s.updatedAt);
    if (dirty.length) {
      await this.remote.upsertMySolutions(dirty.map((s) => mySolutionToRow(s, this.userId)));
      if (!this.active) return 0;
      await Promise.all(dirty.map((s) => d.mySolutions.update(s.id, { pushedAt: s.updatedAt })));
    }
    return deleted.length + dirty.length;
  }

  /** Best-of-both merge of local and server progress, then upload whatever the server lacks. */
  async syncProgress(): Promise<void> {
    const d = db();
    const now = Date.now();
    const rows = await this.remote.listProgress();
    if (!this.active) return;
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
    if (!this.active) return 0;
    const dirty = (await listProgress()).filter((p) => (p.pushedAt ?? -1) < p.updatedAt);
    if (!dirty.length) return 0;
    await this.remote.upsertProgress(dirty.map((p) => progressToRow(p, this.userId)));
    if (!this.active) return 0;
    await Promise.all(
      dirty.map((p) => db().progress.update(p.problemId, { pushedAt: p.updatedAt })),
    );
    return dirty.length;
  }

  /** Local attempt edits are not part of the cloud dirty set. */
  async pushDirty(): Promise<number> {
    return (await this.pushProgress()) + (await this.pushMySolutions()) + (await this.pushDrafts());
  }
}
