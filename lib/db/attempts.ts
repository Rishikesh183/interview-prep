import { AttemptSchema, type Attempt } from "@/lib/schema";
import { db } from "./dexie";

export function newAttempt(problemId: string, now = Date.now()): Attempt {
  // UUIDs because attempts sync to Supabase (uuid primary key).
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
    // Remembered so the sync worker can delete it on the server too.
    await d.tombstones.put({ id, deletedAt: Date.now() });
  });
}
