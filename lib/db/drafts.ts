import {
  DraftContentSchema,
  AttemptSchema,
  type Attempt,
  type DraftContent,
  type DraftRow,
  type LocalDraft,
} from "@/lib/schema";
import { stableStringify, toStored, fromStored } from "@/lib/graph/codec";
import { db } from "./dexie";

export const draftKey = (userId: string, problemId: string) => `${userId}:${problemId}`;
export const sameDraft = (a: DraftContent, b: DraftContent) =>
  stableStringify(a) === stableStringify(b);

export function designOf(a: Attempt): DraftContent {
  return DraftContentSchema.parse({
    v: 1,
    graph: toStored(a.graph),
    apis: a.apis,
    entities: a.entities,
    requirements: a.requirements,
    estimation: a.estimation,
    stage: a.stage,
    hintsRevealed: a.hintsRevealed,
    solutionViewedBeforeSubmit: a.solutionViewedBeforeSubmit,
  });
}

export async function queueDraft(a: Attempt, userId: string, guard?: () => boolean): Promise<void> {
  if (a.ownerUserId && a.ownerUserId !== userId) return;
  const content = designOf(a),
    id = draftKey(userId, a.problemId),
    d = db();
  await d.transaction("rw", d.drafts, async () => {
    if (guard && !guard()) return;
    const old = await d.drafts.get(id);
    if (guard && !guard()) return;
    if (old && sameDraft(old.content, content)) {
      if (old.linkedAttemptId !== a.id) await d.drafts.update(id, { linkedAttemptId: a.id });
      return;
    }
    const unseenCloud =
      old && old.revision > 0 && !old.linkedAttemptId
        ? {
            user_id: userId,
            problem_id: a.problemId,
            revision: old.revision,
            content: old.content,
            updated_at: new Date(old.updatedAt).toISOString(),
          }
        : undefined;
    await d.drafts.put({
      ...old,
      id,
      userId,
      problemId: a.problemId,
      content,
      revision: old?.revision ?? 0,
      remote: old?.remote ?? unseenCloud,
      dirty: true,
      updatedAt: Math.max(Date.now(), (old?.updatedAt ?? 0) + 1),
      linkedAttemptId: a.id,
    });
  });
}

/** Incoming remote edits are staged, never applied to a canvas that the user may be editing. */
export async function receiveDraft(row: DraftRow, userId: string): Promise<void> {
  if (row.user_id !== userId) throw new Error("Draft account mismatch");
  const d = db(),
    id = draftKey(userId, row.problem_id);
  await d.transaction("rw", d.drafts, async () => {
    const old = await d.drafts.get(id);
    if (!old) {
      await d.drafts.put({
        id,
        userId,
        problemId: row.problem_id,
        content: row.content,
        revision: row.revision,
        dirty: false,
        updatedAt: Date.parse(row.updated_at),
      });
    } else if (row.revision > old.revision && row.revision > (old.remote?.revision ?? 0)) {
      if (sameDraft(old.content, row.content))
        await d.drafts.update(id, { revision: row.revision, dirty: false, remote: undefined });
      else await d.drafts.update(id, { remote: row });
    }
  });
}

export async function acceptCloudDraft(
  userId: string,
  problemId: string,
): Promise<LocalDraft | undefined> {
  const id = draftKey(userId, problemId),
    d = db();
  return d.transaction("rw", d.drafts, async () => {
    const old = await d.drafts.get(id);
    if (!old?.remote) return old;
    const next: LocalDraft = {
      ...old,
      content: old.remote.content,
      revision: old.remote.revision,
      dirty: false,
      remote: undefined,
      linkedAttemptId: undefined,
      updatedAt: Date.parse(old.remote.updated_at),
    };
    await d.drafts.put(next);
    return next;
  });
}

export async function keepDeviceDraft(userId: string, problemId: string): Promise<void> {
  const id = draftKey(userId, problemId),
    d = db();
  await d.transaction("rw", d.drafts, async () => {
    const old = await d.drafts.get(id);
    if (old?.remote)
      await d.drafts.update(id, {
        revision: old.remote.revision,
        remote: undefined,
        dirty: true,
        updatedAt: Math.max(Date.now(), old.updatedAt + 1),
      });
  });
}

export function attemptFromDraft(row: LocalDraft, existing?: Attempt | null): Attempt {
  const reuse =
    existing?.status === "in_progress" &&
    (!existing.ownerUserId || existing.ownerUserId === row.userId);
  return AttemptSchema.parse({
    ...(reuse ? existing : {}),
    id: reuse ? existing.id : crypto.randomUUID(),
    ownerUserId: row.userId,
    problemId: row.problemId,
    startedAt: reuse ? existing.startedAt : Date.now(),
    updatedAt: Date.now(),
    ...row.content,
    graph: fromStored(row.content.graph),
    status: "in_progress",
    testRun: undefined,
    review: undefined,
    followUps: [],
    lint: [],
    submittedAt: undefined,
    points: undefined,
  });
}
