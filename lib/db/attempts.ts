import { AttemptSchema, type Attempt } from "@/lib/schema";
import { db } from "./dexie";
import { getProgress } from "./progress";

/** A compact synced progress row proves a submission even when this device has no history. */
export async function hasSubmittedProblem(problemId: string): Promise<boolean> {
  if (await getProgress(problemId)) return true;
  return (await listAttempts(problemId)).some((a) => a.status !== "in_progress");
}

export function newAttempt(problemId: string, now = Date.now()): Attempt {
  // Stable local IDs keep history links valid; full attempts never leave IndexedDB.
  return AttemptSchema.parse({
    id: crypto.randomUUID(),
    problemId,
    startedAt: now,
    updatedAt: now,
  });
}

/** Rows written by older versions are upgraded with defaults; unreadable rows are skipped. */
function parse(row: unknown): Attempt | null {
  const res = AttemptSchema.safeParse(row);
  return res.success ? res.data : null;
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  return parse(await db().attempts.get(id));
}

export async function listAttempts(problemId?: string): Promise<Attempt[]> {
  const rows = problemId
    ? await db().attempts.where("problemId").equals(problemId).toArray()
    : await db().attempts.toArray();
  return rows
    .map(parse)
    .filter((a): a is Attempt => a !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** The attempt to resume for a problem: the latest in-progress one, if any. */
export async function latestInProgress(problemId: string): Promise<Attempt | null> {
  const attempts = await listAttempts(problemId);
  return attempts.find((a) => a.status === "in_progress") ?? null;
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  await db().attempts.put({ ...attempt, updatedAt: Date.now() });
}

export async function deleteAttempt(id: string): Promise<void> {
  const d = db();
  await d.transaction("rw", d.attempts, d.tombstones, d.syncState, async () => {
    await d.attempts.delete(id);
    await d.syncState.delete(id);
    // Remove legacy sync bookkeeping; deleting local history never touches the cloud.
    await d.tombstones.delete(id);
  });
}
