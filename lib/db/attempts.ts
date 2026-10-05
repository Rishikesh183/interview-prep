import { nanoid } from "nanoid";
import { AttemptSchema, type Attempt } from "@/lib/schema";
import { db } from "./dexie";

export function newAttempt(problemId: string, now = Date.now()): Attempt {
  return AttemptSchema.parse({ id: nanoid(10), problemId, startedAt: now, updatedAt: now });
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
  await db().attempts.delete(id);
}
